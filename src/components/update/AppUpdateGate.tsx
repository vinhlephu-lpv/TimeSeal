import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../ui/DesignPrimitives';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import {
  AppUpdateCheckResult,
  checkForAppUpdate,
  openUpdateUrl,
  parseVersionCode,
} from '../../services/appUpdateService';
import { useTranslation } from '../../i18n';
import { SplashScreen } from '../../screens/auth/SplashScreen';

type AppUpdateGateProps = {
  children: React.ReactNode;
};

export function AppUpdateGate({ children }: AppUpdateGateProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();

  const pulse = useRef(new Animated.Value(0)).current;
  const [ready, setReady] = useState(false);
  const [checkCompleted, setCheckCompleted] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);
  const [updateResult, setUpdateResult] = useState<AppUpdateCheckResult | null>(null);
  const [isOpeningStore, setIsOpeningStore] = useState(false);

  const handleSplashFinished = React.useCallback(() => {
    setSplashFinished(true);
  }, []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 760,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 760,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse]);

  useEffect(() => {
    let isMounted = true;

    const runUpdateCheck = async () => {
      try {
        const result = await checkForAppUpdate();
        if (!isMounted) {
          return;
        }

        if (result.updateAvailable) {
          setUpdateResult(result);
        }
        setCheckCompleted(true);
      } catch {
        if (isMounted) {
          setCheckCompleted(true);
        }
      }
    };

    runUpdateCheck();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (checkCompleted && splashFinished) {
      if (updateResult && updateResult.updateAvailable) {
        // Keep ready false, show update card
      } else {
        setReady(true);
      }
    }
  }, [checkCompleted, splashFinished, updateResult]);

  const handleUpdate = async () => {
    if (!updateResult?.remoteConfig) {
      return;
    }

    setIsOpeningStore(true);
    await openUpdateUrl(updateResult.remoteConfig, updateResult.localVersion);
    setIsOpeningStore(false);
  };

  if (ready) {
    return <>{children}</>;
  }

  if (!splashFinished) {
    return <SplashScreen onFinished={handleSplashFinished} />;
  }

  // If splash is finished, check completed, but no update available,
  // we are just waiting for useEffect to setReady(true).
  // Return static splash to avoid flashing the update check UI.
  if (checkCompleted && !updateResult?.updateAvailable) {
    return <SplashScreen onFinished={handleSplashFinished} skipAnimation={true} />;
  }

  const remoteConfig = updateResult?.remoteConfig;
  const remoteVersionCode = parseVersionCode(remoteConfig?.versionCode);
  const remoteVersionName = remoteConfig?.versionName || t('mới nhất');
  const canSkipUpdate = updateResult && !updateResult.forceUpdate;

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.05],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.68, 1],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.blob, styles.topBlob]} />
          <View style={[styles.blob, styles.sideBlob]} />
          <View style={[styles.blob, styles.bottomBlob]} />
        </View>

        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}>
          <AppIcon name="download-outline" size={34} color="#FFFFFF" />
        </Animated.View>

        <Text style={styles.title}>
          {t(updateResult ? 'Có bản cập nhật mới' : 'Đang kiểm tra cập nhật')}
        </Text>
        <Text style={styles.subtitle}>
          {updateResult
            ? t('TimeSeal cần xác nhận phiên bản trước khi vào ứng dụng.')
            : t('Đang đồng bộ phiên bản mới nhất.')}
        </Text>

        {!updateResult ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}

        {updateResult ? (
          <View style={styles.updateCard}>
            <Text style={styles.cardTitle}>{updateResult.title}</Text>
            <Text style={styles.cardText}>{updateResult.message}</Text>

            <View style={styles.versionRow}>
              <View style={styles.versionBox}>
                <Text style={styles.versionLabel}>{t('Đang dùng')}</Text>
                <Text style={styles.versionValue}>
                  {updateResult.localVersion.versionName} ({updateResult.localVersion.versionCode})
                </Text>
              </View>
              <View style={styles.versionBox}>
                <Text style={styles.versionLabel}>{t('Bản mới')}</Text>
                <Text style={styles.versionValue}>
                  {remoteVersionName}
                  {remoteVersionCode > 0 ? ` (${remoteVersionCode})` : ''}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleUpdate}
              disabled={isOpeningStore}
              style={[styles.primaryButton, isOpeningStore && styles.disabledButton]}>
              <Text style={styles.primaryButtonText}>
                {t(isOpeningStore ? 'Đang mở Google Play...' : 'Cập nhật ngay')}
              </Text>
            </Pressable>

            {canSkipUpdate ? (
              <Pressable onPress={() => setReady(true)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{t('Để sau, vào ứng dụng')}</Text>
              </Pressable>
            ) : (
              <Text style={styles.forceText}>{t('Bản này cần cập nhật trước khi tiếp tục.')}</Text>
            )}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.surfaceTint,
    },
    screen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 22,
      backgroundColor: colors.surfaceTint,
      overflow: 'hidden',
    },
    blob: {
      position: 'absolute',
      borderRadius: 999,
    },
    topBlob: {
      width: 260,
      height: 230,
      left: -90,
      top: -95,
      backgroundColor: colors.primarySoft,
    },
    sideBlob: {
      width: 170,
      height: 170,
      right: -58,
      top: 105,
      backgroundColor: colors.infoLight,
    },
    bottomBlob: {
      width: 520,
      height: 230,
      left: -80,
      bottom: -130,
      backgroundColor: colors.lavenderWash,
    },
    logoWrap: {
      width: 88,
      height: 88,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.22,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 14 },
      elevation: 7,
    },
    title: {
      marginTop: 18,
      color: colors.ink,
      fontSize: 24,
      fontWeight: '800',
      textAlign: 'center',
    },
    subtitle: {
      maxWidth: 310,
      marginTop: 8,
      color: colors.mutedText,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },
    loader: {
      marginTop: 22,
    },
    updateCard: {
      width: '100%',
      maxWidth: 370,
      marginTop: 26,
      padding: 18,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.primarySoft,
      backgroundColor: colors.card,
      shadowColor: colors.black,
      shadowOpacity: 0.08,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    cardTitle: {
      color: colors.ink,
      fontSize: 18,
      fontWeight: '800',
    },
    cardText: {
      marginTop: 8,
      color: colors.mutedText,
      fontSize: 14,
      lineHeight: 21,
    },
    versionRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    versionBox: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceTint,
      borderWidth: 1,
      borderColor: colors.softBorder,
    },
    versionLabel: {
      color: colors.mutedText,
      fontSize: 12,
      fontWeight: '700',
    },
    versionValue: {
      marginTop: 4,
      color: colors.ink,
      fontSize: 14,
      fontWeight: '800',
    },
    primaryButton: {
      minHeight: 52,
      marginTop: 18,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    disabledButton: {
      opacity: 0.7,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },
    secondaryButton: {
      minHeight: 48,
      marginTop: 10,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.card,
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '800',
    },
    forceText: {
      marginTop: 12,
      color: colors.danger,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
  });
