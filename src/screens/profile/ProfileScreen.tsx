import React from 'react';
import { Alert, Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAuthStore } from '../../store/authStore';
import { useCapsuleStore } from '../../store/capsuleStore';
import { PremiumModal } from '../../components/modals/PremiumModal';
import { PLAN_LIMITS } from '../../config/plans';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { AppIcon, ElevatedCard, SoftScreen } from '../../components/ui/DesignPrimitives';
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

        <View style={styles.container}>
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

          <ElevatedCard style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{capsules.length}</Text>
              <Text style={styles.statsText}>Tổng capsule</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{waiting}</Text>
              <Text style={styles.statsText}>Đang chờ</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{opened}</Text>
              <Text style={styles.statsText}>Đã mở</Text>
            </View>
          </ElevatedCard>

          {!isPremium ? (
            <Pressable style={styles.planCard} onPress={() => setShowPremiumModal(true)}>
              <Text style={styles.planTitle}>Gói Free</Text>
              <Text style={styles.planText}>
                Đã dùng {capsules.length}/{PLAN_LIMITS.free.maxCapsules} capsule
              </Text>
              <Text style={styles.planText}>
                Tối đa {PLAN_LIMITS.free.maxMediaPerCapsule} ảnh/capsule, tổng lưu trữ 50MB
              </Text>
              <Text style={styles.planCta}>👑 Nâng cấp Premium</Text>
            </Pressable>
          ) : (
            <View style={styles.planCardPremium}>
              <Text style={styles.planTitlePremium}>✨ Premium đang hoạt động</Text>
              <Text style={styles.planTextPremium}>
                Gói {activePlanName}: không giới hạn số capsule, {activePlan.maxCapsuleSizeMb}MB/capsule, tổng {activePlan.maxAccountStorageMb / 1024}GB
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
      
      {/* Premium Modal */}
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
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  avatar: {
    width: 72,
    height: 72,
    position: 'relative',
  },
  avatarInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  name: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  email: {
    marginTop: 4,
    fontSize: 14,
    color: colors.mutedText,
  },
  statsCard: {
    width: '100%',
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  statsText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.mutedText,
  },
  logoutButton: {
    marginTop: 12,
    alignSelf: 'stretch',
  },
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
  planCard: {
    width: '100%',
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 16,
    backgroundColor: isDark ? colors.primarySoft : '#F2F0FE',
    padding: 14,
    gap: 4,
  },
  planTitle: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  planText: {
    color: colors.text,
    fontSize: 13,
  },
  planCta: {
    marginTop: 4,
    color: colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  planCardPremium: {
    width: '100%',
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 16,
    backgroundColor: isDark ? colors.tealSoft : '#ECFFF7',
    padding: 14,
    gap: 4,
  },
  planTitlePremium: {
    color: colors.success,
    fontWeight: '800',
    fontSize: 14,
  },
  planTextPremium: {
    color: colors.text,
    fontSize: 13,
  },
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
