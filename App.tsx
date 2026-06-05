import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';
import { AppUpdateGate } from './src/components/update/AppUpdateGate';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppIcon } from './src/components/ui/DesignPrimitives';
import { isBiometricAutoLockSuppressed } from './src/services/biometricLockGuard';
import { SplashScreen } from './src/screens/auth/SplashScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { useLanguageStore, useTranslation } from './src/i18n';

const rnBiometrics = new ReactNativeBiometrics();

function BiometricGate({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showUnlockSplash, setShowUnlockSplash] = useState(false);
  const appState = useRef(AppState.currentState);
  const exitTimestampRef = useRef<number | null>(null);
  const { colors } = useTheme();
  const { t } = useTranslation();

  const triggerBiometricAuth = useCallback(async () => {
    try {
      const { available } = await rnBiometrics.isSensorAvailable();
      if (!available) {
        setIsLocked(false);
        return;
      }

      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: t('Xác thực Face ID/vân tay để mở khóa TimeSeal'),
      });

      if (success) {
        setIsLocked(false);
        setShowUnlockSplash(true);
      }
    } catch (e) {
      console.log('Biometric error: ', e);
    }
  }, [t]);

  const checkAndAuthenticate = useCallback(async () => {
    try {
      const lockEnabled = await AsyncStorage.getItem('@timeseal_biometric_lock');
      if (lockEnabled !== '1') {
        setIsLocked(false);
        setChecking(false);
        return;
      }

      setIsLocked(true);
      setChecking(false);
      triggerBiometricAuth();
    } catch {
      setIsLocked(false);
      setChecking(false);
    }
  }, [triggerBiometricAuth]);

  useEffect(() => {
    checkAndAuthenticate();

    // Secure Auto-Lock when minimized (background) and brought back to foreground
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appState.current === 'active' && nextAppState === 'background') {
        exitTimestampRef.current = Date.now();
      }

      if (
        appState.current === 'background' &&
        nextAppState === 'active'
      ) {
        if (!isBiometricAutoLockSuppressed()) {
          // Grace Period validation
          try {
            const graceEnabled = await AsyncStorage.getItem('@timeseal_biometric_grace_enabled');
            const graceValueStr = await AsyncStorage.getItem('@timeseal_biometric_grace_value');

            if (graceEnabled === '1' && exitTimestampRef.current !== null && graceValueStr !== null) {
              const elapsedSeconds = (Date.now() - exitTimestampRef.current) / 1000;
              const graceSeconds = Number(graceValueStr);
              if (elapsedSeconds < graceSeconds) {
                console.log('Skipping lock due to active grace period:', elapsedSeconds, 's /', graceSeconds, 's');
                appState.current = nextAppState;
                return;
              }
            }
          } catch (err) {
            console.log('Grace period error:', err);
          }

          checkAndAuthenticate();
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [checkAndAuthenticate]);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      {isLocked ? (
      <View style={{ position: 'absolute', inset: 0, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 999 }}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        
        {/* Soft background blobs */}
        <View style={{ position: 'absolute', top: -50, left: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: colors.primaryPale, opacity: 0.2 }} />
        <View style={{ position: 'absolute', bottom: -50, right: -50, width: 250, height: 250, borderRadius: 125, backgroundColor: colors.primaryPale, opacity: 0.15 }} />

        {/* Lock Screen Icon */}
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <AppIcon name="lock-closed" size={42} color="#FFFFFF" />
        </View>

        <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 8 }}>{t('TimeSeal đã khóa')}</Text>
        <Text style={{ fontSize: 14, color: colors.primaryPale, textAlign: 'center', marginBottom: 40, paddingHorizontal: 16 }}>{t('Để đảm bảo quyền riêng tư, vui lòng mở khóa bằng Face ID hoặc vân tay để xem các hộp ký ức.')}</Text>

        <Pressable
          onPress={triggerBiometricAuth}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 28,
            paddingVertical: 16,
            borderRadius: 16,
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
        >
          <AppIcon name="finger-print-outline" size={20} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>{t('Nhấn để quét vân tay / Face ID')}</Text>
        </Pressable>
      </View>
      ) : null}
      {showUnlockSplash ? (
        <View style={{ position: 'absolute', inset: 0, zIndex: 998 }}>
          <SplashScreen onFinished={() => setShowUnlockSplash(false)} />
        </View>
      ) : null}
    </View>
  );
}

import { PolishedAlert } from './src/components/ui/PolishedAlert';

function AppContent() {
  const { isDark } = useTheme();
  const initLanguage = useLanguageStore(state => state.initLanguage);

  useEffect(() => {
    initLanguage().catch(() => {});
  }, [initLanguage]);

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <AppUpdateGate>
        <BiometricGate>
          <AppNavigator />
        </BiometricGate>
      </AppUpdateGate>
      <PolishedAlert />
    </>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
