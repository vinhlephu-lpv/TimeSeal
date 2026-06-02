import RNFS from 'react-native-fs';

const CACHE_DIRECTORY = `${RNFS.DocumentDirectoryPath}/timeseal-sharp-thumbnails`;

type ThumbnailListener = (uri: string | null) => void;

const listeners = new Map<string, Set<ThumbnailListener>>();
const inFlightDownloads = new Map<string, Promise<string | null>>();

const safeCapsuleId = (capsuleId: string) => capsuleId.replace(/[^a-zA-Z0-9_-]/g, '_');
const getThumbnailPath = (capsuleId: string) => `${CACHE_DIRECTORY}/${safeCapsuleId(capsuleId)}.img`;
const asFileUri = (path: string) => `file://${path}`;

const notify = (capsuleId: string, uri: string | null) => {
  listeners.get(capsuleId)?.forEach(listener => listener(uri));
};

const ensureCacheDirectory = async () => {
  if (!(await RNFS.exists(CACHE_DIRECTORY))) {
    await RNFS.mkdir(CACHE_DIRECTORY);
  }
};

export const getCachedCapsuleSharpThumbnail = async (capsuleId: string): Promise<string | null> => {
  const targetPath = getThumbnailPath(capsuleId);
  return (await RNFS.exists(targetPath)) ? asFileUri(targetPath) : null;
};

/**
 * Persist the first full-quality image after the view bandwidth has been recorded.
 * Home cards only read this local file and never fetch the full-size remote image.
 */
export const cacheCapsuleSharpThumbnail = async (
  capsuleId: string,
  remoteImageUri: string,
): Promise<string | null> => {
  if (!/^https?:\/\//i.test(remoteImageUri)) {
    return null;
  }

  const existingUri = await getCachedCapsuleSharpThumbnail(capsuleId);
  if (existingUri) {
    return existingUri;
  }

  const activeDownload = inFlightDownloads.get(capsuleId);
  if (activeDownload) {
    return activeDownload;
  }

  const download = (async () => {
    const targetPath = getThumbnailPath(capsuleId);
    const temporaryPath = `${targetPath}.${Date.now()}.tmp`;

    try {
      await ensureCacheDirectory();
      const result = await RNFS.downloadFile({
        fromUrl: remoteImageUri,
        toFile: temporaryPath,
      }).promise;

      if (result.statusCode && (result.statusCode < 200 || result.statusCode >= 300)) {
        throw new Error(`Thumbnail download failed with status ${result.statusCode}`);
      }

      if (await RNFS.exists(targetPath)) {
        await RNFS.unlink(targetPath);
      }
      await RNFS.moveFile(temporaryPath, targetPath);

      const uri = asFileUri(targetPath);
      notify(capsuleId, uri);
      return uri;
    } catch {
      if (await RNFS.exists(temporaryPath).catch(() => false)) {
        await RNFS.unlink(temporaryPath).catch(() => {});
      }
      return null;
    }
  })();

  inFlightDownloads.set(capsuleId, download);
  try {
    return await download;
  } finally {
    inFlightDownloads.delete(capsuleId);
  }
};

export const subscribeCachedCapsuleSharpThumbnail = (
  capsuleId: string,
  listener: ThumbnailListener,
) => {
  const capsuleListeners = listeners.get(capsuleId) || new Set<ThumbnailListener>();
  capsuleListeners.add(listener);
  listeners.set(capsuleId, capsuleListeners);

  return () => {
    capsuleListeners.delete(listener);
    if (!capsuleListeners.size) {
      listeners.delete(capsuleId);
    }
  };
};

export const deleteCachedCapsuleSharpThumbnail = async (capsuleId: string) => {
  const targetPath = getThumbnailPath(capsuleId);
  if (await RNFS.exists(targetPath)) {
    await RNFS.unlink(targetPath);
  }
  notify(capsuleId, null);
};
