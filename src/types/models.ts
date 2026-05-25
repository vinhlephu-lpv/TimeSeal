export type CapsuleTheme = 'default' | 'birthday' | 'new_year' | 'graduation';

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
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  isPremium: boolean;
  fcmToken?: string | null;
  avatarUrl?: string;
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
