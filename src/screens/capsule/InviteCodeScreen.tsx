import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { AppIcon, ElevatedCard, PolishedInput, PrimaryButton, SoftScreen } from '../../components/ui/DesignPrimitives';
import { useTranslation } from '../../i18n';

type Props = NativeStackScreenProps<AppStackParamList, 'InviteCode'>;

function normalizeInviteCode(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/capsuleId=([^&]+)/);
  return decodeURIComponent(match?.[1] || trimmed);
}

export function InviteCodeScreen({ navigation }: Props) {
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();

  const submit = () => {
    const capsuleId = normalizeInviteCode(code);
    if (!capsuleId) { setError(t('Nhập mã mời hoặc liên kết mời trước đã.')); return; }
    setError('');
    navigation.navigate('InviteAccept', { capsuleId });
  };

  return (
    <SoftScreen>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ElevatedCard style={styles.card}>
            <View style={styles.iconWrap}>
              <AppIcon name="mail-open" size={34} color={colors.primary} />
            </View>
            <Text style={styles.title}>{t('Nhập mã mời')}</Text>
            <Text style={styles.subtitle}>{t('Dán mã hộp ký ức hoặc liên kết mời bạn nhận được để tham gia.')}</Text>
            <PolishedInput iconName="mail-open" value={code} onChangeText={setCode}
              placeholder="VD: abc123 hoặc timeseal://invite?capsuleId=..."
              autoCapitalize="none" autoCorrect={false} error={Boolean(error)} containerStyle={styles.input} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label={t('Kiểm tra lời mời')} iconName="arrow-forward-outline" onPress={submit} style={styles.button} />
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.backLabel}>{t('Quay lại')}</Text>
            </Pressable>
          </ElevatedCard>
        </View>
      </SafeAreaView>
    </SoftScreen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, justifyContent: 'center', padding: 16, paddingTop: 72 },
  card: { alignItems: 'center', paddingVertical: 28 },
  iconWrap: { width: 76, height: 76, borderRadius: 26, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { marginTop: 8, color: colors.mutedText, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  input: { alignSelf: 'stretch', marginTop: 22 },
  error: { alignSelf: 'stretch', marginTop: 10, color: colors.danger, fontSize: 13 },
  button: { alignSelf: 'stretch', marginTop: 18 },
  backLabel: { marginTop: 16, color: colors.primary, fontWeight: '700' },
});
