export const PLAN_LIMITS = {
  free: {
    maxCapsules: 3,
    maxMediaPerCapsule: 5,
    maxPhotosPerCapsule: 5,
    maxVideosPerCapsule: 0,
    allowVideo: false,
    maxVideoDurationSeconds: 0,
    maxCapsuleSizeMb: 50,
    maxAccountStorageMb: 50, // 50MB total
    maxMessageLength: 500,
  },
  plus: {
    maxCapsules: Infinity,
    maxMediaPerCapsule: 13, // 10 ảnh + 3 video
    maxPhotosPerCapsule: 10,
    maxVideosPerCapsule: 3,
    allowVideo: true,
    maxVideoDurationSeconds: 60, // 1 phút
    maxCapsuleSizeMb: 50, // 50MB/capsule
    maxAccountStorageMb: 1536, // 1.5GB
    maxMessageLength: 1500,
  },
  pro: {
    maxCapsules: Infinity,
    maxMediaPerCapsule: 25, // 20 ảnh + 5 video
    maxPhotosPerCapsule: 20,
    maxVideosPerCapsule: 5,
    allowVideo: true,
    maxVideoDurationSeconds: 180, // 3 phút
    maxCapsuleSizeMb: 500, // 500MB/capsule
    maxAccountStorageMb: 5120, // 5GB
    maxMessageLength: 3000,
  },
  pro_max: {
    maxCapsules: Infinity,
    maxMediaPerCapsule: 40,
    maxPhotosPerCapsule: 30,
    maxVideosPerCapsule: 10,
    allowVideo: true,
    maxVideoDurationSeconds: 420, // 7 phút
    maxCapsuleSizeMb: 1024, // 1GB/capsule
    maxAccountStorageMb: 20480, // 20GB
    maxMessageLength: 10000,
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export const getPlanLimits = (planOrPremium?: PlanType | boolean) => {
  if (typeof planOrPremium === 'boolean') {
    return planOrPremium ? PLAN_LIMITS.plus : PLAN_LIMITS.free;
  }
  if (!planOrPremium) {
    return PLAN_LIMITS.free;
  }
  return PLAN_LIMITS[planOrPremium] || PLAN_LIMITS.free;
};
