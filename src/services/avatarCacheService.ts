import React from 'react';
import RNFS from 'react-native-fs';
import { getAvatarAccess } from './backendService';

const CACHE_DIRECTORY = `${RNFS.DocumentDirectoryPath}/timeseal-avatars`;

export type AvatarReference = {
  userId?: string;
  avatarPath?: string;
  avatarVersion?: string;
  avatarUrl?: string;
} | null | undefined;

const inFlightDownloads = new Map<string, Promise<string | null>>();
const safePart = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');
const asFileUri = (path: string) => `file://${path}`;

const ensureCacheDirectory = async () => {
  if (!(await RNFS.exists(CACHE_DIRECTORY))) {
    await RNFS.mkdir(CACHE_DIRECTORY);
  }
};

const getCacheKey = (avatar: NonNullable<AvatarReference>) => {
  const sourceVersion = avatar.avatarVersion || avatar.avatarUrl || avatar.avatarPath || 'none';
  let hash = 0;
  for (let index = 0; index < sourceVersion.length; index++) {
    hash = (hash * 31 + sourceVersion.charCodeAt(index)) % 2147483647;
  }
  return `${safePart(avatar.userId || 'external')}_${Math.abs(hash)}`;
};

export const resolveCachedAvatarUri = async (
  avatar: AvatarReference,
): Promise<string | null> => {
  if (!avatar?.avatarPath && !avatar?.avatarUrl) {
    return null;
  }

  const cacheKey = getCacheKey(avatar);
  const targetPath = `${CACHE_DIRECTORY}/${cacheKey}.jpg`;
  if (await RNFS.exists(targetPath)) {
    return asFileUri(targetPath);
  }

  const activeDownload = inFlightDownloads.get(cacheKey);
  if (activeDownload) {
    return activeDownload;
  }

  const download = (async () => {
    const temporaryPath = `${targetPath}.${Date.now()}.tmp`;
    try {
      await ensureCacheDirectory();
      const remoteUrl = avatar.userId
        ? (await getAvatarAccess(avatar.userId)).avatarUrl
        : avatar.avatarUrl;
      if (!remoteUrl) {
        return null;
      }
      const result = await RNFS.downloadFile({
        fromUrl: remoteUrl,
        toFile: temporaryPath,
      }).promise;
      if (result.statusCode && (result.statusCode < 200 || result.statusCode >= 300)) {
        throw new Error(`Avatar download failed with status ${result.statusCode}`);
      }

      if (!(await RNFS.exists(temporaryPath))) {
        return null;
      }
      await RNFS.moveFile(temporaryPath, targetPath);
      return asFileUri(targetPath);
    } catch {
      if (await RNFS.exists(temporaryPath).catch(() => false)) {
        await RNFS.unlink(temporaryPath).catch(() => {});
      }
      return avatar.userId ? null : avatar.avatarUrl || null;
    }
  })();

  inFlightDownloads.set(cacheKey, download);
  try {
    return await download;
  } finally {
    inFlightDownloads.delete(cacheKey);
  }
};

export const cacheLocalAvatarUri = async (
  avatar: NonNullable<AvatarReference>,
  localUri: string,
) => {
  const targetPath = `${CACHE_DIRECTORY}/${getCacheKey(avatar)}.jpg`;
  const sourcePath = localUri.startsWith('file://') ? localUri.slice(7) : localUri;
  try {
    await ensureCacheDirectory();
    if (await RNFS.exists(targetPath)) {
      await RNFS.unlink(targetPath);
    }
    await RNFS.copyFile(sourcePath, targetPath);
    return asFileUri(targetPath);
  } catch {
    return null;
  }
};

export const useCachedAvatarUri = (avatar: AvatarReference) => {
  const [uri, setUri] = React.useState<string | null>(avatar?.userId ? null : avatar?.avatarUrl || null);
  const userId = avatar?.userId;
  const avatarPath = avatar?.avatarPath;
  const avatarVersion = avatar?.avatarVersion;
  const avatarUrl = avatar?.avatarUrl;

  React.useEffect(() => {
    let active = true;
    setUri(userId ? null : avatarUrl || null);
    resolveCachedAvatarUri({ userId, avatarPath, avatarVersion, avatarUrl })
      .then(result => {
        if (active) {
          setUri(result);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [avatarPath, avatarUrl, avatarVersion, userId]);

  return uri;
};
