import { Platform } from 'react-native';
import storage from '@react-native-firebase/storage';
import type { LocalMediaAsset } from '../store/capsuleStore';
import type { CapsuleTheme } from '../types/models';
import type { PlanType } from '../config/plans';
import { processMediaBatch } from './mediaService';
import {
  abandonCapsuleDraft,
  createContributionDraft,
  createWaitingCapsuleDraft,
  finalizeContributionUpload,
  finalizeWaitingCapsuleUpload,
  type CapsuleUploadSlot,
} from './backendService';

type WaitingCapsuleInput = {
  title: string;
  message: string;
  openDateISO: string;
  contributionDeadlineISO: string;
  theme: CapsuleTheme;
  memberEmails: string[];
  mediaAssets: LocalMediaAsset[];
};

type ContributionInput = {
  capsuleId: string;
  message: string;
  mediaAssets: LocalMediaAsset[];
  retainedMediaPaths?: string[];
};

const normalizeUploadPath = (uri: string): string =>
  Platform.OS === 'ios' ? uri.replace('file://', '') : uri;

const uploadAssetsToSlots = async (
  slots: CapsuleUploadSlot[],
  assets: Awaited<ReturnType<typeof processMediaBatch>>,
  onProgress?: (progress: number) => void,
) => {
  const fileProgresses = new Array(slots.length).fill(0);
  await Promise.all(assets.map(async (asset, index) => {
    const slot = slots[index];
    if (!slot) {
      return;
    }
    const uploadUri = asset.compressedUri || asset.uri;
    if (!uploadUri) {
      return;
    }

    const mediaRef = storage().ref(slot.mediaPath);
    const uploadTask = mediaRef.putFile(normalizeUploadPath(uploadUri));
    uploadTask.on('state_changed', snapshot => {
      const fileProgress = snapshot.totalBytes > 0
        ? snapshot.bytesTransferred / snapshot.totalBytes
        : 0;
      fileProgresses[index] = fileProgress;
      const uploaded = fileProgresses.reduce((sum, value) => sum + value, 0);
      onProgress?.(20 + Math.round((uploaded / Math.max(slots.length, 1)) * 70));
    });
    await uploadTask;

    if (asset.thumbnailUri) {
      await storage().ref(slot.thumbnailPath).putFile(normalizeUploadPath(asset.thumbnailUri)).catch(() => {});
    }
  }));
};

const buildUploadFiles = (assets: Awaited<ReturnType<typeof processMediaBatch>>) =>
  assets.map(asset => ({
    mediaType: asset.mediaKind === 'video' ? ('video' as const) : ('image' as const),
    sizeBytes: asset.compressedSize || asset.fileSize || 1,
  }));

export const createWaitingCapsuleWithUpload = async (
  input: WaitingCapsuleInput,
  plan: PlanType,
  onProgress?: (progress: number) => void,
) => {
  onProgress?.(1);
  const processedAssets = await processMediaBatch(input.mediaAssets, plan, (current, total) => {
    onProgress?.(Math.round((current / Math.max(total, 1)) * 20));
  });
  const draft = await createWaitingCapsuleDraft({
    title: input.title,
    message: input.message,
    openDateISO: input.openDateISO,
    contributionDeadlineISO: input.contributionDeadlineISO,
    theme: input.theme,
    memberEmails: input.memberEmails,
    files: buildUploadFiles(processedAssets),
  });
  try {
    await uploadAssetsToSlots(draft.uploadSlots, processedAssets, onProgress);
    onProgress?.(95);
    await finalizeWaitingCapsuleUpload(draft.capsuleId, draft.uploadId);
    onProgress?.(100);
    return draft.capsuleId;
  } catch (error) {
    await abandonCapsuleDraft(draft.capsuleId).catch(() => {});
    throw error;
  }
};

export const saveCapsuleContributionWithUpload = async (
  input: ContributionInput,
  plan: PlanType,
  onProgress?: (progress: number) => void,
) => {
  onProgress?.(1);
  const processedAssets = await processMediaBatch(input.mediaAssets, plan, (current, total) => {
    onProgress?.(Math.round((current / Math.max(total, 1)) * 20));
  });
  const draft = await createContributionDraft({
    capsuleId: input.capsuleId,
    message: input.message,
    files: buildUploadFiles(processedAssets),
    retainedMediaPaths: input.retainedMediaPaths || [],
  });
  await uploadAssetsToSlots(draft.uploadSlots, processedAssets, onProgress);
  onProgress?.(95);
  await finalizeContributionUpload(draft.uploadId);
  onProgress?.(100);
  return draft.capsuleId;
};
