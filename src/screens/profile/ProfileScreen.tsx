import React from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PolishedAlert } from '../../store/alertStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useAuthStore } from '../../store/authStore';
import { useCapsuleStore } from '../../store/capsuleStore';
import { PremiumModal } from '../../components/modals/PremiumModal';
import { PLAN_LIMITS } from '../../config/plans';
import { getFreeCapsuleLimit, REWARDED_CAPSULE_SLOT_LIMIT } from '../../config/rewardCapsuleSlots';
import { getPlanStorageLabel } from '../../services/subscriptionService';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { AppIcon, ElevatedCard, SoftScreen, cardShadow, uiShadow } from '../../components/ui/DesignPrimitives';
import { launchImageLibrary } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import { suppressBiometricAutoLock } from '../../services/biometricLockGuard';
import { useTranslation } from '../../i18n';
import { cacheLocalAvatarUri, useCachedAvatarUri } from '../../services/avatarCacheService';
import { abandonAvatarDraft, createAvatarDraft, finalizeAvatarUpload } from '../../services/backendService';

export function ProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const user = useAuthStore(state => state.user);
  const subscriptionSync = useAuthStore(state => state.subscriptionSync);
  const isPremium = Boolean(user?.isPremium);
  const isPaidPlan = (user?.plan || 'free') !== 'free';
  const capsules = useCapsuleStore(state => state.capsules);
  const [showPremiumModal, setShowPremiumModal] = React.useState(false);
  const [showPlanDetails, setShowPlanDetails] = React.useState(false);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const [pendingAvatarUri, setPendingAvatarUri] = React.useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = React.useState(false);
  const refreshProfile = useAuthStore(state => state.refreshProfile);

  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const freeCapsuleLimit = getFreeCapsuleLimit(user?.rewardedCapsuleSlots);

  const planInfo = React.useMemo(() => {
    const plan = user?.plan || 'free';
    const copyLimits = {
      free: { upload: '5MB' },
      pro_max: { upload: '1GB (1024MB)' },
    };
    const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)} phút`;
    switch (plan) {
      case 'plus':
        return {
          title: t('Gói Plus'),
          levelLabel: t('Thành viên Plus'),
          color: '#6366F1', // Indigo
          bg: isDark ? 'rgba(99, 102, 241, 0.08)' : '#F5F3FF',
          border: isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.2)',
          icon: 'sparkles',
          summary: t('{{storage}} vĩnh viễn, {{photos}} ảnh + {{videos}} video', {
            storage: getPlanStorageLabel('plus'),
            photos: PLAN_LIMITS.plus.maxPhotosPerCapsule,
            videos: PLAN_LIMITS.plus.maxVideosPerCapsule,
          }),
          desc: t('Plus mở rộng dung lượng cá nhân, hỗ trợ video ngắn và toàn bộ theme cao cấp.'),
          badge: 'PLUS',
          benefits: [
            t('Dung lượng tài khoản: {{storage}} vĩnh viễn', { storage: getPlanStorageLabel('plus') }),
            t('Không giới hạn số hộp ký ức'),
            t('Dung lượng tối đa mỗi hộp: {{size}}MB', { size: PLAN_LIMITS.plus.maxCapsuleSizeMb }),
            t('Tối đa {{photos}} ảnh và {{videos}} video trong mỗi hộp', {
              photos: PLAN_LIMITS.plus.maxPhotosPerCapsule,
              videos: PLAN_LIMITS.plus.maxVideosPerCapsule,
            }),
            t('Mỗi video dưới {{duration}}', { duration: formatDuration(PLAN_LIMITS.plus.maxVideoDurationSeconds) }),
            t('Lời nhắn tối đa {{count}} ký tự', { count: PLAN_LIMITS.plus.maxMessageLength }),
            t('Mở toàn bộ theme cao cấp'),
          ],
        };
      case 'pro':
        return {
          title: t('Gói Pro'),
          levelLabel: t('Thành viên Pro'),
          color: '#F59E0B', // Gold/Amber
          bg: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FEF3C7',
          border: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.3)',
          icon: 'star',
          summary: t('{{storage}} vĩnh viễn, hỗ trợ nhóm đóng góp', {
            storage: getPlanStorageLabel('pro'),
          }),
          desc: t('Pro phù hợp cho kỷ niệm nhóm nhỏ, mở hộp ký ức nhóm đóng góp và nhiều dung lượng hơn.'),
          badge: 'PRO',
          benefits: [
            t('Dung lượng tài khoản: {{storage}} vĩnh viễn', { storage: getPlanStorageLabel('pro') }),
            t('Không giới hạn số hộp ký ức'),
            t('Dung lượng tối đa mỗi hộp: {{size}}MB', { size: PLAN_LIMITS.pro.maxCapsuleSizeMb }),
            t('Tối đa {{photos}} ảnh và {{videos}} video trong mỗi hộp', {
              photos: PLAN_LIMITS.pro.maxPhotosPerCapsule,
              videos: PLAN_LIMITS.pro.maxVideosPerCapsule,
            }),
            t('Mỗi video dưới {{duration}}', { duration: formatDuration(PLAN_LIMITS.pro.maxVideoDurationSeconds) }),
            t('Lời nhắn tối đa {{count}} ký tự', { count: PLAN_LIMITS.pro.maxMessageLength }),
            t('Mở toàn bộ theme cao cấp'),
            t('Mở tính năng hộp ký ức nhóm đóng góp'),
          ],
        };
      case 'pro_max':
        return {
          title: t('Gói Pro Max'),
          levelLabel: t('Thành viên Pro Max'),
          color: '#10B981', // Emerald/Mint
          bg: isDark ? 'rgba(16, 185, 129, 0.08)' : '#E6FFFA',
          border: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.35)',
          icon: 'diamond',
          summary: t('{{storage}} vĩnh viễn, hạng cao nhất', {
            storage: getPlanStorageLabel('pro_max'),
          }),
          desc: t('Pro Max là hạng cao nhất cho bộ sưu tập lớn, nhóm đông và quyền lợi đầy đủ nhất.'),
          badge: 'PRO MAX',
          benefits: [
            t('Dung lượng tài khoản: {{storage}} vĩnh viễn', { storage: getPlanStorageLabel('pro_max') }),
            t('Không giới hạn số hộp ký ức'),
            t('Dung lượng tối đa mỗi hộp: {{size}}', { size: copyLimits.pro_max.upload }),
            t('Tối đa {{photos}} ảnh và {{videos}} video trong mỗi hộp', {
              photos: PLAN_LIMITS.pro_max.maxPhotosPerCapsule,
              videos: PLAN_LIMITS.pro_max.maxVideosPerCapsule,
            }),
            t('Mỗi video dưới {{duration}}', { duration: formatDuration(PLAN_LIMITS.pro_max.maxVideoDurationSeconds) }),
            t('Lời nhắn tối đa {{count}} ký tự', { count: PLAN_LIMITS.pro_max.maxMessageLength }),
            t('Mở toàn bộ theme cao cấp'),
            t('Mở tính năng hộp ký ức nhóm đóng góp'),
          ],
        };
      default:
        return {
          title: t('Gói Free'),
          levelLabel: t('Tài khoản Free'),
          color: colors.primary,
          bg: isDark ? 'rgba(83, 74, 183, 0.08)' : '#F8FAFC',
          border: isDark ? 'rgba(83, 74, 183, 0.2)' : 'rgba(83, 74, 183, 0.15)',
          icon: 'diamond-outline',
          summary: t('{{storage}} vĩnh viễn, tối đa {{max}} hộp khi xem quảng cáo', {
            storage: getPlanStorageLabel('free'),
            max: PLAN_LIMITS.free.maxCapsules + REWARDED_CAPSULE_SLOT_LIMIT,
          }),
          desc: t('Free là gói cơ bản với dung lượng vĩnh viễn theo tài khoản.'),
          badge: 'FREE',
          benefits: [
            t('Dung lượng tài khoản: {{storage}} vĩnh viễn', { storage: getPlanStorageLabel('free') }),
            t('Dung lượng tối đa mỗi hộp: {{size}}', { size: copyLimits.free.upload }),
            t('{{base}} hộp mặc định, xem quảng cáo có thưởng thêm tối đa {{bonus}} hộp', {
              base: PLAN_LIMITS.free.maxCapsules,
              bonus: REWARDED_CAPSULE_SLOT_LIMIT,
            }),
            t('Tối đa {{photos}} ảnh trong mỗi hộp', { photos: PLAN_LIMITS.free.maxPhotosPerCapsule }),
            t('Không hỗ trợ video'),
            t('Lời nhắn tối đa {{count}} ký tự', { count: PLAN_LIMITS.free.maxMessageLength }),
          ],
        };
    }
  }, [user?.plan, isDark, colors.primary, t]);

  const nextRenewalText = React.useMemo(() => {
    if (!subscriptionSync?.expirationDateISO || !isPremium) {
      return '';
    }

    const label = subscriptionSync.willRenew === false
      ? t('Hiệu lực đến')
      : t('Gia hạn tiếp theo');
    return `${label}: ${new Date(subscriptionSync.expirationDateISO).toLocaleDateString()}`;
  }, [isPremium, subscriptionSync?.expirationDateISO, subscriptionSync?.willRenew, t]);

  const reduceMotion = useAuthStore(state => state.reduceMotion);
  const flip = useSharedValue(0);
  const shimmer = useSharedValue(-76);
  const avatarOpacity = useSharedValue(1);

  // Artistic animations: entrance and looping float
  const floatAnim = useSharedValue(0);

  // Float animation responds to reduceMotion
  React.useEffect(() => {
    if (!reduceMotion) {
      floatAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(floatAnim);
      floatAnim.value = 0;
    }
  }, [floatAnim, reduceMotion]);

  const animatedAvatarContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: interpolate(floatAnim.value, [0, 1], [-5, 5]) }
      ]
    };
  });

  const animatedAvatarStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotateY: `${flip.value}deg` }],
      opacity: avatarOpacity.value,
    };
  });

  const animatedShimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: shimmer.value }],
    };
  });

  const activeCapsules = capsules.filter(item => item.id !== 'screenshot-opened-capsule');
  const ownedCapsules = activeCapsules.filter(item => item.ownerId === user?.id);
  const sharedCapsules = activeCapsules.filter(item => item.ownerId !== user?.id);
  const waiting = activeCapsules.filter(item => item.status === 'locked').length;
  const opened = activeCapsules.filter(item => item.status === 'opened').length;
  const cachedAvatarUri = useCachedAvatarUri(user ? {
    userId: user.id,
    avatarPath: user.avatarPath,
    avatarVersion: user.avatarVersion,
    avatarUrl: user.avatarUrl,
  } : null);
  const avatarPreviewUri = pendingAvatarUri || cachedAvatarUri;
  const planSummaryText = React.useMemo(() => {
    if (!isPaidPlan) {
      return t('{{current}}/{{max}} hộp ký ức đã dùng', {
        current: ownedCapsules.length,
        max: freeCapsuleLimit,
      });
    }
    return nextRenewalText || t('Quyền lợi đang hoạt động');
  }, [freeCapsuleLimit, isPaidPlan, nextRenewalText, ownedCapsules.length, t]);

  const startAvatarUploadAnimation = React.useCallback(() => {
    cancelAnimation(flip);
    cancelAnimation(shimmer);
    cancelAnimation(avatarOpacity);

    if (reduceMotion) {
      avatarOpacity.value = withRepeat(
        withSequence(
          withTiming(0.58, { duration: 420 }),
          withTiming(1, { duration: 420 }),
        ),
        -1,
        true,
      );
      return;
    }

    flip.value = 0;
    shimmer.value = -76;
    avatarOpacity.value = 1;
    flip.value = withRepeat(withTiming(360, { duration: 1200 }), -1, false);
    shimmer.value = withRepeat(
      withSequence(
        withTiming(76, { duration: 900 }),
        withTiming(-76, { duration: 1 }),
      ),
      -1,
      false,
    );
  }, [avatarOpacity, flip, reduceMotion, shimmer]);

  const finishAvatarUploadAnimation = React.useCallback(() => {
    cancelAnimation(flip);
    cancelAnimation(shimmer);
    cancelAnimation(avatarOpacity);

    if (reduceMotion) {
      avatarOpacity.value = 0;
      avatarOpacity.value = withTiming(1, { duration: 150 });
      return;
    }

    flip.value = 0;
    shimmer.value = -76;
    avatarOpacity.value = 1;
    flip.value = withTiming(360, { duration: 1000 }, (finished) => {
      if (finished) {
        shimmer.value = withTiming(76, { duration: 1200 });
      }
    });
  }, [avatarOpacity, flip, reduceMotion, shimmer]);

  const onChangeAvatar = async () => {
    if (!user?.id) return;
    try {
      suppressBiometricAutoLock();
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 500,
        maxHeight: 500,
      });

      if (result.didCancel || !result.assets || !result.assets[0]?.uri) {
        return;
      }

      setAvatarUploading(true);
      const pickedUri = result.assets[0].uri;
      setPendingAvatarUri(pickedUri);
      startAvatarUploadAnimation();
      const draft = await createAvatarDraft();
      const reference = storage().ref(draft.storagePath);
      
      const uploadPath = Platform.OS === 'ios' ? pickedUri.replace('file://', '') : pickedUri;
      await reference.putFile(uploadPath);
      const { avatarPath, avatarVersion } = await finalizeAvatarUpload();
      await cacheLocalAvatarUri({
        userId: user.id,
        avatarPath,
        avatarVersion,
      }, pickedUri);

      await refreshProfile();
      setPendingAvatarUri(null);
      finishAvatarUploadAnimation();

      PolishedAlert.show(t('Thành công'), t('Cập nhật ảnh đại diện thành công!'));
    } catch {
      await abandonAvatarDraft().catch(() => {});
      setPendingAvatarUri(null);
      cancelAnimation(flip);
      cancelAnimation(shimmer);
      cancelAnimation(avatarOpacity);
      flip.value = withTiming(0, { duration: 150 });
      shimmer.value = -76;
      avatarOpacity.value = withTiming(1, { duration: 150 });
      PolishedAlert.show(t('Lỗi'), t('Không cập nhật được ảnh đại diện.'));
    } finally {
      suppressBiometricAutoLock(2000);
      setAvatarUploading(false);
    }
  };

  return (
    <SoftScreen variant="teal">
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Pressable
          style={styles.headerSettingsBtn}
          onPress={() => navigation.getParent()?.navigate('Settings' as never)}>
          <AppIcon name="settings-outline" size={22} color={colors.primary} />
        </Pressable>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header/Hero Section */}
          <Animated.View style={[styles.heroSection, animatedAvatarContainerStyle]}>
            <Pressable style={styles.avatar} onPress={() => setShowAvatarModal(true)} disabled={avatarUploading}>
              <Animated.View style={[styles.avatarInner, animatedAvatarStyle]}>
                {avatarPreviewUri ? (
                  <Image source={{ uri: avatarPreviewUri }} style={styles.avatarImage} />
                ) : (
                  <AppIcon name="person" size={32} color={colors.primary} />
                )}
                <Animated.View style={[styles.shimmerLine, animatedShimmerStyle]} />
              </Animated.View>
              <View style={styles.editBadge}>
                <AppIcon name="camera-outline" size={12} color="#FFFFFF" />
              </View>
            </Pressable>
            <Text style={styles.name}>{user?.displayName ?? t('Khách')}</Text>
            <Text style={styles.email}>{user?.email ?? t('Chưa có email')}</Text>
            <Pressable
              style={[
                styles.membershipBadgeRow,
                {
                  backgroundColor: `${planInfo.color}12`,
                  borderColor: `${planInfo.color}36`,
                },
              ]}
              onPress={() => setShowPlanDetails(true)}>
              <View style={[styles.membershipBadgeIcon, { backgroundColor: planInfo.color }]}>
                <AppIcon name={planInfo.icon} size={11} color="#FFFFFF" />
              </View>
              <Text style={[styles.membershipBadgeText, { color: planInfo.color }]}>
                {planInfo.levelLabel}
              </Text>
            </Pressable>
          </Animated.View>

          {/* Section title for capsule statistics */}
          <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 8 }]}>{t('Thông tin hộp ký ức')}</Text>

          {/* Artistic Stats Cards Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, styles.statBoxPrimary]}>
              <View style={[styles.statIconWrap, { backgroundColor: colors.primarySoft }]}>
                <AppIcon name="cube" size={16} color={colors.primary} />
              </View>
              <Text style={styles.statNumber}>{ownedCapsules.length}</Text>
              <Text style={styles.statLabel}>{t('Đã tạo')}</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxPurple]}>
              <View style={[styles.statIconWrap, { backgroundColor: '#F3E8FF' }]}>
                <AppIcon name="people" size={16} color="#8B5CF6" />
              </View>
              <Text style={styles.statNumber}>{sharedCapsules.length}</Text>
              <Text style={styles.statLabel}>{t('Được chia sẻ')}</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxWarning]}>
              <View style={[styles.statIconWrap, { backgroundColor: '#FFEED3' }]}>
                <AppIcon name="lock-closed" size={16} color={colors.warning} />
              </View>
              <Text style={styles.statNumber}>{waiting}</Text>
              <Text style={styles.statLabel}>{t('Đang khóa')}</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxSuccess]}>
              <View style={[styles.statIconWrap, { backgroundColor: '#DFF6EF' }]}>
                <AppIcon name="lock-open" size={16} color={colors.success} />
              </View>
              <Text style={styles.statNumber}>{opened}</Text>
              <Text style={styles.statLabel}>{t('Đã mở')}</Text>
            </View>
          </View>

          {/* Membership/Plan Pitch Section */}
          <Pressable
            style={[
              styles.planSummaryCard,
              {
                backgroundColor: planInfo.bg,
                borderColor: planInfo.border,
              },
            ]}
            onPress={() => setShowPlanDetails(true)}>
            <View style={[styles.planIconWrap, { backgroundColor: `${planInfo.color}16` }]}>
              <AppIcon name={planInfo.icon} size={18} color={planInfo.color} />
            </View>

            <View style={styles.planSummaryBody}>
              <View style={styles.planSummaryTitleRow}>
                <Text style={[styles.planSummaryTitle, { color: planInfo.color }]}>
                  {planInfo.title}
                </Text>
                <View style={[styles.planTierPill, { backgroundColor: `${planInfo.color}16` }]}>
                  <Text style={[styles.planTierPillText, { color: planInfo.color }]}>
                    {planInfo.badge}
                  </Text>
                </View>
              </View>
              <Text style={[styles.planSummaryText, { color: colors.mutedText }]}>
                {planSummaryText}
              </Text>
            </View>

            <View style={styles.planSummaryRight}>
              {!isPaidPlan ? (
                <Text style={[styles.planSummaryActionText, { color: planInfo.color }]}>
                  {t('Nâng cấp')}
                </Text>
              ) : null}
              <AppIcon name="chevron-forward" size={18} color={colors.mutedText} />
            </View>
          </Pressable>

          {/* Staggered Quick Actions Menu */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>{t('Tính năng chính')}</Text>

            <ElevatedCard style={styles.actionsCard}>
              <Pressable
                style={styles.actionRow}
                onPress={() => navigation.navigate('StorageManagement' as never)}>
                <View style={[styles.actionIconWrap, { backgroundColor: colors.primarySoft }]}>
                  <AppIcon name="server-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionLabel}>{t('Quản lý dung lượng')}</Text>
                  <Text style={styles.actionSublabel}>{t('Theo dõi dung lượng tài khoản của bạn')}</Text>
                </View>
                <AppIcon name="chevron-forward" size={16} color={colors.mutedText} />
              </Pressable>

              <View style={styles.actionDivider} />

              <Pressable
                style={styles.actionRow}
                onPress={() => navigation.getParent()?.navigate('Settings' as never)}>
                <View style={[styles.actionIconWrap, { backgroundColor: '#E2E8F0' }]}>
                  <AppIcon name="settings-outline" size={18} color={colors.mutedText} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionLabel}>{t('Cài đặt hệ thống')}</Text>
                  <Text style={styles.actionSublabel}>{t('Quản lý thông báo, hỗ trợ và giao diện tối')}</Text>
                </View>
                <AppIcon name="chevron-forward" size={16} color={colors.mutedText} />
              </Pressable>
            </ElevatedCard>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Premium Upgrade Modal */}
      <PremiumModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />

      <Modal visible={showPlanDetails} transparent animationType="fade" onRequestClose={() => setShowPlanDetails(false)}>
        <Pressable style={styles.planModalBackdrop} onPress={() => setShowPlanDetails(false)}>
          <Pressable style={styles.planDetailSheet} onPress={event => event.stopPropagation()}>
            <View style={styles.planDetailHeader}>
              <View style={[styles.planDetailIcon, { backgroundColor: `${planInfo.color}18` }]}>
                <AppIcon name={planInfo.icon} size={22} color={planInfo.color} />
              </View>
              <View style={styles.planDetailTitleWrap}>
                <Text style={[styles.planDetailTitle, { color: planInfo.color }]}>
                  {planInfo.title}
                </Text>
                <Text style={styles.planDetailSubtitle}>{planInfo.summary}</Text>
              </View>
              <Pressable style={styles.planDetailClose} onPress={() => setShowPlanDetails(false)}>
                <AppIcon name="close" size={18} color={colors.mutedText} />
              </Pressable>
            </View>

            <View style={[styles.planDetailBadge, { borderColor: `${planInfo.color}40` }]}>
              <View style={[styles.planDetailBadgeMark, { backgroundColor: planInfo.color }]}>
                <AppIcon name={planInfo.icon} size={12} color="#FFFFFF" />
              </View>
              <Text style={[styles.planDetailBadgeText, { color: planInfo.color }]}>
                {planInfo.levelLabel}
              </Text>
            </View>

            <Text style={styles.planDetailDesc}>{planInfo.desc}</Text>

            {nextRenewalText ? (
              <View style={[styles.planDetailNote, { backgroundColor: `${planInfo.color}10` }]}>
                <AppIcon name="calendar-outline" size={15} color={planInfo.color} />
                <Text style={styles.planDetailNoteText}>{nextRenewalText}</Text>
              </View>
            ) : null}

            <View style={styles.planDetailBenefits}>
              {planInfo.benefits.map(benefit => (
                <View key={benefit} style={styles.planDetailBenefitRow}>
                  <AppIcon name="checkmark-circle" size={15} color={planInfo.color} />
                  <Text style={styles.planDetailBenefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.planDetailStatusRow, { borderColor: `${planInfo.color}24` }]}>
              <AppIcon
                name={isPaidPlan ? 'shield-checkmark-outline' : 'information-circle-outline'}
                size={16}
                color={planInfo.color}
              />
              <Text style={[styles.planDetailStatusText, { color: planInfo.color }]}>
                {t(isPaidPlan ? 'Quyền lợi của bạn đang hoạt động' : 'Bạn có thể nâng cấp bất cứ lúc nào')}
              </Text>
            </View>

            {!isPaidPlan ? (
              <Pressable
                style={[styles.planDetailPrimaryBtn, { backgroundColor: planInfo.color }]}
                onPress={() => {
                  setShowPlanDetails(false);
                  setShowPremiumModal(true);
                }}>
                <AppIcon name="star" size={15} color="#FFFFFF" />
                <Text style={styles.planDetailPrimaryText}>{t('Xem các gói nâng cấp')}</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Fullscreen Avatar Modal Viewer */}
      <Modal visible={showAvatarModal} transparent animationType="fade" onRequestClose={() => setShowAvatarModal(false)}>
        <View style={styles.viewerOverlay}>
          <Pressable style={styles.viewerClose} onPress={() => setShowAvatarModal(false)}>
            <AppIcon name="close" size={24} color="#FFFFFF" />
          </Pressable>
          
          {avatarPreviewUri ? (
            <Image source={{ uri: avatarPreviewUri }} style={styles.viewerImage} resizeMode="contain" />
          ) : (
            <View style={styles.viewerPlaceholder}>
              <AppIcon name="person" size={96} color="#FFFFFF" />
            </View>
          )}
          
          <Pressable
            style={styles.viewerChangeBtn}
            onPress={() => {
              setShowAvatarModal(false);
              onChangeAvatar();
            }}
            disabled={avatarUploading}
          >
            <AppIcon name="camera-outline" size={18} color="#FFFFFF" />
            <Text style={styles.viewerChangeBtnText}>
              {t(avatarUploading ? 'Đang tải...' : 'Thay đổi ảnh đại diện')}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </SoftScreen>
  );
}

const createStyles = (colors: ThemeColors, _isDark: boolean) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 26,
  },
  avatar: {
    width: 90,
    height: 90,
    position: 'relative',
  },
  avatarInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: colors.primary,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  shimmerLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#00FFE0',
    opacity: 0.8,
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  name: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  email: {
    marginTop: 4,
    fontSize: 14,
    color: colors.mutedText,
  },
  membershipBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  membershipBadgeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  membershipBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Stats Grid Layout
  statsGrid: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statBox: {
    width: '23.5%',
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1.2,
    borderColor: colors.primarySoft,
    paddingVertical: 10,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...cardShadow,
  },
  statBoxPrimary: {
    borderColor: colors.primarySoft,
  },
  statBoxPurple: {
    borderColor: '#F3E8FF',
  },
  statBoxWarning: {
    borderColor: '#FFEED3',
  },
  statBoxSuccess: {
    borderColor: '#DFF6EF',
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '700',
    color: colors.mutedText,
    textAlign: 'center',
  },

  // Plan summary and detail
  planSummaryCard: {
    width: '100%',
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.2,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: 'hidden',
    ...cardShadow,
  },
  planIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planSummaryBody: {
    flex: 1,
    minWidth: 0,
  },
  planSummaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  planSummaryTitle: {
    fontWeight: '800',
    fontSize: 15,
  },
  planSummaryText: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  planTierPill: {
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  planTierPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  planSummaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planSummaryActionText: {
    fontSize: 11,
    fontWeight: '800',
  },
  planModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  planDetailSheet: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: colors.primarySoft,
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 8,
    ...cardShadow,
  },
  planDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planDetailIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planDetailTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  planDetailTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  planDetailSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: colors.mutedText,
  },
  planDetailClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceTint,
  },
  planDetailBadge: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  planDetailBadgeMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planDetailBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  planDetailDesc: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: colors.text,
  },
  planDetailNote: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  planDetailNoteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  planDetailBenefits: {
    marginTop: 14,
    gap: 9,
  },
  planDetailBenefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  planDetailBenefitText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  planDetailStatusRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: colors.surfaceTint,
  },
  planDetailStatusText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  planDetailPrimaryBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    ...uiShadow,
  },
  planDetailPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // Actions List Card
  actionsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    marginBottom: 10,
    marginLeft: 4,
  },
  actionsCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
    backgroundColor: colors.card,
    padding: 6,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  actionSublabel: {
    fontSize: 11,
    color: colors.mutedText,
    marginTop: 2,
  },
  actionDivider: {
    height: 1,
    backgroundColor: colors.softBorder,
    marginHorizontal: 12,
  },

  // Settings Header Button
  headerSettingsBtn: {
    position: 'absolute',
    top: 36,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primarySoft,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    zIndex: 10,
  },

  // Viewer Modal styles
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  viewerClose: {
    position: 'absolute',
    top: 50,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  viewerImage: {
    width: 300,
    height: 300,
    borderRadius: 150,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.card,
  },
  viewerPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerChangeBtn: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  viewerChangeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
