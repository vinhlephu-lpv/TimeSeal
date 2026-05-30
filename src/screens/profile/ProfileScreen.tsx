import React from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useAuthStore } from '../../store/authStore';
import { useCapsuleStore } from '../../store/capsuleStore';
import { PremiumModal } from '../../components/modals/PremiumModal';
import { PLAN_LIMITS } from '../../config/plans';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { AppIcon, ElevatedCard, SoftScreen, cardShadow } from '../../components/ui/DesignPrimitives';
import { launchImageLibrary } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import { suppressBiometricAutoLock } from '../../services/biometricLockGuard';

export function ProfileScreen() {
  const navigation = useNavigation();
  const user = useAuthStore(state => state.user);
  const isPremium = Boolean(user?.isPremium);
  const activePlan = user?.plan === 'pro_max' ? PLAN_LIMITS.pro_max : user?.plan === 'pro' ? PLAN_LIMITS.pro : PLAN_LIMITS.plus;
  const activePlanName = user?.plan === 'pro_max' ? 'Pro Max' : user?.plan === 'pro' ? 'Pro' : 'Plus';
  const capsules = useCapsuleStore(state => state.capsules);
  const [showPremiumModal, setShowPremiumModal] = React.useState(false);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const [pendingAvatarUri, setPendingAvatarUri] = React.useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = React.useState(false);
  const refreshProfile = useAuthStore(state => state.refreshProfile);

  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const reduceMotion = useAuthStore(state => state.reduceMotion);
  const flip = useSharedValue(0);
  const shimmer = useSharedValue(-76);
  const avatarOpacity = useSharedValue(1);

  // Artistic animations: entrance and looping float
  const floatAnim = useSharedValue(0);
  const entryProgress = useSharedValue(0);

  React.useEffect(() => {
    entryProgress.value = 0;
    entryProgress.value = withSpring(1, { damping: 16, stiffness: 90 });

    if (!reduceMotion) {
      floatAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true
      );
    }
  }, [floatAnim, entryProgress, reduceMotion]);

  const animatedAvatarContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: interpolate(floatAnim.value, [0, 1], [-5, 5]) }
      ]
    };
  });

  const makeEntryStyle = (delayMs: number) =>
    useAnimatedStyle(() => {
      const translateY = interpolate(entryProgress.value, [0, 1], [30, 0]);
      const opacity = interpolate(entryProgress.value, [0, 1], [0, 1]);
      return {
        opacity: withDelay(delayMs, withTiming(opacity, { duration: 400 })),
        transform: [
          { translateY: withDelay(delayMs, withSpring(translateY, { damping: 16, stiffness: 90 })) }
        ]
      };
    });

  const animHeader = makeEntryStyle(0);
  const animStats = makeEntryStyle(120);
  const animPlan = makeEntryStyle(240);
  const animActions = makeEntryStyle(360);

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

  const waiting = capsules.filter(item => item.status === 'locked').length;
  const opened = capsules.filter(item => item.status === 'opened').length;
  const avatarPreviewUri = pendingAvatarUri || user?.avatarUrl;

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
      const ext = pickedUri.split('.').pop() || 'jpg';
      const reference = storage().ref(`avatars/${user.id}/profile_${Date.now()}.${ext}`);
      
      const uploadPath = Platform.OS === 'ios' ? pickedUri.replace('file://', '') : pickedUri;
      await reference.putFile(uploadPath);
      const downloadUrl = await reference.getDownloadURL();

      await firestore().collection('users').doc(user.id).update({
        avatarUrl: downloadUrl,
      });

      await refreshProfile();
      setPendingAvatarUri(null);
      finishAvatarUploadAnimation();

      Alert.alert('Thành công', 'Cập nhật ảnh đại diện thành công!');
    } catch {
      setPendingAvatarUri(null);
      cancelAnimation(flip);
      cancelAnimation(shimmer);
      cancelAnimation(avatarOpacity);
      flip.value = withTiming(0, { duration: 150 });
      shimmer.value = -76;
      avatarOpacity.value = withTiming(1, { duration: 150 });
      Alert.alert('Lỗi', 'Không cập nhật được ảnh đại diện.');
    } finally {
      suppressBiometricAutoLock(2000);
      setAvatarUploading(false);
    }
  };

  return (
    <SoftScreen variant="teal">
      <SafeAreaView style={styles.safeArea}>
        <Pressable
          style={styles.headerSettingsBtn}
          onPress={() => navigation.getParent()?.navigate('Settings' as never)}>
          <AppIcon name="settings-outline" size={22} color={colors.primary} />
        </Pressable>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header/Hero Section */}
          <Animated.View style={[styles.heroSection, animatedAvatarContainerStyle, animHeader]}>
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
            <Text style={styles.name}>{user?.displayName ?? 'Khách'}</Text>
            <Text style={styles.email}>{user?.email ?? 'Chưa có email'}</Text>
            {isPremium && (
              <View style={styles.premiumBadgeRow}>
                <AppIcon name="star" size={12} color="#D4AF37" />
                <Text style={styles.premiumBadgeText}>Premium VIP Member</Text>
              </View>
            )}
          </Animated.View>

          {/* Artistic Stats Cards Grid */}
          <Animated.View style={[styles.statsGrid, animStats]}>
            <View style={[styles.statBox, styles.statBoxPrimary]}>
              <View style={[styles.statIconWrap, { backgroundColor: colors.primarySoft }]}>
                <AppIcon name="cube" size={20} color={colors.primary} />
              </View>
              <Text style={styles.statNumber}>{capsules.length}</Text>
              <Text style={styles.statLabel}>Tổng Capsule</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxWarning]}>
              <View style={[styles.statIconWrap, { backgroundColor: '#FFEED3' }]}>
                <AppIcon name="lock-closed" size={20} color={colors.warning} />
              </View>
              <Text style={styles.statNumber}>{waiting}</Text>
              <Text style={styles.statLabel}>Đang khóa</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxSuccess]}>
              <View style={[styles.statIconWrap, { backgroundColor: '#DFF6EF' }]}>
                <AppIcon name="sparkles" size={20} color={colors.success} />
              </View>
              <Text style={styles.statNumber}>{opened}</Text>
              <Text style={styles.statLabel}>Đã mở</Text>
            </View>
          </Animated.View>

          {/* Membership/Plan Pitch Section */}
          <Animated.View style={animPlan}>
            {!isPremium ? (
              <Pressable style={styles.planCard} onPress={() => setShowPremiumModal(true)}>
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>Gói Thành Viên Free</Text>
                  <AppIcon name="diamond-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.planText}>
                  Đã dùng {capsules.length}/{PLAN_LIMITS.free.maxCapsules} capsule tối đa.
                </Text>
                <Text style={styles.planTextMuted}>
                  Giới hạn {PLAN_LIMITS.free.maxMediaPerCapsule} ảnh/capsule, lưu trữ 50MB.
                </Text>
                <Text style={styles.planCta}>👑 Nâng Cấp Ngay Lập Tức</Text>
              </Pressable>
            ) : (
              <View style={styles.planCardPremium}>
                <View style={styles.planHeader}>
                  <Text style={styles.planTitlePremium}>✨ Thành Viên Cao Cấp ({activePlanName})</Text>
                  <AppIcon name="star" size={18} color={colors.success} />
                </View>
                <Text style={styles.planTextPremium}>
                  Kích hoạt trọn vẹn đặc quyền: Không giới hạn số capsule, {activePlan.maxCapsuleSizeMb}MB/capsule, tổng lưu trữ {activePlan.maxAccountStorageMb / 1024}GB.
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Staggered Quick Actions Menu */}
          <Animated.View style={[styles.actionsSection, animActions]}>
            <Text style={styles.sectionTitle}>Tính năng chính</Text>

            <ElevatedCard style={styles.actionsCard}>
              <Pressable
                style={styles.actionRow}
                onPress={() => navigation.navigate('StorageManagement' as never)}>
                <View style={[styles.actionIconWrap, { backgroundColor: colors.primarySoft }]}>
                  <AppIcon name="server-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionLabel}>Quản lý dung lượng</Text>
                  <Text style={styles.actionSublabel}>Xem chi tiết lưu trữ và băng thông thực tế</Text>
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
                  <Text style={styles.actionLabel}>Cài đặt hệ thống</Text>
                  <Text style={styles.actionSublabel}>Quản lý thông báo, hỗ trợ và giao diện tối</Text>
                </View>
                <AppIcon name="chevron-forward" size={16} color={colors.mutedText} />
              </Pressable>
            </ElevatedCard>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Premium Upgrade Modal */}
      <PremiumModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />

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
              {avatarUploading ? 'Đang tải...' : 'Thay đổi ảnh đại diện'}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </SoftScreen>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
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
  premiumBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderColor: 'rgba(212, 175, 55, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#BA8D10',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Stats Grid Layout
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1.2,
    borderColor: colors.primarySoft,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    overflow: 'hidden',
    ...cardShadow,
  },
  statBoxPrimary: {
    borderColor: colors.primarySoft,
  },
  statBoxWarning: {
    borderColor: '#FFEED3',
  },
  statBoxSuccess: {
    borderColor: '#DFF6EF',
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedText,
  },

  // Plan Card Layout
  planCard: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(83, 74, 183, 0.08)' : '#F6F5FE',
    padding: 18,
    gap: 6,
    overflow: 'hidden',
    ...cardShadow,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planTitle: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 15,
  },
  planText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  planTextMuted: {
    color: colors.mutedText,
    fontSize: 12,
  },
  planCta: {
    marginTop: 6,
    color: colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  planCardPremium: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.success,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(29, 158, 117, 0.08)' : '#ECFFF7',
    padding: 18,
    gap: 6,
    overflow: 'hidden',
    ...cardShadow,
  },
  planTitlePremium: {
    color: colors.success,
    fontWeight: '800',
    fontSize: 15,
  },
  planTextPremium: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
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
