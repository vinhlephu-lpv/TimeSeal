import type { PlanType } from './plans';

export type PaidPlanType = Exclude<PlanType, 'free'>;

/**
 * Keep these IDs identical to Google Play Console and RevenueCat.
 * Android may append a base plan suffix, for example "product_id:base_plan".
 */
export const SUBSCRIPTION_PRODUCT_IDS: Record<PaidPlanType, string> = {
  plus: 'timeseal_plus_monthly',
  pro: 'timeseal_pro_monthly',
  pro_max: 'timeseal_promax_monthly',
};

export const PLAN_PRIORITY: Record<PlanType, number> = {
  free: 0,
  plus: 1,
  pro: 2,
  pro_max: 3,
};

const normalizeProductId = (value: unknown): string =>
  String(value || '').trim().toLowerCase();

export const mapProductIdToPlan = (value: unknown): PlanType => {
  const productId = normalizeProductId(value);
  if (!productId) {
    return 'free';
  }

  const match = (Object.entries(SUBSCRIPTION_PRODUCT_IDS) as Array<[PaidPlanType, string]>)
    .find(([, configuredId]) =>
      productId === configuredId || productId.startsWith(`${configuredId}:`),
    );

  return match?.[0] || 'free';
};

export const getPlanPriority = (plan: PlanType): number => PLAN_PRIORITY[plan];

export const isPlanAtLeast = (currentPlan: PlanType, requiredPlan: PlanType): boolean =>
  getPlanPriority(currentPlan) >= getPlanPriority(requiredPlan);

export const getHighestPlanFromProductIds = (productIds: string[]): PlanType =>
  productIds.reduce<PlanType>((highestPlan, productId) => {
    const nextPlan = mapProductIdToPlan(productId);
    return getPlanPriority(nextPlan) > getPlanPriority(highestPlan)
      ? nextPlan
      : highestPlan;
  }, 'free');
