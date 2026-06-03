import { Platform } from 'react-native';
import { create } from 'zustand';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { Capsule, CapsuleTheme } from '../types/models';
import { getPlanLimits, type PlanType } from '../config/plans';
import { processMediaBatch, countMediaByType } from '../services/mediaService';
import { translate } from '../i18n';
import { deleteCachedCapsuleSharpThumbnail } from '../services/thumbnailCacheService';
import {
  deleteCapsuleOnServer,
  markCapsuleOpenedOnServer,
  syncDirectCapsuleMembers,
} from '../services/backendService';

// Demo/screenshot mock capsule is removed for production release to show only real user capsules


export type LocalMediaAsset = {
  uri: string;
  fileName?: string | null;
  type?: string | null;
  mediaKind?: 'image' | 'video';
  fileSize?: number; // Dung lượng tệp (bytes)
  duration?: number | null; // Thời lượng video (giây)
};

type CreateCapsuleInput = {
  title: string;
  message: string;
  openDateISO: string;
  theme: CapsuleTheme;
  mediaAssets: LocalMediaAsset[];
  memberEmails: string[];
};

type CapsuleState = {
  capsules: Capsule[];
  isLoading: boolean;
  uploadProgress: number;
  error: string | null;
  subscribeCapsules: (ownerId: string) => () => void;
  createCapsule: (
    input: CreateCapsuleInput,
    ownerId: string,
    isPremium: boolean,
    plan?: PlanType,
    onProgress?: (progress: number) => void,
  ) => Promise<boolean>;
  deleteCapsule: (capsuleId: string) => Promise<boolean>;
  markCapsuleOpened: (capsuleId: string) => Promise<void>;
  clearCapsules: () => void;
};

const safeTheme = (value: unknown): CapsuleTheme => {
  const validThemes: CapsuleTheme[] = [
    'default',
    'vintage',
    'cyberpunk',
    'aurora',
    'zen',
    'sunset',
    'royal',
    'crystal',
    'starry',
    'birthday',
    'new_year',
    'graduation',
    'future',
  ];
  if (typeof value === 'string' && validThemes.includes(value as CapsuleTheme)) {
    return value as CapsuleTheme;
  }
  return 'default';
};

const mapDocToCapsule = (
  doc: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>,
): Capsule => {
  const data = doc.data();
  return {
    id: doc.id,
    ownerId: String(data.ownerId || ''),
    title: String(data.title || 'Hộp ký ức chưa đặt tên'),
    message: String(data.message || ''),
    openDateISO: String(data.openDateISO || new Date().toISOString()),
    createdAtISO: String(data.createdAtISO || new Date().toISOString()),
    theme: safeTheme(data.theme),
    status: data.status === 'opened' || data.status === 'unlocked' ? data.status : 'locked',
    type: data.type === 'group' ? 'group' : 'personal',
    mediaCount: Number(data.mediaCount || 0),
    mediaUrls: Array.isArray(data.mediaUrls) ? data.mediaUrls.map(String) : [],
    mediaPaths: Array.isArray(data.mediaPaths) ? data.mediaPaths.map(String) : [],
    thumbnailUrls: Array.isArray(data.thumbnailUrls) ? data.thumbnailUrls.map(String) : [],
    thumbnailPaths: Array.isArray(data.thumbnailPaths) ? data.thumbnailPaths.map(String) : [],
    totalSizeMb: Number(data.totalSizeMb || 0),
    storageSizeMb: Number(data.storageSizeMb || data.totalSizeMb || 0),
    mediaTypes: Array.isArray(data.mediaTypes) ? data.mediaTypes.map(String) : [],
    shareToken: String(data.shareToken || ''),
    members: Array.isArray(data.members) ? data.members.map(String) : [],
  };
};

const normalizeUploadPath = (uri: string): string => {
  if (Platform.OS === 'ios') {
    return uri.replace('file://', '');
  }
  return uri;
};

export const useCapsuleStore = create<CapsuleState>()((set, get) => ({
  capsules: [],
  isLoading: false,
  uploadProgress: 0,
  error: null,
  subscribeCapsules: ownerId => {
    set({ isLoading: true, error: null });

    let ownerCapsules: Capsule[] = [];
    let memberCapsules: Capsule[] = [];

    const updateStore = () => {
      const allCapsules = [...ownerCapsules, ...memberCapsules];
      // Deduplicate by ID to prevent any duplicate issues
      const uniqueCapsules = Array.from(new Map(allCapsules.map(item => [item.id, item])).values())
        .sort(
          (a, b) =>
            new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime(),
        );

      set({
        capsules: uniqueCapsules,
        isLoading: false,
        error: null,
      });
    };

    const unsubscribeOwner = firestore()
      .collection('capsules')
      .where('ownerId', '==', ownerId)
      .onSnapshot(
        snapshot => {
          ownerCapsules = snapshot.docs.map(mapDocToCapsule);
          updateStore();
        },
        () => {
          set({
            isLoading: false,
            error: translate('Không tải được danh sách hộp ký ức của bạn. Vui lòng thử lại.'),
          });
        },
      );

    const unsubscribeMember = firestore()
      .collection('capsules')
      .where('members', 'array-contains', ownerId)
      .onSnapshot(
        snapshot => {
          memberCapsules = snapshot.docs.map(mapDocToCapsule);
          updateStore();
        },
        () => {
          set({
            isLoading: false,
            error: translate('Không tải được danh sách hộp ký ức được chia sẻ. Vui lòng thử lại.'),
          });
        },
      );

    return () => {
      unsubscribeOwner();
      unsubscribeMember();
    };
  },
  createCapsule: async (input, ownerId, isPremium, plan, onProgress) => {
    const now = new Date();
    const openDate = new Date(input.openDateISO);
    const status = openDate <= now ? 'unlocked' : 'locked';
    const userPlan: PlanType = plan || (isPremium ? 'plus' : 'free');
    const limits = getPlanLimits(userPlan);
    const accountLimitLabel =
      limits.maxAccountStorageMb >= 1024
        ? `${limits.maxAccountStorageMb / 1024}GB`
        : `${limits.maxAccountStorageMb}MB`;

    // Tính toán tổng dung lượng tệp tải lên (MB)
    const totalSizeMb = Number(
      (input.mediaAssets.reduce((sum, item) => sum + (item.fileSize || 0), 0) / (1024 * 1024)).toFixed(2)
    );

    try {
      set({ isLoading: true, error: null, uploadProgress: 0 });

      const existingSnapshot = await firestore()
        .collection('capsules')
        .where('ownerId', '==', ownerId)
        .get();

      if (userPlan === 'free') {
        if (existingSnapshot.size >= limits.maxCapsules) {
          set({
            isLoading: false,
            error: translate('Gói Free chỉ được tạo tối đa {{max}} hộp ký ức trọn đời.', { max: limits.maxCapsules }),
          });
          return false;
        }
      }

      const usedStorageMb = Number(
        existingSnapshot.docs
          .reduce((sum, doc) => sum + Number(doc.data().totalSizeMb || 0), 0)
          .toFixed(2),
      );
      const projectedStorageMb = Number((usedStorageMb + totalSizeMb).toFixed(2));

      if (projectedStorageMb > limits.maxAccountStorageMb) {
        set({
          isLoading: false,
          error: translate('Tổng dung lượng tài khoản ({{size}}MB) vượt quá giới hạn gói {{plan}} ({{limit}}).', { size: projectedStorageMb, plan: userPlan, limit: accountLimitLabel }),
        });
        return false;
      }

      // Free chỉ có ảnh nên không chặn theo từng capsule; vẫn chặn tổng 50MB ở trên.
      if (userPlan !== 'free' && totalSizeMb > limits.maxCapsuleSizeMb) {
        set({
          isLoading: false,
          error: translate('Dung lượng hộp ký ức ({{size}}MB) vượt quá giới hạn gói {{plan}} ({{limit}}MB).', { size: totalSizeMb, plan: userPlan, limit: limits.maxCapsuleSizeMb }),
        });
        return false;
      }

      // --- Validate photo count separately ---
      const { photos: photoCount } = countMediaByType(input.mediaAssets);

      if (photoCount > limits.maxPhotosPerCapsule) {
        set({
          isLoading: false,
          error: translate('Giới hạn ảnh: tối đa {{max}} ảnh cho gói {{plan}}.', { max: limits.maxPhotosPerCapsule, plan: userPlan }),
        });
        return false;
      }

      if (input.mediaAssets.length > limits.maxMediaPerCapsule) {
        set({
          isLoading: false,
          error: translate('Giới hạn ảnh/video: tối đa {{max}} tệp ({{photos}} ảnh + {{videos}} video) cho gói hiện tại.', { max: limits.maxMediaPerCapsule, photos: limits.maxPhotosPerCapsule, videos: limits.maxVideosPerCapsule }),
        });
        return false;
      }

      const videoAssets = input.mediaAssets.filter(item => item.mediaKind === 'video');
      if (videoAssets.length > limits.maxVideosPerCapsule) {
        set({
          isLoading: false,
          error: translate('Giới hạn video: tối đa {{max}} video cho gói hiện tại.', { max: limits.maxVideosPerCapsule }),
        });
        return false;
      }

      const hasLongVideo = videoAssets.some(item => Number(item.duration || 0) > limits.maxVideoDurationSeconds);
      if (hasLongVideo) {
        set({
          isLoading: false,
          error: translate('Video vượt quá thời lượng cho phép ({{min}} phút/video).', { min: Math.floor(limits.maxVideoDurationSeconds / 60) }),
        });
        return false;
      }

      if ((userPlan === 'free' || userPlan === 'plus') && input.memberEmails.length > 0) {
        set({
          isLoading: false,
          error: translate('Chỉ gói PRO và PRO MAX mới hỗ trợ tạo hộp ký ức nhóm.'),
        });
        return false;
      }

      if (userPlan === 'pro' && input.memberEmails.length > 5) {
        set({
          isLoading: false,
          error: translate('Gói PRO chỉ hỗ trợ tối đa 5 thành viên nhóm.'),
        });
        return false;
      }



      if (!limits.allowVideo && input.mediaAssets.some(item => item.mediaKind === 'video')) {
        set({
          isLoading: false,
          error: translate('Gói Free không hỗ trợ video.'),
        });
        return false;
      }

      // --- Compress media before upload ---
      onProgress?.(1); // signal compression started
      const processedAssets = await processMediaBatch(input.mediaAssets, userPlan, (cur, tot) => {
        // Compression progress: 0-20% of overall progress
        const compressPercent = Math.round((cur / Math.max(tot, 1)) * 20);
        set({ uploadProgress: compressPercent });
        onProgress?.(compressPercent);
      });

      // Recalculate size after compression
      const compressedTotalSizeMb = Number(
        (processedAssets.reduce((sum, item) => sum + (item.compressedSize || item.fileSize || 0), 0) / (1024 * 1024)).toFixed(2)
      );

      // Re-check capsule size after compression
      if (userPlan !== 'free' && compressedTotalSizeMb > limits.maxCapsuleSizeMb) {
        set({
          isLoading: false,
          error: translate('Dung lượng hộp ký ức sau nén ({{size}}MB) vượt quá giới hạn gói {{plan}} ({{limit}}MB).', { size: compressedTotalSizeMb, plan: userPlan, limit: limits.maxCapsuleSizeMb }),
        });
        return false;
      }

      // Re-check account storage after compression
      const projectedCompressedMb = Number((usedStorageMb + compressedTotalSizeMb).toFixed(2));
      if (projectedCompressedMb > limits.maxAccountStorageMb) {
        set({
          isLoading: false,
          error: translate('Tổng dung lượng tài khoản sau nén ({{size}}MB) vượt quá giới hạn gói {{plan}} ({{limit}}).', { size: projectedCompressedMb, plan: userPlan, limit: accountLimitLabel }),
        });
        return false;
      }

      const capsuleRef = firestore().collection('capsules').doc();
      const totalFiles = processedAssets.length;
      const fileProgresses = new Array(totalFiles).fill(0);

      const uploadPromises = processedAssets.map(async (asset, index) => {
        if (!asset.compressedUri && !asset.uri) {
          return { mediaUrl: '', thumbnailUrl: '', mediaType: 'image' as const, actualSize: 0 };
        }

        const uploadUri = asset.compressedUri || asset.uri;
        const ext = (asset.fileName?.split('.').pop() || 'jpg').toLowerCase();
        const storagePath = `capsules/${ownerId}/${capsuleRef.id}/media_${index}.${ext}`;
        const reference = storage().ref(storagePath);
        const uploadTask = reference.putFile(normalizeUploadPath(uploadUri));

        uploadTask.on('state_changed', taskSnapshot => {
          const fileProgress =
            taskSnapshot.totalBytes > 0
              ? taskSnapshot.bytesTransferred / taskSnapshot.totalBytes
              : 0;
          fileProgresses[index] = fileProgress;

          const sumProgress = fileProgresses.reduce((sum, p) => sum + p, 0);
          // Upload progress: 20-95% of overall progress
          const overallProgress =
            20 + (sumProgress / Math.max(totalFiles, 1)) * 75;
          const progressValue = Math.round(overallProgress);
          set({ uploadProgress: progressValue });
          onProgress?.(progressValue);
        });

        const taskSnapshot = await uploadTask;
        const mediaUrl = await reference.getDownloadURL();
        const actualFileSizeMb = Number((taskSnapshot.totalBytes / (1024 * 1024)).toFixed(2));

        await firestore().collection('user_storage_items').add({
          userId: ownerId,
          capsuleId: capsuleRef.id,
          fileUrl: mediaUrl,
          sizeMb: actualFileSizeMb,
          createdAtISO: now.toISOString(),
        });

        // Upload thumbnail/preview
        let thumbnailUrl = mediaUrl;
        if (asset.thumbnailUri) {
          try {
            const thumbPath = `capsules/${ownerId}/${capsuleRef.id}/thumb_${index}.jpg`;
            const thumbRef = storage().ref(thumbPath);
            await thumbRef.putFile(normalizeUploadPath(asset.thumbnailUri));
            thumbnailUrl = await thumbRef.getDownloadURL();
          } catch {
            // Use the media URL when a lightweight preview cannot be generated.
          }
        }

        return {
          mediaUrl,
          thumbnailUrl,
          mediaType: asset.mediaKind === 'video' ? ('video' as const) : ('image' as const),
          actualSize: actualFileSizeMb,
        };
      });

      const uploadResults = await Promise.all(uploadPromises);
      const mediaUrls = uploadResults.map(result => result.mediaUrl);
      const thumbnailUrls = uploadResults.map(result => result.thumbnailUrl);
      const mediaTypes = uploadResults.map(result => result.mediaType);
      const totalActualSizeMb = Number(
        uploadResults.reduce((sum, result) => sum + result.actualSize, 0).toFixed(2),
      );

      await capsuleRef.set({
        ownerId,
        title: input.title,
        message: input.message,
        openDateISO: input.openDateISO,
        createdAtISO: now.toISOString(),
        theme: input.theme,
        status,
        type: input.memberEmails.length ? 'group' : 'personal',
        members: [],
        memberEmails: input.memberEmails,
        shareToken: capsuleRef.id,
        mediaCount: mediaUrls.length,
        mediaUrls,
        thumbnailUrls,
        mediaTypes,
        totalSizeMb: totalActualSizeMb,
      });

      if (input.memberEmails.length) {
        const batch = firestore().batch();
        input.memberEmails.forEach(email => {
          const inviteRef = firestore().collection('invites').doc();
          batch.set(inviteRef, {
            capsuleId: capsuleRef.id,
            invitedBy: ownerId,
            invitedEmail: email,
            token: inviteRef.id,
            status: 'pending',
            createdAtISO: now.toISOString(),
            expiresAtISO: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7).toISOString(),
          });
        });
        await batch.commit();
        await syncDirectCapsuleMembers(capsuleRef.id).catch(() => {});
      }

      set({ isLoading: false, uploadProgress: 100, error: null });
      return true;
    } catch {
      set({
        isLoading: false,
        error: translate('Không tạo được hộp ký ức. Vui lòng thử lại.'),
      });
      return false;
    }
  },
  deleteCapsule: async capsuleId => {
    try {
      set({ isLoading: true, error: null });
      const capsule = get().capsules.find(item => item.id === capsuleId);
      if (!capsule) {
        set({ isLoading: false, error: translate('Không tìm thấy hộp ký ức.') });
        return false;
      }

      const now = new Date();
      const openDate = new Date(capsule.openDateISO);
      const isLocked = capsule.status === 'locked';

      // Cho phép xoá nếu đã mở được trên 3 tháng (90 ngày)
      const openedAtMs = openDate.getTime();
      const diffDays = (now.getTime() - openedAtMs) / (1000 * 60 * 60 * 24);
      const isOpenedAfter3Months = capsule.status === 'opened' && diffDays >= 90;

      if (!isOpenedAfter3Months) {
        set({
          isLoading: false,
          error: isLocked
            ? translate('Hộp ký ức đang khóa không thể xóa để đảm bảo tính bảo toàn.')
            : translate('Hộp ký ức đã mở chỉ có thể xóa sau 3 tháng (90 ngày) kể từ ngày mở khóa.'),
        });
        return false;
      }

      await deleteCapsuleOnServer(capsuleId);
      await deleteCachedCapsuleSharpThumbnail(capsuleId).catch(() => {});

      set({ isLoading: false, error: null });
      return true;
    } catch {
      set({ isLoading: false, error: translate('Xóa hộp ký ức thất bại. Vui lòng thử lại.') });
      return false;
    }
  },
  markCapsuleOpened: async capsuleId => {
    const capsule = get().capsules.find(item => item.id === capsuleId);
    if (!capsule) {
      return;
    }

    if (capsule.status === 'opened') {
      return;
    }

    await markCapsuleOpenedOnServer(capsuleId);
  },
  clearCapsules: () =>
    set({ capsules: [], isLoading: false, uploadProgress: 0, error: null }),
}));
