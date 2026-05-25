export const PLAN_LIMITS = {
  free: {
    maxCapsules: 3,
    maxMediaPerCapsule: 5,
    allowVideo: false,
  },
  premium: {
    maxCapsules: Infinity,
    maxMediaPerCapsule: 20,
    allowVideo: true,
  },
} as const;

export const getPlanLimits = (isPremium: boolean) =>
  isPremium ? PLAN_LIMITS.premium : PLAN_LIMITS.free;
