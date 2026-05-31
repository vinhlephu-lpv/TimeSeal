/**
 * subscriptionService.ts
 *
 * Checks RevenueCat subscription status when the app opens, syncs the
 * active plan to Firestore, and exposes helpers to detect downgrades.
 */
import Purchases from 'react-native-purchases';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRevenueCatApiKey, REVENUECAT_ENTITLEMENT_ID } from '../config/revenuecat';
import { PLAN_LIMITS, type PlanType } from '../config/plans';
import {
  ADMIN_PLAN_OVERRIDE_SOURCE,
  getAdminPlanOverride,
} from './adminPlanOverrideService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubscriptionSyncResult = {
  /** The plan determined from RevenueCat (or 'free' if no active entitlement). */
  currentPlan: PlanType;
  /** The plan that was stored in Firestore before this sync. */
  previousPlan: PlanType;
  /** True when the user previously had a paid plan but is now 'free'. */
  isExpired: boolean;
  /** True when the user moved to a lower-tier paid plan. */
  isDowngraded: boolean;
  /** True when the stored data exceeds the current plan's account limit. */
  isOverQuota: boolean;
  /** Total MB currently stored across all capsules for this user. */
  usedStorageMb: number;
  /** True when Firebase Realtime Database granted an internal testing plan. */
  isAdminOverride?: boolean;
  premiumUpdatedAtISO?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Numeric tier rank for easy comparison. Higher = more storage. */
const PLAN_RANK: Record<PlanType, number> = {
  free: 0,
  plus: 1,
  pro: 2,
  pro_max: 3,
};

let configuredUserId: string | null = null;

const ensureRevenueCatConfigured = async (userId: string): Promise<boolean> => {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    return false;
  }

  try {
    if (!configuredUserId) {
      Purchases.configure({ apiKey, appUserID: userId });
      configuredUserId = userId;
    } else if (configuredUserId !== userId) {
      await Purchases.logIn(userId);
      configuredUserId = userId;
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Infer the paid plan type from RevenueCat active subscriptions / product IDs.
 */
const inferPlanFromProductIds = (productIds: string[]): PlanType => {
  const joined = productIds.join(' ').toLowerCase();
  if (joined.includes('pro_max') || joined.includes('pro-max') || joined.includes('promax')) {
    return 'pro_max';
  }
  if (joined.includes('pro')) {
    return 'pro';
  }
  if (joined.includes('plus') || joined.length > 0) {
    return 'plus';
  }
  return 'free';
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Called once on app launch (after auth). Queries RevenueCat for the active
 * entitlements, compares with the previously stored plan in Firestore, syncs
 * the result, and returns actionable flags so the UI can show the appropriate
 * modal (expired / downgraded / over-quota).
 */
export const syncPlanOnAppOpen = async (
  userId: string,
  email?: string | null,
): Promise<SubscriptionSyncResult> => {
  // 1. Read the previous plan from Firestore ---
  const userRef = firestore().collection('users').doc(userId);
  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};
  const previousPlan: PlanType = (userData.plan as PlanType) || 'free';
  const previousPremiumSource = userData.premiumSource as string | undefined;

  const adminOverride = await getAdminPlanOverride(
    (userData.email as string | undefined) || email,
  );
  const isAdminOverride = adminOverride.status === 'active';
  const isAdminOverrideUnavailable = adminOverride.status === 'unavailable';

  // 2. Try to get current status from RevenueCat, unless RTDB grants an internal plan.
  let currentPlan: PlanType =
    previousPremiumSource === ADMIN_PLAN_OVERRIDE_SOURCE && !isAdminOverrideUnavailable
      ? 'free'
      : previousPlan;

  const rcConfigured =
    isAdminOverride || isAdminOverrideUnavailable
      ? false
      : await ensureRevenueCatConfigured(userId);
  if (isAdminOverride) {
    currentPlan = adminOverride.plan;
  } else if (rcConfigured) {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const hasEntitlement = Boolean(
        customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID],
      );

      if (hasEntitlement) {
        const activeProducts = [
          ...(customerInfo.activeSubscriptions || []),
          ...(customerInfo.allPurchasedProductIdentifiers || []),
        ];
        currentPlan = inferPlanFromProductIds(activeProducts);
      } else {
        currentPlan = 'free';
      }
    } catch {
      // RevenueCat unavailable – keep previous plan to avoid false downgrade
      currentPlan =
        previousPremiumSource === ADMIN_PLAN_OVERRIDE_SOURCE && !isAdminOverrideUnavailable
          ? 'free'
          : previousPlan;
    }
  }

  // 3. Calculate used storage (includes static storage + current month's view/download bandwidth) ---
  const itemsSnap = await firestore()
    .collection('user_storage_items')
    .where('userId', '==', userId)
    .get();

  const staticStorageMb = itemsSnap.docs
    .reduce((sum, doc) => sum + Number(doc.data().sizeMb || 0), 0);

  // Helper to get current month key
  const currentMonthKey = (): string => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const month = currentMonthKey();
  const bandwidth = userData.bandwidthUsed || { month, usedMb: 0 };
  let currentMonthBandwidthMb = 0;
  if (bandwidth.month === month) {
    currentMonthBandwidthMb = Number(bandwidth.usedMb || 0);
  }

  const usedStorageMb = Number((staticStorageMb + currentMonthBandwidthMb).toFixed(2));

  // 4. Derive flags ---
  const isPreviouslyPaid = PLAN_RANK[previousPlan] > 0;
  const isCurrentlyFree = currentPlan === 'free';
  const isExpired = isPreviouslyPaid && isCurrentlyFree;
  const isDowngraded =
    !isExpired && PLAN_RANK[currentPlan] < PLAN_RANK[previousPlan];
  const currentLimits = PLAN_LIMITS[currentPlan];
  const isOverQuota = usedStorageMb > currentLimits.maxAccountStorageMb;

  // 5. Sync to Firestore if plan/source changed ---
  const nextPremiumSource =
    isAdminOverride ||
    (isAdminOverrideUnavailable && previousPremiumSource === ADMIN_PLAN_OVERRIDE_SOURCE)
      ? ADMIN_PLAN_OVERRIDE_SOURCE
      : null;
  if (currentPlan !== previousPlan || previousPremiumSource !== nextPremiumSource) {
    await userRef.set(
      {
        isPremium: currentPlan !== 'free',
        plan: currentPlan,
        previousPlan,
        premiumSource: nextPremiumSource,
        premiumLifetime: isAdminOverride ? adminOverride.lifetime : null,
        premiumUpdatedAtISO: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  return {
    currentPlan,
    previousPlan,
    isExpired,
    isDowngraded,
    isOverQuota,
    usedStorageMb,
    isAdminOverride,
    premiumUpdatedAtISO: userData.premiumUpdatedAtISO,
  };
};

/**
 * Record bandwidth usage (viewing/downloading) for a user in the current month.
 * Automatically checks and self-cleans a 24-hour cache of viewed capsules to avoid double-charging.
 */
export const addBandwidthUsage = async (userId: string, amountMb: number, capsuleId?: string): Promise<void> => {
  if (amountMb <= 0) return;

  if (capsuleId) {
    try {
      const cacheStr = await AsyncStorage.getItem('@timeseal_viewed_capsules');
      const cache = cacheStr ? JSON.parse(cacheStr) : {};

      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      // Self-cleaning: remove expired items (> 24 hours) to avoid locally bloating storage
      const cleanCache: Record<string, number> = {};
      for (const [id, timestamp] of Object.entries(cache)) {
        if (now - Number(timestamp) <= oneDayMs) {
          cleanCache[id] = Number(timestamp);
        }
      }

      // If already viewed in the last 24h, bypass and return
      if (cleanCache[capsuleId]) {
        return;
      }

      // Otherwise, add to cache and proceed
      cleanCache[capsuleId] = now;
      await AsyncStorage.setItem('@timeseal_viewed_capsules', JSON.stringify(cleanCache));
    } catch {
      // Proceed on storage error
    }
  }

  const currentMonthKey = (): string => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const userRef = firestore().collection('users').doc(userId);
  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};

  const month = currentMonthKey();
  const bandwidth = userData.bandwidthUsed || { month, usedMb: 0 };

  let newUsedMb = amountMb;
  if (bandwidth.month === month) {
    newUsedMb = Number((Number(bandwidth.usedMb || 0) + amountMb).toFixed(2));
  }

  await userRef.set(
    {
      bandwidthUsed: { month, usedMb: newUsedMb },
    },
    { merge: true },
  );
};

/**
 * Returns the human-readable storage limit for a plan.
 * e.g. "1.5GB", "5GB", "50MB"
 */
export const getPlanStorageLabel = (plan: PlanType): string => {
  const mb = PLAN_LIMITS[plan].maxAccountStorageMb;
  return mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)}GB` : `${mb}MB`;
};

/**
 * Returns the human-readable label for a plan.
 */
export const getPlanDisplayName = (plan: PlanType): string => {
  const names: Record<PlanType, string> = {
    free: 'Free',
    plus: 'Plus',
    pro: 'Pro',
    pro_max: 'Pro Max',
  };
  return names[plan] || 'Free';
};
