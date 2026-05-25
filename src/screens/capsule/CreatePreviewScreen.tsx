import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { useCapsuleStore } from '../../store/capsuleStore';
import { PremiumModal } from '../../components/modals/PremiumModal';
import type { AppStackParamList } from '../../types/navigation';
import { PLAN_LIMITS } from '../../config/plans';
import { colors } from '../../theme/colors';
import { formatDate } from '../../utils/dateHelpers';
import { AppIcon, ElevatedCard, PrimaryButton, SoftScreen } from '../../components/ui/DesignPrimitives';

type Props = NativeStackScreenProps<AppStackParamList, 'CreatePreview'>;

export function CreatePreviewScreen({ navigation, route }: Props) {
  const user = useAuthStore(s => s.user);
  const isPremium = Boolean(user?.isPremium);
  const existingCapsules = useCapsuleStore(s => s.capsules);
  const createCapsule = useCapsuleStore(s => s.createCapsule);
  const isLoading = useCapsuleStore(s => s.isLoading);
  const uploadProgress = useCapsuleStore(s => s.uploadProgress);
  const capsuleError = useCapsuleStore(s => s.error);
  const [localError, setLocalError] = useState('');
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const onConfirmCreate = async () => {
    if (!user?.id) { setLocalError('Bạn cần đăng nhập lại để tạo capsule.'); return; }
    if (!isPremium && existingCapsules.length >= PLAN_LIMITS.free.maxCapsules) { setShowPremiumModal(true); return; }
    const success = await createCapsule(
      {
        title: route.params.title, openDateISO: route.params.openDateISO, theme: route.params.theme,
        message: route.params.message, mediaAssets: route.params.mediaAssets, memberEmails: route.params.memberEmails
      },
      user.id, isPremium);
    if (!success) { setLocalError('Không tạo được capsule. Vui lòng thử lại.'); return; }
    navigation.popToTop();
  };

  return (
    <SoftScreen variant="warm">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.step}>Bước 4/4</Text>
          <Text style={styles.heading}>Xem trước capsule</Text>
          <ElevatedCard style={styles.previewCard}>
            <View style={styles.previewIcon}>
              <AppIcon name="cube-outline" size={30} color={colors.warningDark} />
            </View>
            <Text style={styles.previewTitle}>{route.params.title}</Text>
            <Text style={styles.meta}>📅 Mở vào: {formatDate(route.params.openDateISO)}</Text>
            <Text style={styles.meta}>🎨 Chủ đề: {route.params.theme}</Text>
            <Text style={styles.meta}>📎 Ảnh: {route.params.mediaAssets.length}</Text>
            <Text style={styles.meta}>👥 Thành viên: {route.params.memberEmails.length}</Text>
          </ElevatedCard>
          <Text style={styles.warning}>⚠️ Sau khi tạo, bạn không thể chỉnh sửa nội dung capsule.</Text>
          {isLoading ? <Text style={styles.info}>Đang tải lên: {uploadProgress}%</Text> : null}
          {localError ? <Text style={styles.error}>{localError}</Text> : null}
          {!localError && capsuleError ? <Text style={styles.error}>{capsuleError}</Text> : null}
          <View style={styles.actions}>
            <PrimaryButton label="Quay lại" variant="outline" onPress={() => navigation.goBack()} style={styles.actionButton} />
            <PrimaryButton label={isLoading ? 'Đang tạo...' : 'Tạo & Khoá'} iconName="lock-closed-outline"
              onPress={onConfirmCreate} disabled={isLoading} style={styles.actionButton} />
          </View>
        </View>
      </SafeAreaView>
      <PremiumModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, padding: 16, paddingTop: 72 },
  step: { color: colors.mutedText, fontSize: 12 },
  heading: { marginTop: 8, fontSize: 24, fontWeight: '700', color: colors.text },
  previewCard: { marginTop: 16, gap: 4, backgroundColor: '#FFF8F0', borderColor: '#FFE0BD' },
  previewIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.warmSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  previewTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  meta: { color: colors.mutedText, fontSize: 13 },
  warning: { marginTop: 14, color: colors.danger, fontSize: 13 },
  info: { marginTop: 10, color: colors.mutedText, fontSize: 13 },
  error: { marginTop: 10, color: colors.danger, fontSize: 13 },
  actions: { marginTop: 'auto', flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1 },
});
