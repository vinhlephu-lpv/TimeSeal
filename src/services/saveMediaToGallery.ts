import { Alert, Linking, PermissionsAndroid, Platform, ToastAndroid } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import type { MediaItem } from '../components/capsule/MediaViewerModal';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'm4v', '3gp'];

const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('TimeSeal', message);
  }
};

const isRemoteUri = (uri: string) => /^https?:\/\//i.test(uri);

const normalizeLocalUri = (uri: string) => {
  if (uri.startsWith('content://') || uri.startsWith('file://')) {
    return uri;
  }
  return `file://${uri}`;
};

const getExtensionFromMime = (mimeType?: string) => {
  if (!mimeType) { return ''; }
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('jpeg')) { return 'jpg'; }
  if (normalized.includes('png')) { return 'png'; }
  if (normalized.includes('webp')) { return 'webp'; }
  if (normalized.includes('quicktime')) { return 'mov'; }
  if (normalized.includes('webm')) { return 'webm'; }
  if (normalized.includes('mp4')) { return 'mp4'; }
  return '';
};

const getExtensionFromUri = (uri: string) => {
  const cleanUri = decodeURIComponent(uri.split('?')[0].split('#')[0]);
  const match = cleanUri.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() || '';
};

const getMediaExtension = (item: MediaItem) => {
  const candidate =
    getExtensionFromUri(item.fileName || '') ||
    getExtensionFromUri(item.uri) ||
    getExtensionFromMime(item.mimeType);

  const allowed = item.type === 'video' ? VIDEO_EXTENSIONS : IMAGE_EXTENSIONS;
  if (allowed.includes(candidate)) {
    return candidate === 'jpeg' ? 'jpg' : candidate;
  }
  return item.type === 'video' ? 'mp4' : 'jpg';
};

async function requestLegacyWritePermission() {
  if (Platform.OS !== 'android') { return true; }

  const version = Number(Platform.Version);
  if (Number.isFinite(version) && version >= 29) {
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  );

  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return true;
  }

  Alert.alert(
    'Cần quyền lưu ảnh/video',
    'TimeSeal cần quyền lưu vào thư viện. Bạn có thể cấp lại quyền trong phần Cài đặt ứng dụng.',
    [
      { text: 'Để sau', style: 'cancel' },
      { text: 'Mở cài đặt', onPress: () => Linking.openSettings().catch(() => {}) },
    ],
  );
  return false;
}

async function getSavableUri(item: MediaItem, onProgress?: (percent: number) => void) {
  if (!isRemoteUri(item.uri)) {
    onProgress?.(100);
    return normalizeLocalUri(item.uri);
  }

  const extension = getMediaExtension(item);
  const targetPath = `${RNFS.CachesDirectoryPath}/TimeSeal_${Date.now()}.${extension}`;
  const result = await RNFS.downloadFile({
    fromUrl: item.uri,
    toFile: targetPath,
    progress: (res) => {
      const percent = res.contentLength > 0 ? (res.bytesWritten / res.contentLength) * 100 : 0;
      onProgress?.(Math.min(100, Math.max(0, percent)));
    }
  }).promise;

  if (result.statusCode && (result.statusCode < 200 || result.statusCode >= 300)) {
    throw new Error(`Download failed with status ${result.statusCode}`);
  }

  onProgress?.(100);
  return `file://${targetPath}`;
}

export async function saveMediaToGallery(
  item: MediaItem,
  onProgress?: (percent: number) => void,
) {
  if (!item?.uri) {
    showToast('Ảnh/video không hợp lệ');
    return false;
  }

  const allowed = await requestLegacyWritePermission();
  if (!allowed) {
    showToast('Chưa có quyền lưu ảnh/video');
    return false;
  }

  try {
    const savableUri = await getSavableUri(item, onProgress);
    await CameraRoll.save(savableUri, {
      type: item.type === 'video' ? 'video' : 'photo',
      album: 'TimeSeal',
    });
    showToast(item.type === 'video' ? 'Đã lưu video vào thư viện' : 'Đã lưu ảnh vào thư viện');
    return true;
  } catch {
    showToast(item.type === 'video' ? 'Chưa lưu được video' : 'Chưa lưu được ảnh');
    return false;
  }
}
