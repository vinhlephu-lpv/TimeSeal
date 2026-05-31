import React from 'react';
import { Alert, Image, Pressable, ScrollView, StatusBar, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import type { AppStackParamList } from '../../types/navigation';
import { useCapsuleStore } from '../../store/capsuleStore';
import { useAuthStore } from '../../store/authStore';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { capsuleThemes, getThemeStyle, ThemeBackground } from '../../theme/capsuleThemes';
import { formatDate } from '../../utils/dateHelpers';
import { type PlanType } from '../../config/plans';
import { getViewAccessLevel, consumeFreeView, getRemainingFreeViews, type ViewAccessLevel } from '../../services/freeViewService';
import { addBandwidthUsage } from '../../services/subscriptionService';
import { AppIcon, PrimaryButton } from '../../components/ui/DesignPrimitives';
import { ThemeDecoration } from '../../components/capsule/ThemeDecorations';
import { MediaViewerModal, type MediaItem } from '../../components/capsule/MediaViewerModal';
import { ExpiredPlanModal } from '../../components/modals/ExpiredPlanModal';
import { DowngradePlanModal } from '../../components/modals/DowngradePlanModal';
import { PremiumModal } from '../../components/modals/PremiumModal';
import { saveMediaToGallery } from '../../services/saveMediaToGallery';

type Props = NativeStackScreenProps<AppStackParamList, 'CapsuleDetail'>;

const isValidMediaUri = (uri: unknown): uri is string =>
  typeof uri === 'string' && /^(https?:|file:|content:|data:(image|video)\/)/.test(uri);

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
}: {
  item: MediaItem;
  style: StyleProp<ViewStyle>;
  iconSize?: number;
  placeholderBg?: string;
  textColor?: string;
}) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const thumbnailUri = item.type === 'video' ? item.thumbnailUri : item.thumbnailUri || item.uri;
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
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [previewVisible, setPreviewVisible] = React.useState(false);
  const [previewIndex, setPreviewIndex] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);
  const [accessLevel, setAccessLevel] = React.useState<ViewAccessLevel>('full');
  const [remainingFreeViews, setRemainingFreeViews] = React.useState(0);
  const [showExpiredModal, setShowExpiredModal] = React.useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = React.useState(false);
  const [showPremiumModal, setShowPremiumModal] = React.useState(false);
  const [ownerProfile, setOwnerProfile] = React.useState<{ displayName?: string; avatarUrl?: string; email?: string } | null>(null);

  const capsule = useCapsuleStore(s => s.capsules.find(i => i.id === route.params.capsuleId));
  const deleteCapsule = useCapsuleStore(s => s.deleteCapsule);
  const capsuleError = useCapsuleStore(s => s.error);

  const user = useAuthStore(s => s.user);

  React.useEffect(() => {
    if (!capsule?.ownerId) { return; }

    if (capsule.ownerId === user?.id) {
      setOwnerProfile({
        displayName: 'Tôi',
        avatarUrl: user?.avatarUrl,
        email: user?.email,
      });
      return;
    }

    firestore().collection('users').doc(capsule.ownerId).get()
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
  }, [capsule?.ownerId, user?.id, user]);
  const bandwidthRecordedRef = React.useRef(false);
  const subscriptionSync = useAuthStore(s => s.subscriptionSync);

  const userPlan: PlanType = user?.plan || 'free';
  const usedStorageMb = subscriptionSync?.usedStorageMb ?? 0;
  const themeStyle = getThemeStyle(capsule?.theme);

  // Theme-aware colors — same pattern as CREATE flow
  const activeTheme = capsuleThemes[capsule?.theme || 'default'] || capsuleThemes.default;
  const tc = activeTheme.colors;

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
    if (!user?.id || !capsule) { return; }

    const checkAccess = async () => {
      const capsuleSizeMb = capsule.totalSizeMb || 0;
      const level = await getViewAccessLevel(
        user.id, userPlan, usedStorageMb, capsuleSizeMb,
        subscriptionSync?.previousPlan as PlanType | undefined,
        subscriptionSync?.isExpired,
      );
      setAccessLevel(level);

      const views = await getRemainingFreeViews(user.id);
      setRemainingFreeViews(views);

      // Record bandwidth usage if they have full quality access and it has not been recorded in this session yet
      if (level === 'full' && !bandwidthRecordedRef.current) {
        bandwidthRecordedRef.current = true;
        await addBandwidthUsage(user.id, capsuleSizeMb, capsule.id);
        // Refresh subscription metadata silently to sync new storage numbers immediately
        useAuthStore.getState().syncSubscription();
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
    };

    checkAccess();
  }, [user?.id, capsule?.id, userPlan, usedStorageMb, capsule, subscriptionSync?.previousPlan, subscriptionSync?.isExpired, subscriptionSync?.isDowngraded, subscriptionSync?.isOverQuota]);

  if (!capsule) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>Không tìm thấy capsule</Text>
        </View>
      </SafeAreaView>
    );
  }

  const now = new Date();
  const openDate = new Date(capsule.openDateISO);
  const openedAtMs = openDate.getTime();
  const diffDays = (now.getTime() - openedAtMs) / (1000 * 60 * 60 * 24);
  const isOpenedAfter3Months = capsule.status === 'opened' && diffDays >= 90;

  // Whether to show full media or just thumbnails
  const showFullMedia = accessLevel === 'full';
  const fullMediaUrls = (capsule.mediaUrls || []).filter(isValidMediaUri);
  const thumbnailMediaUrls = (capsule.thumbnailUrls || capsule.mediaUrls || []).filter(isValidMediaUri);
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
  const primaryMediaIsVideo = mediaItems[0]?.type === 'video';
  const primaryMediaLabel = primaryMediaIsVideo ? 'video' : 'ảnh';

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
    await import('react-native').then(({ Share }) =>
      Share.share({ title: capsule.title, message: `Xem capsule: https://timeseal-bba5a.web.app/invite?capsuleId=${capsule.id}` }),
    ).catch(() => {});
  };

  const handleViewFullContent = async () => {
    if (!user?.id) { return; }

    if (accessLevel === 'free_view') {
      await consumeFreeView(user.id);
      setAccessLevel('full');
      setRemainingFreeViews(prev => Math.max(0, prev - 1));
      setShowExpiredModal(false);

      // Record bandwidth!
      await addBandwidthUsage(user.id, capsule.totalSizeMb || 0, capsule.id);
      useAuthStore.getState().syncSubscription();
    }
  };

  const saveAllMedia = async () => {
    if (mediaItems.length === 0) {
      Alert.alert('Chưa có ảnh/video', 'Capsule này không có ảnh hoặc video để lưu.');
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

    // If free_view, consume the view
    if (accessLevel === 'free_view' && user?.id) {
      await consumeFreeView(user.id);
      setAccessLevel('full');
      setRemainingFreeViews(prev => Math.max(0, prev - 1));
    }

    try {
      setIsSaving(true);
      setDownloadProgress(0);

      if (user?.id) {
        await addBandwidthUsage(user.id, capsule.totalSizeMb || 0, capsule.id);
        await useAuthStore.getState().syncSubscription();
      }

      const totalCount = mediaItems.length;
      let successCount = 0;

      for (let i = 0; i < totalCount; i++) {
        const item = mediaItems[i];
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
        Alert.alert('Thành Công', msg);
      }
    } catch {
      Alert.alert(
        'Lỗi Lưu Tệp',
        'Đã xảy ra lỗi khi tải và lưu các tệp về thư viện.',
      );
    } finally {
      setIsSaving(false);
      setDownloadProgress(0);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Xoá Capsule?',
      'Ký ức này đã được mở trên 3 tháng (90 ngày). Bạn có chắc chắn muốn xoá vĩnh viễn khỏi đám mây để giải phóng dung lượng tài nguyên không? (Hãy tải ảnh về máy trước khi xoá).',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteCapsule(capsule.id);
            if (success) {
              Alert.alert('Đã xoá', 'Ký ức đã được xoá vĩnh viễn khỏi hệ thống.');
              navigation.navigate('Tabs', { screen: 'Home' });
            } else {
              Alert.alert('Lỗi', capsuleError || 'Xoá capsule thất bại.');
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>

            {/* Restricted access banner */}
            {accessLevel !== 'full' && (
              <View style={[styles.restrictedBanner, { backgroundColor: tc.cardBg, borderColor: tc.accent }]}>
                <View style={styles.restrictedRow}>
                  <AppIcon name="lock-closed" size={18} color={tc.accent} />
                  <Text style={[styles.restrictedText, { color: tc.mutedText }]}>
                    {accessLevel === 'free_view'
                      ? `Bạn đang xem bản xem trước. Bạn còn ${remainingFreeViews} lượt xem đầy đủ miễn phí tháng này.`
                      : 'Gói lưu trữ đã hết hạn. Nâng cấp để xem nội dung gốc chất lượng cao.'}
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
                <MediaThumbnail item={mediaItems[0]} style={styles.coverImage} iconSize={18} placeholderBg={tc.inputBg} textColor={tc.primary} />
                {!showFullMedia && (
                  <View style={styles.previewBadge}>
                    <Text style={styles.previewBadgeText}>Bản xem trước</Text>
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
                  <MediaThumbnail item={mediaItems[0]} style={styles.collageImage} iconSize={16} placeholderBg={tc.inputBg} textColor={tc.primary} />
                </Pressable>
                <Pressable
                  style={[styles.galleryHalf, { borderColor: themeStyle.coverBorder }]}
                  onPress={() => { setPreviewIndex(1); setPreviewVisible(true); }}
                >
                  <MediaThumbnail item={mediaItems[1]} style={styles.collageImage} iconSize={16} placeholderBg={tc.inputBg} textColor={tc.primary} />
                </Pressable>
              </View>
            ) : mediaUrls.length === 3 ? (
              <View style={styles.galleryStack}>
                <Pressable
                  style={[styles.galleryHero, { borderColor: themeStyle.coverBorder }]}
                  onPress={() => { setPreviewIndex(0); setPreviewVisible(true); }}
                >
                  <MediaThumbnail item={mediaItems[0]} style={styles.collageImage} iconSize={18} placeholderBg={tc.inputBg} textColor={tc.primary} />
                </Pressable>
                <View style={styles.gallerySubRow}>
                  <Pressable
                    style={[styles.gallerySubHalf, { borderColor: themeStyle.coverBorder }]}
                    onPress={() => { setPreviewIndex(1); setPreviewVisible(true); }}
                  >
                    <MediaThumbnail item={mediaItems[1]} style={styles.collageImage} iconSize={14} placeholderBg={tc.inputBg} textColor={tc.primary} />
                  </Pressable>
                  <Pressable
                    style={[styles.gallerySubHalf, { borderColor: themeStyle.coverBorder }]}
                    onPress={() => { setPreviewIndex(2); setPreviewVisible(true); }}
                  >
                    <MediaThumbnail item={mediaItems[2]} style={styles.collageImage} iconSize={14} placeholderBg={tc.inputBg} textColor={tc.primary} />
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
                  <MediaThumbnail item={mediaItems[0]} style={styles.collageImage} iconSize={18} placeholderBg={tc.inputBg} textColor={tc.primary} />
                </Pressable>
                <View style={styles.gallerySubRow}>
                  <Pressable
                    style={[styles.gallerySubThird, { borderColor: themeStyle.coverBorder }]}
                    onPress={() => { setPreviewIndex(1); setPreviewVisible(true); }}
                  >
                    <MediaThumbnail item={mediaItems[1]} style={styles.collageImage} iconSize={12} placeholderBg={tc.inputBg} textColor={tc.primary} />
                  </Pressable>
                  <Pressable
                    style={[styles.gallerySubThird, { borderColor: themeStyle.coverBorder }]}
                    onPress={() => { setPreviewIndex(2); setPreviewVisible(true); }}
                  >
                    <MediaThumbnail item={mediaItems[2]} style={styles.collageImage} iconSize={12} placeholderBg={tc.inputBg} textColor={tc.primary} />
                  </Pressable>
                  <Pressable
                    style={[styles.gallerySubThird, { borderColor: themeStyle.coverBorder }]}
                    onPress={() => { setPreviewIndex(3); setPreviewVisible(true); }}
                  >
                    <MediaThumbnail item={mediaItems[3]} style={styles.collageImage} iconSize={12} placeholderBg={tc.inputBg} textColor={tc.primary} />
                    {mediaUrls.length > 4 && (
                      <View style={styles.moreMediaOverlay}>
                        <Text style={styles.moreMediaText}>+{mediaUrls.length - 3}</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* Information Card */}
            <View style={[styles.themedCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
              <Text style={[styles.title, { color: tc.text }]}>{capsule.title}</Text>

              {ownerProfile && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                  <AppIcon name="person-outline" size={14} color={tc.primary} />
                  <Text style={{ fontSize: 13, color: tc.mutedText }}>
                    Tạo bởi: <Text style={{ color: tc.text, fontWeight: '600' }}>{ownerProfile.displayName || 'Thành viên'}</Text>
                  </Text>
                </View>
              )}

              <View style={[styles.metaDivider, { backgroundColor: tc.cardBorder }]} />
              <View style={styles.metaRow}>
                <AppIcon name="calendar-outline" size={14} color={tc.primary} />
                <Text style={[styles.meta, { color: tc.mutedText }]}>Tạo ngày {formatDate(capsule.createdAtISO)}</Text>
              </View>
              <View style={styles.metaRow}>
                <AppIcon name="time-outline" size={14} color={tc.primary} />
                <Text style={[styles.meta, { color: tc.mutedText }]}>Mở ngày {formatDate(capsule.openDateISO)}</Text>
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
                    {capsule.totalSizeMb >= 1 ? `${capsule.totalSizeMb.toFixed(1)}MB` : `${(capsule.totalSizeMb * 1024).toFixed(0)}KB`}
                  </Text>
                </View>
              ) : null}
              {hasMedia ? (
                <Text style={[styles.mediaHint, { color: tc.mutedText }]}>
                  Chạm vào ảnh/video để xem toàn màn hình, vuốt để xem tiếp.
                </Text>
              ) : null}
            </View>

            {/* Message Box */}
            <View style={[styles.themedCard, styles.messageBox, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
              <View style={[styles.messageIconRow]}>
                <View style={[styles.messageIconWrap, { backgroundColor: tc.activeChipBg }]}>
                  <Text style={styles.messageEmoji}>💌</Text>
                </View>
                <Text style={[styles.messageTitle, { color: tc.text }]}>Lời nhắn</Text>
              </View>
              <View style={[styles.messageContent, { backgroundColor: tc.inputBg, borderColor: tc.inputBorder }]}>
                <Text style={[styles.message, { color: tc.text }]}>{capsule.message || 'Chưa có lời nhắn.'}</Text>
              </View>
            </View>

            {/* Interactive Media Action Buttons */}
            <View style={styles.actions}>
              <Pressable
                onPress={shareCapsule}
                style={[styles.themedActionButton, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}
              >
                <AppIcon name="share-social-outline" size={18} color={tc.primary} />
                <Text style={[styles.themedActionLabel, { color: tc.primary }]}>Chia sẻ</Text>
              </Pressable>
              <Pressable
                onPress={saveAllMedia}
                disabled={isSaving || !hasMedia}
                style={[styles.themedActionButton, { backgroundColor: tc.buttonBg, borderColor: tc.buttonBg, opacity: (isSaving || !hasMedia) ? 0.6 : 1 }]}
              >
                <AppIcon name="download-outline" size={18} color={tc.buttonText} />
                <Text style={[styles.themedActionLabel, { color: tc.buttonText }]}>
                  {isSaving ? `Đang lưu (${downloadProgress}%)` : 'Lưu tất cả'}
                </Text>
              </Pressable>
            </View>

            {/* Delete button if opened over 3 months */}
            {isOpenedAfter3Months ? (
              <PrimaryButton
                label="Xoá vĩnh viễn khỏi đám mây"
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
  });
