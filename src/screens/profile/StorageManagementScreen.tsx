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
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { AppIcon, ElevatedCard, PrimaryButton, SoftScreen } from '../../components/ui/DesignPrimitives';
import { useTranslation } from '../../i18n';
import RNFS from 'react-native-fs';
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
  const [cacheSize, setCacheSize] = React.useState(0);
  const [isCleaningReserved, setIsCleaningReserved] = React.useState(false);
  const [isCleaningCache, setIsCleaningCache] = React.useState(false);

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

  // Read local cache directories size
  const THUMBNAIL_DIR = `${RNFS.DocumentDirectoryPath}/timeseal-sharp-thumbnails`;
  const AVATAR_DIR = `${RNFS.DocumentDirectoryPath}/timeseal-avatars`;

  const getDirSize = async (dirPath: string): Promise<number> => {
    try {
      if (!(await RNFS.exists(dirPath))) return 0;
      const files = await RNFS.readDir(dirPath);
      let size = 0;
      for (const file of files) {
        if (file.isFile()) {
          size += Number(file.size || 0);
        }
      }
      return size;
    } catch {
      return 0;
    }
  };

  const updateCacheSize = React.useCallback(async () => {
    const thumbSize = await getDirSize(THUMBNAIL_DIR);
    const avtSize = await getDirSize(AVATAR_DIR);
    setCacheSize(thumbSize + avtSize);
  }, [THUMBNAIL_DIR, AVATAR_DIR]);

  React.useEffect(() => {
    updateCacheSize();
  }, [updateCacheSize]);

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

  // 4. Clear local image caches
  const clearDirFiles = async (dirPath: string) => {
    try {
      if (!(await RNFS.exists(dirPath))) return;
      const files = await RNFS.readDir(dirPath);
      for (const file of files) {
        if (file.isFile()) {
          await RNFS.unlink(file.path);
        }
      }
    } catch {}
  };

  const handleClearCache = () => {
    if (isCleaningCache) return;
    PolishedAlert.show(
      t('Xóa bộ nhớ đệm hình ảnh?'),
      t('Bộ nhớ đệm chứa ảnh bìa sắc nét giúp màn hình chính tải nhanh hơn và tiết kiệm băng thông. Xóa bộ đệm sẽ giải phóng bộ nhớ điện thoại của bạn, nhưng lần sau mở hộp sẽ tải lại tệp từ đám mây.'),
      [
        { text: t('Hủy'), style: 'cancel' },
        {
          text: t('Xóa bộ đệm'),
          style: 'destructive',
          onPress: async () => {
            setIsCleaningCache(true);
            try {
              await clearDirFiles(THUMBNAIL_DIR);
              await clearDirFiles(AVATAR_DIR);
              await updateCacheSize();
              PolishedAlert.show(t('Đã xóa'), t('Bộ nhớ đệm hình ảnh cục bộ đã được dọn sạch!'));
            } catch {
              PolishedAlert.show(t('Lỗi'), t('Không thể xóa bộ nhớ đệm.'));
            } finally {
              setIsCleaningCache(false);
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
              {formatMb(usedMb)} / {limitMb >= 1024 ? `${(limitMb / 1024).toFixed(0)}GB` : `${limitMb}MB`}
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

            {reservedStorageMb > 0 && (
              <View style={[styles.reservedBox, { backgroundColor: isDark ? '#2A2010' : '#FFFDF2', borderColor: colors.warning }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <AppIcon name="timer-outline" size={16} color={colors.warning} />
                  <Text style={[styles.reservedText, { color: colors.text, fontSize: 11, fontWeight: '500', flex: 1, lineHeight: 16 }]}>
                    {t('Có {{size}}MB đang giữ chỗ tạm thời. Nếu thoát app lúc đang tải lên, tệp sẽ bị LỖI.', { size: reservedStorageMb.toFixed(1) })}
                  </Text>
                </View>
                <Pressable 
                  style={[styles.clearReservedBtn, { backgroundColor: colors.warning }]} 
                  onPress={handleClearReserved}
                  disabled={isCleaningReserved}
                >
                  <Text style={styles.clearReservedBtnText}>{isCleaningReserved ? t('...') : t('Hủy')}</Text>
                </Pressable>
              </View>
            )}
          </ElevatedCard>

          {/* Cache cleanup card */}
          <ElevatedCard style={styles.cacheCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={[styles.cacheIconWrap, { backgroundColor: colors.primarySoft, width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }]}>
                  <AppIcon name="image-outline" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cacheTitle, { color: colors.text, fontSize: 13, fontWeight: '700' }]}>{t('Bộ nhớ đệm hình ảnh cục bộ')}</Text>
                  <Text style={{ color: colors.mutedText, fontSize: 10, marginTop: 2 }}>
                    {t('Ảnh bìa và avatar đệm giúp tải cực nhanh.')}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4, marginLeft: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>
                  {cacheSize >= 1024 * 1024 
                    ? `${(cacheSize / (1024 * 1024)).toFixed(1)} MB` 
                    : cacheSize >= 1024 
                    ? `${(cacheSize / 1024).toFixed(0)} KB` 
                    : `${cacheSize} B`}
                </Text>
                <Pressable 
                  style={[styles.clearCacheBtn, { backgroundColor: isDark ? '#2E1A1A' : '#FFF0F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }]} 
                  onPress={handleClearCache}
                  disabled={isCleaningCache || cacheSize === 0}
                >
                  <Text style={[styles.clearCacheBtnText, { color: cacheSize === 0 ? colors.mutedText : colors.danger, fontSize: 10, fontWeight: '700' }]}>
                    {isCleaningCache ? t('...') : t('Dọn dẹp')}
                  </Text>
                </Pressable>
              </View>
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

          {userPlan !== 'pro_max' ? (
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
  cacheCard: {
    padding: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  cacheIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cacheTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  clearCacheBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearCacheBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
