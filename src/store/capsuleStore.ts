import { Platform } from 'react-native';
import { create } from 'zustand';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { Capsule, CapsuleTheme } from '../types/models';
import { getPlanLimits } from '../config/plans';

export type LocalMediaAsset = {
  uri: string;
  fileName?: string | null;
  type?: string | null;
  mediaKind?: 'image' | 'video';
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
    onProgress?: (progress: number) => void,
  ) => Promise<boolean>;
  markCapsuleOpened: (capsuleId: string) => Promise<void>;
  clearCapsules: () => void;
};

const safeTheme = (value: unknown): CapsuleTheme => {
  const validThemes: CapsuleTheme[] = ['default', 'birthday', 'new_year', 'graduation'];
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
    title: String(data.title || 'Untitled capsule'),
    message: String(data.message || ''),
    openDateISO: String(data.openDateISO || new Date().toISOString()),
    createdAtISO: String(data.createdAtISO || new Date().toISOString()),
    theme: safeTheme(data.theme),
    status: data.status === 'opened' || data.status === 'unlocked' ? data.status : 'locked',
    type: data.type === 'group' ? 'group' : 'personal',
    mediaCount: Number(data.mediaCount || 0),
    mediaUrls: Array.isArray(data.mediaUrls) ? data.mediaUrls.map(String) : [],
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

    const unsubscribe = firestore()
      .collection('capsules')
      .where('ownerId', '==', ownerId)
      .onSnapshot(
        snapshot => {
          const capsules = snapshot.docs
            .map(mapDocToCapsule)
            .sort(
              (a, b) =>
                new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime(),
            );

          set({ capsules, isLoading: false, error: null });
        },
        () => {
          set({
            isLoading: false,
            error: 'Không tải được danh sách capsule từ Firestore.',
          });
        },
      );

    return unsubscribe;
  },
  createCapsule: async (input, ownerId, isPremium, onProgress) => {
    const now = new Date();
    const openDate = new Date(input.openDateISO);
    const status = openDate <= now ? 'unlocked' : 'locked';
    const limits = getPlanLimits(isPremium);

    try {
      set({ isLoading: true, error: null, uploadProgress: 0 });

      if (!isPremium) {
        const existingSnapshot = await firestore()
          .collection('capsules')
          .where('ownerId', '==', ownerId)
          .get();
        if (existingSnapshot.size >= limits.maxCapsules) {
          set({
            isLoading: false,
            error: 'Gói Free chỉ tạo tối đa 3 capsule.',
          });
          return false;
        }
      }

      if (input.mediaAssets.length > limits.maxMediaPerCapsule) {
        set({
          isLoading: false,
          error: `Giới hạn media: tối đa ${limits.maxMediaPerCapsule} tệp cho gói hiện tại.`,
        });
        return false;
      }

      if (!isPremium && input.memberEmails.length > 0) {
        set({
          isLoading: false,
          error: 'Gói Free không hỗ trợ capsule nhóm.',
        });
        return false;
      }

      if (!limits.allowVideo && input.mediaAssets.some(item => item.mediaKind === 'video')) {
        set({
          isLoading: false,
          error: 'Gói Free không hỗ trợ video.',
        });
        return false;
      }

      const capsuleRef = firestore().collection('capsules').doc();
      const mediaUrls: string[] = [];
      const mediaTypes: ('image' | 'video')[] = [];
      const totalFiles = input.mediaAssets.length;

      for (let index = 0; index < totalFiles; index += 1) {
        const asset = input.mediaAssets[index];
        if (!asset.uri) {
          continue;
        }

        const ext = (asset.fileName?.split('.').pop() || 'jpg').toLowerCase();
        const storagePath = `capsules/${capsuleRef.id}/media_${index}.${ext}`;
        const reference = storage().ref(storagePath);
        const uploadTask = reference.putFile(normalizeUploadPath(asset.uri));

        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', taskSnapshot => {
            const fileProgress =
              taskSnapshot.totalBytes > 0
                ? taskSnapshot.bytesTransferred / taskSnapshot.totalBytes
                : 0;
            const overallProgress =
              ((index + fileProgress) / Math.max(totalFiles, 1)) * 100;
            const progressValue = Math.round(overallProgress);
            set({ uploadProgress: progressValue });
            onProgress?.(progressValue);
          });

          uploadTask.then(() => resolve()).catch(reject);
        });

        const url = await reference.getDownloadURL();
        mediaUrls.push(url);
        mediaTypes.push(asset.mediaKind || 'image');
      }

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
        mediaTypes,
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
            expiresAtISO: new Date(
              now.getTime() + 1000 * 60 * 60 * 24 * 7,
            ).toISOString(),
          });
        });
        await batch.commit();
      }

      set({ isLoading: false, uploadProgress: 100, error: null });
      return true;
    } catch {
      set({
        isLoading: false,
        error: 'Không tạo được capsule. Vui lòng thử lại.',
      });
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

    await firestore().collection('capsules').doc(capsuleId).set(
      {
        status: 'opened',
      },
      { merge: true },
    );
  },
  clearCapsules: () =>
    set({ capsules: [], isLoading: false, uploadProgress: 0, error: null }),
}));
