import { randomBytes } from 'crypto';
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const bucket = admin.storage().bucket();
const region = 'us-central1';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SIGNED_URL_TTL_MS = 30 * 60 * 1000;
const FREE_VIEWS_PER_MONTH = 1;
const MAX_THUMBNAIL_BYTES = 1024 * 1024;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_GROUP_MEMBERS_HARD_LIMIT = 200;
const enableAppCheckVerification = process.env.ENABLE_APP_CHECK_BACKEND === 'true';

type PlanType = 'free' | 'plus' | 'pro' | 'pro_max';
type MediaType = 'image' | 'video';

const PLAN_LIMITS: Record<PlanType, {
  maxCapsules: number;
  maxMediaPerCapsule: number;
  maxPhotosPerCapsule: number;
  maxVideosPerCapsule: number;
  allowVideo: boolean;
  maxCapsuleSizeMb: number;
  maxAccountStorageMb: number;
  maxMessageLength: number;
  maxGroupMembers: number;
}> = {
  free: {
    maxCapsules: 3,
    maxMediaPerCapsule: 5,
    maxPhotosPerCapsule: 5,
    maxVideosPerCapsule: 0,
    allowVideo: false,
    maxCapsuleSizeMb: 50,
    maxAccountStorageMb: 50,
    maxMessageLength: 500,
    maxGroupMembers: 0,
  },
  plus: {
    maxCapsules: Number.MAX_SAFE_INTEGER,
    maxMediaPerCapsule: 13,
    maxPhotosPerCapsule: 10,
    maxVideosPerCapsule: 3,
    allowVideo: true,
    maxCapsuleSizeMb: 50,
    maxAccountStorageMb: 1536,
    maxMessageLength: 1500,
    maxGroupMembers: 0,
  },
  pro: {
    maxCapsules: Number.MAX_SAFE_INTEGER,
    maxMediaPerCapsule: 25,
    maxPhotosPerCapsule: 20,
    maxVideosPerCapsule: 5,
    allowVideo: true,
    maxCapsuleSizeMb: 500,
    maxAccountStorageMb: 5120,
    maxMessageLength: 3000,
    maxGroupMembers: 5,
  },
  pro_max: {
    maxCapsules: Number.MAX_SAFE_INTEGER,
    maxMediaPerCapsule: 40,
    maxPhotosPerCapsule: 30,
    maxVideosPerCapsule: 10,
    allowVideo: true,
    maxCapsuleSizeMb: 1024,
    maxAccountStorageMb: 20480,
    maxMessageLength: 10000,
    maxGroupMembers: Number.MAX_SAFE_INTEGER,
  },
};

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type AuthContext = {
  uid: string;
  email: string;
  authTime: number;
};

type UploadFile = {
  mediaPath: string;
  thumbnailPath: string;
  mediaType: MediaType;
  maxBytes: number;
};

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();
const toMb = (bytes: number) => Number((bytes / (1024 * 1024)).toFixed(2));
const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const isCurrentMonth = (value: unknown) => {
  const date = new Date(String(value || ''));
  const now = new Date();
  return Number.isFinite(date.getTime()) &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth();
};
const randomToken = () => randomBytes(24).toString('hex');
const isPaidPlan = (value: unknown): value is Exclude<PlanType, 'free'> =>
  value === 'plus' || value === 'pro' || value === 'pro_max';
const safePlan = (value: unknown): PlanType =>
  value === 'plus' || value === 'pro' || value === 'pro_max' ? value : 'free';
const PLAN_PRIORITY: Record<PlanType, number> = {
  free: 0,
  plus: 1,
  pro: 2,
  pro_max: 3,
};
const SUBSCRIPTION_PRODUCT_IDS: Record<Exclude<PlanType, 'free'>, string> = {
  plus: 'timeseal_plus_monthly',
  pro: 'timeseal_pro_monthly',
  pro_max: 'timeseal_promax_monthly',
};

const getAuthContext = async (authorization?: string): Promise<AuthContext> => {
  const match = authorization?.match(/^Bearer (.+)$/);
  if (!match?.[1]) {
    throw new ApiError(401, 'Bạn cần đăng nhập để tiếp tục.');
  }

  const decoded = await admin.auth().verifyIdToken(match[1]);
  return {
    uid: decoded.uid,
    email: normalizeEmail(decoded.email),
    authTime: Number(decoded.auth_time || 0),
  };
};

const verifyAppCheck = async (headerValue: string | string[] | undefined) => {
  const token = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!token) {
    if (!enableAppCheckVerification) {
      return;
    }
    throw new ApiError(401, 'Thiết bị chưa vượt qua kiểm tra bảo mật ứng dụng.');
  }
  try {
    await admin.appCheck().verifyToken(token);
  } catch {
    if (!enableAppCheckVerification) {
      return;
    }
    throw new ApiError(401, 'Thiết bị chưa vượt qua kiểm tra bảo mật ứng dụng.');
  }
};

const authenticatedEndpoint = (
  handler: (authContext: AuthContext, body: any) => Promise<any>,
) => handler;

const getStaticStorageMb = async (userId: string) => {
  const snapshot = await db.collection('user_storage_items').where('userId', '==', userId).get();
  return Number(snapshot.docs
    .reduce((sum, doc) => sum + Number(doc.data().sizeMb || 0), 0)
    .toFixed(2));
};

const commitBatchOperations = async (
  operations: Array<(batch: FirebaseFirestore.WriteBatch) => void>,
) => {
  for (let index = 0; index < operations.length; index += 400) {
    const batch = db.batch();
    operations.slice(index, index + 400).forEach(operation => operation(batch));
    await batch.commit();
  }
};

const getRegisteredUserIdByEmail = async (email: string) => {
  if (!email) {
    return '';
  }
  const user = await admin.auth().getUserByEmail(email).catch(() => null);
  return user?.uid || '';
};

const createSharedCapsuleNotification = (
  userId: string,
  capsuleId: string,
  capsuleTitle: string,
) => ({
  userId,
  capsuleId,
  type: 'invited',
  title: 'Bạn được chia sẻ một hộp ký ức',
  body: `"${capsuleTitle || 'Hộp ký ức'}" đã được thêm vào danh sách của bạn.`,
  isRead: false,
  createdAtISO: new Date().toISOString(),
});

const sendSharedCapsulePush = async (
  userId: string,
  capsuleId: string,
  capsuleTitle: string,
) => {
  const userSnap = await db.collection('users').doc(userId).get().catch(() => null);
  const fcmToken = String(userSnap?.data()?.fcmToken || '');
  if (!fcmToken) {
    return;
  }
  await admin.messaging().send({
    token: fcmToken,
    notification: {
      title: 'Bạn được chia sẻ một hộp ký ức',
      body: `"${capsuleTitle || 'Hộp ký ức'}" đã được thêm vào danh sách của bạn.`,
    },
    data: {
      capsuleId,
      userId,
      screen: 'CapsuleLocked',
      type: 'invited',
    },
  }).catch(() => {});
};

const getServerPlan = async (userData: FirebaseFirestore.DocumentData): Promise<PlanType> => {
  const emailKey = normalizeEmail(userData.email).replace(/[^a-z0-9_-]/g, '_');
  if (emailKey) {
    const override = (await admin.database()
      .ref(`/adminPlanOverrides/byEmail/${emailKey}`)
      .get()
      .catch(() => null))?.val();
    if (override?.enabled && isPaidPlan(override.plan)) {
      return override.plan;
    }
  }
  return safePlan(userData.plan);
};

const requireCapsuleMember = (
  capsule: FirebaseFirestore.DocumentData,
  userId: string,
) => {
  const members = Array.isArray(capsule.members) ? capsule.members.map(String) : [];
  if (String(capsule.ownerId || '') !== userId && !members.includes(userId)) {
    throw new ApiError(403, 'Bạn không có quyền truy cập hộp ký ức này.');
  }
};

const pathFromDownloadUrl = (value: unknown): string | null => {
  const raw = String(value || '');
  if (!raw) {
    return null;
  }
  if (raw.startsWith('gs://')) {
    const slashIndex = raw.indexOf('/', 5);
    return slashIndex >= 0 ? raw.slice(slashIndex + 1) : null;
  }
  if (!raw.startsWith('http')) {
    return raw;
  }
  const match = raw.match(/\/o\/([^?]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

const revokeFirebaseDownloadToken = async (storagePath: string) => {
  await bucket.file(storagePath).setMetadata({
    metadata: {
      firebaseStorageDownloadTokens: '',
    },
  }).catch(() => {});
};

const createFirebaseDownloadUrl = (storagePath: string, token: string) => {
  const encodedPath = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
};

const getCapsuleMediaPaths = async (
  capsuleRef: FirebaseFirestore.DocumentReference,
  capsule: FirebaseFirestore.DocumentData,
) => {
  const currentPaths = Array.isArray(capsule.mediaPaths)
    ? capsule.mediaPaths.map(String).filter(Boolean)
    : [];
  if (currentPaths.length) {
    return currentPaths;
  }

  const legacyPaths = (Array.isArray(capsule.mediaUrls) ? capsule.mediaUrls : [])
    .map(pathFromDownloadUrl)
    .filter((value): value is string => Boolean(value));
  if (!legacyPaths.length) {
    return [];
  }

  await capsuleRef.set({
    mediaPaths: legacyPaths,
  }, { merge: true });
  return legacyPaths;
};

const getCapsuleThumbnailPaths = async (
  capsuleRef: FirebaseFirestore.DocumentReference,
  capsule: FirebaseFirestore.DocumentData,
) => {
  const originalMediaPaths = new Set([
    ...(Array.isArray(capsule.mediaPaths) ? capsule.mediaPaths : []),
    ...(Array.isArray(capsule.mediaUrls) ? capsule.mediaUrls : []).map(pathFromDownloadUrl),
  ].filter(Boolean).map(String));
  const excludeOriginalMedia = (paths: string[]) =>
    paths.map(path => path && !originalMediaPaths.has(path) ? path : '');
  const currentPaths = Array.isArray(capsule.thumbnailPaths)
    ? capsule.thumbnailPaths.map(String)
    : [];
  if (currentPaths.length) {
    const safeCurrentPaths = excludeOriginalMedia(currentPaths);
    const unsafeCurrentPaths = currentPaths.filter((path, index) => path && !safeCurrentPaths[index]);
    if (unsafeCurrentPaths.length) {
      await capsuleRef.set({ thumbnailPaths: safeCurrentPaths }, { merge: true });
    }
    return safeCurrentPaths;
  }

  const rawLegacyPaths = (Array.isArray(capsule.thumbnailUrls) ? capsule.thumbnailUrls : [])
    .map(pathFromDownloadUrl)
    .map(value => value || '');
  if (!rawLegacyPaths.some(Boolean)) {
    return [];
  }

  const safeLegacyPaths = excludeOriginalMedia(rawLegacyPaths);
  await capsuleRef.set({
    thumbnailPaths: safeLegacyPaths,
  }, { merge: true });
  return safeLegacyPaths;
};

const signStoragePaths = async (storagePaths: string[], ttlMs = SIGNED_URL_TTL_MS) =>
  Promise.all(storagePaths.map(async storagePath => {
    if (!storagePath) {
      return '';
    }
    const token = randomToken();
    const success = await bucket.file(storagePath).setMetadata({
      metadata: {
        firebaseStorageDownloadTokens: token,
        tokenIssuedAtISO: new Date().toISOString(),
        tokenTtlMs: String(ttlMs),
      },
    }).then(() => true).catch(() => false);
    return success ? createFirebaseDownloadUrl(storagePath, token) : '';
  }));

const deleteCapsuleFiles = async (ownerId: string, capsuleId: string) => {
  await bucket.deleteFiles({ prefix: `capsules/${ownerId}/${capsuleId}/` }).catch(() => {});
};

const getStorageItemsForCapsule = async (capsuleId: string) =>
  db.collection('user_storage_items').where('capsuleId', '==', capsuleId).get();

const getAvatarSource = async (
  userId: string,
  userRef: FirebaseFirestore.DocumentReference,
  userData: FirebaseFirestore.DocumentData,
) => {
  const existingPath = String(userData.avatarPath || '');
  const legacyUrl = String(userData.avatarUrl || '');
  const legacyPath = pathFromDownloadUrl(legacyUrl);
  const avatarPath = existingPath ||
    (legacyPath?.startsWith(`avatars/${userId}/`) ? legacyPath : '');
  if (!avatarPath) {
    return {
      avatarPath: '',
      avatarVersion: String(userData.avatarVersion || legacyUrl),
      externalUrl: legacyUrl,
      sizeMb: 0,
    };
  }

  const avatarFile = bucket.file(avatarPath);
  const [exists] = await avatarFile.exists();
  if (!exists) {
    return {
      avatarPath: '',
      avatarVersion: '',
      externalUrl: '',
      sizeMb: 0,
    };
  }

  const [metadata] = await avatarFile.getMetadata();
  const sizeMb = toMb(Number(metadata.size || 0));
  const avatarVersion = String(userData.avatarVersion || randomToken());
  if (!existingPath || !userData.avatarVersion || legacyUrl) {
    const storageItemRef = db.collection('user_storage_items').doc(`avatar_${userId}`);
    await db.runTransaction(async transaction => {
      const [latestUserSnap, storageItemSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(storageItemRef),
      ]);
      const latestUser = latestUserSnap.data() || {};
      if (legacyUrl && latestUser.avatarUrl !== legacyUrl) {
        return;
      }
      const previousAvatarMb = Number(storageItemSnap.data()?.sizeMb || 0);
      transaction.set(userRef, {
        avatarPath,
        avatarVersion,
        staticStorageMb: Number(
          (Math.max(0, Number(latestUser.staticStorageMb || 0) - previousAvatarMb) + sizeMb)
            .toFixed(2),
        ),
      }, { merge: true });
      transaction.set(storageItemRef, {
        userId,
        type: 'avatar',
        storagePath: avatarPath,
        sizeMb,
        createdAtISO: new Date().toISOString(),
      });
    });
  }

  return {
    avatarPath,
    avatarVersion,
    externalUrl: '',
    sizeMb,
  };
};

const abandonAvatarDraftForUser = async (userId: string, expectedStoragePath?: string) => {
  const draftRef = db.collection('avatar_uploads').doc(userId);
  const userRef = db.collection('users').doc(userId);
  const draftSnap = await draftRef.get();
  const draft = draftSnap.data();
  if (!draft) {
    return false;
  }

  const deleted = await db.runTransaction(async transaction => {
    const latestDraftSnap = await transaction.get(draftRef);
    const latestDraft = latestDraftSnap.data();
    if (!latestDraft ||
      latestDraft.status !== 'draft' ||
      (expectedStoragePath && latestDraft.storagePath !== expectedStoragePath)) {
      return false;
    }
    const userSnap = await transaction.get(userRef);
    const userData = userSnap.data() || {};
    transaction.set(userRef, {
      reservedStorageMb: Math.max(
        0,
        Number(userData.reservedStorageMb || 0) - Number(latestDraft.reservationMb || 0),
      ),
    }, { merge: true });
    transaction.delete(draftRef);
    return true;
  });

  if (deleted && draft.storagePath) {
    await bucket.file(String(draft.storagePath)).delete().catch(() => {});
  }
  return deleted;
};

const resolveInvite = async (inviteCode: string, authContext: AuthContext) => {
  const inviteRef = db.collection('invites').doc(inviteCode);
  const inviteSnap = await inviteRef.get();
  if (inviteSnap.exists) {
    const invite = inviteSnap.data() || {};
    const invitedEmail = normalizeEmail(invite.invitedEmail);
    if (invite.status !== 'pending' ||
      new Date(String(invite.expiresAtISO || '')).getTime() < Date.now() ||
      (invitedEmail && invitedEmail !== authContext.email)) {
      throw new ApiError(403, 'Lời mời không hợp lệ hoặc đã hết hạn.');
    }
    return {
      capsuleId: String(invite.capsuleId || ''),
      inviteRef,
    };
  }

  const shareSnapshot = await db.collection('capsules')
    .where('shareToken', '==', inviteCode)
    .limit(1)
    .get();
  const capsuleDoc = shareSnapshot.docs[0];
  if (!capsuleDoc) {
    throw new ApiError(404, 'Không tìm thấy lời mời.');
  }
  return {
    capsuleId: capsuleDoc.id,
    inviteRef: null,
  };
};

export const createCapsuleDraft = authenticatedEndpoint(async (authContext, body) => {
  const title = String(body.title || '').trim();
  const message = String(body.message || '');
  const openDateISO = String(body.openDateISO || '');
  const theme = String(body.theme || 'default');
  const memberEmails = Array.isArray(body.memberEmails)
    ? Array.from(new Set(body.memberEmails.map(normalizeEmail).filter(Boolean)))
    : [];
  const inputFiles = Array.isArray(body.files) ? body.files : [];

  if (!title || title.length > 200 || !Number.isFinite(new Date(openDateISO).getTime())) {
    throw new ApiError(400, 'Thông tin hộp ký ức chưa hợp lệ.');
  }

  const userRef = db.collection('users').doc(authContext.uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};
  const plan = await getServerPlan(userData);
  const limits = PLAN_LIMITS[plan];
  const mediaTypes = inputFiles.map((file: any) => String((file as Record<string, unknown>).mediaType || '') as MediaType);
  if (mediaTypes.some((type: string) => type !== 'image' && type !== 'video')) {
    throw new ApiError(400, 'Invalid upload media type.');
  }
  const fileSizes = inputFiles.map((file: any) => Math.max(0, Number((file as Record<string, unknown>).sizeBytes || 0)));
  if (fileSizes.some((size: number) => !Number.isFinite(size) || size <= 0)) {
    throw new ApiError(400, 'Dung lượng tệp tải lên chưa hợp lệ.');
  }
  const photos = mediaTypes.filter((type: string) => type === 'image').length;
  const videos = mediaTypes.filter((type: string) => type === 'video').length;
  const requestedBytes = fileSizes.reduce((sum: number, size: number) => sum + size, 0);
  const requestedMb = toMb(requestedBytes);
  const storageReservationMb = toMb(requestedBytes + inputFiles.length * MAX_THUMBNAIL_BYTES);

  if (message.length > limits.maxMessageLength ||
    inputFiles.length > limits.maxMediaPerCapsule ||
    photos > limits.maxPhotosPerCapsule ||
    videos > limits.maxVideosPerCapsule ||
    (!limits.allowVideo && videos > 0) ||
    memberEmails.length > Math.min(limits.maxGroupMembers, MAX_GROUP_MEMBERS_HARD_LIMIT) ||
    requestedMb > limits.maxCapsuleSizeMb) {
    throw new ApiError(403, 'Hộp ký ức vượt giới hạn của gói hiện tại.');
  }

  const staticStorageMb = await getStaticStorageMb(authContext.uid);
  const capsuleCountSnapshot = await db.collection('capsules')
    .where('ownerId', '==', authContext.uid)
    .get();
  const capsuleRef = db.collection('capsules').doc();
  const shareToken = randomToken();
  const uploadSlots: UploadFile[] = inputFiles.map((file: any, index: number) => {
    const mediaType = mediaTypes[index] === 'video' ? 'video' : 'image';
    const extension = mediaType === 'video' ? 'mp4' : 'jpg';
    return {
      mediaType,
      maxBytes: Math.max(1, Math.floor(fileSizes[index] * 1.25) + 500 * 1024),
      mediaPath: `capsules/${authContext.uid}/${capsuleRef.id}/media_${index}.${extension}`,
      thumbnailPath: `capsules/${authContext.uid}/${capsuleRef.id}/thumb_${index}.jpg`,
    };
  });
  const expectedUploads = uploadSlots.reduce<Record<string, number>>((result: Record<string, number>, slot: UploadFile) => {
    result[slot.mediaPath.split('/').pop()!] = slot.maxBytes;
    result[slot.thumbnailPath.split('/').pop()!] = MAX_THUMBNAIL_BYTES;
    return result;
  }, {});
  const now = new Date().toISOString();

  await db.runTransaction(async transaction => {
    const latestUserSnap = await transaction.get(userRef);
    const latestUserData = latestUserSnap.data() || {};
    const reservedStorageMb = Number(latestUserData.reservedStorageMb || 0);
    const authoritativeStaticStorageMb = Math.max(
      staticStorageMb,
      Number(latestUserData.staticStorageMb || 0),
    );
    const capsuleCount = Number(latestUserData.capsuleCount ?? capsuleCountSnapshot.size);
    if (capsuleCount >= limits.maxCapsules ||
      authoritativeStaticStorageMb + reservedStorageMb + storageReservationMb > limits.maxAccountStorageMb) {
      throw new ApiError(403, 'Tài khoản đã đạt giới hạn lưu trữ của gói hiện tại.');
    }

    transaction.set(userRef, {
      reservedStorageMb: Number((reservedStorageMb + storageReservationMb).toFixed(2)),
      capsuleCount: capsuleCount + 1,
    }, { merge: true });
    transaction.set(capsuleRef, {
      ownerId: authContext.uid,
      title,
      message,
      openDateISO,
      createdAtISO: now,
      theme,
      status: 'draft',
      type: memberEmails.length ? 'group' : 'personal',
      members: [],
      memberEmails,
      shareToken,
      mediaCount: uploadSlots.length,
      mediaTypes,
      uploadFiles: uploadSlots,
      expectedUploads,
      reservationMb: storageReservationMb,
    });
  });

  return {
    capsuleId: capsuleRef.id,
    uploadSlots: uploadSlots.map(slot => ({
      mediaPath: slot.mediaPath,
      thumbnailPath: slot.thumbnailPath,
    })),
  };
});

export const abandonCapsuleDraft = authenticatedEndpoint(async (authContext, body) => {
  const capsuleId = String(body.capsuleId || '');
  const capsuleRef = db.collection('capsules').doc(capsuleId);
  const capsuleSnap = await capsuleRef.get();
  const capsule = capsuleSnap.data();
  if (!capsule || capsule.ownerId !== authContext.uid || capsule.status !== 'draft') {
    throw new ApiError(404, 'Không tìm thấy bản tải lên tạm.');
  }

  const userRef = db.collection('users').doc(authContext.uid);
  const deleted = await db.runTransaction(async transaction => {
    const latestCapsule = await transaction.get(capsuleRef);
    const latestCapsuleData = latestCapsule.data();
    if (!latestCapsuleData ||
      latestCapsuleData.ownerId !== authContext.uid ||
      latestCapsuleData.status !== 'draft') {
      return false;
    }
    const latestUser = await transaction.get(userRef);
    const userData = latestUser.data() || {};
    transaction.set(userRef, {
      reservedStorageMb: Math.max(0, Number(userData.reservedStorageMb || 0) - Number(latestCapsuleData.reservationMb || 0)),
      capsuleCount: Math.max(0, Number(userData.capsuleCount || 1) - 1),
    }, { merge: true });
    transaction.delete(capsuleRef);
    return true;
  });
  if (deleted) {
    await deleteCapsuleFiles(authContext.uid, capsuleId);
  }
  return { capsuleId };
});

export const finalizeCapsuleUpload = authenticatedEndpoint(async (authContext, body) => {
  const capsuleId = String(body.capsuleId || '');
  const capsuleRef = db.collection('capsules').doc(capsuleId);
  const capsuleSnap = await capsuleRef.get();
  const capsule = capsuleSnap.data();
  if (!capsule || capsule.ownerId !== authContext.uid || capsule.status !== 'draft') {
    throw new ApiError(404, 'Không tìm thấy bản tải lên tạm.');
  }

  const uploadFiles = (Array.isArray(capsule.uploadFiles) ? capsule.uploadFiles : []) as UploadFile[];
  const metadata = await Promise.all(uploadFiles.map(async slot => {
    const file = bucket.file(slot.mediaPath);
    const [exists] = await file.exists();
    if (!exists) {
      throw new ApiError(400, 'Một tệp tải lên chưa hoàn tất.');
    }
    const [fileMetadata] = await file.getMetadata();
    return {
      ...slot,
      actualBytes: Number(fileMetadata.size || 0),
    };
  }));
  const totalActualMb = toMb(metadata.reduce((sum, file) => sum + file.actualBytes, 0));
  if (totalActualMb > Number(capsule.reservationMb || 0) + 0.01) {
    throw new ApiError(403, 'Dung lượng tải lên thực tế vượt quá dung lượng đã đăng ký.');
  }

  const thumbnailPaths: string[] = [];
  const thumbnailBytes: number[] = [];
  for (const slot of uploadFiles) {
    const thumbnailFile = bucket.file(slot.thumbnailPath);
    const [exists] = await thumbnailFile.exists();
    if (exists) {
      const [thumbnailMetadata] = await thumbnailFile.getMetadata();
      thumbnailPaths.push(slot.thumbnailPath);
      thumbnailBytes.push(Number(thumbnailMetadata.size || 0));
    } else {
      thumbnailPaths.push('');
      thumbnailBytes.push(0);
    }
  }
  const storedActualMb = toMb(
    metadata.reduce((sum, file) => sum + file.actualBytes, 0) +
    thumbnailBytes.reduce((sum, bytes) => sum + bytes, 0),
  );
  if (storedActualMb > Number(capsule.reservationMb || 0) + 0.01) {
    throw new ApiError(403, 'Dung lượng lưu trữ thực tế vượt quá dung lượng đã đăng ký.');
  }

  const userRef = db.collection('users').doc(authContext.uid);
  const existingStaticStorageMb = await getStaticStorageMb(authContext.uid);
  const status = new Date(String(capsule.openDateISO || '')).getTime() <= Date.now()
    ? 'unlocked'
    : 'locked';
  await db.runTransaction(async transaction => {
    const latestCapsule = await transaction.get(capsuleRef);
    if (latestCapsule.data()?.status !== 'draft') {
      throw new ApiError(409, 'Bản tải lên đã được hoàn tất.');
    }
    const latestUser = await transaction.get(userRef);
    const userData = latestUser.data() || {};
    const reservedStorageMb = Number(userData.reservedStorageMb || 0);
    const staticStorageMb = Math.max(
      existingStaticStorageMb,
      Number(userData.staticStorageMb || 0),
    );

    transaction.set(userRef, {
      reservedStorageMb: Math.max(0, Number((reservedStorageMb - Number(capsule.reservationMb || 0)).toFixed(2))),
      staticStorageMb: Number((staticStorageMb + storedActualMb).toFixed(2)),
    }, { merge: true });
    transaction.set(capsuleRef, {
      status,
      mediaPaths: metadata.map(file => file.mediaPath),
      thumbnailPaths,
      totalSizeMb: totalActualMb,
      storageSizeMb: storedActualMb,
      expectedUploads: admin.firestore.FieldValue.delete(),
      uploadFiles: admin.firestore.FieldValue.delete(),
      reservationMb: admin.firestore.FieldValue.delete(),
    }, { merge: true });

    metadata.forEach((file, index) => {
      transaction.set(db.collection('user_storage_items').doc(`${capsuleId}_${index}`), {
        userId: authContext.uid,
        capsuleId,
        storagePath: file.mediaPath,
        sizeMb: toMb(file.actualBytes + thumbnailBytes[index]),
        createdAtISO: new Date().toISOString(),
      });
    });
  });

  if (Array.isArray(capsule.memberEmails) && capsule.memberEmails.length) {
    const memberEmails = Array.from(new Set(
      capsule.memberEmails.map(normalizeEmail).filter(Boolean),
    ));
    const registeredMembers = await Promise.all(memberEmails.map(async email => ({
      email,
      userId: await getRegisteredUserIdByEmail(email),
    })));
    const memberIds = Array.from(new Set(
      registeredMembers
        .map(member => member.userId)
        .filter(userId => userId && userId !== authContext.uid),
    ));
    const batch = db.batch();
    if (memberIds.length) {
      batch.set(capsuleRef, {
        members: admin.firestore.FieldValue.arrayUnion(...memberIds),
      }, { merge: true });
    }
    registeredMembers.filter(member => !member.userId).forEach(({ email }) => {
      const inviteRef = db.collection('invites').doc();
      batch.set(inviteRef, {
        capsuleId,
        invitedBy: authContext.uid,
        invitedEmail: email,
        token: inviteRef.id,
        status: 'pending',
        createdAtISO: new Date().toISOString(),
        expiresAtISO: new Date(Date.now() + 7 * ONE_DAY_MS).toISOString(),
      });
    });
    memberIds.forEach(userId => {
      batch.set(
        db.collection('notifications').doc(`${capsuleId}_${userId}_shared`),
        createSharedCapsuleNotification(userId, capsuleId, String(capsule.title || '')),
        { merge: true },
      );
    });
    await batch.commit();
    await Promise.all(
      memberIds.map(userId => sendSharedCapsulePush(userId, capsuleId, String(capsule.title || ''))),
    );
  }

  return { capsuleId };
});

export const syncDirectCapsuleMembers = authenticatedEndpoint(async (authContext, body) => {
  const capsuleId = String(body.capsuleId || '');
  const capsuleRef = db.collection('capsules').doc(capsuleId);
  const capsuleSnap = await capsuleRef.get();
  const capsule = capsuleSnap.data();
  if (!capsule || capsule.ownerId !== authContext.uid || capsule.status === 'draft') {
    throw new ApiError(404, 'Không tìm thấy hộp ký ức.');
  }

  const memberEmails = Array.from(new Set(
    (Array.isArray(capsule.memberEmails) ? capsule.memberEmails : [])
      .map(normalizeEmail)
      .filter(Boolean),
  ));
  const memberIds = Array.from(new Set(
    (await Promise.all(memberEmails.map(getRegisteredUserIdByEmail)))
      .filter(userId => userId && userId !== authContext.uid),
  ));
  if (!memberIds.length) {
    return { capsuleId };
  }

  const batch = db.batch();
  batch.set(capsuleRef, {
    members: admin.firestore.FieldValue.arrayUnion(...memberIds),
  }, { merge: true });
  memberIds.forEach(userId => {
    batch.set(
      db.collection('notifications').doc(`${capsuleId}_${userId}_shared`),
      createSharedCapsuleNotification(userId, capsuleId, String(capsule.title || '')),
      { merge: true },
    );
  });
  await batch.commit();
  await Promise.all(
    memberIds.map(userId => sendSharedCapsulePush(userId, capsuleId, String(capsule.title || ''))),
  );
  return { capsuleId };
});

export const createAvatarDraft = authenticatedEndpoint(async (authContext) => {
  const userRef = db.collection('users').doc(authContext.uid);
  const draftRef = db.collection('avatar_uploads').doc(authContext.uid);
  const storageItemRef = db.collection('user_storage_items').doc(`avatar_${authContext.uid}`);
  const [userSnap, staticStorageMb] = await Promise.all([
    userRef.get(),
    getStaticStorageMb(authContext.uid),
  ]);
  const userData = userSnap.data() || {};
  const limits = PLAN_LIMITS[await getServerPlan(userData)];
  const fileName = `profile_${randomToken()}.jpg`;
  const storagePath = `avatars/${authContext.uid}/${fileName}`;
  let previousDraftPath = '';

  await db.runTransaction(async transaction => {
    const [latestUserSnap, latestDraftSnap, storageItemSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(draftRef),
      transaction.get(storageItemRef),
    ]);
    const latestUserData = latestUserSnap.data() || {};
    const latestDraft = latestDraftSnap.data() || {};
    previousDraftPath = String(latestDraft.storagePath || '');
    const previousAvatarMb = Number(storageItemSnap.data()?.sizeMb || 0);
    const previousDraftReservationMb = Number(latestDraft.reservationMb || 0);
    const reservedStorageMb = Math.max(
      0,
      Number(latestUserData.reservedStorageMb || 0) - previousDraftReservationMb,
    );
    const authoritativeStaticStorageMb = Math.max(
      staticStorageMb,
      Number(latestUserData.staticStorageMb || 0),
    );
    const availableAvatarMb = Math.max(
      0,
      limits.maxAccountStorageMb - authoritativeStaticStorageMb - reservedStorageMb + previousAvatarMb,
    );
    const maxBytes = Math.min(MAX_AVATAR_BYTES, Math.floor(availableAvatarMb * 1024 * 1024));
    if (maxBytes <= 0) {
      throw new ApiError(403, 'Tài khoản đã đạt giới hạn lưu trữ của gói hiện tại.');
    }
    const reservationMb = Math.max(0, toMb(maxBytes) - previousAvatarMb);
    transaction.set(userRef, {
      reservedStorageMb: Number((reservedStorageMb + reservationMb).toFixed(2)),
    }, { merge: true });
    transaction.set(draftRef, {
      ownerId: authContext.uid,
      status: 'draft',
      fileName,
      storagePath,
      maxBytes,
      reservationMb,
      createdAtISO: new Date().toISOString(),
    });
  });

  if (previousDraftPath && previousDraftPath !== storagePath) {
    await bucket.file(previousDraftPath).delete().catch(() => {});
  }
  return { storagePath };
});

export const abandonAvatarDraft = authenticatedEndpoint(async (authContext) => {
  await abandonAvatarDraftForUser(authContext.uid);
  return { ok: true };
});

export const finalizeAvatarUpload = authenticatedEndpoint(async (authContext) => {
  const userRef = db.collection('users').doc(authContext.uid);
  const draftRef = db.collection('avatar_uploads').doc(authContext.uid);
  const storageItemRef = db.collection('user_storage_items').doc(`avatar_${authContext.uid}`);
  const [draftSnap, staticStorageMb] = await Promise.all([
    draftRef.get(),
    getStaticStorageMb(authContext.uid),
  ]);
  const draft = draftSnap.data();
  if (!draft || draft.ownerId !== authContext.uid || draft.status !== 'draft') {
    throw new ApiError(404, 'Không tìm thấy ảnh đại diện đang tải lên.');
  }

  const avatarPath = String(draft.storagePath || '');
  const avatarFile = bucket.file(avatarPath);
  const [exists] = await avatarFile.exists();
  if (!exists) {
    throw new ApiError(400, 'Ảnh đại diện chưa tải lên hoàn tất.');
  }
  const [metadata] = await avatarFile.getMetadata();
  const actualBytes = Number(metadata.size || 0);
  if (!actualBytes || actualBytes > Number(draft.maxBytes || 0)) {
    throw new ApiError(403, 'Dung lượng ảnh đại diện vượt giới hạn còn lại của tài khoản.');
  }

  const userSnap = await userRef.get();
  const limits = PLAN_LIMITS[await getServerPlan(userSnap.data() || {})];
  const avatarVersion = randomToken();
  let previousAvatarPath = '';
  await db.runTransaction(async transaction => {
    const [latestDraftSnap, latestUserSnap, storageItemSnap] = await Promise.all([
      transaction.get(draftRef),
      transaction.get(userRef),
      transaction.get(storageItemRef),
    ]);
    const latestDraft = latestDraftSnap.data();
    if (!latestDraft || latestDraft.storagePath !== avatarPath || latestDraft.status !== 'draft') {
      throw new ApiError(409, 'Ảnh đại diện đã được xử lý.');
    }
    const latestUserData = latestUserSnap.data() || {};
    const previousAvatarMb = Number(storageItemSnap.data()?.sizeMb || 0);
    previousAvatarPath = String(storageItemSnap.data()?.storagePath || '');
    const actualMb = toMb(actualBytes);
    const authoritativeStaticStorageMb = Math.max(
      staticStorageMb,
      Number(latestUserData.staticStorageMb || 0),
    );
    const nextStaticStorageMb = Number(
      (authoritativeStaticStorageMb - previousAvatarMb + actualMb).toFixed(2),
    );
    if (nextStaticStorageMb > limits.maxAccountStorageMb) {
      throw new ApiError(403, 'Tài khoản đã đạt giới hạn lưu trữ của gói hiện tại.');
    }
    transaction.set(userRef, {
      avatarPath,
      avatarVersion,
      avatarUrl: admin.firestore.FieldValue.delete(),
      staticStorageMb: nextStaticStorageMb,
      reservedStorageMb: Math.max(
        0,
        Number(latestUserData.reservedStorageMb || 0) - Number(latestDraft.reservationMb || 0),
      ),
    }, { merge: true });
    transaction.set(storageItemRef, {
      userId: authContext.uid,
      type: 'avatar',
      storagePath: avatarPath,
      sizeMb: actualMb,
      createdAtISO: new Date().toISOString(),
    });
    transaction.delete(draftRef);
  });

  await revokeFirebaseDownloadToken(avatarPath);
  if (previousAvatarPath && previousAvatarPath !== avatarPath) {
    await bucket.file(previousAvatarPath).delete().catch(() => {});
  }
  return { avatarPath, avatarVersion };
});

export const getAvatarAccess = authenticatedEndpoint(async (authContext, body) => {
  const avatarOwnerId = String(body.userId || '');
  if (!avatarOwnerId) {
    throw new ApiError(400, 'Thiếu tài khoản ảnh đại diện.');
  }
  const avatarOwnerRef = db.collection('users').doc(avatarOwnerId);
  const avatarOwnerSnap = await avatarOwnerRef.get();
  const avatarOwner = avatarOwnerSnap.data();
  if (!avatarOwner) {
    throw new ApiError(404, 'Không tìm thấy ảnh đại diện.');
  }

  const source = await getAvatarSource(avatarOwnerId, avatarOwnerRef, avatarOwner);
  if (!source.avatarPath) {
    return {
      avatarUrl: source.externalUrl,
      avatarVersion: source.avatarVersion,
    };
  }

  const requesterRef = db.collection('users').doc(authContext.uid);
  const requesterStaticStorageMb = await getStaticStorageMb(authContext.uid);
  await db.runTransaction(async transaction => {
    const requesterSnap = await transaction.get(requesterRef);
    const requester = requesterSnap.data() || {};
    const plan = await getServerPlan(requester);
    const month = currentMonthKey();
    const bandwidthUsed = requester.bandwidthUsed?.month === month
      ? Number(requester.bandwidthUsed.usedMb || 0)
      : 0;
    if (
      bandwidthUsed + source.sizeMb >
      PLAN_LIMITS[plan].maxAccountStorageMb
    ) {
      throw new ApiError(403, 'Tài khoản đã đạt giới hạn băng thông của gói hiện tại.');
    }
    transaction.set(requesterRef, {
      bandwidthUsed: {
        month,
        usedMb: Number((bandwidthUsed + source.sizeMb).toFixed(2)),
      },
    }, { merge: true });
  });

  const avatarUrl = (await signStoragePaths([source.avatarPath], 5 * 60 * 1000))[0];
  await avatarOwnerRef.set({ avatarUrl }, { merge: true });
  return {
    avatarUrl,
    avatarVersion: source.avatarVersion,
  };
});

export const getCapsuleMediaAccess = authenticatedEndpoint(async (authContext, body) => {
  const capsuleId = String(body.capsuleId || '');
  const requestFullQuality = body.requestFullQuality === true;
  const capsuleRef = db.collection('capsules').doc(capsuleId);
  const capsuleSnap = await capsuleRef.get();
  const capsule = capsuleSnap.data();
  if (!capsule || capsule.status === 'draft') {
    throw new ApiError(404, 'Không tìm thấy hộp ký ức.');
  }
  requireCapsuleMember(capsule, authContext.uid);
  if (new Date(String(capsule.openDateISO || '')).getTime() > Date.now()) {
    throw new ApiError(403, 'Hộp ký ức chưa đến ngày mở.');
  }

  const userRef = db.collection('users').doc(authContext.uid);
  const staticStorageMb = await getStaticStorageMb(authContext.uid);
  const result = await db.runTransaction(async transaction => {
    const userSnap = await transaction.get(userRef);
    const userData = userSnap.data() || {};
    const plan = await getServerPlan(userData);
    const month = currentMonthKey();
    const now = Date.now();
    const cleanViewedCapsules: Record<string, number> = {};
    const viewedCapsules = (userData.viewedCapsules || {}) as Record<string, number>;
    Object.entries(viewedCapsules).forEach(([id, timestamp]) => {
      if (now - Number(timestamp) <= ONE_DAY_MS) {
        cleanViewedCapsules[id] = Number(timestamp);
      }
    });

    const freeViewsUsed = userData.freeViewsUsed?.month === month
      ? Number(userData.freeViewsUsed.count || 0)
      : 0;
    const remainingFreeViews = Math.max(0, FREE_VIEWS_PER_MONTH - freeViewsUsed);
    if (cleanViewedCapsules[capsuleId]) {
      transaction.set(userRef, { viewedCapsules: cleanViewedCapsules }, { merge: true });
      return { accessLevel: 'full', remainingFreeViews } as const;
    }

    const bandwidthUsed = userData.bandwidthUsed?.month === month
      ? Number(userData.bandwidthUsed.usedMb || 0)
      : 0;
    const capsuleSizeMb = Number(capsule.totalSizeMb || 0);
    const isWithinQuota =
      bandwidthUsed + capsuleSizeMb <= PLAN_LIMITS[plan].maxAccountStorageMb;
    const expiredThisMonth = plan === 'free' &&
      (isPaidPlan(userData.previousPlan) || isCurrentMonth(userData.premiumUpdatedAtISO));
    const mayUseFreeView = expiredThisMonth && remainingFreeViews > 0;
    if (!isWithinQuota && (!requestFullQuality || !mayUseFreeView)) {
      return {
        accessLevel: mayUseFreeView ? 'free_view' : 'restricted',
        remainingFreeViews,
      } as const;
    }

    cleanViewedCapsules[capsuleId] = now;
    transaction.set(userRef, {
      viewedCapsules: cleanViewedCapsules,
      bandwidthUsed: {
        month,
        usedMb: Number((bandwidthUsed + capsuleSizeMb).toFixed(2)),
      },
      ...(isWithinQuota ? {} : {
        freeViewsUsed: {
          month,
          count: freeViewsUsed + 1,
        },
      }),
    }, { merge: true });
    return {
      accessLevel: 'full',
      remainingFreeViews: isWithinQuota ? remainingFreeViews : Math.max(0, remainingFreeViews - 1),
    } as const;
  });

  const thumbnailPaths = await getCapsuleThumbnailPaths(capsuleRef, capsule);
  const thumbnailUrls = await signStoragePaths(thumbnailPaths);
  await capsuleRef.set({ thumbnailUrls }, { merge: true });
  if (result.accessLevel !== 'full') {
    return {
      ...result,
      mediaUrls: [],
      thumbnailUrls,
    };
  }

  const mediaPaths = await getCapsuleMediaPaths(capsuleRef, capsule);
  const mediaUrls = await signStoragePaths(mediaPaths);
  await capsuleRef.set({ mediaUrls }, { merge: true });
  return {
    ...result,
    mediaUrls,
    thumbnailUrls,
  };
});

export const getCapsuleThumbnailUrls = authenticatedEndpoint(async (authContext, body) => {
  const capsuleId = String(body.capsuleId || '');
  const capsuleRef = db.collection('capsules').doc(capsuleId);
  const capsuleSnap = await capsuleRef.get();
  const capsule = capsuleSnap.data();
  if (!capsule || capsule.status === 'draft') {
    throw new ApiError(404, 'Không tìm thấy hộp ký ức.');
  }
  requireCapsuleMember(capsule, authContext.uid);
  const thumbnailPaths = await getCapsuleThumbnailPaths(capsuleRef, capsule);
  const thumbnailUrls = await signStoragePaths(thumbnailPaths);
  await capsuleRef.set({ thumbnailUrls }, { merge: true });
  return {
    thumbnailUrls,
  };
});

export const getInvitePreview = authenticatedEndpoint(async (authContext, body) => {
  const inviteCode = String(body.inviteCode || '').trim();
  const { capsuleId } = await resolveInvite(inviteCode, authContext);
  const capsuleSnap = await db.collection('capsules').doc(capsuleId).get();
  const capsule = capsuleSnap.data();
  if (!capsule || capsule.status === 'draft') {
    throw new ApiError(404, 'Không tìm thấy hộp ký ức.');
  }
  return {
    capsuleId,
    title: String(capsule.title || 'Hộp ký ức'),
    openDateISO: String(capsule.openDateISO || ''),
  };
});

export const getCapsuleInviteToken = authenticatedEndpoint(async (authContext, body) => {
  const capsuleId = String(body.capsuleId || '');
  const capsuleRef = db.collection('capsules').doc(capsuleId);
  const capsuleSnap = await capsuleRef.get();
  const capsule = capsuleSnap.data();
  if (!capsule || capsule.status === 'draft') {
    throw new ApiError(404, 'Không tìm thấy hộp ký ức.');
  }
  requireCapsuleMember(capsule, authContext.uid);

  let inviteCode = String(capsule.shareToken || '');
  if (!inviteCode || inviteCode === capsuleId) {
    inviteCode = randomToken();
    await capsuleRef.set({ shareToken: inviteCode }, { merge: true });
  }
  return { inviteCode };
});

export const acceptCapsuleInvite = authenticatedEndpoint(async (authContext, body) => {
  const inviteCode = String(body.inviteCode || '').trim();
  const { capsuleId, inviteRef } = await resolveInvite(inviteCode, authContext);
  const capsuleRef = db.collection('capsules').doc(capsuleId);
  let capsuleTitle = '';
  let shouldNotify = false;
  await db.runTransaction(async transaction => {
    const capsuleSnap = await transaction.get(capsuleRef);
    if (!capsuleSnap.exists || capsuleSnap.data()?.status === 'draft') {
      throw new ApiError(404, 'Không tìm thấy hộp ký ức.');
    }
    const capsule = capsuleSnap.data() || {};
    capsuleTitle = String(capsule.title || '');
    shouldNotify = String(capsule.ownerId || '') !== authContext.uid;
    transaction.set(capsuleRef, {
      members: admin.firestore.FieldValue.arrayUnion(authContext.uid),
    }, { merge: true });
    if (shouldNotify) {
      transaction.set(
        db.collection('notifications').doc(`${capsuleId}_${authContext.uid}_shared`),
        createSharedCapsuleNotification(authContext.uid, capsuleId, capsuleTitle),
        { merge: true },
      );
    }
    if (inviteRef) {
      transaction.set(inviteRef, {
        status: 'accepted',
        acceptedBy: authContext.uid,
        acceptedAtISO: new Date().toISOString(),
      }, { merge: true });
    }
  });
  if (shouldNotify) {
    await sendSharedCapsulePush(authContext.uid, capsuleId, capsuleTitle);
  }
  return { capsuleId };
});

export const markCapsuleOpened = authenticatedEndpoint(async (authContext, body) => {
  const capsuleId = String(body.capsuleId || '');
  const capsuleRef = db.collection('capsules').doc(capsuleId);
  const capsuleSnap = await capsuleRef.get();
  const capsule = capsuleSnap.data();
  if (!capsule || capsule.status === 'draft') {
    throw new ApiError(404, 'Không tìm thấy hộp ký ức.');
  }
  requireCapsuleMember(capsule, authContext.uid);
  if (new Date(String(capsule.openDateISO || '')).getTime() > Date.now()) {
    throw new ApiError(403, 'Hộp ký ức chưa đến ngày mở.');
  }
  await capsuleRef.set({ status: 'opened' }, { merge: true });
  return { capsuleId };
});

export const unlockDueCapsules = authenticatedEndpoint(async (authContext) => {
  const now = new Date().toISOString();
  const snapshot = await db.collection('capsules')
    .where('ownerId', '==', authContext.uid)
    .where('status', '==', 'locked')
    .get();
  const due = snapshot.docs.filter(doc => String(doc.data().openDateISO || '') <= now);
  if (due.length) {
    await commitBatchOperations(
      due.map(doc => batch => batch.set(doc.ref, { status: 'unlocked' }, { merge: true })),
    );
  }
  return { unlockedCount: due.length };
});

export const deleteCapsule = authenticatedEndpoint(async (authContext, body) => {
  const capsuleId = String(body.capsuleId || '');
  const capsuleRef = db.collection('capsules').doc(capsuleId);
  const capsuleSnap = await capsuleRef.get();
  const capsule = capsuleSnap.data();
  if (!capsule || capsule.ownerId !== authContext.uid) {
    throw new ApiError(404, 'Không tìm thấy hộp ký ức.');
  }

  const openedDays = (Date.now() - new Date(String(capsule.openDateISO || '')).getTime()) / ONE_DAY_MS;
  const canDelete = capsule.status === 'opened' && openedDays >= 90;
  if (!canDelete) {
    throw new ApiError(403, 'Hộp ký ức chưa đủ điều kiện để xóa.');
  }

  await deleteCapsuleFiles(authContext.uid, capsuleId);
  const storageItems = await getStorageItemsForCapsule(capsuleId);
  const invites = await db.collection('invites').where('capsuleId', '==', capsuleId).get();
  const userRef = db.collection('users').doc(authContext.uid);
  await db.runTransaction(async transaction => {
    const userSnap = await transaction.get(userRef);
    const userData = userSnap.data() || {};
    transaction.set(userRef, {
      staticStorageMb: Math.max(0, Number((Number(userData.staticStorageMb || 0) - Number(capsule.storageSizeMb || capsule.totalSizeMb || 0)).toFixed(2))),
      capsuleCount: Math.max(0, Number(userData.capsuleCount || 1) - 1),
    }, { merge: true });
    storageItems.docs.forEach(doc => transaction.delete(doc.ref));
    invites.docs.forEach(doc => transaction.delete(doc.ref));
    transaction.delete(capsuleRef);
  });
  return { capsuleId };
});

export const deleteAccountData = authenticatedEndpoint(async (authContext) => {
  if (!authContext.authTime || Date.now() / 1000 - authContext.authTime > 10 * 60) {
    throw new ApiError(401, 'Vui lòng đăng nhập lại trước khi xóa tài khoản.');
  }
  const ownedCapsules = await db.collection('capsules').where('ownerId', '==', authContext.uid).get();
  const memberCapsules = await db.collection('capsules').where('members', 'array-contains', authContext.uid).get();
  for (const doc of ownedCapsules.docs) {
    await deleteCapsuleFiles(authContext.uid, doc.id);
  }
  await bucket.deleteFiles({ prefix: `avatars/${authContext.uid}/` }).catch(() => {});

  const storageItems = await db.collection('user_storage_items').where('userId', '==', authContext.uid).get();
  const invites = await db.collection('invites').where('invitedBy', '==', authContext.uid).get();
  const operations: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
  ownedCapsules.docs.forEach(doc => operations.push(batch => batch.delete(doc.ref)));
  memberCapsules.docs.forEach(doc => operations.push(batch => batch.set(doc.ref, {
    members: admin.firestore.FieldValue.arrayRemove(authContext.uid),
  }, { merge: true })));
  storageItems.docs.forEach(doc => operations.push(batch => batch.delete(doc.ref)));
  invites.docs.forEach(doc => operations.push(batch => batch.delete(doc.ref)));
  operations.push(batch => batch.delete(db.collection('users').doc(authContext.uid)));
  await commitBatchOperations(operations);
  await admin.auth().deleteUser(authContext.uid);
  return { ok: true };
});

type VerifiedSubscriptionStatus =
  | 'active'
  | 'cancelled_renewal'
  | 'expired'
  | 'billing_issue'
  | 'unknown';

type VerifiedSubscriptionProduct = {
  productId: string;
  plan: PlanType;
  status: VerifiedSubscriptionStatus;
  expirationAtMs: number;
  latestPurchaseAtMs: number;
  willRenew: boolean;
  updatedAtMs: number;
};

const inferPlanFromProductId = (value: unknown): PlanType => {
  const productId = String(value || '').trim().toLowerCase();
  const match = (Object.entries(SUBSCRIPTION_PRODUCT_IDS) as Array<
    [Exclude<PlanType, 'free'>, string]
  >).find(([, configuredId]) =>
    productId === configuredId || productId.startsWith(`${configuredId}:`),
  );
  return match?.[0] || 'free';
};

const isRevenueCatAnonymousId = (value: string) =>
  value.startsWith('$RCAnonymousID:');

const isProductAccessActive = (
  product: VerifiedSubscriptionProduct,
  now: number,
) =>
  product.plan !== 'free' &&
  product.status !== 'expired' &&
  (!product.expirationAtMs || product.expirationAtMs > now);

const getHighestActiveProduct = (
  products: Record<string, VerifiedSubscriptionProduct>,
  now: number,
) => Object.values(products)
  .filter(product => isProductAccessActive(product, now))
  .sort((left, right) =>
    PLAN_PRIORITY[right.plan] - PLAN_PRIORITY[left.plan] ||
    right.expirationAtMs - left.expirationAtMs,
  )[0];

export const revenuecatWebhook = onRequest({
  region,
  secrets: ['REVENUECAT_WEBHOOK_SECRET'],
}, async (request, response) => {
  response.set('Cache-Control', 'no-store');
  const revenueCatWebhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET || '';
  if (!revenueCatWebhookSecret) {
    response.status(503).send('Webhook secret is not configured.');
    return;
  }
  if (request.method !== 'POST' ||
    request.headers.authorization !== `Bearer ${revenueCatWebhookSecret}`) {
    response.status(401).send('Unauthorized');
    return;
  }

  const event = request.body?.event;
  const aliases = Array.isArray(event?.aliases)
    ? event.aliases.map((value: unknown) => String(value || ''))
    : [];
  const userId = [
    String(event?.app_user_id || ''),
    ...aliases,
  ].find(value => value && !isRevenueCatAnonymousId(value)) || '';
  if (!event || !userId) {
    response.status(400).send('Bad Request');
    return;
  }

  const expirationAtMs = Number(event.expiration_at_ms || 0);
  const gracePeriodExpirationAtMs = Number(event.grace_period_expiration_at_ms || 0);
  const accessUntilMs = Math.max(expirationAtMs, gracePeriodExpirationAtMs);
  const eventAtMs = Number(event.event_timestamp_ms || Date.now());
  const eventId = String(event.id || '');
  const eventType = String(event.type || '');
  const productId = String(event.product_id || '');
  const productPlan = inferPlanFromProductId(productId);
  const eventStatus: VerifiedSubscriptionStatus =
    eventType === 'EXPIRATION'
      ? 'expired'
      : eventType === 'BILLING_ISSUE'
        ? 'billing_issue'
        : eventType === 'CANCELLATION' || eventType === 'SUBSCRIPTION_PAUSED'
          ? 'cancelled_renewal'
          : 'active';
  const userRef = db.collection('users').doc(userId);
  await db.runTransaction(async transaction => {
    const userSnap = await transaction.get(userRef);
    const userData = userSnap.data() || {};
    const lastEventAtMs = Number(userData.subscriptionMeta?.lastEventAtMs || 0);
    const lastEventId = String(userData.subscriptionMeta?.lastEventId || '');
    if (eventAtMs < lastEventAtMs || (eventId && eventId === lastEventId)) {
      return;
    }
    const products = {
      ...((userData.subscriptionMeta?.products || {}) as Record<string, VerifiedSubscriptionProduct>),
    };
    if (productId) {
      products[productId] = {
        productId,
        plan: productPlan,
        status: eventStatus,
        expirationAtMs: accessUntilMs,
        latestPurchaseAtMs: Number(event.purchased_at_ms || 0),
        willRenew: eventStatus === 'active',
        updatedAtMs: eventAtMs,
      };
    }

    const highestActiveProduct = getHighestActiveProduct(products, Date.now());
    const plan = highestActiveProduct?.plan || 'free';
    const isPremium = plan !== 'free';
    const status = highestActiveProduct?.status || 'expired';
    transaction.set(userRef, {
      isPremium,
      plan,
      previousPlan: safePlan(userData.plan),
      premiumSource: 'revenuecat',
      premiumUpdatedAtISO: new Date().toISOString(),
      subscriptionMeta: {
        lastEventId: eventId,
        lastEventAtMs: eventAtMs,
        lastEventType: String(event.type || ''),
        productId,
        status,
        expirationAtMs: highestActiveProduct?.expirationAtMs || accessUntilMs,
        latestPurchaseAtMs: highestActiveProduct?.latestPurchaseAtMs || 0,
        willRenew: highestActiveProduct?.willRenew || false,
        newProductId: String(event.new_product_id || ''),
        originalTransactionId: String(event.original_transaction_id || ''),
        isSandbox: String(event.environment || '').toUpperCase() !== 'PRODUCTION',
        products,
      },
    }, { merge: true });
  });
  response.status(200).send('OK');
});

export const revokeLegacyMediaTokens = onSchedule({
  schedule: 'every 6 hours',
  timeZone: 'Asia/Ho_Chi_Minh',
}, async () => {
  const snapshot = await db.collection('capsules').get();
  for (const doc of snapshot.docs) {
    const capsule = doc.data();
    if (!capsule.shareToken || capsule.shareToken === doc.id) {
      await doc.ref.set({ shareToken: randomToken() }, { merge: true });
    }
    if (Array.isArray(capsule.mediaUrls) && capsule.mediaUrls.length) {
      await getCapsuleMediaPaths(doc.ref, capsule);
    }
    if (Array.isArray(capsule.thumbnailUrls) && capsule.thumbnailUrls.length) {
      await getCapsuleThumbnailPaths(doc.ref, capsule);
    }
  }

  const usersSnapshot = await db.collection('users').get();
  for (const doc of usersSnapshot.docs) {
    const user = doc.data();
    const avatarPath = pathFromDownloadUrl(user.avatarUrl);
    if (!avatarPath?.startsWith(`avatars/${doc.id}/`)) {
      continue;
    }
    const avatarFile = bucket.file(avatarPath);
    const [exists] = await avatarFile.exists();
    if (!exists) {
      continue;
    }
    const [metadata] = await avatarFile.getMetadata();
    const avatarMb = toMb(Number(metadata.size || 0));
    const storageItemRef = db.collection('user_storage_items').doc(`avatar_${doc.id}`);
    await db.runTransaction(async transaction => {
      const [latestUserSnap, storageItemSnap] = await Promise.all([
        transaction.get(doc.ref),
        transaction.get(storageItemRef),
      ]);
      const latestUser = latestUserSnap.data() || {};
      if (latestUser.avatarUrl !== user.avatarUrl) {
        return;
      }
      const previousAvatarMb = Number(storageItemSnap.data()?.sizeMb || 0);
      transaction.set(doc.ref, {
        avatarPath,
        avatarVersion: randomToken(),
        avatarUrl: admin.firestore.FieldValue.delete(),
        staticStorageMb: Number(
          (Math.max(0, Number(latestUser.staticStorageMb || 0) - previousAvatarMb) + avatarMb)
            .toFixed(2),
        ),
      }, { merge: true });
      transaction.set(storageItemRef, {
        userId: doc.id,
        type: 'avatar',
        storagePath: avatarPath,
        sizeMb: avatarMb,
        createdAtISO: new Date().toISOString(),
      });
    });
    await revokeFirebaseDownloadToken(avatarPath);
  }
});

export const cleanupStaleUploadDrafts = onSchedule({
  schedule: 'every 6 hours',
  timeZone: 'Asia/Ho_Chi_Minh',
}, async () => {
  const cutoff = Date.now() - ONE_DAY_MS;
  const snapshot = await db.collection('capsules').where('status', '==', 'draft').get();
  for (const doc of snapshot.docs) {
    const capsule = doc.data();
    if (new Date(String(capsule.createdAtISO || '')).getTime() > cutoff) {
      continue;
    }
    const ownerId = String(capsule.ownerId || '');
    const userRef = db.collection('users').doc(ownerId);
    const deleted = await db.runTransaction(async transaction => {
      const latestCapsule = await transaction.get(doc.ref);
      const latestCapsuleData = latestCapsule.data();
      if (latestCapsuleData?.status !== 'draft') {
        return false;
      }
      const userSnap = await transaction.get(userRef);
      const userData = userSnap.data() || {};
      transaction.set(userRef, {
        reservedStorageMb: Math.max(0, Number(userData.reservedStorageMb || 0) - Number(latestCapsuleData.reservationMb || 0)),
        capsuleCount: Math.max(0, Number(userData.capsuleCount || 1) - 1),
      }, { merge: true });
      transaction.delete(doc.ref);
      return true;
    });
    if (deleted) {
      await deleteCapsuleFiles(ownerId, doc.id);
    }
  }
});

export const cleanupStaleAvatarDrafts = onSchedule({
  schedule: 'every 6 hours',
  timeZone: 'Asia/Ho_Chi_Minh',
}, async () => {
  const cutoff = Date.now() - ONE_DAY_MS;
  const snapshot = await db.collection('avatar_uploads').where('status', '==', 'draft').get();
  for (const doc of snapshot.docs) {
    const draft = doc.data();
    if (new Date(String(draft.createdAtISO || '')).getTime() > cutoff) {
      continue;
    }
    await abandonAvatarDraftForUser(doc.id, String(draft.storagePath || ''));
  }
});

// ---------------------------------------------------------------------------
// Unified Consolidated API Entrypoint
// ---------------------------------------------------------------------------

const handlers: Record<string, (authContext: AuthContext, body: any) => Promise<any>> = {
  createCapsuleDraft,
  abandonCapsuleDraft,
  finalizeCapsuleUpload,
  syncDirectCapsuleMembers,
  createAvatarDraft,
  abandonAvatarDraft,
  finalizeAvatarUpload,
  getAvatarAccess,
  getCapsuleMediaAccess,
  getCapsuleThumbnailUrls,
  getInvitePreview,
  getCapsuleInviteToken,
  acceptCapsuleInvite,
  markCapsuleOpened,
  unlockDueCapsules,
  deleteCapsule,
  deleteAccountData,
};

export const api = onRequest({ region, timeoutSeconds: 120 }, async (request, response) => {
  response.set('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  // Get action/endpoint name from URL path, e.g. "/createCapsuleDraft" -> "createCapsuleDraft"
  let action = request.path.replace(/^\//, '').replace(/\/$/, '');
  if (action.startsWith('api/')) {
    action = action.substring(4);
  }
  const handler = handlers[action];
  if (!handler) {
    response.status(404).json({ error: `API endpoint "${action}" not found.` });
    return;
  }

  try {
    await verifyAppCheck(request.headers['x-firebase-appcheck']);
    const authContext = await getAuthContext(request.headers.authorization);
    const result = await handler(authContext, request.body || {});
    response.status(200).json(result || {});
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError
      ? error.message
      : 'Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại.';
    console.error({
      endpoint: action,
      status,
      message,
      rawError: error instanceof Error ? error.message : String(error),
    });
    response.status(status).json({ error: message });
  }
});
