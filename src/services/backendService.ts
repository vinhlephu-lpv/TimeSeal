import auth from '@react-native-firebase/auth';
import { firebaseProject } from '../config/firebase';

const FUNCTIONS_BASE_URL = `https://us-central1-${firebaseProject.projectId}.cloudfunctions.net/api`;

type BackendErrorBody = {
  error?: string;
};

type TimedPromise<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

const AVATAR_ACCESS_CACHE_MS = 6 * 60 * 60 * 1000;
const WAITING_DETAIL_CACHE_MS = 5000;

const callBackend = async <T>(endpoint: string, body: Record<string, unknown>): Promise<T> => {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    throw new Error('Bạn cần đăng nhập để tiếp tục.');
  }

  const idToken = await currentUser.getIdToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${FUNCTIONS_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({})) as T & BackendErrorBody;
  if (!response.ok) {
    throw new Error(payload.error || 'Không thể kết nối máy chủ. Vui lòng thử lại.');
  }

  return payload;
};

export type ViewAccessLevel = 'full' | 'restricted';
export type MediaAccessPurpose = 'view' | 'download';

export type CapsuleMediaAccess = {
  accessLevel: ViewAccessLevel;
  mediaUrls: string[];
  thumbnailUrls: string[];
  blockedMediaIndexes?: number[];
};

export type CapsuleUploadFile = {
  mediaType: 'image' | 'video';
  sizeBytes: number;
};

export type CapsuleUploadSlot = {
  mediaPath: string;
  thumbnailPath: string;
};

export type WaitingContribution = {
  id: string;
  contributorId: string;
  contributorName: string;
  contributorEmail: string;
  contributorAvatarPath?: string;
  contributorAvatarVersion?: string;
  contributorAvatarUrl?: string;
  ownerContribution: boolean;
  message: string;
  mediaTypes: string[];
  mediaPaths: string[];
  thumbnailPaths: string[];
  mediaUrls: string[];
  thumbnailUrls: string[];
  storageSizeMb: number;
  blockedMediaIndexes?: number[];
  createdAtISO: string;
  updatedAtISO: string;
};

export type WaitingCapsuleDetail = {
  capsule: {
    id: string;
    ownerId: string;
    title: string;
    openDateISO: string;
    contributionDeadlineISO: string;
    createdAtISO: string;
    status: string;
    theme: string;
    memberEmails: string[];
    members: string[];
    shareToken: string;
  };
  accessLevel: 'full' | 'restricted';
  contributions: WaitingContribution[];
  viewerContributionId: string;
  pendingMembers: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string;
    avatarVersion: string;
    avatarPath: string;
  }[];
};

type AvatarAccess = {
  avatarUrl: string;
  avatarVersion: string;
};

const avatarAccessRequests = new Map<string, TimedPromise<AvatarAccess>>();
const waitingDetailRequests = new Map<string, TimedPromise<WaitingCapsuleDetail>>();

export const createCapsuleDraft = async (input: {
  title: string;
  message: string;
  openDateISO: string;
  theme: string;
  memberEmails: string[];
  files: CapsuleUploadFile[];
}) =>
  callBackend<{ capsuleId: string; uploadSlots: CapsuleUploadSlot[] }>('createCapsuleDraft', input);

export const finalizeCapsuleUpload = async (capsuleId: string) =>
  callBackend<{ capsuleId: string }>('finalizeCapsuleUpload', { capsuleId });

export const createWaitingCapsuleDraft = async (input: {
  title: string;
  message: string;
  openDateISO: string;
  contributionDeadlineISO: string;
  theme: string;
  memberEmails: string[];
  files: CapsuleUploadFile[];
  coverThumbnailUrl?: string;
  coverThumbnailPath?: string;
}) =>
  callBackend<{ capsuleId: string; uploadId: string; uploadSlots: CapsuleUploadSlot[] }>('createWaitingCapsuleDraft', input);

export const finalizeWaitingCapsuleUpload = async (capsuleId: string, uploadId: string) =>
  callBackend<{ capsuleId: string }>('finalizeWaitingCapsuleUpload', { capsuleId, uploadId });

export const createContributionDraft = async (input: {
  capsuleId: string;
  message: string;
  files: CapsuleUploadFile[];
  retainedMediaPaths?: string[];
}) =>
  callBackend<{ capsuleId: string; uploadId: string; uploadSlots: CapsuleUploadSlot[] }>('createContributionDraft', input);

export const finalizeContributionUpload = async (uploadId: string) =>
  callBackend<{ capsuleId: string }>('finalizeContributionUpload', { uploadId });

export const updateContributionText = async (capsuleId: string, message: string) =>
  callBackend<{ capsuleId: string }>('updateContributionText', { capsuleId, message });

export const getWaitingCapsuleDetail = async (
  capsuleId: string,
  requestFullQuality = false,
  selectedContributionId = '',
  accessPurpose: MediaAccessPurpose = 'view',
  mediaIndexes?: number[],
) => {
  const shouldCache = !requestFullQuality && !selectedContributionId && accessPurpose === 'view' && !mediaIndexes?.length;
  const cacheKey = `${capsuleId}:${requestFullQuality ? 'full' : 'preview'}:${selectedContributionId}:${accessPurpose}:${mediaIndexes?.join(',') || 'all'}`;
  const now = Date.now();
  const existing = waitingDetailRequests.get(cacheKey);
  if (shouldCache && existing && existing.expiresAt > now) {
    return existing.promise;
  }

  const promise = callBackend<WaitingCapsuleDetail>('getWaitingCapsuleDetail', {
    capsuleId,
    requestFullQuality,
    selectedContributionId,
    accessPurpose,
    mediaIndexes,
  })
    .catch(error => {
      waitingDetailRequests.delete(cacheKey);
      throw error;
    });
  if (shouldCache) {
    waitingDetailRequests.set(cacheKey, {
      expiresAt: now + WAITING_DETAIL_CACHE_MS,
      promise,
    });
  }
  return promise;
};

export const closeDueWaitingCapsulesOnServer = async () =>
  callBackend<{ closedCount: number }>('closeDueWaitingCapsules', {});

export const abandonCapsuleDraft = async (capsuleId: string) =>
  callBackend<{ capsuleId: string }>('abandonCapsuleDraft', { capsuleId });

export const getCapsuleMediaAccess = async (
  capsuleId: string,
  requestFullQuality = false,
  accessPurpose: MediaAccessPurpose = 'view',
  mediaIndexes?: number[],
) =>
  callBackend<CapsuleMediaAccess>('getCapsuleMediaAccess', {
    capsuleId,
    requestFullQuality,
    accessPurpose,
    mediaIndexes,
  });

const thumbnailRequests = new Map<string, Promise<string[]>>();

export const getCapsuleThumbnailUrls = async (capsuleId: string) => {
  const existing = thumbnailRequests.get(capsuleId);
  if (existing) {
    return existing;
  }
  const request = callBackend<{ thumbnailUrls: string[] }>('getCapsuleThumbnailUrls', {
    capsuleId,
  })
    .then(result => {
      setTimeout(() => thumbnailRequests.delete(capsuleId), 10 * 60 * 1000);
      return result.thumbnailUrls;
    })
    .catch(error => {
      thumbnailRequests.delete(capsuleId);
      throw error;
    });
  thumbnailRequests.set(capsuleId, request);
  return request;
};

export const deleteCapsuleOnServer = async (capsuleId: string) =>
  callBackend<{ capsuleId: string }>('deleteCapsule', { capsuleId });

export const markCapsuleOpenedOnServer = async (capsuleId: string) =>
  callBackend<{ capsuleId: string }>('markCapsuleOpened', { capsuleId });

export const unlockDueCapsulesOnServer = async () =>
  callBackend<{ unlockedCount: number }>('unlockDueCapsules', {});

export type InvitePreview = {
  capsuleId: string;
  title: string;
  openDateISO: string;
};

export const getInvitePreview = async (inviteCode: string) =>
  callBackend<InvitePreview>('getInvitePreview', { inviteCode });

export const getCapsuleInviteToken = async (capsuleId: string) =>
  callBackend<{ inviteCode: string }>('getCapsuleInviteToken', { capsuleId });

export const syncDirectCapsuleMembers = async (capsuleId: string) =>
  callBackend<{ capsuleId: string }>('syncDirectCapsuleMembers', { capsuleId });

export const acceptCapsuleInvite = async (inviteCode: string) =>
  callBackend<{ capsuleId: string }>('acceptCapsuleInvite', { inviteCode });

export const deleteAccountDataOnServer = async () =>
  callBackend<{ ok: true }>('deleteAccountData', {});

export const createAvatarDraft = async () =>
  callBackend<{ storagePath: string }>('createAvatarDraft', {});

export const finalizeAvatarUpload = async () =>
  callBackend<{ avatarPath: string; avatarVersion: string }>('finalizeAvatarUpload', {});

export const abandonAvatarDraft = async () =>
  callBackend<{ ok: true }>('abandonAvatarDraft', {});

export const getAvatarAccess = async (userId: string, cacheVersion = '') => {
  const cacheKey = `${userId}:${cacheVersion || 'default'}`;
  const now = Date.now();
  const existing = avatarAccessRequests.get(cacheKey);
  if (existing && existing.expiresAt > now) {
    return existing.promise;
  }

  const promise = callBackend<AvatarAccess>('getAvatarAccess', { userId })
    .catch(error => {
      avatarAccessRequests.delete(cacheKey);
      throw error;
    });
  avatarAccessRequests.set(cacheKey, {
    expiresAt: now + AVATAR_ACCESS_CACHE_MS,
    promise,
  });
  return promise;
};
