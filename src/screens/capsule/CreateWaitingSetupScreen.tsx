import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import { AppIcon, PrimaryButton } from '../../components/ui/DesignPrimitives';
import { capsuleThemes, ThemeBackground } from '../../theme/capsuleThemes';
import { formatDate } from '../../utils/dateHelpers';
import { createWaitingCapsuleWithUpload } from '../../services/waitingContributionUploadService';
import { useTranslation } from '../../i18n';

type Props = NativeStackScreenProps<AppStackParamList, 'CreateWaitingSetup'>;

const oneHourMs = 60 * 60 * 1000;

const defaultDeadline = (openDateISO: string) => {
  const openAt = new Date(openDateISO).getTime();
  const fallback = Date.now() + 24 * oneHourMs;
  return new Date(Math.max(Date.now() + oneHourMs, Math.min(openAt - oneHourMs, fallback)));
};

export function CreateWaitingSetupScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { title, openDateISO, theme, message, mediaAssets, memberEmails } = route.params;
  const user = useAuthStore(s => s.user);
  const isPremium = Boolean(user?.isPremium);
  const userPlan = user?.plan || (isPremium ? 'plus' : 'free');
  const activeTheme = capsuleThemes[theme] || capsuleThemes.default;
  const tc = activeTheme.colors;
  const insets = useSafeAreaInsets();
  const [deadline, setDeadline] = React.useState(() => defaultDeadline(openDateISO));
  const [showPicker, setShowPicker] = React.useState(false);
  const [pickerMode, setPickerMode] = React.useState<'date' | 'time'>('date');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState('');

  const openDate = new Date(openDateISO);
  const isDeadlineValid = deadline.getTime() > Date.now() &&
    deadline.getTime() <= openDate.getTime() - oneHourMs;

  const openDeadlinePicker = () => {
    setPickerMode('date');
    setShowPicker(true);
  };

  const onPickerChange = (_: unknown, selectedDate?: Date) => {
    if (!selectedDate) {
      setShowPicker(false);
      return;
    }
    if (pickerMode === 'date') {
      const nextDate = new Date(deadline);
      nextDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setDeadline(nextDate);
      setPickerMode('time');
      setShowPicker(false);
      setTimeout(() => setShowPicker(true), 120);
      return;
    }
    const nextDate = new Date(deadline);
    nextDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    setDeadline(nextDate);
    setShowPicker(false);
  };

  const createWaitingCapsule = async () => {
    if (!isDeadlineValid || isSubmitting) {
      setError(t('Deadline đóng góp phải trước ngày mở ít nhất 1 giờ.'));
      return;
    }
    try {
      setIsSubmitting(true);
      setError('');
      await createWaitingCapsuleWithUpload({
        title,
        message,
        openDateISO,
        contributionDeadlineISO: deadline.toISOString(),
        theme,
        memberEmails,
        mediaAssets,
      }, userPlan, setProgress);
      navigation.navigate('Tabs', { screen: 'Home' });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Không tạo được capsule nhóm chờ đóng góp.'));
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ThemeBackground themeKey={theme} />
      <StatusBar barStyle={activeTheme.statusBar} translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: tc.inputBg, borderColor: tc.cardBorder }]}
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}>
            <AppIcon name="chevron-back" size={22} color={tc.primary} />
          </Pressable>
          <View style={[styles.badge, { backgroundColor: tc.activeChipBg, borderColor: tc.activeChipBorder }]}>
            <Text style={[styles.badgeText, { color: tc.activeChipText }]}>{t('Bước 4/4')}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
          <Text style={[styles.heading, { color: tc.text }]}>{t('Tạo capsule chờ')}</Text>
          <Text style={[styles.subheading, { color: tc.mutedText }]}>
            {t('Thành viên được mời có thể xem trước và đóng góp ký ức của riêng họ cho đến deadline này.')}
          </Text>

          <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <Text style={[styles.label, { color: tc.mutedText }]}>{t('CAPSULE')}</Text>
            <Text style={[styles.title, { color: tc.text }]}>{title}</Text>
            <View style={[styles.divider, { backgroundColor: tc.cardBorder }]} />
            <View style={styles.metaRow}>
              <AppIcon name="time-outline" size={16} color={tc.primary} />
              <Text style={[styles.meta, { color: tc.text }]}>{t('Mở ngày')} {formatDate(openDateISO)}</Text>
            </View>
            <View style={styles.metaRow}>
              <AppIcon name="people-outline" size={16} color={tc.primary} />
              <Text style={[styles.meta, { color: tc.text }]}>{memberEmails.length} {t('thành viên được mời')}</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: isDeadlineValid ? tc.cardBorder : '#EF4444' }]}>
            <Text style={[styles.label, { color: tc.mutedText }]}>{t('DEADLINE ĐÓNG GÓP')}</Text>
            <Pressable
              style={[styles.deadlineButton, { backgroundColor: tc.inputBg, borderColor: tc.inputBorder }]}
              onPress={openDeadlinePicker}
              disabled={isSubmitting}>
              <AppIcon name="calendar-outline" size={18} color={tc.primary} />
              <Text style={[styles.deadlineText, { color: tc.text }]}>{formatDate(deadline.toISOString())}</Text>
            </Pressable>
            <Text style={[styles.hint, { color: isDeadlineValid ? tc.mutedText : '#EF4444' }]}>
              {t('Deadline phải trước ngày mở capsule ít nhất 1 giờ.')}
            </Text>
          </View>

          {showPicker ? (
            <DateTimePicker
              value={deadline}
              mode={pickerMode}
              is24Hour
              minimumDate={pickerMode === 'date' ? new Date(Date.now() + oneHourMs) : undefined}
              maximumDate={pickerMode === 'date' ? new Date(openDate.getTime() - oneHourMs) : undefined}
              onChange={onPickerChange}
            />
          ) : null}

          {isSubmitting ? (
            <View style={styles.progressBox}>
              <ActivityIndicator color={tc.primary} />
              <Text style={[styles.progressText, { color: tc.primary }]}>{progress}%</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label={isSubmitting ? t('Đang tạo...') : t('Tạo capsule chờ')}
            iconName="hourglass-outline"
            disabled={isSubmitting}
            onPress={createWaitingCapsule}
            style={[styles.primary, { backgroundColor: tc.buttonBg }]}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    height: 60,
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { borderWidth: 1.2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  heading: { fontSize: 28, fontWeight: '800', marginTop: 16 },
  subheading: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  card: { marginTop: 18, borderRadius: 20, borderWidth: 1.4, padding: 18 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  title: { marginTop: 8, fontSize: 20, fontWeight: '800' },
  divider: { height: 1, marginVertical: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  meta: { fontSize: 14, fontWeight: '600' },
  deadlineButton: {
    marginTop: 10,
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deadlineText: { fontSize: 15, fontWeight: '700' },
  hint: { marginTop: 10, fontSize: 12, lineHeight: 17 },
  progressBox: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  progressText: { fontSize: 13, fontWeight: '800' },
  error: { marginTop: 14, color: '#EF4444', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  primary: { marginTop: 22, minHeight: 56, borderRadius: 16 },
});
