/**
 * freeViewService.ts
 *
 * Manages the "1 free full-quality view/download per month" allowance for
 * users whose subscription has expired (downgraded to Free).
 *
 * Storage: Firestore `users/{uid}` → `freeViewsUsed: { month, count }`
 * The month key format is "YYYY-MM" (e.g. "2026-06").
 */
import firestore from '@react-native-firebase/firestore';
import { PLAN_LIMITS, type PlanType } from '../config/plans';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How many free full-quality views/downloads per month after subscription expires. */
const FREE_VIEWS_PER_MONTH = 1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const currentMonthKey = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

type FreeViewRecord = {
  month: string;
  count: number;
};

const readFreeViewRecord = async (userId: string): Promise<FreeViewRecord> => {
  const snap = await firestore().collection('users').doc(userId).get();
  const data = snap.data();
  if (!data?.freeViewsUsed) {
    return { month: currentMonthKey(), count: 0 };
  }

  const record = data.freeViewsUsed as FreeViewRecord;
  // Reset if month rolled over
  if (record.month !== currentMonthKey()) {
    return { month: currentMonthKey(), count: 0 };
  }

  return record;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether this user still has free full-quality views left this month.
 */
export const canViewFullQuality = async (userId: string): Promise<boolean> => {
  const record = await readFreeViewRecord(userId);
  return record.count < FREE_VIEWS_PER_MONTH;
};

/**
 * Get how many free views are left this month.
 */
export const getRemainingFreeViews = async (userId: string): Promise<number> => {
  const record = await readFreeViewRecord(userId);
  return Math.max(0, FREE_VIEWS_PER_MONTH - record.count);
};

/**
 * Consume one free view. Call this after the user actually views/downloads
 * full-quality content.
 */
export const consumeFreeView = async (userId: string): Promise<void> => {
  const month = currentMonthKey();
  const record = await readFreeViewRecord(userId);

  const newCount = record.month === month ? record.count + 1 : 1;

  await firestore()
    .collection('users')
    .doc(userId)
    .set(
      {
        freeViewsUsed: { month, count: newCount },
      },
      { merge: true },
    );
};

/**
 * Determine whether a specific capsule's full content should be accessible
 * based on the user's plan, total storage used, and the capsule's own size.
 *
 * Returns:
 *  - 'full'       → user can view/download at full quality
 *  - 'free_view'  → user is expired but still has free monthly view left
 *  - 'restricted' → user must upgrade or wait for next month
 */
export type ViewAccessLevel = 'full' | 'free_view' | 'restricted';

export const getViewAccessLevel = async (
  userId: string,
  userPlan: PlanType,
  usedStorageMb: number,
  _capsuleSizeMb: number,
  previousPlan?: PlanType,
  isExpired?: boolean,
): Promise<ViewAccessLevel> => {
  const limits = PLAN_LIMITS[userPlan];

  // User is within their quota → full access
  if (usedStorageMb <= limits.maxAccountStorageMb) {
    return 'full';
  }

  // User is over quota (usedStorageMb > limits.maxAccountStorageMb)
  // Give 1 free full-quality view/download per month, remaining are restricted (preview)
  const hasRemaining = await canViewFullQuality(userId);
  return hasRemaining ? 'free_view' : 'restricted';
};
