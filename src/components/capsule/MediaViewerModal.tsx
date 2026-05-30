import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Video from 'react-native-video';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../ui/DesignPrimitives';
import { saveMediaToGallery } from '../../services/saveMediaToGallery';

export type MediaType = 'image' | 'video';

export type MediaItem = {
  id?: string;
  uri: string;
  type: MediaType;
  thumbnailUri?: string;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
};

type MediaViewerModalProps = {
  visible: boolean;
  media: MediaItem[];
  initialIndex: number;
  onClose: () => void;
  allowDownload?: boolean;
  onRestrictedAction?: () => void;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MAX_IMAGE_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const CLOSE_DRAG_DISTANCE = 140;
const DEFAULT_PROGRESS_WIDTH = Math.max(80, SCREEN_W - 220);
const GESTURE_DIRECTION_THRESHOLD = 8;

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

function ZoomableImage({
  item,
  isActive,
  onClose,
  onToggleChrome,
  onZoomActiveChange,
}: {
  item: MediaItem;
  isActive: boolean;
  onClose: () => void;
  onToggleChrome: () => void;
  onZoomActiveChange: (zoomed: boolean) => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const touchStartX = useSharedValue(0);
  const touchStartY = useSharedValue(0);

  const reportZoom = React.useCallback((nextScale: number) => {
    onZoomActiveChange(nextScale > 1.02);
  }, [onZoomActiveChange]);

  React.useEffect(() => {
    if (!isActive) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      onZoomActiveChange(false);
    }
  }, [isActive, onZoomActiveChange, savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY]);

  const resetImage = React.useCallback(() => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    onZoomActiveChange(false);
  }, [onZoomActiveChange, savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY]);

  const pinch = Gesture.Pinch()
    .onUpdate(event => {
      const nextScale = clamp(savedScale.value * event.scale, 1, MAX_IMAGE_SCALE);
      scale.value = nextScale;
      runOnJS(reportZoom)(nextScale);
    })
    .onEnd(() => {
      if (scale.value <= 1.02) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(reportZoom)(1);
        return;
      }

      savedScale.value = scale.value;
      const limitX = (SCREEN_W * (scale.value - 1)) / 2;
      const limitY = (SCREEN_H * 0.8 * (scale.value - 1)) / 2;
      translateX.value = withSpring(clamp(translateX.value, -limitX, limitX));
      translateY.value = withSpring(clamp(translateY.value, -limitY, limitY));
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown(event => {
      const touch = event.allTouches[0];
      if (!touch) {
        return;
      }
      touchStartX.value = touch.absoluteX;
      touchStartY.value = touch.absoluteY;
    })
    .onTouchesMove((event, state) => {
      const touch = event.allTouches[0];
      if (!touch || event.numberOfTouches > 1) {
        state.fail();
        return;
      }

      const deltaX = touch.absoluteX - touchStartX.value;
      const deltaY = touch.absoluteY - touchStartY.value;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX < GESTURE_DIRECTION_THRESHOLD && absY < GESTURE_DIRECTION_THRESHOLD) {
        return;
      }

      if (scale.value > 1.02) {
        state.activate();
        return;
      }

      if (deltaY > GESTURE_DIRECTION_THRESHOLD && absY > absX * 1.15) {
        state.activate();
        return;
      }

      if (absX > GESTURE_DIRECTION_THRESHOLD && absX > absY) {
        state.fail();
      }
    })
    .onBegin(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate(event => {
      if (scale.value > 1.02) {
        const limitX = (SCREEN_W * (scale.value - 1)) / 2;
        const limitY = (SCREEN_H * 0.8 * (scale.value - 1)) / 2;
        translateX.value = clamp(savedTranslateX.value + event.translationX, -limitX, limitX);
        translateY.value = clamp(savedTranslateY.value + event.translationY, -limitY, limitY);
        return;
      }

      if (event.translationY > 0 && Math.abs(event.translationY) > Math.abs(event.translationX)) {
        translateY.value = event.translationY;
      }
    })
    .onEnd(event => {
      if (scale.value > 1.02) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        return;
      }

      if (event.translationY > CLOSE_DRAG_DISTANCE || event.velocityY > 1100) {
        runOnJS(onClose)();
        return;
      }
      translateY.value = withSpring(0);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value <= 1.02) {
        scale.value = withSpring(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
        runOnJS(reportZoom)(DOUBLE_TAP_SCALE);
      } else {
        runOnJS(resetImage)();
      }
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(onToggleChrome)();
    });

  const composedGesture = Gesture.Simultaneous(
    pinch,
    pan,
    Gesture.Exclusive(doubleTap, singleTap),
  );

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const pageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scale.value <= 1.02 ? translateY.value : 0 }],
  }));

  if (!item?.uri) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorText}>Không thể mở ảnh này</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.mediaPage, pageStyle]}>
        {loading && !hasError ? <ActivityIndicator color="#FFFFFF" size="large" /> : null}
        {hasError ? (
          <Text style={styles.errorText}>Ảnh không tải được</Text>
        ) : (
          <Animated.Image
            source={{ uri: item.uri }}
            resizeMode="contain"
            style={[styles.fullMedia, imageStyle]}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setHasError(true);
            }}
          />
        )}
      </Animated.View>
    </GestureDetector>
  );
}

function VideoMediaItem({
  item,
  isActive,
  onClose,
  onToggleChrome,
  onSeekingChange,
}: {
  item: MediaItem;
  isActive: boolean;
  onClose: () => void;
  onToggleChrome: () => void;
  onSeekingChange: (seeking: boolean) => void;
}) {
  const videoRef = React.useRef<any>(null);
  const [paused, setPaused] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [muted, setMuted] = React.useState(false);
  const [duration, setDuration] = React.useState(item.duration || 0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [hasError, setHasError] = React.useState(false);
  const [progressWidth, setProgressWidth] = React.useState(DEFAULT_PROGRESS_WIDTH);
  const translateY = useSharedValue(0);
  const measuredProgressWidth = Math.max(1, progressWidth);

  React.useEffect(() => {
    if (!isActive) {
      setPaused(true);
      setLoading(false);
    } else {
      setPaused(true);
      setHasError(false);
    }
  }, [isActive]);

  const seekToRatio = React.useCallback((ratio: number) => {
    if (!duration) { return; }
    const nextTime = clamp(ratio, 0, 1) * duration;
    setCurrentTime(nextTime);
    videoRef.current?.seek(nextTime);
  }, [duration]);

  const verticalDrag = Gesture.Pan()
    .activeOffsetY([-16, 16])
    .failOffsetX([-24, 24])
    .onUpdate(event => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd(event => {
      if (event.translationY > CLOSE_DRAG_DISTANCE || event.velocityY > 1100) {
        runOnJS(onClose)();
        return;
      }
      translateY.value = withSpring(0);
    });

  const progressGesture = Gesture.Pan()
    .onBegin(event => {
      runOnJS(onSeekingChange)(true);
      runOnJS(seekToRatio)(event.x / measuredProgressWidth);
    })
    .onUpdate(event => {
      runOnJS(seekToRatio)(event.x / measuredProgressWidth);
    })
    .onFinalize(() => {
      runOnJS(onSeekingChange)(false);
    });

  const pageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const progressRatio = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const thumbLeft = Math.min(
    Math.max(0, progressRatio * measuredProgressWidth - 6),
    Math.max(0, measuredProgressWidth - 12),
  );

  if (!item?.uri) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorText}>Không thể mở video này</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={verticalDrag}>
      <Animated.View style={[styles.mediaPage, pageStyle]}>
        {isActive ? (
          <>
            <Pressable style={styles.videoSurface} onPress={onToggleChrome}>
              <Video
                ref={videoRef}
                source={{ uri: item.uri }}
                style={styles.fullMedia}
                resizeMode="contain"
                paused={paused}
                muted={muted}
                controls={false}
                onLoad={data => {
                  setLoading(false);
                  setDuration(data.duration || item.duration || 0);
                }}
                onProgress={data => {
                  setCurrentTime(data.currentTime || 0);
                }}
                onBuffer={data => setLoading(Boolean(data.isBuffering))}
                onError={() => {
                  setLoading(false);
                  setHasError(true);
                  setPaused(true);
                }}
                onEnd={() => {
                  setPaused(true);
                  setCurrentTime(0);
                  videoRef.current?.seek(0);
                }}
              />
            </Pressable>

            {loading && !hasError ? (
              <View style={styles.videoCenterOverlay}>
                <ActivityIndicator color="#FFFFFF" size="large" />
              </View>
            ) : null}

            {hasError ? (
              <View style={styles.videoCenterOverlay}>
                <Text style={styles.errorText}>Video không phát được</Text>
              </View>
            ) : (
              <Pressable
                style={styles.playButton}
                onPress={() => setPaused(value => !value)}
              >
                <AppIcon name={paused ? 'play' : 'pause'} size={32} color="#FFFFFF" />
              </Pressable>
            )}

            <View style={styles.videoControls}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <GestureDetector gesture={progressGesture}>
                <View
                  style={styles.progressTrack}
                  onLayout={event => setProgressWidth(event.nativeEvent.layout.width)}
                >
                  <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
                  <View style={[styles.progressThumb, { left: thumbLeft }]} />
                </View>
              </GestureDetector>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
              <Pressable style={styles.muteButton} onPress={() => setMuted(value => !value)}>
                <AppIcon name={muted ? 'volume-mute-outline' : 'volume-high-outline'} size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.videoPlaceholder}>
            {item.thumbnailUri ? (
              <Image source={{ uri: item.thumbnailUri }} style={styles.fullMedia} resizeMode="contain" />
            ) : null}
            <View style={styles.placeholderPlay}>
              <AppIcon name="play" size={28} color="#FFFFFF" />
            </View>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const MediaPage = React.memo(function MediaPage({
  item,
  index,
  currentIndex,
  onClose,
  onToggleChrome,
  onZoomActiveChange,
  onSeekingChange,
}: {
  item: MediaItem;
  index: number;
  currentIndex: number;
  onClose: () => void;
  onToggleChrome: () => void;
  onZoomActiveChange: (zoomed: boolean) => void;
  onSeekingChange: (seeking: boolean) => void;
}) {
  const isActive = index === currentIndex;

  if (item.type === 'video') {
    return (
      <VideoMediaItem
        item={item}
        isActive={isActive}
        onClose={onClose}
        onToggleChrome={onToggleChrome}
        onSeekingChange={onSeekingChange}
      />
    );
  }

  return (
    <ZoomableImage
      item={item}
      isActive={isActive}
      onClose={onClose}
      onToggleChrome={onToggleChrome}
      onZoomActiveChange={onZoomActiveChange}
    />
  );
});

export function MediaViewerModal({
  visible,
  media,
  initialIndex,
  onClose,
  allowDownload = true,
  onRestrictedAction,
}: MediaViewerModalProps) {
  const insets = useSafeAreaInsets();
  const listRef = React.useRef<FlatList<MediaItem>>(null);
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [chromeVisible, setChromeVisible] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);
  const [zoomed, setZoomed] = React.useState(false);
  const [seeking, setSeeking] = React.useState(false);
  const safeMedia = React.useMemo(
    () => media.filter(item => Boolean(item?.uri)),
    [media],
  );
  const activeItem = safeMedia[currentIndex];
  const headerTop = Math.max(insets.top + 8, 32);

  React.useEffect(() => {
    if (!visible) {
      StatusBar.setHidden(false, 'fade');
      return;
    }

    StatusBar.setHidden(true, 'fade');
    return () => {
      StatusBar.setHidden(false, 'fade');
    };
  }, [visible]);

  React.useEffect(() => {
    if (!visible) {
      setZoomed(false);
      setSeeking(false);
      setSaving(false);
      return;
    }

    const nextIndex = Math.min(Math.max(initialIndex, 0), Math.max(safeMedia.length - 1, 0));
    setCurrentIndex(nextIndex);
    setChromeVisible(true);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: nextIndex, animated: false });
    });
  }, [initialIndex, safeMedia.length, visible]);

  const onViewableItemsChanged = React.useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const nextIndex = viewableItems[0]?.index;
      if (typeof nextIndex === 'number') {
        setCurrentIndex(nextIndex);
        setZoomed(false);
        setSeeking(false);
      }
    },
  ).current;

  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const handleSave = React.useCallback(async () => {
    if (!activeItem || saving) { return; }
    if (allowDownload === false) {
      onRestrictedAction?.();
      return;
    }
    setSaving(true);
    setDownloadProgress(0);
    try {
      await saveMediaToGallery(activeItem, (percent) => {
        setDownloadProgress(Math.round(percent));
      });
    } catch {
      Alert.alert(
        'Không thể lưu media',
        'TimeSeal chưa có quyền tải/lưu media này hoặc đường dẫn media đã hết hạn. Vui lòng mở lại capsule rồi thử lại.',
      );
    } finally {
      setSaving(false);
      setDownloadProgress(0);
    }
  }, [activeItem, allowDownload, onRestrictedAction, saving]);

  const renderItem = React.useCallback(({ item, index }: { item: MediaItem; index: number }) => (
    <View style={styles.page}>
      <MediaPage
        item={item}
        index={index}
        currentIndex={currentIndex}
        onClose={onClose}
        onToggleChrome={() => setChromeVisible(value => !value)}
        onZoomActiveChange={setZoomed}
        onSeekingChange={setSeeking}
      />
    </View>
  ), [currentIndex, onClose]);

  if (!visible) {
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
        <StatusBar hidden barStyle="light-content" backgroundColor="#000000" translucent />
        <View style={styles.overlay}>
          {safeMedia.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.errorText}>Không có media để hiển thị</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={safeMedia}
              horizontal
              pagingEnabled
              scrollEnabled={!zoomed && !seeking}
              initialScrollIndex={Math.min(Math.max(initialIndex, 0), safeMedia.length - 1)}
              maxToRenderPerBatch={2}
              windowSize={3}
              removeClippedSubviews
              keyExtractor={(item, index) => item.id || `${item.uri}-${index}`}
              getItemLayout={(_, index) => ({
                length: SCREEN_W,
                offset: SCREEN_W * index,
                index,
              })}
              renderItem={renderItem}
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              onScrollToIndexFailed={({ index }) => {
                requestAnimationFrame(() => {
                  listRef.current?.scrollToOffset({ offset: index * SCREEN_W, animated: false });
                });
              }}
            />
          )}

          {chromeVisible ? (
            <View style={[styles.header, { top: headerTop }]}>
              <Pressable style={styles.headerButton} onPress={onClose} hitSlop={10}>
                <AppIcon name="close" size={24} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.counterText}>
                {safeMedia.length > 0 ? `${currentIndex + 1} / ${safeMedia.length}` : '0 / 0'}
              </Text>
              <Pressable
                style={[styles.headerButton, saving && styles.headerButtonDisabled, saving && styles.headerButtonSaving]}
                onPress={handleSave}
                disabled={saving || !activeItem}
                hitSlop={10}
              >
                {saving ? (
                  <Text style={styles.downloadProgressText}>{downloadProgress}%</Text>
                ) : (
                  <AppIcon name="download-outline" size={22} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          ) : null}
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
    backgroundColor: '#000000',
  },
  page: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  mediaPage: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullMedia: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonDisabled: {
    opacity: 0.7,
  },
  headerButtonSaving: {
    width: 64,
  },
  downloadProgressText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  videoSurface: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCenterOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    position: 'absolute',
    alignSelf: 'center',
    top: SCREEN_H / 2 - 36,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.46)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoControls: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  progressTrack: {
    flex: 1,
    minWidth: 80,
    height: 32,
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  progressThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 12,
    minWidth: 38,
    textAlign: 'center',
  },
  muteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholder: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050505',
  },
  placeholderPlay: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
