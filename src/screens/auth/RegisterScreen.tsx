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

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const register = useAuthStore(state => state.register);
  const loginWithGoogle = useAuthStore(state => state.loginWithGoogle);
  const isLoading = useAuthStore(state => state.isLoading);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const onRegister = async () => {
    if (password !== confirmPassword) {
      setError('Xác nhận mật khẩu chưa khớp.');
      return;
    }

    const result = await register(name.trim(), email.trim(), password);
    if (!result.ok) {
      setError(result.error || 'Đăng ký thất bại.');
      return;
    }

    setError('');
  };

  const onGoogleRegister = async () => {
    const result = await loginWithGoogle();
    if (!result.ok) {
      setError(result.error || 'Đăng ký bằng Google thất bại.');
      return;
    }

    setError('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SoftScreen variant="teal">
      <View style={styles.container}>
        <Pressable style={styles.backButton} onPress={() => navigation.replace('Login')}>
          <AppIcon name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.heading}>Tạo tài khoản</Text>
        <Text style={styles.subheading}>Bắt đầu cất giữ những ký ức quan trọng.</Text>

        <PolishedInput
          iconName="person-outline"
          placeholder="Tên hiển thị"
          value={name}
          onChangeText={setName}
          containerStyle={styles.input}
        />

        <PolishedInput
          iconName="mail-outline"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          containerStyle={styles.input}
        />

        <PolishedInput
          iconName="lock-closed-outline"
          placeholder="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={Boolean(error)}
          containerStyle={styles.input}
        />

        <PolishedInput
          iconName="shield-checkmark-outline"
          placeholder="Xác nhận mật khẩu"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          error={Boolean(error)}
          containerStyle={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label={isLoading ? 'Đang xử lý...' : 'Đăng ký'}
          onPress={onRegister}
          disabled={isLoading}
          style={styles.button}
        />

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>hoặc</Text>
          <View style={styles.divider} />
        </View>

        <PrimaryButton
          label="Tiếp tục với Google"
          iconName="logo-google"
          onPress={onGoogleRegister}
          disabled={isLoading}
          variant="outline"
        />

        <Pressable onPress={() => navigation.replace('Login')}>
          <Text style={styles.link}>Đã có tài khoản? Đăng nhập</Text>
        </Pressable>
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
    error: {
      color: colors.danger,
      marginBottom: 12,
      fontSize: 13,
    },
    button: {
      marginTop: 4,
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
    link: {
      marginTop: 20,
      textAlign: 'center',
      color: colors.primary,
      fontWeight: '500',
    },
  });
