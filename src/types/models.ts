export type CapsuleTheme =
  | 'default'
  | 'vintage'
  | 'cyberpunk'
  | 'aurora'
  | 'zen'
  | 'sunset'
  | 'royal'
  | 'crystal'
  | 'starry'
  | 'birthday'
  | 'new_year'
  | 'graduation'
  | 'future';

export type CapsuleStatus = 'locked' | 'unlocked' | 'opened';

export type CapsuleType = 'personal' | 'group';

export interface Capsule {
  id: string;
  ownerId?: string;
  title: string;
  message: string;
  openDateISO: string;
  createdAtISO: string;
  theme: CapsuleTheme;
  status: CapsuleStatus;
  type: CapsuleType;
  mediaCount: number;
  mediaUrls?: string[];
  mediaPaths?: string[];
  thumbnailUrls?: string[]; // Preview nhẹ cho media khi vượt quota
  thumbnailPaths?: string[];
  totalSizeMb?: number; // Dung lượng capsule (để kiểm soát FUP)
  storageSizeMb?: number;
  mediaTypes?: string[];
  shareToken?: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  isPremium: boolean;
  plan?: 'free' | 'plus' | 'pro' | 'pro_max';
  previousPlan?: 'free' | 'plus' | 'pro' | 'pro_max';
  premiumSource?: 'revenuecat' | 'admin_rtdb_override' | null;
  premiumLifetime?: boolean | null;
  fcmToken?: string | null;
  avatarUrl?: string;
  avatarPath?: string;
  avatarVersion?: string;
  freeViewsUsed?: { month: string; count: number };
}

export interface AppNotification {
  id: string;
  userId: string;
  capsuleId: string;
  type: 'capsule_unlocked' | 'invited' | 'reminder';
  title: string;
  body: string;
  isRead: boolean;
  createdAtISO: string;
}
