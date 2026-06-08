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

  // Clear stuck reservation with warnings
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
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
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
              <View style={styles.usageHeaderLeft}>
                <AppIcon name="cloud-outline" size={22} color={isOverQuota ? colors.danger : colors.primary} />
                <Text style={styles.usageTitle}>{t('Dung lượng lưu trữ')}</Text>
              </View>
              {/* Premium plan badge */}
              <View style={[
                styles.planBadge, 
                { 
                  backgroundColor: colors.primarySoft + '1A', 
                  borderColor: colors.primarySoft + '50',
                  marginTop: 0
                }
              ]}>
                <AppIcon name="sparkles" size={10} color={colors.primary} />
                <Text style={[styles.planBadgeText, { color: colors.primary }]}>
                  {userPlan.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.usageText}>
              {formatMb(usedMb)} / {formatPlanLimit(limitMb)}
              {' '}({usedPercent.toFixed(0)}%)
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

            {isOverQuota ? (
              <View style={styles.overQuotaAlert}>
                <AppIcon name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.overQuotaText}>
                  {t('Vượt giới hạn! Xóa bớt hộp ký ức hoặc nâng cấp gói.')}
                </Text>
              </View>
            ) : null}

            {/* Info row explaining storage */}
            <View style={[
              styles.infoRow, 
              { 
                backgroundColor: isDark ? '#222130' : '#F8F9FD', 
                borderColor: colors.softBorder 
              }
            ]}>
              <AppIcon name="sparkles-outline" size={12} color={colors.primary} />
              <Text style={styles.infoRowText}>
                {t('Dung lượng bao gồm việc xem, tải lên và tải xuống.')}
              </Text>
            </View>
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
                <View style={[
                  styles.capsuleRow,
                  isOverQuota && sizeMb > 0 && styles.overQuotaRow,
                  { backgroundColor: colors.card, borderColor: colors.softBorder }
                ]}>
                  {/* Status color indicator stripe on the left edge */}
                  <View style={[
                    styles.statusStripe,
                    {
                      backgroundColor: item.status === 'locked'
                        ? colors.primary
                        : item.status === 'unlocked'
                        ? colors.success
                        : colors.mutedText
                    }
                  ]} />
                  
                  <View style={styles.capsuleContent}>
                    <View style={styles.capsuleInfo}>
                      <Text style={[styles.capsuleTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={styles.metaRow}>
                        {/* Status badge */}
                        <View style={[
                          styles.statusBadge,
                          {
                            backgroundColor: item.status === 'locked'
                              ? colors.primarySoft + '1F'
                              : item.status === 'unlocked'
                              ? colors.success + '1F'
                              : colors.mutedText + '1F',
                            borderColor: item.status === 'locked'
                              ? colors.primarySoft + '50'
                              : item.status === 'unlocked'
                              ? colors.success + '50'
                              : colors.mutedText + '50'
                          }
                        ]}>
                          <AppIcon 
                            name={item.status === 'locked' ? 'lock-closed' : item.status === 'unlocked' ? 'mail-open' : 'cube'} 
                            size={10} 
                            color={item.status === 'locked' ? colors.primary : item.status === 'unlocked' ? colors.success : colors.mutedText} 
                          />
                          <Text style={[
                            styles.statusBadgeText,
                            {
                              color: item.status === 'locked' ? colors.primary : item.status === 'unlocked' ? colors.success : colors.mutedText
                            }
                          ]}>
                            {t(item.status === 'locked' ? 'Khóa' : item.status === 'unlocked' ? 'Sẵn sàng' : 'Đã mở')}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.capsuleRightSide}>
                      {/* Size pill badge */}
                      <View style={[styles.sizePill, { backgroundColor: isDark ? '#2E2D38' : '#F5F5FA' }]}>
                        <Text style={[styles.sizeText, { color: colors.text }]}>{formatMb(sizeMb)}</Text>
                      </View>

                      {/* Delete button if older than 90 days */}
                      {canDelete && (
                        <Pressable
                          style={[styles.deleteBtn, { backgroundColor: isDark ? '#3D1B1B' : '#FFF0F0' }]}
                          onPress={() => handleDelete(item.id, item.title, sizeMb)}
                        >
                          <AppIcon name="trash-outline" size={16} color={colors.danger} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <AppIcon name="cube-outline" size={48} color={colors.mutedText} />
                <Text style={styles.emptyText}>{t('Chưa có hộp ký ức nào.')}</Text>
              </View>
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
  safeArea: { 
    flex: 1, 
    backgroundColor: 'transparent' 
  },
  container: { 
    flex: 1, 
    paddingHorizontal: 16, 
    paddingTop: 80 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.mutedText,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
  },
  usageCard: { 
    padding: 20, 
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: colors.softBorder,
    backgroundColor: colors.card,
    marginBottom: 24,
  },
  usageHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 12 
  },
  usageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usageTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: colors.text 
  },
  usageText: { 
    fontSize: 22, 
    fontWeight: '800',
    color: colors.text, 
    marginBottom: 8 
  },
  progressBg: { 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: isDark ? '#2E2D38' : '#ECEBF5', 
    overflow: 'hidden',
    marginVertical: 12,
  },
  progressFill: { 
    height: 12, 
    borderRadius: 6 
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  infoRowText: { 
    fontSize: 12, 
    color: colors.mutedText,
    fontStyle: 'italic',
    flex: 1,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  overQuotaAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: colors.danger + '1A',
    borderColor: colors.danger + '40',
  },
  overQuotaText: { 
    fontSize: 13, 
    color: colors.danger, 
    fontWeight: '600',
    flex: 1,
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: colors.text, 
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  listContent: { 
    paddingBottom: 24 
  },
  capsuleRow: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1.2,
    marginBottom: 10,
    overflow: 'hidden',
  },
  statusStripe: {
    width: 5,
    height: '100%',
  },
  capsuleContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  overQuotaRow: { 
    borderColor: colors.danger, 
  },
  capsuleInfo: { 
    flex: 1,
    marginRight: 12,
  },
  capsuleTitle: { 
    fontSize: 15, 
    fontWeight: '700', 
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  capsuleRightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sizePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sizeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: { 
    textAlign: 'center', 
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 10,
  },
  upgradeBtn: { 
    marginTop: 16,
    marginBottom: 8,
  },
});

