import React, { useState, useEffect } from 'react';
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

type ForgotPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ route, navigation }: ForgotPasswordScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { t } = useTranslation();

  const sendPasswordReset = useAuthStore(state => state.sendPasswordReset);
  const isLoading = useAuthStore(state => state.isLoading);
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Pre-fill email if passed from login
  useEffect(() => {
    if (route.params?.email) {
      setEmail(route.params.email);
    }
  }, [route.params?.email]);

  const onSubmit = async () => {
    setError('');
    
    if (!email.trim()) {
      setError(t('Vui lòng nhập email.'));
      return;
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t('Email không hợp lệ.'));
      return;
    }

    const result = await sendPasswordReset(email.trim());
    if (result.ok) {
      setIsSuccess(true);
      setError('');
    } else {
      setError(result.error || t('Đã có lỗi xảy ra, vui lòng thử lại.'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SoftScreen variant="warm">
        <View style={styles.container}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <AppIcon name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          {isSuccess ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconWrapper}>
                <AppIcon name="checkmark-circle" size={48} color={colors.success} />
              </View>
              <Text style={styles.heading}>{t('Thành công')}</Text>
              <Text style={styles.successSubheading}>
                {t('Liên kết đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.')}
              </Text>
              <PrimaryButton
                label={t('Quay lại đăng nhập')}
                onPress={() => navigation.navigate('Login')}
                style={styles.button}
              />
            </View>
          ) : (
            <View style={styles.formContainer}>
              <View style={styles.logo}>
                <AppIcon name="lock-closed" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.heading}>{t('Quên mật khẩu')}</Text>
              <Text style={styles.subheading}>
                {t('Vui lòng nhập email để nhận liên kết đặt lại mật khẩu.')}
              </Text>

              <PolishedInput
                iconName="mail-outline"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                error={Boolean(error)}
                containerStyle={styles.input}
                editable={!isLoading}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <PrimaryButton
                label={t(isLoading ? 'Đang xử lý...' : 'Gửi email đặt lại')}
                onPress={onSubmit}
                disabled={isLoading}
                style={styles.button}
              />

              <Pressable onPress={() => navigation.navigate('Login')} disabled={isLoading}>
                <Text style={styles.link}>{t('Quay lại đăng nhập')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </SoftScreen>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) =>
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
    backButton: {
      position: 'absolute',
      top: 18,
      left: 20,
      padding: 8,
      zIndex: 10,
    },
    formContainer: {
      width: '100%',
    },
    successContainer: {
      width: '100%',
      alignItems: 'center',
    },
    successIconWrapper: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDark ? '#1C3A27' : '#E8F5E9',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
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
      lineHeight: 20,
    },
    successSubheading: {
      marginTop: 12,
      marginBottom: 32,
      color: colors.mutedText,
      textAlign: 'center',
      fontSize: 15,
      lineHeight: 22,
      paddingHorizontal: 10,
    },
    input: {
      marginBottom: 12,
    },
    error: {
      color: colors.danger,
      marginBottom: 12,
      fontSize: 13,
      textAlign: 'center',
    },
    button: {
      marginTop: 4,
      width: '100%',
    },
    link: {
      marginTop: 20,
      textAlign: 'center',
      color: colors.primary,
      fontWeight: '500',
    },
  });
