import React from 'react';
import { Image, Pressable, ScrollView, Share, StatusBar, StyleProp, StyleSheet, Text, View, ViewStyle, ActivityIndicator } from 'react-native';
import { PolishedAlert } from '../../store/alertStore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import type { AppStackParamList } from '../../types/navigation';
import { useCapsuleStore } from '../../store/capsuleStore';
import { useAuthStore } from '../../store/authStore';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { capsuleThemes, getThemeStyle, ThemeBackground } from '../../theme/capsuleThemes';
import { formatDate } from '../../utils/dateHelpers';
import { type PlanType } from '../../config/plans';
import { AppIcon, PrimaryButton } from '../../components/ui/DesignPrimitives';
import { ThemeDecoration } from '../../components/capsule/ThemeDecorations';
import { MediaViewerModal, type MediaItem } from '../../components/capsule/MediaViewerModal';
import { ExpiredPlanModal } from '../../components/modals/ExpiredPlanModal';
import { DowngradePlanModal } from '../../components/modals/DowngradePlanModal';
import { PremiumModal } from '../../components/modals/PremiumModal';
import { saveMediaToGallery } from '../../services/saveMediaToGallery';
import { useTranslation } from '../../i18n';
import { cacheCapsuleSharpThumbnail } from '../../services/thumbnailCacheService';
import {
  getCapsuleMediaAccess,
  getCapsuleInviteToken,
  type CapsuleMediaAccess,
  type ViewAccessLevel,
} from '../../services/backendService';
import { createCapsuleInviteUrl } from '../../services/inviteService';

type Props = NativeStackScreenProps<AppStackParamList, 'CapsuleDetail'>;

const isValidMediaUri = (uri: unknown): uri is string =>
  typeof uri === 'string' && /^(https?:|file:|content:|data:(image|video)\/)/.test(uri);

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = 3500): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Backend request timed out.')), timeoutMs);
    promise.then(
      result => {
        clearTimeout(timeout);
        resolve(result);
      },
      error => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });

const isVideoUrl = (url: string, index: number, mediaTypes?: string[]) => {
  if (mediaTypes && mediaTypes[index]) {
    return mediaTypes[index] === 'video';
  }
  const cleanUrl = url.toLowerCase().split('?')[0];
  return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.m4v') || cleanUrl.endsWith('.3gp') || cleanUrl.endsWith('.avi');
};

function MediaThumbnail({
  item,
  style,
  iconSize = 16,
  placeholderBg,
  textColor,
  index = 0,
}: {
  item: MediaItem;
  style: StyleProp<ViewStyle>;
  iconSize?: number;
  placeholderBg?: string;
  textColor?: string;
  index?: number;
}) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // Nếu là 5 tấm đầu tiên (index < 5), load trực tiếp ảnh gốc (item.uri) để sắc nét tuyệt đối.
  // Các tấm tiếp theo dùng thumbnailUri siêu nhẹ để bảo vệ RAM thiết bị, tránh bị crash (OOM).
  const targetUri = index < 5 ? item.uri : (item.thumbnailUri || item.uri);
  const thumbnailUri = item.type === 'video' ? item.thumbnailUri : targetUri;
  const canRenderImage = item.type === 'image' || (thumbnailUri && thumbnailUri !== item.uri);

  return (
    <View style={[style, styles.thumbnailFrame]}>
      {canRenderImage && thumbnailUri ? (
        <Image source={{ uri: thumbnailUri }} style={styles.thumbnailFill} resizeMode="cover" />
      ) : (
        <View style={[styles.thumbnailFill, styles.videoThumbPlaceholder, placeholderBg ? { backgroundColor: placeholderBg } : null]}>
          <AppIcon name="videocam-outline" size={Math.max(18, iconSize + 6)} color={textColor || "#FFFFFF"} />
        </View>
      )}
      {item.type === 'video' ? (
        <View style={styles.miniPlayOverlay}>
          <AppIcon name="play" size={iconSize} color={textColor || "#FFFFFF"} />
        </View>
      ) : null}
    </View>
  );
}

export function CapsuleDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [previewVisible, setPreviewVisible] = React.useState(false);
  const [previewIndex, setPreviewIndex] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);
  const [accessLevel, setAccessLevel] = React.useState<ViewAccessLevel | null>(null);
  const [resolvedFullMediaUrls, setResolvedFullMediaUrls] = React.useState<string[]>([]);
  const [resolvedThumbnailUrls, setResolvedThumbnailUrls] = React.useState<string[]>([]);
  const [remainingFreeViews, setRemainingFreeViews] = React.useState(0);
  const [showExpiredModal, setShowExpiredModal] = React.useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = React.useState(false);
  const [showPremiumModal, setShowPremiumModal] = React.useState(false);
  const [ownerProfile, setOwnerProfile] = React.useState<{ displayName?: string; avatarUrl?: string; email?: string } | null>(null);
  const insets = useSafeAreaInsets();
  const [loadingKyUc, setLoadingKyUc] = React.useState(true);
  const hasCheckedAccess = React.useRef(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingKyUc(false);
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  const capsule = useCapsuleStore(s => s.capsules.find(i => i.id === route.params.capsuleId));
  const capsuleRef = React.useRef(capsule);
  capsuleRef.current = capsule;

  const deleteCapsule = useCapsuleStore(s => s.deleteCapsule);
  const capsuleError = useCapsuleStore(s => s.error);

  const user = useAuthStore(s => s.user);

  React.useEffect(() => {
    const currentCapsule = capsuleRef.current;
    if (!currentCapsule?.ownerId) { return; }

    if (currentCapsule.ownerId === user?.id) {
      setOwnerProfile({
        displayName: 'Tôi',
        avatarUrl: user?.avatarUrl,
        email: user?.email,
      });
      return;
    }

    firestore().collection('users').doc(currentCapsule.ownerId).get()
      .then(doc => {
        const data = doc.data();
        if (data) {
          setOwnerProfile({
            displayName: data.displayName || 'Người dùng',
            avatarUrl: data.avatarUrl,
            email: data.email,
          });
        }
      })
      .catch(() => {});
  }, [user?.id, user]);

  const subscriptionSync = useAuthStore(s => s.subscriptionSync);

  const userPlan: PlanType = user?.plan || 'free';
  const usedStorageMb = subscriptionSync?.usedStorageMb ?? 0;
  const themeStyle = getThemeStyle(capsule?.theme);

  // Theme-aware colors — same pattern as CREATE flow
  const activeTheme = capsuleThemes[capsule?.theme || 'default'] || capsuleThemes.default;
  const tc = activeTheme.colors;

  const cacheSharpCoverAfterQuota = React.useCallback(async (mediaUrls: string[]) => {
    const currentCapsule = capsuleRef.current;
    if (!currentCapsule) { return; }
    const firstMediaUrl = mediaUrls[0];
    const capsuleSizeMb = currentCapsule.totalSizeMb || 0;
    if (
      !currentCapsule.id ||
      capsuleSizeMb <= 0 ||
      !firstMediaUrl ||
      isVideoUrl(firstMediaUrl, 0, currentCapsule.mediaTypes)
    ) {
      return;
    }

    await cacheCapsuleSharpThumbnail(currentCapsule.id, firstMediaUrl);
  }, []);

  const getCompatibilityAccess = React.useCallback(async (): Promise<CapsuleMediaAccess> => {
    const currentCapsule = capsuleRef.current;
    if (!currentCapsule) {
      return { accessLevel: 'restricted', remainingFreeViews: 0, mediaUrls: [], thumbnailUrls: [] };
    }
    const resolveUrls = async (urls: string[] = [], paths: string[] = []) =>
      Promise.all(paths.length
        ? paths.map((path, index) =>
            urls[index] || (path ? storage().ref(path).getDownloadURL().catch(() => '') : ''),
          )
        : urls);
    const [mediaUrls, thumbnailUrls] = await Promise.all([
      resolveUrls(currentCapsule.mediaUrls, currentCapsule.mediaPaths),
      resolveUrls(currentCapsule.thumbnailUrls, currentCapsule.thumbnailPaths),
    ]);
    return {
      accessLevel: 'full',
      remainingFreeViews: 0,
      mediaUrls: mediaUrls.filter(Boolean),
      thumbnailUrls: thumbnailUrls.filter(Boolean),
    };
  }, []);

  const prepareFullQualityAccess = React.useCallback(async (
    requestFullQuality = false,
  ): Promise<CapsuleMediaAccess | null> => {
    const currentCapsule = capsuleRef.current;
    if (!user?.id || !currentCapsule) {
      return null;
    }

    const result = await withTimeout(getCapsuleMediaAccess(currentCapsule.id, requestFullQuality), 6000)
      .catch(() => getCompatibilityAccess());
    setAccessLevel(result.accessLevel);
    setRemainingFreeViews(result.remainingFreeViews);
    setResolvedThumbnailUrls(result.thumbnailUrls);
    if (result.accessLevel !== 'full') {
      return result;
    }

    setResolvedFullMediaUrls(result.mediaUrls);
    await cacheSharpCoverAfterQuota(result.mediaUrls);
    useAuthStore.getState().syncSubscription().catch(() => {});
    return result;
  }, [cacheSharpCoverAfterQuota, getCompatibilityAccess, user?.id]);

  // ---------------------------------------------------------------------------
  // Set screen header styles dynamically
  // ---------------------------------------------------------------------------
  React.useEffect(() => {
    if (capsule) {
      navigation.setOptions({
        headerTransparent: false,
        headerStyle: {
          backgroundColor: tc.background,
        },
        headerTintColor: tc.text,
        headerShadowVisible: false,
      });
    }
  }, [capsule, tc, navigation]);

  // ---------------------------------------------------------------------------
  // Check access level on mount
  // ---------------------------------------------------------------------------
  React.useEffect(() => {
    const currentCapsule = capsuleRef.current;
    if (!user?.id || !currentCapsule) { return; }
    if (hasCheckedAccess.current) { return; }
    hasCheckedAccess.current = true;

    let active = true;
    const checkAccess = async () => {
      try {
        const access = await withTimeout(getCapsuleMediaAccess(currentCapsule.id), 6000);
        const level = access.accessLevel;

        if (!active) {
          return;
        }

        setAccessLevel(level);
        setRemainingFreeViews(access.remainingFreeViews);
        setResolvedThumbnailUrls(access.thumbnailUrls);
        if (level === 'full') {
          setResolvedFullMediaUrls(access.mediaUrls);
          await cacheSharpCoverAfterQuota(access.mediaUrls);
          useAuthStore.getState().syncSubscription().catch(() => {});
        }

        // Show modal automatically for restricted on first load
        if (level === 'restricted') {
          if (subscriptionSync?.isExpired) {
            setShowExpiredModal(true);
          } else if (subscriptionSync?.isDowngraded || subscriptionSync?.isOverQuota) {
            // Only auto-show the downgrade modal up to 3 times per month
            // After that, the inline banner is enough
            try {
              const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
              const now = new Date();
              const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
              const storageKey = `downgrade_modal_shown_${user.id}_${monthKey}`;
              const shown = Number(await AsyncStorage.getItem(storageKey)) || 0;
              if (shown < 3) {
                await AsyncStorage.setItem(storageKey, String(shown + 1));
                setShowDowngradeModal(true);
              }
            } catch {
              setShowDowngradeModal(true); // fallback: show modal on error
            }
          } else {
            setShowExpiredModal(true);
          }
        }
      } catch (error) {
        console.warn('Backend access check failed or timed out. Falling back to compatibility access:', error);
        try {
          const access = await withTimeout(getCompatibilityAccess(), 3500);
          if (!active) {
            return;
          }
          setAccessLevel(access.accessLevel);
          setRemainingFreeViews(access.remainingFreeViews);
          setResolvedThumbnailUrls(access.thumbnailUrls);
          setResolvedFullMediaUrls(access.mediaUrls);
          await cacheSharpCoverAfterQuota(access.mediaUrls);
        } catch (compatError) {
          console.error('Compatibility access check failed:', compatError);
          if (!active) {
            return;
          }
          // Ultimate fallback to prevent infinite loading screen!
          setAccessLevel('restricted');
          setRemainingFreeViews(0);
          setResolvedThumbnailUrls([]);
          setResolvedFullMediaUrls([]);
        }
      }
    };

    checkAccess().catch(() => {});
    return () => {
      active = false;
      hasCheckedAccess.current = false;
    };
  }, [user?.id, subscriptionSync?.isExpired, subscriptionSync?.isDowngraded, subscriptionSync?.isOverQuota, cacheSharpCoverAfterQuota, getCompatibilityAccess]);

  if (!capsule) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>{t('Không tìm thấy hộp ký ức')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadingKyUc || accessLevel === null) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: tc.background }]}>
        <ThemeBackground themeKey={capsule?.theme || 'default'} />
        <View style={styles.loadingInner}>
          <ActivityIndicator size="large" color={tc.primary} style={{ marginBottom: 16 }} />
          <Text style={[styles.loadingText, { color: tc.text }]}>{t('Đang khôi phục ký ức chất lượng gốc...')}</Text>
        </View>
      </View>
    );
  }

  const now = new Date();
  const openDate = new Date(capsule.openDateISO);
  const openedAtMs = openDate.getTime();
  const diffDays = (now.getTime() - openedAtMs) / (1000 * 60 * 60 * 24);
  const isOpenedAfter3Months = capsule.status === 'opened' && diffDays >= 90;

  // Whether to show full media or just thumbnails
  const showFullMedia = accessLevel === 'full';
  const fullMediaUrls = resolvedFullMediaUrls.filter(isValidMediaUri);
  const thumbnailMediaUrls = resolvedThumbnailUrls.filter(isValidMediaUri);
  const mediaUrls = showFullMedia ? fullMediaUrls : thumbnailMediaUrls;
  const mediaItems: MediaItem[] = mediaUrls.map((uri, index) => {
    const type = isVideoUrl(uri, index, capsule.mediaTypes) ? 'video' : 'image';
    return {
      id: `${capsule.id}-${index}`,
      uri,
      type,
      thumbnailUri: thumbnailMediaUrls[index],
    };
  });
  const hasMedia = mediaUrls.length > 0;

  const mediaSummary = (() => {
    const counts = mediaItems.reduce(
      (summary, item) => {
        if (item.type === 'video') {
          summary.videos += 1;
        } else {
          summary.images += 1;
        }
        return summary;
      },
      { images: 0, videos: 0 },
    );

    const parts: string[] = [];
    if (counts.images > 0) {
      parts.push(`${counts.images} ảnh`);
    }
    if (counts.videos > 0) {
      parts.push(`${counts.videos} video`);
    }
    return parts.join(' · ');
  })();

  const shareCapsule = async () => {
    try {
      const { inviteCode } = await getCapsuleInviteToken(capsule.id);
      await Share.share({
        title: capsule.title,
        message: `Xem hộp ký ức: ${createCapsuleInviteUrl(inviteCode)}`,
      });
    } catch (error) {
      PolishedAlert.show(
        t('Lỗi'),
        error instanceof Error ? error.message : t('Không thể chia sẻ hộp ký ức lúc này.'),
      );
    }
  };

  const handleViewFullContent = async () => {
    if (!user?.id) { return; }

    if (accessLevel === 'free_view') {
      const access = await prepareFullQualityAccess(true);
      if (access?.accessLevel !== 'full') {
        PolishedAlert.show(t('Lỗi'), t('Không thể xác nhận dung lượng. Vui lòng thử lại.'));
        return;
      }
      setShowExpiredModal(false);
    }
  };

  const saveAllMedia = async () => {
    if (mediaItems.length === 0) {
      PolishedAlert.show('Chưa có ảnh/video', 'Hộp ký ức này không có ảnh hoặc video để lưu.');
      return;
    }

    // Block download if restricted
    if (accessLevel === 'restricted') {
      if (subscriptionSync?.isExpired) {
        setShowExpiredModal(true);
      } else {
        setShowDowngradeModal(true);
      }
      return;
    }

    try {
      setIsSaving(true);
      setDownloadProgress(0);

      const access = await prepareFullQualityAccess(accessLevel === 'free_view');
      if (access?.accessLevel !== 'full') {
        throw new Error('Full-quality access is unavailable.');
      }

      const mediaToSave = access.mediaUrls.map((uri, index) => ({
        id: `${capsule.id}-${index}`,
        uri,
        type: isVideoUrl(uri, index, capsule.mediaTypes) ? 'video' as const : 'image' as const,
        thumbnailUri: thumbnailMediaUrls[index],
      }));
      const totalCount = mediaToSave.length;
      let successCount = 0;

      for (let i = 0; i < totalCount; i++) {
        const item = mediaToSave[i];
        const ok = await saveMediaToGallery(item, (percent) => {
          const cumulativePercent = Math.round(((i * 100) + percent) / totalCount);
          setDownloadProgress(cumulativePercent);
        });
        if (ok) {
          successCount++;
        }
      }

      // Show toast message using RN ToastAndroid or native Alert
      const { ToastAndroid, Platform } = await import('react-native');
      const msg = `Đã lưu thành công ${successCount}/${totalCount} tệp vào thư viện!`;
      if (Platform.OS === 'android') {
        ToastAndroid.show(msg, ToastAndroid.LONG);
      } else {
        PolishedAlert.show('Thành công', msg);
      }
    } catch {
      PolishedAlert.show(
        'Lỗi lưu tệp',
        'Đã xảy ra lỗi khi tải và lưu các tệp về thư viện.',
      );
    } finally {
      setIsSaving(false);
      setDownloadProgress(0);
    }
  };

  const handleDelete = () => {
    PolishedAlert.show(
      t('Xóa hộp ký ức?'),
      t('Hộp ký ức này đã được mở trên 3 tháng (90 ngày). Bạn có chắc chắn muốn xóa vĩnh viễn khỏi đám mây để giải phóng dung lượng không? Hãy tải ảnh về máy trước khi xóa.'),
      [
        { text: t('Hủy'), style: 'cancel' },
        {
          text: t('Xóa vĩnh viễn'),
          style: 'destructive',
          onPress: async () => {
            const success = await deleteCapsule(capsule.id);
            if (success) {
              PolishedAlert.show(t('Đã xóa'), t('Hộp ký ức đã được xóa vĩnh viễn khỏi hệ thống.'));
              navigation.navigate('Tabs', { screen: 'Home' });
            } else {
              PolishedAlert.show(t('Lỗi'), t(capsuleError || '') || t('Xóa hộp ký ức thất bại.'));
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: tc.background }}>
      <ThemeBackground themeKey={capsule.theme} />
      <StatusBar barStyle={activeTheme.statusBar} translucent backgroundColor="transparent" />
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.container}>

            {/* Restricted access banner */}
            {accessLevel !== 'full' && (
              <View style={[styles.restrictedBanner, { backgroundColor: tc.cardBg, borderColor: tc.accent }]}>
                <View style={styles.restrictedRow}>
                  <AppIcon name="lock-closed" size={18} color={tc.accent} />
                  <Text style={[styles.restrictedText, { color: tc.mutedText }]}>
                    {accessLevel === 'free_view'
                      ? `Đã vượt giới hạn 50MB/tháng. Bạn còn ${remainingFreeViews} lượt xem và tải xuống 1 lần miễn phí / 24h trong tháng.`
                      : 'Gói lưu trữ đã hết hạn hoặc vượt quá giới hạn 50MB/tháng. Nâng cấp để xem nội dung gốc chất lượng cao.'}
                  </Text>
                </View>
                {accessLevel === 'free_view' && (
                  <PrimaryButton
                    label="Xem đầy đủ"
                    iconName="eye-outline"
                    onPress={handleViewFullContent}
                    style={{ marginTop: 8, minHeight: 40, backgroundColor: tc.buttonBg }}
                  />
                )}
                {accessLevel === 'restricted' && (
                  <PrimaryButton
                    label="Gia hạn gói"
                    iconName="star"
                    onPress={() => setShowExpiredModal(true)}
                    style={{ marginTop: 8, minHeight: 40, backgroundColor: tc.buttonBg }}
                  />
                )}
              </View>
            )}

            {/* Combined Media Collage (Static Artistic Grid) */}
            {/* Artistic Collage/Gallery Layout */}
            {!hasMedia ? (
              <View style={[styles.coverHero, { backgroundColor: themeStyle.coverBg, borderColor: themeStyle.coverBorder }]}>
                <AppIcon name={themeStyle.iconName} size={46} color={themeStyle.detailAccent} />
                <ThemeDecoration pattern={themeStyle.cardPattern} />
              </View>
            ) : mediaUrls.length === 1 ? (
              <Pressable
                style={[styles.coverHero, { backgroundColor: themeStyle.coverBg, borderColor: themeStyle.coverBorder }]}
                onPress={() => { setPreviewIndex(0); setPreviewVisible(true); }}
              >
                <MediaThumbnail item={mediaItems[0]} index={0} style={styles.coverImage} iconSize={18} placeholderBg={tc.inputBg} textColor={tc.primary} />
                {!showFullMedia && (
                  <View style={styles.previewBadge}>
                    <Text style={styles.previewBadgeText}>{t('Bản xem trước')}</Text>
                  </View>
                )}
                <ThemeDecoration pattern={themeStyle.cardPattern} />
              </Pressable>
            ) : mediaUrls.length === 2 ? (
              <View style={styles.galleryRow}>
                <Pressable
                  style={[styles.galleryHalf, { borderColor: themeStyle.coverBorder }]}
                  onPress={() => { setPreviewIndex(0); setPreviewVisible(true); }}
                >
                  <MediaThumbnail item={mediaItems[0]} index={0} style={styles.collageImage} iconSize={16} placeholderBg={tc.inputBg} textColor={tc.primary} />
                </Pressable>
                <Pressable
                  style={[styles.galleryHalf, { borderColor: themeStyle.coverBorder }]}
                  onPress={() => { setPreviewIndex(1); setPreviewVisible(true); }}
                >
                  <MediaThumbnail item={mediaItems[1]} index={1} style={styles.collageImage} iconSize={16} placeholderBg={tc.inputBg} textColor={tc.primary} />
                </Pressable>
              </View>
            ) : mediaUrls.length === 3 ? (
              <View style={styles.galleryStack}>
                <Pressable
                  style={[styles.galleryHero, { borderColor: themeStyle.coverBorder }]}
                  onPress={() => { setPreviewIndex(0); setPreviewVisible(true); }}
                >
                  <MediaThumbnail item={mediaItems[0]} index={0} style={styles.collageImage} iconSize={18} placeholderBg={tc.inputBg} textColor={tc.primary} />
                </Pressable>
                <View style={styles.gallerySubRow}>
                  <Pressable
                    style={[styles.gallerySubHalf, { borderColor: themeStyle.coverBorder }]}
                    onPress={() => { setPreviewIndex(1); setPreviewVisible(true); }}
                  >
                    <MediaThumbnail item={mediaItems[1]} index={1} style={styles.collageImage} iconSize={14} placeholderBg={tc.inputBg} textColor={tc.primary} />
                  </Pressable>
                  <Pressable
                    style={[styles.gallerySubHalf, { borderColor: themeStyle.coverBorder }]}
                    onPress={() => { setPreviewIndex(2); setPreviewVisible(true); }}
                  >
                    <MediaThumbnail item={mediaItems[2]} index={2} style={styles.collageImage} iconSize={14} placeholderBg={tc.inputBg} textColor={tc.primary} />
                  </Pressable>
                </View>
              </View>
            ) : (
              // 4 or more media collage grid layout
              <View style={styles.galleryStack}>
                <Pressable
                  style={[styles.galleryHero, { borderColor: themeStyle.coverBorder }]}
                  onPress={() => { setPreviewIndex(0); setPreviewVisible(true); }}
                >
                  <MediaThumbnail item={mediaItems[0]} index={0} style={styles.collageImage} iconSize={18} placeholderBg={tc.inputBg} textColor={tc.primary} />
                </Pressable>
                <View style={styles.gallerySubRow}>
                  <Pressable
                    style={[styles.gallerySubThird, { borderColor: themeStyle.coverBorder }]}
                    onPress={() => { setPreviewIndex(1); setPreviewVisible(true); }}
                  >
                    <MediaThumbnail item={mediaItems[1]} index={1} style={styles.collageImage} iconSize={12} placeholderBg={tc.inputBg} textColor={tc.primary} />
                  </Pressable>
                  <Pressable
                    style={[styles.gallerySubThird, { borderColor: themeStyle.coverBorder }]}
                    onPress={() => { setPreviewIndex(2); setPreviewVisible(true); }}
                  >
                    <MediaThumbnail item={mediaItems[2]} index={2} style={styles.collageImage} iconSize={12} placeholderBg={tc.inputBg} textColor={tc.primary} />
                  </Pressable>
                  <Pressable
                    style={[styles.gallerySubThird, { borderColor: themeStyle.coverBorder }]}
                    onPress={() => { setPreviewIndex(3); setPreviewVisible(true); }}
                  >
                    <MediaThumbnail item={mediaItems[3]} index={3} style={styles.collageImage} iconSize={12} placeholderBg={tc.inputBg} textColor={tc.primary} />
                    {mediaUrls.length > 4 && (
                      <View style={styles.moreMediaOverlay}>
                        <Text style={styles.moreMediaText}>+{mediaUrls.length - 3}</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* Core Content Card: Title & Message */}
            <View style={[styles.themedCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
              {/* Title */}
              <Text style={[styles.title, { color: tc.text, marginBottom: 12 }]}>{capsule.title}</Text>

              {/* Message Box nested elegantly inside */}
              <View style={{ marginTop: 4 }}>
                <View style={[styles.messageIconRow, { marginBottom: 8 }]}>
                  <View style={[styles.messageIconWrap, { backgroundColor: tc.activeChipBg }]}>
                    <AppIcon name="mail-open-outline" size={18} color={tc.primary} />
                  </View>
                  <Text style={[styles.messageTitle, { color: tc.text, fontSize: 14, fontWeight: '700' }]}>{t('Lời nhắn')}</Text>
                </View>
                <View style={[styles.messageContent, { backgroundColor: tc.inputBg, borderColor: tc.inputBorder, borderRadius: 12, padding: 12 }]}>
                  <Text style={[styles.message, { color: tc.text, fontSize: 14, lineHeight: 20 }]}>
                    {capsule.message || t('Chưa có lời nhắn.')}
                  </Text>
                </View>
              </View>

              {hasMedia ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 }}>
                  <AppIcon name="bulb-outline" size={14} color={tc.primary} />
                  <Text style={{ color: tc.mutedText, fontStyle: 'italic', fontSize: 11, flex: 1 }}>
                    {t('Chạm vào ảnh/video để xem toàn màn hình, vuốt để xem tiếp.')}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Technical Metadata Card (Moved to the bottom) */}
            <View style={[styles.themedCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder, marginTop: 14, padding: 14 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <AppIcon name="calendar-outline" size={16} color={tc.primary} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: tc.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {t('Thông tin chi tiết')}
                </Text>
              </View>

              <View style={[styles.metaDivider, { backgroundColor: tc.cardBorder, marginVertical: 6 }]} />

              {ownerProfile && (
                <View style={styles.metaRow}>
                  <AppIcon name="person-outline" size={14} color={tc.primary} />
                  <Text style={[styles.meta, { color: tc.mutedText }]}>
                    {t('Tạo bởi:')} <Text style={{ color: tc.text, fontWeight: '600' }}>{ownerProfile.displayName || t('Thành viên')}</Text>
                  </Text>
                </View>
              )}

              <View style={styles.metaRow}>
                <AppIcon name="calendar-outline" size={14} color={tc.primary} />
                <Text style={[styles.meta, { color: tc.mutedText }]}>{t('Tạo ngày')} {formatDate(capsule.createdAtISO)}</Text>
              </View>

              <View style={styles.metaRow}>
                <AppIcon name="time-outline" size={14} color={tc.primary} />
                <Text style={[styles.meta, { color: tc.mutedText }]}>{t('Mở ngày')} {formatDate(capsule.openDateISO)}</Text>
              </View>

              {mediaSummary ? (
                <View style={styles.metaRow}>
                  <AppIcon name="images-outline" size={14} color={tc.primary} />
                  <Text style={[styles.mediaSummary, { color: tc.text }]}>{mediaSummary}</Text>
                </View>
              ) : null}

              {capsule.totalSizeMb ? (
                <View style={styles.metaRow}>
                  <AppIcon name="cloud-outline" size={14} color={tc.primary} />
                  <Text style={[styles.sizeInfo, { color: tc.mutedText }]}>
                    Dung lượng: <Text style={{ color: tc.text, fontWeight: '600' }}>
                      {capsule.totalSizeMb >= 1 ? `${capsule.totalSizeMb.toFixed(1)}MB` : `${(capsule.totalSizeMb * 1024).toFixed(0)}KB`}
                    </Text>
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Interactive Media Action Buttons */}
            <View style={styles.actions}>
              <Pressable
                onPress={shareCapsule}
                style={[styles.themedActionButton, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}
              >
                <AppIcon name="share-social-outline" size={18} color={tc.primary} />
                <Text style={[styles.themedActionLabel, { color: tc.primary }]}>{t('Chia sẻ')}</Text>
              </Pressable>
              <Pressable
                onPress={saveAllMedia}
                disabled={isSaving || !hasMedia}
                style={[styles.themedActionButton, { backgroundColor: tc.buttonBg, borderColor: tc.buttonBg, opacity: (isSaving || !hasMedia) ? 0.6 : 1 }]}
              >
                <AppIcon name="download-outline" size={18} color={tc.buttonText} />
                <Text style={[styles.themedActionLabel, { color: tc.buttonText }]}>
                  {isSaving ? `${t('Đang lưu')} (${downloadProgress}%)` : t('Lưu tất cả')}
                </Text>
              </Pressable>
            </View>

            {/* Delete button if opened over 3 months */}
            {isOpenedAfter3Months ? (
              <PrimaryButton
                    label={t('Xóa vĩnh viễn khỏi đám mây')}
                iconName="trash-outline"
                variant="danger"
                onPress={handleDelete}
                style={{ marginTop: 12, minHeight: 48 }}
              />
            ) : null}
          </View>
        </ScrollView>

        {/* Fullscreen media viewer for Capsule Detail only. */}
        <MediaViewerModal
          visible={previewVisible}
          media={mediaItems}
          initialIndex={previewIndex}
          onClose={() => setPreviewVisible(false)}
          allowDownload={accessLevel !== 'restricted'}
          onRestrictedAction={() => {
            setPreviewVisible(false);
            if (subscriptionSync?.isExpired) {
              setShowExpiredModal(true);
            } else {
              setShowDowngradeModal(true);
            }
          }}
        />

        {/* Expired Plan Modal */}
        <ExpiredPlanModal
          visible={showExpiredModal}
          remainingFreeViews={remainingFreeViews}
          onUseFreeView={async () => {
            await handleViewFullContent();
            setShowExpiredModal(false);
          }}
          onUpgrade={() => {
            setShowExpiredModal(false);
            setShowPremiumModal(true);
          }}
          onDismiss={() => setShowExpiredModal(false)}
        />

        {/* Downgrade Plan Modal */}
        <DowngradePlanModal
          visible={showDowngradeModal}
          currentPlan={userPlan}
          usedStorageMb={usedStorageMb}
          onStayInLimit={() => setShowDowngradeModal(false)}
          onUpgrade={() => {
            setShowDowngradeModal(false);
            setShowPremiumModal(true);
          }}
          onManageStorage={() => {
            setShowDowngradeModal(false);
            navigation.navigate('StorageManagement');
          }}
          onDismiss={() => setShowDowngradeModal(false)}
        />

        {/* Premium Upgrade Modal */}
        <PremiumModal
          visible={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
        />
      </SafeAreaView>
    </View>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'transparent' },
    scrollContent: { paddingTop: 8, paddingBottom: 32 },
    container: { padding: 16 },


    // Restricted banner
    restrictedBanner: {
      borderWidth: 1.5,
      padding: 14,
      marginBottom: 16,
      borderRadius: 18,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    restrictedRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    restrictedText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
    },

    // Cover hero
    coverHero: {
      height: 280,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      borderWidth: 1.5,
      overflow: 'hidden',
    },
    coverImage: { width: '100%', height: '100%' },
    thumbnailFrame: {
      overflow: 'hidden',
      position: 'relative',
    },
    thumbnailFill: {
      width: '100%',
      height: '100%',
    },
    videoThumbPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#111827',
    },
    previewBadge: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    previewBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '600',
    },

    // Themed card (replaces ElevatedCard)
    themedCard: {
      borderRadius: 20,
      borderWidth: 1.5,
      padding: 18,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
    metaDivider: { height: 1, marginVertical: 12, borderRadius: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 3 },
    meta: { fontSize: 13, fontWeight: '500' },
    mediaSummary: { fontSize: 13, fontWeight: '600' },
    sizeInfo: { fontSize: 12 },
    mediaHint: { marginTop: 10, fontSize: 12, lineHeight: 18 },

    // Message card
    messageBox: { marginTop: 16 },
    messageIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    messageIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    messageEmoji: { fontSize: 18 },
    messageTitle: { fontWeight: '800', fontSize: 16 },
    messageContent: { borderRadius: 14, borderWidth: 1, padding: 14 },
    message: { lineHeight: 22, fontSize: 14 },

    // Action buttons
    actions: { marginTop: 16, flexDirection: 'row', gap: 10 },
    themedActionButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 14,
      borderWidth: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    themedActionLabel: { fontSize: 14, fontWeight: '700' },

    // Artistic Collage Styles
    // Artistic Collage/Gallery Styles
    galleryRow: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    galleryHalf: {
      width: '48.5%',
      aspectRatio: 1.1,
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1.5,
    },
    galleryStack: {
      width: '100%',
      marginBottom: 16,
    },
    galleryHero: {
      width: '100%',
      height: 220,
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1.5,
      marginBottom: 10,
    },
    gallerySubRow: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    gallerySubHalf: {
      width: '48.5%',
      height: 110,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1.5,
    },
    gallerySubThird: {
      width: '31.8%',
      height: 82,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1.5,
      position: 'relative',
    },
    collageImage: {
      width: '100%',
      height: '100%',
    },
    miniPlayOverlay: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
    },
    moreMediaOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 3,
    },
    moreMediaText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
    },
    loadingScreen: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    loadingInner: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      borderRadius: 24,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    },
    loadingText: {
      fontSize: 13,
      fontWeight: '600',
      opacity: 0.85,
      marginTop: 8,
      textAlign: 'center',
    },
  });
