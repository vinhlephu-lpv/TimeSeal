import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { useCapsuleStore } from '../../store/capsuleStore';
import type { AppStackParamList } from '../../types/navigation';
import { capsuleThemes, ThemeBackground } from '../../theme/capsuleThemes';
import { AppIcon, PrimaryButton } from '../../components/ui/DesignPrimitives';
import { getWaitingCapsuleDetail, type WaitingCapsuleDetail } from '../../services/backendService';
import { formatDate, getCountdownValues } from '../../utils/dateHelpers';
import { useTranslation } from '../../i18n';

type Props = NativeStackScreenProps<AppStackParamList, 'CapsuleWaiting'>;

export function CapsuleWaitingScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const capsule = useCapsuleStore(s => s.capsules.find(item => item.id === route.params.capsuleId));
  const userId = useAuthStore(s => s.user?.id);
  const themeKey = capsule?.theme || 'default';
  const activeTheme = capsuleThemes[themeKey] || capsuleThemes.default;
  const tc = activeTheme.colors;
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = React.useState<WaitingCapsuleDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');
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

  const currentCapsule = detail?.capsule;
  const deadlineISO = currentCapsule?.contributionDeadlineISO || capsule?.contributionDeadlineISO || '';
  const countdown = deadlineISO
    ? getCountdownValues(deadlineISO)
    : { days: 0, hours: 0, minutes: 0, seconds: 0, isUnlocked: true };
  const hasDeadlinePassed = deadlineISO ? new Date(deadlineISO).getTime() <= now.getTime() : false;
  const myContribution = detail?.contributions.find(item => item.contributorId === userId);
  const contributedEmails = new Set(detail?.contributions.map(item => item.contributorEmail.toLowerCase()).filter(Boolean));
  const pendingEmails = (currentCapsule?.memberEmails || capsule?.memberEmails || [])
    .filter(email => !contributedEmails.has(email.toLowerCase()));

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
                <AppIcon name="checkmark-circle" size={18} color="#10B981" />
                <Text style={[styles.memberText, { color: tc.text }]} numberOfLines={1}>
                  {item.contributorName || item.contributorEmail}
                </Text>
                <Text style={styles.doneText}>{t('Đã góp')}</Text>
              </View>
            ))}
            {pendingEmails.map(email => (
              <View key={email} style={styles.memberRow}>
                <AppIcon name="ellipse-outline" size={18} color={tc.mutedText} />
                <Text style={[styles.memberText, { color: tc.mutedText }]} numberOfLines={1}>{email}</Text>
                <Text style={[styles.pendingText, { color: tc.mutedText }]}>{t('Chưa góp')}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: tc.text }]}>{t('Nội dung đã đóng góp')}</Text>
            {detail.accessLevel === 'restricted' ? (
              <Text style={[styles.meta, { color: '#EF4444' }]}>
                {t('Tài khoản đã hết quota xem nội dung. Hãy quay lại sau khi quota được làm mới hoặc nâng gói khi cần.')}
              </Text>
            ) : null}
            {detail.contributions.map(item => {
              const previewUri = item.thumbnailUrls.find(Boolean) || item.mediaUrls.find(Boolean);
              return (
                <View key={item.id} style={[styles.contributionCard, { borderColor: tc.cardBorder, backgroundColor: tc.inputBg }]}>
                  <View style={styles.contributionHeader}>
                    <View style={[styles.avatar, { backgroundColor: tc.activeChipBg }]}>
                      <Text style={[styles.avatarText, { color: tc.activeChipText }]}>
                        {(item.contributorName || item.contributorEmail || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.contributorName, { color: tc.text }]}>{item.contributorName}</Text>
                      <Text style={[styles.metaSmall, { color: tc.mutedText }]}>{formatDate(item.createdAtISO)}</Text>
                    </View>
                  </View>
                  {item.message ? <Text style={[styles.message, { color: tc.text }]}>{item.message}</Text> : null}
                  {previewUri ? <Image source={{ uri: previewUri }} style={styles.previewImage} /> : null}
                </View>
              );
            })}
          </View>

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
  avatarText: { fontSize: 13, fontWeight: '900' },
  contributorName: { fontSize: 14, fontWeight: '900' },
  metaSmall: { marginTop: 2, fontSize: 11 },
  message: { marginTop: 10, fontSize: 14, lineHeight: 20 },
  previewImage: { marginTop: 10, width: '100%', height: 160, borderRadius: 12 },
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
});
