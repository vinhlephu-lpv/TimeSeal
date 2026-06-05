import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import type { AuthStackParamList } from '../../types/navigation';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import {
  AppIcon,
  PolishedInput,
  PrimaryButton,
  SoftScreen,
} from '../../components/ui/DesignPrimitives';
import { useTranslation } from '../../i18n';

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: LoginScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { t } = useTranslation();

  const login = useAuthStore(state => state.login);
  const loginWithGoogle = useAuthStore(state => state.loginWithGoogle);
  const isLoading = useAuthStore(state => state.isLoading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onLogin = async () => {
    const result = await login(email.trim(), password);
    if (!result.ok) {
      setError(result.error || t('Đăng nhập thất bại.'));
      return;
    }
    setError('');
  };

  const onGoogleLogin = async () => {
    const result = await loginWithGoogle();
    if (!result.ok) {
      setError(result.error || t('Đăng nhập Google thất bại.'));
      return;
    }
    setError('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SoftScreen>
      <View style={styles.container}>
        <View style={styles.logo}>
          <AppIcon name="hourglass" size={24} color="#FFFFFF" />
        </View>
        <Text style={styles.heading}>{t('Đăng nhập')}</Text>
        <Text style={styles.subheading}>{t('Tiếp tục để mở các hộp ký ức của bạn.')}</Text>

        <PolishedInput
          iconName="mail-outline"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          error={Boolean(error)}
          containerStyle={styles.input}
        />

        <PolishedInput
          iconName="lock-closed-outline"
          placeholder={t('Mật khẩu')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={Boolean(error)}
          containerStyle={styles.input}
        />

        <Pressable
          style={styles.forgotButton}
          onPress={() => navigation.navigate('ForgotPassword', { email })}
        >
          <Text style={styles.forgotLabel}>{t('Quên mật khẩu?')}</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label={t(isLoading ? 'Đang xử lý...' : 'Đăng nhập')}
          onPress={onLogin}
          disabled={isLoading}
          style={styles.button}
        />

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>{t('hoặc')}</Text>
          <View style={styles.divider} />
        </View>

        <PrimaryButton
          label={t('Tiếp tục với Google')}
          iconName="logo-google"
          onPress={onGoogleLogin}
          disabled={isLoading}
          variant="outline"
        />

        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>{t('Chưa có tài khoản? Đăng ký')}</Text>
        </Pressable>
      </View>
      </SoftScreen>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, _isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      padding: 24,
      justifyContent: 'center',
    },
    logo: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 22,
    },
    heading: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    subheading: {
      marginTop: 8,
      marginBottom: 28,
      color: colors.mutedText,
      textAlign: 'center',
      fontSize: 14,
    },
    input: {
      marginBottom: 12,
    },
    forgotButton: {
      alignSelf: 'flex-end',
      marginBottom: 12,
    },
    forgotLabel: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    error: {
      color: colors.danger,
      marginBottom: 12,
      fontSize: 13,
    },
    button: {
      marginTop: 4,
    },
    link: {
      marginTop: 20,
      textAlign: 'center',
      color: colors.primary,
      fontWeight: '500',
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginVertical: 20,
    },
    divider: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      color: colors.mutedText,
      fontSize: 13,
    },
  });
