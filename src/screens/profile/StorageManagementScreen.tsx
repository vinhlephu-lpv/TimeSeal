/**
 * StorageManagementScreen.tsx
 *
 * Shows total storage used vs plan limit, lists capsules by size,
 * highlights over-quota items, and allows deletion.
 */
import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { useCapsuleStore } from '../../store/capsuleStore';
import { useAuthStore } from '../../store/authStore';
import { getPlanLimits, type PlanType } from '../../config/plans';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { AppIcon, ElevatedCard, PrimaryButton, SoftScreen } from '../../components/ui/DesignPrimitives';

type Props = NativeStackScreenProps<AppStackParamList, 'StorageManagement'>;

export function StorageManagementScreen({ navigation }: Props) {
  const user = useAuthStore(s => s.user);
  const subscriptionSync = useAuthStore(s => s.subscriptionSync);
  const capsules = useCapsuleStore(s => s.capsules);
  const deleteCapsule = useCapsuleStore(s => s.deleteCapsule);
  const capsuleError = useCapsuleStore(s => s.error);

  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const userPlan: PlanType = user?.plan || 'free';
  const limits = getPlanLimits(userPlan);
  const usedMb = subscriptionSync?.usedStorageMb ?? 0;
  const limitMb = limits.maxAccountStorageMb;
  const usedPercent = limitMb > 0 ? Math.min(100, (usedMb / limitMb) * 100) : 0;
  const isOverQuota = usedMb > limitMb;

  // Sort capsules by size descending
  const sorted = [...capsules].sort((a, b) => (b.totalSizeMb || 0) - (a.totalSizeMb || 0));

  const handleDelete = (capsuleId: string, title: string, sizeMb: number) => {
    Alert.alert(
      'Xoá capsule?',
      `Bạn sắp xoá "${title}" (${sizeMb.toFixed(1)}MB). Hành động này không thể hoàn tác.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            const ok = await deleteCapsule(capsuleId);
            if (!ok) {
              Alert.alert('Lỗi', capsuleError || 'Xoá thất bại.');
            }
          },
        },
      ],
    );
  };

  const formatMb = (mb: number) =>
    mb >= 1 ? `${mb.toFixed(1)}MB` : `${(mb * 1024).toFixed(0)}KB`;

  return (
    <SoftScreen>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Storage usage card */}
          <ElevatedCard style={styles.usageCard}>
            <View style={styles.usageHeader}>
              <AppIcon name="cloud-outline" size={22} color={isOverQuota ? colors.danger : colors.primary} />
              <Text style={styles.usageTitle}>Dung lượng lưu trữ</Text>
            </View>
            <Text style={styles.usageText}>
              {formatMb(usedMb)} / {limitMb >= 1024 ? `${(limitMb / 1024).toFixed(0)}GB` : `${limitMb}MB`}
              {' '}({usedPercent.toFixed(0)}%)
            </Text>
            <Text style={{ fontSize: 11, color: colors.mutedText, marginTop: -4, marginBottom: 8, fontStyle: 'italic' }}>
              * Dung lượng bao gồm việc xem, tải lên và tải xuống từ Firebase.
            </Text>

            {/* Progress bar */}
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(usedPercent, 100)}%`,
                    backgroundColor: isOverQuota ? colors.danger : usedPercent > 80 ? colors.warning : colors.success,
                  },
                ]}
              />
            </View>

            {isOverQuota && (
              <Text style={styles.overQuotaText}>
                ⚠️ Vượt giới hạn! Xoá bớt capsule hoặc nâng cấp gói.
              </Text>
            )}

            <Text style={styles.planLabel}>Gói hiện tại: {userPlan.toUpperCase()}</Text>
          </ElevatedCard>

          {/* Capsule list by size */}
          <Text style={styles.sectionTitle}>Capsule theo dung lượng</Text>

          <FlatList
            data={sorted}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const sizeMb = item.totalSizeMb || 0;
              const now = new Date();
              const openDate = new Date(item.openDateISO);
              const diffDays = (now.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24);
              const canDelete =
                (item.status === 'locked' && sizeMb > 200) ||
                (item.status === 'opened' && diffDays >= 90);

              return (
                <View style={[styles.capsuleRow, isOverQuota && sizeMb > 0 && styles.overQuotaRow]}>
                  <View style={styles.capsuleInfo}>
                    <Text style={styles.capsuleTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.capsuleMeta}>
                      {formatMb(sizeMb)} · {item.status === 'locked' ? '🔒 Khoá' : item.status === 'unlocked' ? '🔓 Sẵn sàng' : '📦 Đã mở'}
                    </Text>
                  </View>
                  {canDelete ? (
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(item.id, item.title, sizeMb)}>
                      <AppIcon name="trash-outline" size={16} color={colors.danger} />
                    </Pressable>
                  ) : (
                    <Text style={styles.sizeLabel}>{formatMb(sizeMb)}</Text>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Chưa có capsule nào.</Text>
            }
          />

          <PrimaryButton
            label="Nâng cấp gói"
            iconName="diamond-outline"
            onPress={() => navigation.goBack()}
            style={styles.upgradeBtn}
          />
        </View>
      </SafeAreaView>
    </SoftScreen>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, padding: 16, paddingTop: 72 },
  usageCard: { padding: 16, marginBottom: 20 },
  usageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  usageTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  usageText: { fontSize: 14, color: colors.mutedText, marginBottom: 10 },
  progressBg: { height: 8, borderRadius: 4, backgroundColor: colors.primarySoft, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  overQuotaText: { marginTop: 8, fontSize: 12, color: colors.danger, fontWeight: '600' },
  planLabel: { marginTop: 8, fontSize: 12, color: colors.primary, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  listContent: { paddingBottom: 20 },
  capsuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.softBorder,
  },
  overQuotaRow: { borderColor: colors.danger, backgroundColor: isDark ? '#2E1A1A' : '#FFF5F5' },
  capsuleInfo: { flex: 1 },
  capsuleTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  capsuleMeta: { marginTop: 2, fontSize: 12, color: colors.mutedText },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#2E1A1A' : '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeLabel: { fontSize: 12, color: colors.mutedText, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: colors.mutedText, marginTop: 20 },
  upgradeBtn: { marginTop: 12 },
});
