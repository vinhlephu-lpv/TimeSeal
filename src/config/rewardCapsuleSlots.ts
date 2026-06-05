import { PLAN_LIMITS } from './plans';

export const REWARDED_CAPSULE_SLOT_LIMIT = 5;

type RewardedCapsuleSlots =
  | number
  | {
      granted?: number | null;
      count?: number | null;
    }
  | null
  | undefined;

const clampRewardedSlots = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(REWARDED_CAPSULE_SLOT_LIMIT, Math.floor(value)));
};

export const getRewardedCapsuleSlotsGranted = (value: RewardedCapsuleSlots): number => {
  if (typeof value === 'number') {
    return clampRewardedSlots(value);
  }
  return clampRewardedSlots(Number(value?.granted ?? value?.count ?? 0));
};

export const getFreeCapsuleLimit = (rewardedSlots: RewardedCapsuleSlots): number =>
  PLAN_LIMITS.free.maxCapsules + getRewardedCapsuleSlotsGranted(rewardedSlots);
