import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import type { AppStackParamList } from '../../types/navigation';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { formatDate } from '../../utils/dateHelpers';
import { AppIcon, ElevatedCard, PrimaryButton, SoftScreen } from '../../components/ui/DesignPrimitives';
import { useTranslation } from '../../i18n';
import { acceptCapsuleInvite, getInvitePreview } from '../../services/backendService';
import { useCapsuleStore } from '../../store/capsuleStore';

type Props = NativeStackScreenProps<AppStackParamList, 'InviteAccept'>;

export function InviteAcceptScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const [title, setTitle] = useState(t('Đang tải hộp ký ức...'));
  const [openDateISO, setOpenDateISO] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const syncCapsule = useCapsuleStore(s => s.syncCapsule);
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    getInvitePreview(route.params.inviteCode)
      .then(preview => {
        setTitle(preview.title || t('Hộp ký ức'));
        setOpenDateISO(preview.openDateISO);
      })
      .catch(() => setTitle(t('Không tìm thấy hộp ký ức')));
  }, [route.params.inviteCode, t]);

  const joinCapsule = async () => {
    if (!user?.id) { setMessage(t('Bạn cần đăng nhập để tham gia hộp ký ức.')); return; }
    setLoading(true);
    try {
      const result = await acceptCapsuleInvite(route.params.inviteCode);
      await syncCapsule(result.capsuleId).catch(() => null);
      setMessage(t('Tham gia hộp ký ức thành công!'));
      navigation.replace('CapsuleLocked', { capsuleId: result.capsuleId });
    } catch {
      setMessage(t('Không thể tham gia hộp ký ức lúc này.'));
    } finally { setLoading(false); }
  };

  return (
    <SoftScreen>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ElevatedCard style={styles.card}>
            <View style={styles.iconWrap}>
              <AppIcon name="mail-open" size={34} color={colors.primary} />
            </View>
            <Text style={styles.kicker}>{t('Lời mời tham gia hộp ký ức')}</Text>
            <Text style={styles.title}>{title}</Text>
            {openDateISO ? <Text style={styles.meta}>{t('Mở vào')} {formatDate(openDateISO)}</Text> : null}
            <Text style={styles.code}>{t('Mã:')} {route.params.inviteCode}</Text>
            {message ? <Text style={styles.status}>{message}</Text> : null}
            <PrimaryButton label={t(loading ? 'Đang xử lý...' : 'Tham gia')}
              iconName="arrow-forward-outline" onPress={joinCapsule}
              disabled={loading || title === t('Không tìm thấy hộp ký ức')} style={styles.button} />
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.backLabel}>{t('Nhập mã khác')}</Text>
            </Pressable>
          </ElevatedCard>
        </View>
      </SafeAreaView>
    </SoftScreen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, padding: 16, justifyContent: 'center', paddingTop: 72 },
  card: { alignItems: 'center', paddingVertical: 28 },
  iconWrap: { width: 76, height: 76, borderRadius: 26, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  kicker: { color: colors.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  title: { marginTop: 8, color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  meta: { marginTop: 8, color: colors.mutedText },
  code: { marginTop: 10, color: colors.mutedText, fontSize: 12 },
  status: { marginTop: 14, color: colors.primary, fontWeight: '700' },
  button: { alignSelf: 'stretch', marginTop: 20 },
  backLabel: { marginTop: 16, color: colors.primary, fontWeight: '700' },
});
