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
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useAuthStore } from '../../store/authStore';
import { useCapsuleStore } from '../../store/capsuleStore';
import { PremiumModal } from '../../components/modals/PremiumModal';
import { PLAN_LIMITS } from '../../config/plans';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { AppIcon, ElevatedCard, SoftScreen, cardShadow, uiShadow } from '../../components/ui/DesignPrimitives';
import { launchImageLibrary } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import { suppressBiometricAutoLock } from '../../services/biometricLockGuard';
import { useTranslation } from '../../i18n';

export function ProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const user = useAuthStore(state => state.user);
  const isPremium = Boolean(user?.isPremium);
  const capsules = useCapsuleStore(state => state.capsules);
  const [showPremiumModal, setShowPremiumModal] = React.useState(false);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const [pendingAvatarUri, setPendingAvatarUri] = React.useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = React.useState(false);
  const refreshProfile = useAuthStore(state => state.refreshProfile);

  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const planInfo = React.useMemo(() => {
    const plan = user?.plan || 'free';
    switch (plan) {
      case 'plus':
        return {
          title: 'Gói Plus',
          color: '#6366F1', // Indigo
          bg: isDark ? 'rgba(99, 102, 241, 0.08)' : '#F5F3FF',
          border: isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.2)',
          icon: 'sparkles',
          desc: `Kích hoạt đặc quyền Plus: Vô hạn hộp ký ức cá nhân, ${PLAN_LIMITS.plus.maxMediaPerCapsule} tệp/hộp ký ức, tổng lưu trữ ${PLAN_LIMITS.plus.maxAccountStorageMb / 1024}GB.`,
          badge: 'PLUS',
        };
      case 'pro':
        return {
          title: 'Gói Pro',
          color: '#F59E0B', // Gold/Amber
          bg: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FEF3C7',
          border: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.3)',
          icon: 'star',
          desc: `Kích hoạt đặc quyền Pro: Hỗ trợ hộp ký ức nhóm (tối đa 5 người), ${PLAN_LIMITS.pro.maxMediaPerCapsule} tệp/hộp ký ức, tổng lưu trữ ${PLAN_LIMITS.pro.maxAccountStorageMb / 1024}GB.`,
          badge: 'PRO',
        };
      case 'pro_max':
        return {
          title: 'Gói Pro Max',
          color: '#10B981', // Emerald/Mint
          bg: isDark ? 'rgba(16, 185, 129, 0.08)' : '#E6FFFA',
          border: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.35)',
          icon: 'diamond',
          desc: `Kích hoạt đặc quyền tối cao Pro Max: Vô hạn hộp ký ức nhóm và thành viên, ${PLAN_LIMITS.pro_max.maxMediaPerCapsule} tệp/hộp ký ức, tổng lưu trữ 20GB.`,
          badge: 'PRO MAX',
        };
      default:
        return {
          title: 'Gói Free',
          color: colors.primary,
          bg: isDark ? 'rgba(83, 74, 183, 0.08)' : '#F8FAFC',
          border: isDark ? 'rgba(83, 74, 183, 0.2)' : 'rgba(83, 74, 183, 0.15)',
          icon: 'diamond-outline',
          desc: '',
          badge: 'FREE',
        };
    }
  }, [user?.plan, isDark, colors.primary]);

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

  const useEntryStyle = (delayMs: number) =>
    useAnimatedStyle(() => {
      // Đổi delay sang điểm bắt đầu (0 -> 0%, 120 -> 15%, 240 -> 30%, 360 -> 45%)
      const start = delayMs === 0 ? 0 : delayMs === 120 ? 0.15 : delayMs === 240 ? 0.3 : 0.45;
      const end = Math.min(1, start + 0.55);

      const opacity = interpolate(entryProgress.value, [start, end], [0, 1], 'clamp');
      const translateY = interpolate(entryProgress.value, [start, end], [15, 0], 'clamp');

      return {
        opacity,
        transform: [{ translateY }],
      };
    });

  const animHeader = useEntryStyle(0);
  const animStats = useEntryStyle(120);
  const animPlan = useEntryStyle(240);
  const animActions = useEntryStyle(360);

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

      Alert.alert(t('Thành công'), t('Cập nhật ảnh đại diện thành công!'));
    } catch {
      setPendingAvatarUri(null);
      cancelAnimation(flip);
      cancelAnimation(shimmer);
      cancelAnimation(avatarOpacity);
      flip.value = withTiming(0, { duration: 150 });
      shimmer.value = -76;
      avatarOpacity.value = withTiming(1, { duration: 150 });
      Alert.alert(t('Lỗi'), t('Không cập nhật được ảnh đại diện.'));
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
            <Text style={styles.name}>{user?.displayName ?? t('Khách')}</Text>
            <Text style={styles.email}>{user?.email ?? t('Chưa có email')}</Text>
            {isPremium && (
              <View style={styles.premiumBadgeRow}>
                <AppIcon name="star" size={12} color="#D4AF37" />
                <Text style={styles.premiumBadgeText}>THÀNH VIÊN {planInfo.badge}</Text>
              </View>
            )}
          </Animated.View>

          {/* Section title for capsule statistics */}
          <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 8 }]}>{t('Thông tin hộp ký ức')}</Text>

          {/* Artistic Stats Cards Grid */}
          <Animated.View style={[styles.statsGrid, animStats]}>
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
          </Animated.View>

          {/* Membership/Plan Pitch Section */}
          <Animated.View style={animPlan}>
            {!isPremium ? (
              <Pressable 
                style={[
                  styles.planCard, 
                  { 
                    backgroundColor: planInfo.bg, 
                    borderColor: planInfo.border,
                  }
                ]} 
                onPress={() => setShowPremiumModal(true)}
              >
                <View style={styles.planHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.planIconWrap, { backgroundColor: 'rgba(83, 74, 183, 0.1)' }]}>
                      <AppIcon name="diamond-outline" size={16} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={[styles.planTitle, { color: colors.primary }]}>{t('Gói Free')}</Text>
                      <Text style={styles.planBadgeText}>{t('TÀI KHOẢN CƠ BẢN')}</Text>
                    </View>
                  </View>
                  <AppIcon name="chevron-forward" size={16} color={colors.mutedText} />
                </View>

                <View style={styles.planDivider} />

                <View style={styles.planUsageInfo}>
                  <View style={styles.planUsageRow}>
                    <Text style={[styles.planUsageLabel, { color: colors.text }]}>{t('Số hộp ký ức:')}</Text>
                    <Text style={[styles.planUsageVal, { color: colors.text }]}>
                      {ownedCapsules.length} <Text style={{ color: colors.mutedText, fontWeight: '400' }}>/ 3 tối đa</Text>
                    </Text>
                  </View>
                  <View style={styles.planUsageBarBg}>
                    <View 
                      style={[
                        styles.planUsageBarFill, 
                        { 
                          width: `${Math.min(100, (ownedCapsules.length / PLAN_LIMITS.free.maxCapsules) * 100)}%`,
                          backgroundColor: colors.primary 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.planTextMuted, { color: colors.mutedText, marginTop: 6 }]}>
                    • Giới hạn {PLAN_LIMITS.free.maxMediaPerCapsule} ảnh/hộp ký ức, lưu trữ 50MB.
                  </Text>
                </View>

                <View style={[styles.planCtaBtn, { backgroundColor: colors.primary }]}>
                  <AppIcon name="star" size={14} color="#FFFFFF" />
                  <Text style={styles.planCtaText}>{t('Nâng cấp gói ngay')}</Text>
                </View>
              </Pressable>
            ) : (
              <View 
                style={[
                  styles.planCardPremium, 
                  { 
                    backgroundColor: planInfo.bg, 
                    borderColor: planInfo.border,
                  }
                ]}
              >
                <View style={styles.planHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.planIconWrap, { backgroundColor: `${planInfo.color}15` }]}>
                      <AppIcon name={planInfo.icon} size={18} color={planInfo.color} />
                    </View>
                    <View>
                      <Text style={[styles.planTitlePremium, { color: planInfo.color }]}>
                        {planInfo.title}
                      </Text>
                      <View style={[styles.planBadgeContainer, { backgroundColor: `${planInfo.color}15` }]}>
                        <Text style={[styles.planBadgeTextPremium, { color: planInfo.color }]}>
                          {planInfo.badge}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={[styles.planDivider, { backgroundColor: `${planInfo.color}15` }]} />

                <Text style={[styles.planTextPremium, { color: colors.text }]}>
                  {planInfo.desc}
                </Text>

                <View style={styles.premiumSuccessRow}>
                  <AppIcon name="shield-checkmark-outline" size={14} color={planInfo.color} />
                  <Text style={[styles.premiumSuccessText, { color: planInfo.color }]}>
                    {t('Đã kích hoạt đầy đủ quyền lợi gói')}
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Staggered Quick Actions Menu */}
          <Animated.View style={[styles.actionsSection, animActions]}>
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
                  <Text style={styles.actionSublabel}>{t('Xem chi tiết lưu trữ và băng thông thực tế')}</Text>
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

  // Plan Card Layout
  planCard: {
    width: '100%',
    borderWidth: 1.2,
    borderRadius: 22,
    padding: 16,
    overflow: 'hidden',
    ...cardShadow,
  },
  planCardPremium: {
    width: '100%',
    borderWidth: 1.2,
    borderRadius: 22,
    padding: 16,
    overflow: 'hidden',
    ...cardShadow,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    fontWeight: '800',
    fontSize: 15,
  },
  planTitlePremium: {
    fontWeight: '800',
    fontSize: 15,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.mutedText,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  planBadgeContainer: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  planBadgeTextPremium: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planDivider: {
    height: 1,
    backgroundColor: colors.softBorder,
    marginVertical: 12,
  },
  planUsageInfo: {
    width: '100%',
  },
  planUsageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  planUsageLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  planUsageVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  planUsageBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    marginBottom: 8,
  },
  planUsageBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  planTextMuted: {
    fontSize: 11,
    lineHeight: 16,
  },
  planTextPremium: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  planCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 10,
    marginTop: 14,
    ...uiShadow,
  },
  planCtaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  premiumSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  premiumSuccessText: {
    fontSize: 12,
    fontWeight: '700',
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
