/**
 * ImageLightbox.tsx
 *
 * Fullscreen media viewer with swipe navigation and quick actions.
 */
import React, { useCallback } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../ui/DesignPrimitives';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

type Props = {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  allowDownload?: boolean;
  onRestrictedAction?: () => void;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
async function requestSavePermission() {
  if (Platform.OS !== 'android') { return true; }
  const version = Number(Platform.Version);
  if (Number.isFinite(version) && version >= 29) { return true; }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function LightboxImage({ uri, onClose }: { uri: string; onClose: () => void }) {
  const closeAction = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Pressable style={styles.imagePressable} onPress={closeAction}>
      <Image
        source={{ uri }}
        style={styles.fullImageCustom}
        resizeMode="contain"
      />
    </Pressable>
  );
}

export function ImageLightbox({
  visible,
  images,
  initialIndex = 0,
  onClose,
  allowDownload = true,
  onRestrictedAction,
}: Props) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [optionsVisible, setOptionsVisible] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  const onViewableItemsChanged = React.useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const activeUri = images[currentIndex];

  const handleSave = async () => {
    if (!activeUri) { return; }

    if (allowDownload === false) {
      onRestrictedAction?.();
      return;
    }

    const allowed = await requestSavePermission();
    if (!allowed) {
      Alert.alert('Cần quyền lưu ảnh/video', 'Vui lòng cấp quyền thư viện để lưu ảnh hoặc video về thiết bị.');
      return;
    }

    try {
      const cleanUrl = activeUri.toLowerCase().split('?')[0];
      const isVideo = cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.m4v') || cleanUrl.endsWith('.3gp') || cleanUrl.endsWith('.avi');

      await CameraRoll.save(activeUri, { type: isVideo ? 'video' : 'photo', album: 'TimeSeal' });
      Alert.alert(
        'Đã lưu thành công',
        isVideo ? 'Video đã được lưu vào thư viện TimeSeal.' : 'Ảnh đã được lưu vào thư viện TimeSeal.',
      );
    } catch {
      Alert.alert('Lưu chưa thành công', 'Không thể lưu ảnh/video này về thiết bị lúc này.');
    }
  };

  const handleShare = async () => {
    if (!activeUri) { return; }
    try {
      await Share.share({ message: `TimeSeal chia sẻ ảnh/video: ${activeUri}` });
    } catch {}
  };

  if (!visible || images.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.overlay}>
          {/* Close button */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <AppIcon name="close" size={22} color="#FFFFFF" />
          </Pressable>

          {/* Options button */}
          <Pressable style={styles.threeDotButton} onPress={() => setOptionsVisible(true)}>
            <AppIcon name="ellipsis-vertical" size={22} color="#FFFFFF" />
          </Pressable>

          {/* Media carousel */}
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_W,
              offset: SCREEN_W * index,
              index,
            })}
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item }) => (
              <View style={styles.page}>
                <LightboxImage uri={item} onClose={onClose} />
              </View>
            )}
          />

          {/* Page indicator */}
          {images.length > 1 && (
            <View style={[styles.indicators, { bottom: Math.max(32, insets.bottom + 16) }]}>
              <Text style={styles.indicatorText}>
                {currentIndex + 1} / {images.length}
              </Text>
            </View>
          )}

          {/* Custom Bottom Sheet Options Modal */}
          <Modal
            visible={optionsVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setOptionsVisible(false)}
          >
            <Pressable style={styles.sheetBackdrop} onPress={() => setOptionsVisible(false)}>
              <View style={styles.sheetContainer}>
                <Pressable style={[styles.sheetContent, { paddingBottom: Math.max(24, insets.bottom + 12) }]} onPress={e => e.stopPropagation()}>
                  {/* Handle bar */}
                  <View style={styles.sheetHandle} />

                  <Text style={styles.sheetTitle}>TÙY CHỌN ẢNH/VIDEO</Text>
                  <Text style={styles.sheetSubtitle}>Ảnh/video thứ {currentIndex + 1} trong hộp ký ức</Text>
                  <Text style={styles.sheetHint}>
                    Vuốt sang trái hoặc phải để xem tiếp. Chạm ra ngoài để quay lại màn chi tiết.
                  </Text>

                  {/* Option: Save */}
                  <Pressable
                    style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
                    onPress={() => {
                      setOptionsVisible(false);
                      handleSave();
                    }}
                  >
                    <View style={styles.sheetIconWrapper}>
                      <AppIcon name="download-outline" size={20} color="#FFFFFF" />
                    </View>
                    <Text style={styles.sheetRowText}>Lưu về thiết bị</Text>
                  </Pressable>

                  {/* Option: Share */}
                  <Pressable
                    style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
                    onPress={() => {
                      setOptionsVisible(false);
                      handleShare();
                    }}
                  >
                    <View style={styles.sheetIconWrapper}>
                      <AppIcon name="share-social-outline" size={20} color="#FFFFFF" />
                    </View>
                    <Text style={styles.sheetRowText}>Chia sẻ ảnh/video</Text>
                  </Pressable>

                  {/* Spacer */}
                  <View style={styles.sheetDivider} />

                  {/* Option: Close */}
                  <Pressable
                    style={({ pressed }) => [styles.sheetCloseButton, pressed && styles.sheetCloseButtonPressed]}
                    onPress={() => setOptionsVisible(false)}
                  >
                    <Text style={styles.sheetCloseButtonText}>Đóng</Text>
                  </Pressable>
                </Pressable>
              </View>
            </Pressable>
          </Modal>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  threeDotButton: {
    position: 'absolute',
    top: 48,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: SCREEN_W,
    height: SCREEN_H * 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  imagePressable: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImageCustom: {
    width: '100%',
    height: '80%',
  },
  indicators: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  indicatorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Custom Bottom Sheet Styles
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 4,
    opacity: 0.8,
  },
  sheetSubtitle: {
    color: '#A0A0A2',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  sheetHint: {
    color: '#D0D0D2',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  sheetRowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sheetRowText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 12,
  },
  sheetCloseButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetCloseButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  sheetCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
