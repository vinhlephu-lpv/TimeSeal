import React from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { useCapsuleStore } from '../../store/capsuleStore';
import type { AppStackParamList } from '../../types/navigation';
import { capsuleThemes, ThemeBackground } from '../../theme/capsuleThemes';
import { AppIcon, PrimaryButton } from '../../components/ui/DesignPrimitives';
import { getWaitingCapsuleDetail, type WaitingCapsuleDetail, type WaitingContribution } from '../../services/backendService';
import { useCachedAvatarUri } from '../../services/avatarCacheService';
import { cacheCapsuleSharpThumbnail, getCachedCapsuleSharpThumbnail } from '../../services/thumbnailCacheService';
import { formatDate, getCountdownValues } from '../../utils/dateHelpers';
import { useTranslation } from '../../i18n';

/** Hiển thị tên đẹp: ưu tiên displayName → username (phần trước @) → fallback */
const getDisplayName = (item: WaitingContribution): string => {
  if (item.contributorName && item.contributorName.trim()) {
    return item.contributorName.trim();
  }
  if (item.contributorEmail) {
    return item.contributorEmail.split('@')[0] || item.contributorEmail;
  }
  return 'Thành viên';
};

type Props = NativeStackScreenProps<AppStackParamList, 'CapsuleWaiting'>;

function CachedContributionThumbnail({ cacheKey, remoteUri, style }: { cacheKey: string; remoteUri: string | null; style: any }) {
  const [localUri, setLocalUri] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    if (remoteUri) {
      cacheCapsuleSharpThumbnail(cacheKey, remoteUri).then(uri => {
        if (active && uri) {
          setLocalUri(uri);
        }
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [cacheKey, remoteUri]);

  if (!localUri && !remoteUri) return null;
  return <Image source={{ uri: localUri || remoteUri || undefined }} style={style} />;
}

function ContributionAvatar({
  item,
  backgroundColor,
  textColor,
  size = 34,
}: {
  item: WaitingContribution;
  backgroundColor: string;
  textColor: string;
  size?: number;
}) {
  const avatarUri = useCachedAvatarUri({
    userId: item.contributorId,
    avatarPath: item.contributorAvatarPath,
    avatarVersion: item.contributorAvatarVersion,
    avatarUrl: item.contributorAvatarUrl,
  });
  // Dùng getDisplayName để lấy ký tự đầu đẹp hơn
  const label = getDisplayName(item).charAt(0).toUpperCase();

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}>
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={[styles.avatarImage, { borderRadius: size / 2 }]} />
      ) : (
        <Text style={[styles.avatarText, { color: textColor }]}>{label}</Text>
      )}
    </View>
  );
}

export function CapsuleWaitingScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const capsule = useCapsuleStore(s => s.capsules.find(item => item.id === route.params.capsuleId));
  const userId = useAuthStore(s => s.user?.id);
  const userPlan = useAuthStore(s => s.user?.plan || 'free');
  const themeKey = capsule?.theme || 'default';
  const activeTheme = capsuleThemes[themeKey] || capsuleThemes.default;
  const tc = activeTheme.colors;
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = React.useState<WaitingCapsuleDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isOpeningContribution, setIsOpeningContribution] = React.useState(false);
  const [selectedContribution, setSelectedContribution] = React.useState<WaitingContribution | null>(null);
  const [error, setError] = React.useState('');
  const [viewerError, setViewerError] = React.useState('');
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    navigation.setOptions({
      headerTransparent: false,
      headerStyle: { backgroundColor: tc.background },
      headerTintColor: tc.text,
      headerShadowVisible: false,
      title: t('Capsule đang chờ'),
    });
  }, [navigation, t, tc]);

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadDetail = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const result = await getWaitingCapsuleDetail(route.params.capsuleId);
      setDetail(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Không tải được capsule đang chờ.'));
    } finally {
      setIsLoading(false);
    }
  }, [route.params.capsuleId, t]);

  React.useEffect(() => {
    loadDetail().catch(() => {});
  }, [loadDetail]);

  const openContributionDetail = React.useCallback(async (contributionId: string) => {
    if (!detail) { return; }
    let currentDetail = detail;
    const currentContribution = detail.contributions.find(item => item.id === contributionId);
    const hasMedia = currentContribution && (currentContribution.mediaTypes && currentContribution.mediaTypes.length > 0);
    const hasMediaLoaded = currentContribution && (currentContribution.mediaUrls && currentContribution.mediaUrls.length > 0);

    if (hasMedia && !hasMediaLoaded) {
      try {
        setIsLoading(true);
        setViewerError('');
        const result = await getWaitingCapsuleDetail(route.params.capsuleId, true);
        setDetail(result);
        currentDetail = result;
      } catch (err) {
        setViewerError(err instanceof Error ? err.message : t('Không tải được nội dung đầy đủ.'));
        setIsLoading(false);
        return;
      } finally {
        setIsLoading(false);
      }
    }

    const contribution = currentDetail.contributions.find(item => item.id === contributionId);
    if (contribution) {
      setSelectedContribution(contribution);
    }
  }, [detail, route.params.capsuleId, t]);

  const currentCapsule = detail?.capsule;
  const deadlineISO = currentCapsule?.contributionDeadlineISO || capsule?.contributionDeadlineISO || '';
  const countdown = deadlineISO
    ? getCountdownValues(deadlineISO)
    : { days: 0, hours: 0, minutes: 0, seconds: 0, isUnlocked: true };
  const hasDeadlinePassed = deadlineISO ? new Date(deadlineISO).getTime() <= now.getTime() : false;
  const myContribution = detail?.contributions.find(item => item.contributorId === userId);
  const isFreeUser = userPlan === 'free';
  const pendingMembers = detail?.pendingMembers || [];
  // Bug #7: Tổng dung lượng đóng góp
  const totalContributionsMb = detail?.contributions.reduce((sum, item) => sum + (item.storageSizeMb || 0), 0) ?? 0;
  const formatMb = (mb: number) => mb >= 1 ? `${mb.toFixed(1)}MB` : `${(mb * 1024).toFixed(0)}KB`;

  if (isLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: tc.background }]}>
        <ThemeBackground themeKey={themeKey} />
        <ActivityIndicator color={tc.primary} />
        <Text style={[styles.loadingText, { color: tc.text }]}>{t('Đang tải capsule đang chờ...')}</Text>
      </View>
    );
  }

  if (error || !currentCapsule) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: tc.background }]}>
        <ThemeBackground themeKey={themeKey} />
        <Text style={[styles.errorText, { color: '#EF4444' }]}>{error || t('Không tìm thấy capsule.')}</Text>
        <PrimaryButton label={t('Thử lại')} onPress={loadDetail} style={{ marginTop: 14, backgroundColor: tc.buttonBg }} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <ThemeBackground themeKey={themeKey} />
      <StatusBar barStyle={activeTheme.statusBar} translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
          <View style={[styles.heroCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={styles.heroIcon}>
              <AppIcon name="hourglass-outline" size={28} color={tc.primary} />
            </View>
            <Text style={[styles.label, { color: tc.primary }]}>{t('ĐANG CHỜ ĐÓNG GÓP')}</Text>
            <Text style={[styles.title, { color: tc.text }]}>{currentCapsule.title}</Text>
            <Text style={[styles.meta, { color: tc.mutedText }]}>
              {t('Deadline:')} {formatDate(deadlineISO)}
            </Text>
            <View style={[styles.countdownPill, { backgroundColor: tc.activeChipBg, borderColor: tc.activeChipBorder }]}>
              <Text style={[styles.countdownText, { color: tc.activeChipText }]}>
                {hasDeadlinePassed
                  ? t('Đã hết thời gian đóng góp')
                  : `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`}
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: tc.text }]}>{t('Tiến độ thành viên')}</Text>
            {detail.contributions.map(item => (
              <View key={item.id} style={styles.memberRow}>
                <ContributionAvatar item={item} backgroundColor={tc.activeChipBg} textColor={tc.activeChipText} size={28} />
                <Text style={[styles.memberText, { color: tc.text }]} numberOfLines={1}>
                  {getDisplayName(item)}
                </Text>
                <Text style={styles.doneText}>{t('Đã góp')}</Text>
              </View>
            ))}
            {pendingMembers.map((member, idx) => (
              <View key={member.id || member.email || idx} style={styles.memberRow}>
                {member.id ? (
                  <ContributionAvatar item={member as any} backgroundColor={tc.cardBorder} textColor={tc.mutedText} size={28} />
                ) : (
                  <AppIcon name="ellipse-outline" size={18} color={tc.mutedText} />
                )}
                <Text style={[styles.memberText, { color: tc.mutedText }]} numberOfLines={1}>{member.name !== 'Thành viên' ? member.name : member.email}</Text>
                <Text style={[styles.pendingText, { color: tc.mutedText }]}>{t('Chưa góp')}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: tc.text }]}>{t('Nội dung đã đóng góp')}</Text>
            {isFreeUser ? (
              <View style={[styles.freeWarning, { backgroundColor: tc.inputBg, borderColor: tc.cardBorder }]}>
                <AppIcon name="alert-circle-outline" size={18} color={tc.primary} />
                <Text style={[styles.freeWarningText, { color: tc.mutedText }]}>
                  {t('Tài khoản Free có quota xem giới hạn. Hãy cân nhắc trước khi mở video/ảnh nặng từ thành viên Pro Max vì quota tháng có thể hết nhanh.')}
                </Text>
              </View>
            ) : null}
            {detail.accessLevel === 'restricted' ? (
              <Text style={[styles.meta, { color: '#EF4444' }]}>
                {t('Tài khoản đã hết quota xem nội dung. Hãy quay lại sau khi quota được làm mới hoặc nâng gói khi cần.')}
              </Text>
            ) : null}
            {detail.contributions.map(item => {
              const previewUri = item.thumbnailUrls.find(Boolean) || item.mediaUrls.find(Boolean);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => openContributionDetail(item.id)}
                  style={[styles.contributionCard, { borderColor: tc.cardBorder, backgroundColor: tc.inputBg }]}>
                  <View style={styles.contributionHeader}>
                    <ContributionAvatar item={item} backgroundColor={tc.activeChipBg} textColor={tc.activeChipText} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.contributorName, { color: tc.text }]}>
                        {getDisplayName(item)}
                      </Text>
                      <Text style={[styles.metaSmall, { color: tc.mutedText }]}>{formatDate(item.createdAtISO)}</Text>
                    </View>
                    {item.storageSizeMb > 0 ? (
                      <Text style={[styles.metaSmall, { color: tc.mutedText }]}>{formatMb(item.storageSizeMb)}</Text>
                    ) : null}
                  </View>
                  {item.message ? <Text style={[styles.message, { color: tc.text }]}>{item.message}</Text> : null}
                  <CachedContributionThumbnail cacheKey={item.id} remoteUri={previewUri || null} style={styles.previewImage} />
                  <Text style={[styles.tapHint, { color: tc.primary }]}>
                    {t('Chạm để xem đầy đủ')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Bug #7: Tổng dung lượng đóng góp */}
          {totalContributionsMb > 0 ? (
            <View style={[styles.storageRow, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
              <AppIcon name="cloud-outline" size={14} color={tc.primary} />
              <Text style={[styles.storageText, { color: tc.mutedText }]}>
                {t('Tổng dung lượng đóng góp:')}{' '}
                <Text style={{ color: tc.text, fontWeight: '700' }}>{formatMb(totalContributionsMb)}</Text>
              </Text>
            </View>
          ) : null}

          {viewerError ? <Text style={[styles.errorText, { color: '#EF4444', marginTop: 12 }]}>{viewerError}</Text> : null}

          <View style={styles.actions}>
            <PrimaryButton
              label={myContribution ? t('Sửa đóng góp của tôi') : t('Đóng góp')}
              iconName={myContribution ? 'create-outline' : 'add-circle-outline'}
              onPress={() => navigation.navigate('CapsuleContribution', { capsuleId: currentCapsule.id })}
              disabled={hasDeadlinePassed}
              style={[styles.primaryButton, { backgroundColor: tc.buttonBg, opacity: hasDeadlinePassed ? 0.55 : 1 }]}
            />
            <Pressable style={[styles.secondaryButton, { borderColor: tc.cardBorder }]} onPress={() => navigation.goBack()}>
              <Text style={[styles.secondaryText, { color: tc.text }]}>{t('Để sau')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
      <Modal visible={Boolean(selectedContribution)} transparent animationType="fade" onRequestClose={() => setSelectedContribution(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={styles.modalHeader}>
              {selectedContribution ? (
                <ContributionAvatar item={selectedContribution} backgroundColor={tc.activeChipBg} textColor={tc.activeChipText} size={38} />
              ) : null}
              <Text style={[styles.modalTitle, { color: tc.text }]} numberOfLines={1}>
                {selectedContribution ? getDisplayName(selectedContribution) : t('Thành viên')}
              </Text>
              <Pressable style={styles.modalClose} onPress={() => setSelectedContribution(null)}>
                <AppIcon name="close" size={20} color={tc.text} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              {selectedContribution?.message ? (
                <Text style={[styles.modalMessage, { color: tc.text }]}>{selectedContribution.message}</Text>
              ) : null}
              {(selectedContribution?.mediaUrls || []).map((uri, index) => {
                const mediaType = selectedContribution?.mediaTypes[index] || 'image';
                const thumbnailUri = selectedContribution?.thumbnailUrls[index] || '';
                return (
                  <View key={`${uri}-${index}`} style={styles.modalMediaWrap}>
                    {mediaType === 'video' ? (
                      <View style={[styles.modalVideo, { backgroundColor: tc.inputBg, borderColor: tc.cardBorder }]}>
                        {thumbnailUri ? <CachedContributionThumbnail cacheKey={`${selectedContribution?.id}_thumb_${index}`} remoteUri={thumbnailUri} style={styles.modalImage} /> : null}
                        <View style={styles.videoBadge}>
                          <AppIcon name="videocam-outline" size={22} color="#FFFFFF" />
                        </View>
                      </View>
                    ) : (
                      <CachedContributionThumbnail cacheKey={`${selectedContribution?.id}_media_${index}`} remoteUri={uri} style={styles.modalImage} />
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '700' },
  errorText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  content: { padding: 16, paddingTop: 12 },
  heroCard: { borderWidth: 1.4, borderRadius: 22, padding: 20, alignItems: 'center' },
  heroIcon: { width: 58, height: 58, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 8, fontSize: 11, letterSpacing: 1.1, fontWeight: '900' },
  title: { marginTop: 8, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  meta: { marginTop: 8, fontSize: 13, lineHeight: 19 },
  countdownPill: { marginTop: 12, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  countdownText: { fontSize: 12, fontWeight: '900' },
  card: { marginTop: 14, borderWidth: 1.2, borderRadius: 18, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '900', marginBottom: 10 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  memberText: { flex: 1, fontSize: 13, fontWeight: '700' },
  doneText: { color: '#10B981', fontSize: 11, fontWeight: '900' },
  pendingText: { fontSize: 11, fontWeight: '800' },
  contributionCard: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 10 },
  contributionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 13, fontWeight: '900' },
  contributorName: { fontSize: 14, fontWeight: '900' },
  metaSmall: { marginTop: 2, fontSize: 11 },
  message: { marginTop: 10, fontSize: 14, lineHeight: 20 },
  previewImage: { marginTop: 10, width: '100%', height: 160, borderRadius: 12 },
  tapHint: { marginTop: 10, fontSize: 12, fontWeight: '900' },
  freeWarning: { flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: 14, padding: 10, marginBottom: 10 },
  freeWarningText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  actions: { marginTop: 18, gap: 10 },
  primaryButton: { minHeight: 54, borderRadius: 16 },
  secondaryButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryText: { fontSize: 14, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'center', padding: 18 },
  modalCard: { maxHeight: '82%', borderWidth: 1.2, borderRadius: 22, padding: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '900' },
  modalClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalContent: { paddingTop: 12, paddingBottom: 8 },
  modalMessage: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  modalMediaWrap: { marginTop: 10 },
  modalImage: { width: '100%', height: 260, borderRadius: 16, backgroundColor: '#CBD5E1' },
  modalVideo: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  videoBadge: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  storageText: {
    fontSize: 13,
  },
});
