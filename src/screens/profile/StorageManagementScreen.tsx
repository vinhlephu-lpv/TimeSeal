/**
 * StorageManagementScreen.tsx
 *
 * Shows total storage used vs plan limit, lists capsules by size,
 * highlights over-quota items, and allows deletion.
 */
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PolishedAlert } from '../../store/alertStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { useCapsuleStore } from '../../store/capsuleStore';
import { useAuthStore } from '../../store/authStore';
import { getPlanLimits, type PlanType } from '../../config/plans';
import { getPlanStorageLabel } from '../../services/subscriptionService';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { AppIcon, ElevatedCard, PrimaryButton, SoftScreen } from '../../components/ui/DesignPrimitives';
import { useTranslation } from '../../i18n';
import firestore from '@react-native-firebase/firestore';
import { abandonCapsuleDraft, abandonAvatarDraft } from '../../services/backendService';

type Props = NativeStackScreenProps<AppStackParamList, 'StorageManagement'>;

export function StorageManagementScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const subscriptionSync = useAuthStore(s => s.subscriptionSync);
  const capsules = useCapsuleStore(s => s.capsules);
  const deleteCapsule = useCapsuleStore(s => s.deleteCapsule);
  const capsuleError = useCapsuleStore(s => s.error);

  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();

  const [reservedStorageMb, setReservedStorageMb] = React.useState(0);
  const [isCleaningReserved, setIsCleaningReserved] = React.useState(false);

  // Firestore reservedStorageMb realtime subscription
  React.useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = firestore().collection('users').doc(user.id).onSnapshot(doc => {
      const data = doc.data();
      if (data) {
        setReservedStorageMb(Number(data.reservedStorageMb || 0));
      }
    });
    return unsubscribe;
  }, [user?.id]);

  // 3. Clear stuck reservation with warnings
  const handleClearReserved = async () => {
    if (isCleaningReserved || !user?.id) return;
    PolishedAlert.show(
      t('Xác nhận giải phóng giữ chỗ?'),
      t('CẢNH BÁO: Chỉ thực hiện khi bạn KHÔNG có tiến trình tải lên nào đang chạy. Nếu bạn thoát ứng dụng đột ngột hoặc hủy lúc đang tải, tệp tải lên sẽ bị HỎNG vĩnh viễn và không thể hoàn tất.'),
      [
        { text: t('Quay lại'), style: 'cancel' },
        {
          text: t('Xác nhận giải phóng'),
          style: 'destructive',
          onPress: async () => {
            setIsCleaningReserved(true);
            try {
              // 1. Abandon avatar draft if any
              await abandonAvatarDraft().catch(() => {});
              
              // 2. Query draft capsules owned by user and abandon them
              const snap = await firestore()
                .collection('capsules')
                .where('ownerId', '==', user.id)
                .where('status', '==', 'draft')
                .get();
              
              for (const doc of snap.docs) {
                await abandonCapsuleDraft(doc.id).catch(() => {});
              }

              // 3. Sync subscription
              await useAuthStore.getState().syncSubscription();
              PolishedAlert.show(t('Thành công'), t('Đã giải phóng hoàn toàn các dung lượng giữ chỗ bị treo!'));
            } catch (err) {
              PolishedAlert.show(t('Thất bại'), t('Không thể dọn dẹp dung lượng giữ chỗ lúc này.'));
            } finally {
              setIsCleaningReserved(false);
            }
          }
        }
      ]
    );
  };

  React.useEffect(() => {
    useAuthStore.getState().syncSubscription();
  }, []);

  const userPlan: PlanType = user?.plan || 'free';
  const limits = getPlanLimits(userPlan);
  const usedMb = subscriptionSync?.usedStorageMb ?? 0;
  const limitMb = limits.maxAccountStorageMb;
  const usedPercent = limitMb > 0 ? Math.min(100, (usedMb / limitMb) * 100) : 0;
  const isOverQuota = usedMb > limitMb;

  // Sort capsules by size descending
  const sorted = [...capsules].sort((a, b) => (b.totalSizeMb || 0) - (a.totalSizeMb || 0));

  const handleDelete = (capsuleId: string, title: string, sizeMb: number) => {
    PolishedAlert.show(
      t('Xóa hộp ký ức?'),
      `Bạn sắp xóa "${title}" (${sizeMb.toFixed(1)}MB). Hành động này không thể hoàn tác.`,
      [
        { text: t('Hủy'), style: 'cancel' },
        {
          text: t('Xóa vĩnh viễn'),
          style: 'destructive',
          onPress: async () => {
            const ok = await deleteCapsule(capsuleId);
            if (!ok) {
              PolishedAlert.show(t('Lỗi'), capsuleError || t('Xóa thất bại.'));
            }
          },
        },
      ],
    );
  };

  const formatMb = (mb: number) =>
    mb >= 1 ? `${mb.toFixed(1)}MB` : `${(mb * 1024).toFixed(0)}KB`;
  const formatPlanLimit = (mb: number) =>
    mb >= 1024 ? getPlanStorageLabel(userPlan) : `${mb}MB`;

  if (!subscriptionSync) {
    return (
      <SoftScreen>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={{ color: colors.mutedText, fontSize: 14, fontWeight: '600' }}>
              {t('Đang tải dung lượng tài khoản...')}
            </Text>
          </View>
        </SafeAreaView>
      </SoftScreen>
    );
  }

  return (
    <SoftScreen>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.container, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
          {/* Storage usage card */}
          <ElevatedCard style={styles.usageCard}>
            <View style={styles.usageHeader}>
              <AppIcon name="cloud-outline" size={22} color={isOverQuota ? colors.danger : colors.primary} />
              <Text style={styles.usageTitle}>{t('Dung lượng lưu trữ')}</Text>
            </View>
            <Text style={styles.usageText}>
              {formatMb(usedMb)} / {formatPlanLimit(limitMb)}
              {' '}({usedPercent.toFixed(0)}%)
            </Text>
            <Text style={{ fontSize: 11, color: colors.mutedText, marginTop: -4, marginBottom: 8, fontStyle: 'italic' }}>
              * Dung lượng bao gồm việc xem, tải lên và tải xuống.
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
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
                <AppIcon name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={[styles.overQuotaText, { marginTop: 0, flex: 1 }]}>
                  {t('Vượt giới hạn! Xóa bớt hộp ký ức hoặc nâng cấp gói.')}
                </Text>
              </View>
            )}

            <Text style={styles.planLabel}>{t('Gói hiện tại:')} {userPlan.toUpperCase()}</Text>

            {/* Reserved storage is automatically cleaned by the backend after 24h.
                No user action needed – UI intentionally hidden. */}
          </ElevatedCard>

          {/* Capsule list by size */}
          <Text style={styles.sectionTitle}>{t('Hộp ký ức theo dung lượng')}</Text>

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
                item.status === 'opened' && diffDays >= 90;

              return (
                <View style={[styles.capsuleRow, isOverQuota && sizeMb > 0 && styles.overQuotaRow]}>
                  <View style={styles.capsuleInfo}>
                    <Text style={styles.capsuleTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                      <Text style={[styles.capsuleMeta, { marginTop: 0 }]}>{formatMb(sizeMb)}</Text>
                      <Text style={[styles.capsuleMeta, { marginTop: 0 }]}>·</Text>
                      {item.status === 'locked' ? (
                        <AppIcon name="lock-closed" size={12} color={colors.primary} />
                      ) : item.status === 'unlocked' ? (
                        <AppIcon name="mail-open" size={12} color={colors.success} />
                      ) : (
                        <AppIcon name="cube" size={12} color={colors.mutedText} />
                      )}
                      <Text style={[styles.capsuleMeta, { marginTop: 0 }]}>
                        {t(item.status === 'locked' ? 'Khóa' : item.status === 'unlocked' ? 'Sẵn sàng' : 'Đã mở')}
                      </Text>
                    </View>
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
              <Text style={styles.emptyText}>{t('Chưa có hộp ký ức nào.')}</Text>
            }
          />

          {userPlan === 'free' && isOverQuota ? (
            <PrimaryButton
              label={t('Nâng cấp gói')}
              iconName="diamond-outline"
              onPress={() => navigation.goBack()}
              style={styles.upgradeBtn}
            />
          ) : null}
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
  reservedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    gap: 6,
  },
  reservedText: {
    flex: 1,
  },
  clearReservedBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
  },
  clearReservedBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
