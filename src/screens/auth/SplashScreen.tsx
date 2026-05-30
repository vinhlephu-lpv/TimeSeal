import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { AppIcon } from '../../components/ui/DesignPrimitives';

// Splash always uses a fixed dark palette — never follows the app theme.
const SPLASH_BG = '#12121E';
const SPLASH_PRIMARY = '#534AB7';
const SPLASH_ACCENT = '#7F77DD';

type SplashScreenProps = {
  onFinished: () => void;
};

export function SplashScreen({ onFinished }: SplashScreenProps) {
  // ── Logo animations ──
  const logoScale = useSharedValue(0.5);
  const logoRotate = useSharedValue(-15);
  const logoOpacity = useSharedValue(0);

  // ── Text animations ──
  const textTranslateY = useSharedValue(40);
  const textOpacity = useSharedValue(0);

  // ── Slogan / loader animations ──
  const sloganOpacity = useSharedValue(0);
  const sloganTranslateY = useSharedValue(16);
  const loaderPulse = useSharedValue(0);

  useEffect(() => {
    // Logo — pop in with spring
    logoOpacity.value = withTiming(1, { duration: 320 });
    logoScale.value = withSpring(1.0, { damping: 12, stiffness: 120 });
    logoRotate.value = withSpring(0, { damping: 12, stiffness: 120 });

    // Title — slide up after logo
    textOpacity.value = withDelay(150, withTiming(1, { duration: 320 }));
    textTranslateY.value = withDelay(
      150,
      withSpring(0, { damping: 12, stiffness: 120 }),
    );

    // Slogan — slide up after title
    sloganOpacity.value = withDelay(420, withTiming(1, { duration: 260 }));
    sloganTranslateY.value = withDelay(
      420,
      withSpring(0, { damping: 13, stiffness: 110 }),
    );

    // Loader pulse
    loaderPulse.value = withDelay(
      520,
      withRepeat(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );

    // Finish splash
    const timer = setTimeout(onFinished, 1800);

    return () => {
      clearTimeout(timer);
      cancelAnimation(logoScale);
      cancelAnimation(logoRotate);
      cancelAnimation(logoOpacity);
      cancelAnimation(textTranslateY);
      cancelAnimation(textOpacity);
      cancelAnimation(sloganOpacity);
      cancelAnimation(sloganTranslateY);
      cancelAnimation(loaderPulse);
    };
  }, [onFinished]);

  // ── Animated styles ──

  const animatedLogo = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
  }));

  const animatedTitle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const animatedSlogan = useAnimatedStyle(() => ({
    opacity: sloganOpacity.value,
    transform: [{ translateY: sloganTranslateY.value }],
  }));

  const animatedLoader = useAnimatedStyle(() => ({
    opacity: 0.4 + loaderPulse.value * 0.6,
    transform: [{ scale: 1 + loaderPulse.value * 0.15 }],
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.container}>
        <Animated.View style={[styles.logoWrap, animatedLogo]}>
          <AppIcon name="hourglass" size={42} color="#FFFFFF" />
        </Animated.View>

        <Animated.Text style={[styles.title, animatedTitle]}>
          TimeSeal
        </Animated.Text>

        <Animated.Text style={[styles.subtitle, animatedSlogan]}>
          Lưu giữ ký ức. Mở ra đúng lúc.
        </Animated.Text>

        <Animated.View style={[styles.loaderDot, animatedLoader]}>
          <View style={styles.dotInner} />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SPLASH_BG,
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
    backgroundColor: SPLASH_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SPLASH_PRIMARY,
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
  loaderDot: {
    marginTop: 24,
    width: 10,
    height: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: SPLASH_ACCENT,
  },
});
