/**
 * mediaService.ts
 *
 * Client-side media processing before upload:
 * - Video compression (target 720p, optimized bitrate)
 * - Image compression (for large files >5MB)
 * - Thumbnail/preview generation for both video & image
 */
import { Video, Image } from 'react-native-compressor';
import type { LocalMediaAsset } from '../store/capsuleStore';
import { type PlanType } from '../config/plans';
import RNFS from 'react-native-fs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProcessedMedia = LocalMediaAsset & {
  /** URI of the compressed file (replaces original for upload). */
  compressedUri: string;
  /** URI of the lightweight thumbnail/preview. */
  thumbnailUri: string;
  /** File size after compression (bytes). */
  compressedSize: number;
};

// ---------------------------------------------------------------------------
// Video compression
// ---------------------------------------------------------------------------

/**
 * Compress a video for mobile upload based on user plan.
 */
export const compressVideo = async (uri: string, plan: PlanType): Promise<{ uri: string; size: number }> => {
  try {
    let maxSize = 720;
    if (plan === 'plus') {
      maxSize = 720; // moderate video compression, 720p
    } else if (plan === 'pro') {
      maxSize = 1080; // high quality, 1080p
    } else if (plan === 'pro_max') {
      maxSize = 1440; // ultra sharp, 1440p
    }

    const compressedUri = await Video.compress(uri, {
      compressionMethod: 'auto',
      maxSize,
      minimumFileSizeForCompress: 0.1, // compress almost all videos
    });

    // Estimate size – compressor doesn't always return size directly
    const size = await getFileSize(compressedUri);
    return { uri: compressedUri, size };
  } catch {
    // Fallback: return original if compression fails
    return { uri, size: 0 };
  }
};

/**
 * Generate a thumbnail from a video.
 * Uses the compressor's built-in frame extraction.
 */
export const generateVideoThumbnail = async (videoUri: string): Promise<string> => {
  try {
    // react-native-compressor can generate thumbnail from video
    const thumbnail = await Video.compress(videoUri, {
      compressionMethod: 'auto',
      maxSize: 200,
      minimumFileSizeForCompress: 0,
    });
    return thumbnail;
  } catch {
    return '';
  }
};

// ---------------------------------------------------------------------------
// Image compression
// ---------------------------------------------------------------------------

/**
 * Compress an image based on the user's plan.
 */
export const compressImage = async (
  uri: string,
  _plan: PlanType,
): Promise<{ uri: string; size: number }> => {
  try {
    // Không thực hiện nén ảnh để giữ nguyên chất lượng gốc thô 100%
    const size = await getFileSize(uri);
    return { uri, size };
  } catch {
    return { uri, size: 0 };
  }
};

/**
 * Generate an optimized, sharp thumbnail/preview from an image (600px max, quality 0.8)
 * for high-density mobile screens to save massive bandwidth costs on the Home Screen.
 */
export const generateImagePreview = async (uri: string): Promise<string> => {
  try {
    const thumbnailUri = await Image.compress(uri, {
      compressionMethod: 'auto',
      maxWidth: 600,
      maxHeight: 600,
      quality: 0.8,
    });
    return thumbnailUri;
  } catch {
    return ''; // Never upload the full original as a lightweight preview.
  }
};

// ---------------------------------------------------------------------------
// Batch processing
// ---------------------------------------------------------------------------

export const processMediaBatch = async (
  assets: LocalMediaAsset[],
  plan: PlanType,
  onProgress?: (current: number, total: number) => void,
): Promise<ProcessedMedia[]> => {
  let completedCount = 0;
  onProgress?.(0, assets.length);

  const promises = assets.map(async (asset) => {
    let processed: ProcessedMedia;

    if (asset.mediaKind === 'video') {
      // Compress video
      const compressed = await compressVideo(asset.uri, plan);
      // Generate thumbnail
      const thumbnailUri = await generateImagePreview(asset.uri); // use frame compression fallback

      processed = {
        ...asset,
        compressedUri: compressed.uri,
        thumbnailUri,
        compressedSize: compressed.size || asset.fileSize || 0,
      };
    } else {
      // Compress image
      const compressed = await compressImage(asset.uri, plan);
      // Generate preview thumbnail
      const thumbnailUri = await generateImagePreview(asset.uri);

      processed = {
        ...asset,
        compressedUri: compressed.uri,
        thumbnailUri,
        compressedSize: compressed.size || asset.fileSize || 0,
      };
    }

    completedCount++;
    onProgress?.(completedCount, assets.length);
    return processed;
  });

  const results = await Promise.all(promises);
  return results;
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Get file size in bytes using RN fetch-based HEAD request or stat.
 */
const getFileSize = async (uri: string): Promise<number> => {
  try {
    const path = uri.startsWith('file://') ? uri.slice(7) : uri;
    const stat = await RNFS.stat(path);
    return Number(stat.size || 0);
  } catch {
    try {
      const response = await fetch(uri, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
    } catch {
      // Ignore
    }
  }
  return 0;
};

/**
 * Format bytes to human-readable string.
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) { return '0 B'; }
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) { return `${mb.toFixed(1)} MB`; }
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
};

/**
 * Count photos and videos separately from a media assets array.
 */
export const countMediaByType = (assets: LocalMediaAsset[]): { photos: number; videos: number } => {
  const photos = assets.filter(a => a.mediaKind !== 'video').length;
  const videos = assets.filter(a => a.mediaKind === 'video').length;
  return { photos, videos };
};
