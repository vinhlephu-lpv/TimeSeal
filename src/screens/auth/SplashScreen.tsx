import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { AppIcon, SoftScreen } from '../../components/ui/DesignPrimitives';

type SplashScreenProps = {
  onFinished: () => void;
};

export function SplashScreen({ onFinished }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(onFinished, 1200);
    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <SoftScreen variant="dark">
      <View style={styles.container}>
        <View style={styles.logoWrap}>
          <AppIcon name="hourglass" size={42} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>TimeSeal</Text>
        <Text style={styles.subtitle}>Lưu giữ ký ức. Mở ra đúng lúc.</Text>
        <ActivityIndicator color={colors.primaryLight} style={styles.loader} />
      </View>
      </SoftScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  title: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#A3A3A3',
  },
  loader: {
    marginTop: 20,
  },
});
