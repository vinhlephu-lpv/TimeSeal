import React from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useCapsuleStore } from '../../store/capsuleStore';
import { PremiumModal } from '../../components/modals/PremiumModal';
import { PLAN_LIMITS } from '../../config/plans';
import { colors } from '../../theme/colors';
import { AppIcon, ElevatedCard, PrimaryButton, SoftScreen } from '../../components/ui/DesignPrimitives';
import { launchImageLibrary } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';

export function ProfileScreen() {
  const navigation = useNavigation();
  const user = useAuthStore(state => state.user);
  const isPremium = Boolean(user?.isPremium);
  const isLoading = useAuthStore(state => state.isLoading);
  const logout = useAuthStore(state => state.logout);
  const capsules = useCapsuleStore(state => state.capsules);
  const [showPremiumModal, setShowPremiumModal] = React.useState(false);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const refreshProfile = useAuthStore(state => state.refreshProfile);

  const waiting = capsules.filter(item => item.status === 'locked').length;
  const opened = capsules.filter(item => item.status === 'opened').length;

  const onChangeAvatar = async () => {
    if (!user?.id) return;
    try {
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
      const ext = pickedUri.split('.').pop() || 'jpg';
      const reference = storage().ref(`avatars/${user.id}/profile_${Date.now()}.${ext}`);
      
      const uploadPath = Platform.OS === 'ios' ? pickedUri.replace('file://', '') : pickedUri;
      await reference.putFile(uploadPath);
      const downloadUrl = await reference.getDownloadURL();

      await firestore().collection('users').doc(user.id).update({
        avatarUrl: downloadUrl,
      });

      await refreshProfile();
      Alert.alert('Thành công', 'Cập nhật ảnh đại diện thành công!');
    } catch {
      Alert.alert('Lỗi', 'Không cập nhật được ảnh đại diện.');
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <SoftScreen variant="teal">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Pressable style={styles.avatar} onPress={onChangeAvatar} disabled={avatarUploading}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <AppIcon name="person" size={32} color={colors.primary} />
            )}
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
                Tối đa {PLAN_LIMITS.free.maxMediaPerCapsule} media/capsule, không có video
              </Text>
              <Text style={styles.planCta}>👑 Nâng cấp Premium</Text>
            </Pressable>
          ) : (
            <View style={styles.planCardPremium}>
              <Text style={styles.planTitlePremium}>✨ Premium đang hoạt động</Text>
              <Text style={styles.planTextPremium}>
                Không giới hạn số capsule, tối đa {PLAN_LIMITS.premium.maxMediaPerCapsule} media/capsule
              </Text>
            </View>
          )}

          <Pressable
            style={styles.settingsButton}
            onPress={() => navigation.getParent()?.navigate('Settings' as never)}>
            <AppIcon name="settings-outline" size={17} color={colors.primary} />
            <Text style={styles.settingsLabel}>Cài đặt</Text>
          </Pressable>

          <PrimaryButton
            label={isLoading ? 'Đang xử lý...' : 'Đăng xuất'}
            onPress={logout}
            disabled={isLoading}
            variant="danger"
            iconName="log-out-outline"
            style={styles.logoutButton}
          />
        </View>
      </SafeAreaView>
      <PremiumModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    borderColor: '#FFFFFF',
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
  settingsButton: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
  planCard: {
    width: '100%',
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 16,
    backgroundColor: '#F2F0FE',
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
    backgroundColor: '#ECFFF7',
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
});
