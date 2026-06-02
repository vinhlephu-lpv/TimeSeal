/**
 * Central RevenueCat + Firestore subscription reconciliation.
 *
 * Firestore users/{uid} remains the verified backend cache written by the
 * RevenueCat webhook. RevenueCat CustomerInfo is used for immediate entitlement
 * updates after a confirmed purchase and whenever the SDK refreshes.
 */
import { AppState } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import { REVENUECAT_ENTITLEMENT_ID } from '../config/revenuecat';
import { PLAN_LIMITS, type PlanType } from '../config/plans';
import {
  getHighestPlanFromProductIds,
  getPlanPriority,
  isPlanAtLeast,
  mapProductIdToPlan,
} from '../config/subscriptionProducts';
import {
  addRevenueCatCustomerInfoListener,
  ensureRevenueCatUser,
} from './revenueCatIdentityService';
import {
  ADMIN_PLAN_OVERRIDE_SOURCE,
  getAdminPlanOverride,
} from './adminPlanOverrideService';

export type SubscriptionStatus =
  | 'active'
  | 'cancelled_renewal'
  | 'expired'
  | 'billing_issue'
  | 'unknown';

export type RevenueCatSubscriptionState = {
  currentPlan: PlanType;
  status: SubscriptionStatus;
  activeProductId?: string;
  expirationDateISO?: string;
  latestPurchaseDateISO?: string;
  willRenew?: boolean;
  isSandbox?: boolean;
  hasUidMismatch?: boolean;
};

export type SubscriptionSyncResult = {
  currentPlan: PlanType;
  previousPlan: PlanType;
  isExpired: boolean;
  isDowngraded: boolean;
  isOverQuota: boolean;
  usedStorageMb: number;
  isAdminOverride?: boolean;
  premiumUpdatedAtISO?: string;
  status: SubscriptionStatus;
  expirationDateISO?: string;
  willRenew?: boolean;
  lifecycleEventType?: string;
  notificationKey?: string;
};

type SubscriptionMeta = {
  lastEventId?: string;
  lastEventAtMs?: number;
  lastEventType?: string;
  status?: SubscriptionStatus;
  expirationAtMs?: number;
  willRenew?: boolean;
};

const safePlan = (value: unknown): PlanType =>
  value === 'plus' || value === 'pro' || value === 'pro_max' ? value : 'free';

const isRevenueCatAnonymousId = (value: string): boolean =>
  value.startsWith('$RCAnonymousID:');

const findActiveProductId = (
  productIds: string[],
  plan: PlanType,
): string | undefined =>
  productIds.find(productId => mapProductIdToPlan(productId) === plan);

/**
 * Normalize the active RevenueCat subscription only. Historical purchases must
 * never override the currently active plan.
 */
export const normalizeRevenueCatEntitlement = (
  customerInfo: CustomerInfo,
  userId?: string,
): RevenueCatSubscriptionState => {
  const originalAppUserId = customerInfo.originalAppUserId || '';
  if (
    userId &&
    originalAppUserId &&
    originalAppUserId !== userId &&
    !isRevenueCatAnonymousId(originalAppUserId)
  ) {
    return {
      currentPlan: 'free',
      status: 'unknown',
      hasUidMismatch: true,
    };
  }

  const activeEntitlement =
    customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID];
  const knownEntitlement =
    activeEntitlement || customerInfo.entitlements.all[REVENUECAT_ENTITLEMENT_ID];
  const activeProductIds = [
    ...(customerInfo.activeSubscriptions || []),
    ...(activeEntitlement?.productIdentifier
      ? [activeEntitlement.productIdentifier]
      : []),
  ];
  const currentPlan = getHighestPlanFromProductIds(activeProductIds);
  const activeProductId = findActiveProductId(activeProductIds, currentPlan);
  const subscriptionInfo = activeProductId
    ? customerInfo.subscriptionsByProductIdentifier?.[activeProductId]
    : undefined;

  if (currentPlan === 'free') {
    return {
      currentPlan,
      status: knownEntitlement ? 'expired' : 'unknown',
      expirationDateISO: knownEntitlement?.expirationDate || undefined,
      latestPurchaseDateISO: knownEntitlement?.latestPurchaseDate || undefined,
      willRenew: false,
      isSandbox: knownEntitlement?.isSandbox,
    };
  }

  const billingIssueDetectedAt =
    activeEntitlement?.billingIssueDetectedAt ||
    subscriptionInfo?.billingIssuesDetectedAt;
  const willRenew =
    activeEntitlement?.willRenew ??
    subscriptionInfo?.willRenew ??
    false;
  const hasCancelledRenewal =
    Boolean(activeEntitlement?.unsubscribeDetectedAt) ||
    Boolean(subscriptionInfo?.unsubscribeDetectedAt) ||
    !willRenew;

  return {
    currentPlan,
    status: billingIssueDetectedAt
      ? 'billing_issue'
      : hasCancelledRenewal
        ? 'cancelled_renewal'
        : 'active',
    activeProductId,
    expirationDateISO:
      activeEntitlement?.expirationDate ||
      subscriptionInfo?.expiresDate ||
      undefined,
    latestPurchaseDateISO:
      activeEntitlement?.latestPurchaseDate ||
      subscriptionInfo?.purchaseDate ||
      undefined,
    willRenew,
    isSandbox:
      activeEntitlement?.isSandbox ??
      subscriptionInfo?.isSandbox,
  };
};

const currentMonthKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const toISODate = (value: unknown): string | undefined => {
  const timestamp = Number(value || 0);
  return timestamp > 0 ? new Date(timestamp).toISOString() : undefined;
};

export const syncPlanOnAppOpen = async (
  userId: string,
  email?: string | null,
  prefetchedCustomerInfo?: CustomerInfo,
): Promise<SubscriptionSyncResult> => {
  const userRef = firestore().collection('users').doc(userId);
  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};
  const previousPlan = safePlan(userData.plan);
  const previousPremiumSource = userData.premiumSource as string | undefined;
  const subscriptionMeta = (userData.subscriptionMeta || {}) as SubscriptionMeta;

  const adminOverride = await getAdminPlanOverride(
    (userData.email as string | undefined) || email,
  );
  const isAdminOverride = adminOverride.status === 'active';
  const isAdminOverrideUnavailable = adminOverride.status === 'unavailable';

  let currentPlan: PlanType =
    previousPremiumSource === ADMIN_PLAN_OVERRIDE_SOURCE && !isAdminOverrideUnavailable
      ? 'free'
      : previousPlan;
  let status: SubscriptionStatus =
    subscriptionMeta.status ||
    (currentPlan === 'free' ? 'unknown' : 'active');
  let expirationDateISO = toISODate(subscriptionMeta.expirationAtMs);
  let willRenew = subscriptionMeta.willRenew;

  if (isAdminOverride) {
    currentPlan = adminOverride.plan;
    status = 'active';
  } else if (!isAdminOverrideUnavailable && await ensureRevenueCatUser(userId)) {
    try {
      const customerInfo =
        prefetchedCustomerInfo ||
        await Purchases.getCustomerInfo();
      const revenueCatState = normalizeRevenueCatEntitlement(customerInfo, userId);

      if (!revenueCatState.hasUidMismatch) {
        currentPlan = revenueCatState.currentPlan;
        status = revenueCatState.status;
        expirationDateISO = revenueCatState.expirationDateISO || expirationDateISO;
        willRenew = revenueCatState.willRenew ?? willRenew;

        const revenueCatUpdatedAtMs = new Date(
          revenueCatState.latestPurchaseDateISO || 0,
        ).getTime();
        const hasNewerVerifiedBackendState =
          previousPremiumSource === 'revenuecat' &&
          Number(subscriptionMeta.lastEventAtMs || 0) > revenueCatUpdatedAtMs;
        if (hasNewerVerifiedBackendState) {
          currentPlan = previousPlan;
          status = subscriptionMeta.status || status;
          expirationDateISO =
            toISODate(subscriptionMeta.expirationAtMs) ||
            expirationDateISO;
          willRenew = subscriptionMeta.willRenew ?? willRenew;
        }
      } else {
        currentPlan = 'free';
        status = 'unknown';
      }
    } catch {
      // Keep the backend-cached plan when RevenueCat cannot be reached.
    }
  }

  const itemsSnap = await firestore()
    .collection('user_storage_items')
    .where('userId', '==', userId)
    .get();
  const staticStorageMb = itemsSnap.docs
    .reduce((sum, doc) => sum + Number(doc.data().sizeMb || 0), 0);
  const month = currentMonthKey();
  const bandwidth = userData.bandwidthUsed || { month, usedMb: 0 };
  const currentMonthBandwidthMb =
    bandwidth.month === month ? Number(bandwidth.usedMb || 0) : 0;
  const usedStorageMb = Number((staticStorageMb + currentMonthBandwidthMb).toFixed(2));

  const isExpired =
    getPlanPriority(previousPlan) > 0 &&
    currentPlan === 'free';
  const isDowngraded =
    !isExpired &&
    getPlanPriority(currentPlan) < getPlanPriority(previousPlan);
  const isOverQuota =
    usedStorageMb > PLAN_LIMITS[currentPlan].maxAccountStorageMb;
  const lifecycleEventType = String(subscriptionMeta.lastEventType || '');
  const notificationKey = subscriptionMeta.lastEventAtMs
    ? `${subscriptionMeta.lastEventAtMs}:${lifecycleEventType}:${currentPlan}:${status}`
    : undefined;

  return {
    currentPlan,
    previousPlan,
    isExpired,
    isDowngraded,
    isOverQuota,
    usedStorageMb,
    isAdminOverride,
    premiumUpdatedAtISO: userData.premiumUpdatedAtISO,
    status,
    expirationDateISO,
    willRenew,
    lifecycleEventType,
    notificationKey,
  };
};

/**
 * Register one event-based subscription lifecycle per Firebase UID.
 * No timer or polling loop is used.
 */
export const watchSubscriptionForUser = (
  userId: string,
  email: string | null | undefined,
  onSync: (result: SubscriptionSyncResult) => void,
): (() => void) => {
  let isActive = true;
  let isRefreshing = false;
  let needsRefresh = false;
  let pendingCustomerInfo: CustomerInfo | undefined;
  let removeRevenueCatListener: (() => void) | undefined;

  const runRefresh = async () => {
    if (isRefreshing) {
      needsRefresh = true;
      return;
    }

    isRefreshing = true;
    do {
      needsRefresh = false;
      const customerInfo = pendingCustomerInfo;
      pendingCustomerInfo = undefined;
      try {
        const result = await syncPlanOnAppOpen(userId, email, customerInfo);
        if (isActive) {
          onSync(result);
        }
      } catch {
        // Keep the last stable entitlement while the network is unavailable.
      }
    } while (isActive && needsRefresh);
    isRefreshing = false;
  };

  const requestRefresh = (customerInfo?: CustomerInfo) => {
    pendingCustomerInfo = customerInfo || pendingCustomerInfo;
    void runRefresh();
  };

  const removeFirestoreListener = firestore()
    .collection('users')
    .doc(userId)
    .onSnapshot(
      () => requestRefresh(),
      () => {},
    );

  const appStateSubscription = AppState.addEventListener('change', nextState => {
    if (nextState === 'active') {
      Purchases.invalidateCustomerInfoCache()
        .catch(() => {})
        .finally(() => requestRefresh());
    }
  });

  ensureRevenueCatUser(userId)
    .then(isConfigured => {
      if (!isActive || !isConfigured) {
        return;
      }
      removeRevenueCatListener = addRevenueCatCustomerInfoListener(
        userId,
        requestRefresh,
      );
      requestRefresh();
    })
    .catch(() => {});

  requestRefresh();

  return () => {
    isActive = false;
    removeFirestoreListener();
    removeRevenueCatListener?.();
    appStateSubscription.remove();
  };
};

export { getPlanPriority, isPlanAtLeast };

export const getPlanStorageLabel = (plan: PlanType): string => {
  const mb = PLAN_LIMITS[plan].maxAccountStorageMb;
  return mb >= 1024
    ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)}GB`
    : `${mb}MB`;
};

export const getPlanDisplayName = (plan: PlanType): string => {
  const names: Record<PlanType, string> = {
    free: 'Free',
    plus: 'Plus',
    pro: 'Pro',
    pro_max: 'Pro Max',
  };
  return names[plan] || 'Free';
};
