import React, { useEffect } from 'react';
import { Image, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  type SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
  interpolate,
} from 'react-native-reanimated';
import { AppIcon } from '../../components/ui/DesignPrimitives';
import { useTranslation } from '../../i18n';

// Fixed dark palette — never follows theme.
const SPLASH_BG = '#080816'; // Rich deep navy-indigo base
const SPLASH_PRIMARY = '#534AB7';
const SPLASH_ACCENT = '#7F77DD';
const SPLASH_GLOW = '#8B7FE8';

export let isSplashCompleted = false;

type SplashScreenProps = {
  onFinished: () => void;
};

export function SplashScreen({ onFinished }: SplashScreenProps) {
  const { t } = useTranslation();
  
  // ── Background Blobs ──
  const blobTopOpacity = useSharedValue(0.18);
  const blobBottomOpacity = useSharedValue(0.12);

  // ── Logo ──
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoRotateZ = useSharedValue(180);

  // ── Glow behind logo ──
  const glowScale = useSharedValue(0.6);
  const glowOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(0);

  // ── Ripple rings ──
  const ring1Scale = useSharedValue(0.5);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(0.5);
  const ring2Opacity = useSharedValue(0);

  // ── Shimmer sweep across logo ──
  const shimmerX = useSharedValue(-120);

  // ── Title ──
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const titleScale = useSharedValue(0.85);

  // ── Subtitle ──
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(20);

  // ── Progress bar ──
  const progressWidth = useSharedValue(0);
  const progressOpacity = useSharedValue(0);

  // ── Developer Branding ──
  const brandOpacity = useSharedValue(0);
  const brandTranslateY = useSharedValue(15);

  // ── Floating particles ──
  const particle1Y = useSharedValue(0);
  const particle1Opacity = useSharedValue(0);
  const particle2Y = useSharedValue(0);
  const particle2Opacity = useSharedValue(0);
  const particle3Y = useSharedValue(0);
  const particle3Opacity = useSharedValue(0);

  useEffect(() => {
    const springConfig = { damping: 14, stiffness: 100 };

    // ── Background blobs breathing pulse ──
    blobTopOpacity.value = withRepeat(
      withSequence(
        withTiming(0.28, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.18, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    blobBottomOpacity.value = withRepeat(
      withSequence(
        withTiming(0.22, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.12, { duration: 3500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // ── Phase 1: Glow appears (0ms) ──
    glowOpacity.value = withTiming(0.6, { duration: 500 });
    glowScale.value = withSpring(1, { damping: 10, stiffness: 80 });
    glowPulse.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );

    // ── Phase 2: Logo spins in (150ms) ──
    logoOpacity.value = withDelay(150, withTiming(1, { duration: 400 }));
    logoScale.value = withDelay(
      150,
      withSequence(
        withSpring(1.15, { damping: 8, stiffness: 150 }),
        withSpring(1.0, { damping: 12, stiffness: 120 }),
      ),
    );
    logoRotateZ.value = withDelay(
      150,
      withSpring(0, { damping: 12, stiffness: 80 }),
    );

    // ── Phase 3: Ripple ring 1 (400ms) ──
    ring1Opacity.value = withDelay(400, withTiming(0.5, { duration: 200 }));
    ring1Scale.value = withDelay(
      400,
      withTiming(2.2, { duration: 800, easing: Easing.out(Easing.cubic) }),
    );
    ring1Opacity.value = withDelay(
      400,
      withSequence(
        withTiming(0.5, { duration: 200 }),
        withTiming(0, { duration: 600 }),
      ),
    );

    // ── Phase 4: Ripple ring 2 (600ms) ──
    ring2Opacity.value = withDelay(600, withTiming(0.4, { duration: 200 }));
    ring2Scale.value = withDelay(
      600,
      withTiming(2.6, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
    ring2Opacity.value = withDelay(
      600,
      withSequence(
        withTiming(0.4, { duration: 200 }),
        withTiming(0, { duration: 700 }),
      ),
    );

    // ── Phase 5: Shimmer sweep (700ms) ──
    shimmerX.value = withDelay(
      700,
      withTiming(120, { duration: 600, easing: Easing.inOut(Easing.ease) }),
    );

    // ── Phase 6: Title (550ms) ──
    titleOpacity.value = withDelay(550, withTiming(1, { duration: 400 }));
    titleTranslateY.value = withDelay(550, withSpring(0, springConfig));
    titleScale.value = withDelay(550, withSpring(1, springConfig));

    // ── Phase 7: Subtitle (750ms) ──
    subtitleOpacity.value = withDelay(750, withTiming(1, { duration: 400 }));
    subtitleTranslateY.value = withDelay(750, withSpring(0, { damping: 16, stiffness: 100 }));

    // ── Phase 8: Progress bar (900ms) ──
    progressOpacity.value = withDelay(900, withTiming(1, { duration: 300 }));
    progressWidth.value = withDelay(
      900,
      withTiming(1, { duration: 1300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
    );

    // ── Phase 9: Developer Branding (1050ms) ──
    brandOpacity.value = withDelay(1050, withTiming(1, { duration: 500 }));
    brandTranslateY.value = withDelay(1050, withSpring(0, { damping: 15, stiffness: 80 }));

    // ── Floating particles ──
    const particleUp = (yVal: SharedValue<number>, opVal: SharedValue<number>, delay: number) => {
      opVal.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0.7, { duration: 600 }),
            withTiming(0, { duration: 1200 }),
          ),
          -1, false,
        ),
      );
      yVal.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0, { duration: 0 }),
            withTiming(-80, { duration: 1800, easing: Easing.out(Easing.quad) }),
          ),
          -1, false,
        ),
      );
    };
    particleUp(particle1Y, particle1Opacity, 500);
    particleUp(particle2Y, particle2Opacity, 900);
    particleUp(particle3Y, particle3Opacity, 1300);

    // ── Finish ──
    const timer = setTimeout(() => {
      isSplashCompleted = true;
      onFinished();
    }, 2400);

    return () => {
      clearTimeout(timer);
      cancelAnimation(logoScale);
      cancelAnimation(logoRotateZ);
      cancelAnimation(logoOpacity);
      cancelAnimation(glowScale);
      cancelAnimation(glowOpacity);
      cancelAnimation(glowPulse);
      cancelAnimation(ring1Scale);
      cancelAnimation(ring1Opacity);
      cancelAnimation(ring2Scale);
      cancelAnimation(ring2Opacity);
      cancelAnimation(shimmerX);
      cancelAnimation(titleOpacity);
      cancelAnimation(titleTranslateY);
      cancelAnimation(titleScale);
      cancelAnimation(subtitleOpacity);
      cancelAnimation(subtitleTranslateY);
      cancelAnimation(progressWidth);
      cancelAnimation(progressOpacity);
      cancelAnimation(particle1Y);
      cancelAnimation(particle1Opacity);
      cancelAnimation(particle2Y);
      cancelAnimation(particle2Opacity);
      cancelAnimation(particle3Y);
      cancelAnimation(particle3Opacity);
      cancelAnimation(brandOpacity);
      cancelAnimation(brandTranslateY);
      cancelAnimation(blobTopOpacity);
      cancelAnimation(blobBottomOpacity);
    };
  }, [onFinished]);

  // ═══════ Animated Styles ═══════

  const animatedGlow = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [
      { scale: interpolate(glowPulse.value, [0, 1], [1, 1.25]) * glowScale.value },
    ],
  }));

  const animatedLogo = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { rotateZ: `${logoRotateZ.value}deg` },
    ],
  }));

  const animatedRing1 = useAnimatedStyle(() => ({
    opacity: ring1Opacity.value,
    transform: [{ scale: ring1Scale.value }],
  }));

  const animatedRing2 = useAnimatedStyle(() => ({
    opacity: ring2Opacity.value,
    transform: [{ scale: ring2Scale.value }],
  }));

  const animatedShimmer = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const animatedTitle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [
      { translateY: titleTranslateY.value },
      { scale: titleScale.value },
    ],
  }));

  const animatedSubtitle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const animatedProgressTrack = useAnimatedStyle(() => ({
    opacity: progressOpacity.value,
  }));

  const animatedProgressFill = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const animatedBrand = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
    transform: [{ translateY: brandTranslateY.value }],
  }));

  const animatedBlobTop = useAnimatedStyle(() => ({
    opacity: blobTopOpacity.value,
  }));

  const animatedBlobBottom = useAnimatedStyle(() => ({
    opacity: blobBottomOpacity.value,
  }));

  const makeParticleStyle = (yVal: SharedValue<number>, opVal: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      opacity: opVal.value,
      transform: [{ translateY: yVal.value }],
    }));

  const animatedP1 = makeParticleStyle(particle1Y, particle1Opacity);
  const animatedP2 = makeParticleStyle(particle2Y, particle2Opacity);
  const animatedP3 = makeParticleStyle(particle3Y, particle3Opacity);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* ── Glowing Animated Background Blobs ── */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.bgBlob, styles.bgBlobTop, animatedBlobTop, { backgroundColor: SPLASH_ACCENT }]} />
        <Animated.View style={[styles.bgBlob, styles.bgBlobBottom, animatedBlobBottom, { backgroundColor: '#FF6B8B' }]} />
      </View>

      <View style={styles.container}>

        {/* ── Logo area ── */}
        <View style={styles.logoArea}>

          {/* Glow pulse behind logo */}
          <Animated.View style={[styles.glow, animatedGlow]} />

          {/* Ripple rings */}
          <Animated.View style={[styles.ring, animatedRing1]} />
          <Animated.View style={[styles.ring, styles.ring2, animatedRing2]} />

          {/* Floating particles */}
          <Animated.View style={[styles.particle, styles.particle1, animatedP1]} />
          <Animated.View style={[styles.particle, styles.particle2, animatedP2]} />
          <Animated.View style={[styles.particle, styles.particle3, animatedP3]} />

          {/* Logo */}
          <Animated.View style={[styles.logoWrap, animatedLogo]}>
            <Image
              source={require('../../assets/icon-app/Icon-app.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            {/* Shimmer sweep overlay */}
            <View style={styles.shimmerMask}>
              <Animated.View style={[styles.shimmerStripe, animatedShimmer]} />
            </View>
          </Animated.View>
        </View>

        {/* ── Title ── */}
        <Animated.Text style={[styles.title, animatedTitle]}>
          TimeSeal
        </Animated.Text>

        {/* ── Subtitle ── */}
        <Animated.Text style={[styles.subtitle, animatedSubtitle]}>
          {t('Lưu giữ ký ức. Mở ra đúng lúc.')}
        </Animated.Text>

        {/* ── Progress bar ── */}
        <Animated.View style={[styles.progressTrack, animatedProgressTrack]}>
          <Animated.View style={[styles.progressFill, animatedProgressFill]} />
        </Animated.View>

        {/* ── Developer Branding (Separated layout, gold/lavender colors) ── */}
        <Animated.View style={[styles.brandContainer, animatedBrand]}>
          <View style={styles.brandDivider} />
          <Text style={styles.brandSubtitle}>{t('DEVELOPED BY')}</Text>
          <Text style={styles.brandTitle}>AuraSoft Systems</Text>
        </Animated.View>

      </View>
    </SafeAreaView>
  );
}

// ═══════ Styles ═══════

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

  // Background blobs
  bgBlob: {
    position: 'absolute',
    borderRadius: 200,
  },
  bgBlobTop: {
    width: 360,
    height: 360,
    borderRadius: 180,
    right: -100,
    top: -100,
  },
  bgBlobBottom: {
    width: 320,
    height: 320,
    borderRadius: 160,
    left: -80,
    bottom: -80,
  },

  // Logo area — relative container for glow, rings, particles
  logoArea: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Glow
  glow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: SPLASH_GLOW,
    opacity: 0.15,
  },

  // Ripple rings
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: SPLASH_ACCENT,
  },
  ring2: {
    borderColor: SPLASH_PRIMARY,
    borderWidth: 1,
  },

  // Floating particles
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: SPLASH_ACCENT,
  },
  particle1: { bottom: 24, left: 30 },
  particle2: { bottom: 18, right: 28 },
  particle3: { bottom: 30, left: 75 },

  // Logo
  logoWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SPLASH_GLOW,
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  logoImage: {
    width: 96,
    height: 96,
  },

  // Shimmer
  shimmerMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRadius: 26,
  },
  shimmerStripe: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    transform: [{ skewX: '-20deg' }],
  },

  // Title
  title: {
    marginTop: 18,
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },

  // Subtitle
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.3,
  },

  // Progress bar
  progressTrack: {
    marginTop: 32,
    width: 120,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: SPLASH_ACCENT,
  },

  // Developer Branding (Separated layout, gold/lavender colors)
  brandContainer: {
    position: 'absolute',
    bottom: 36,
    alignItems: 'center',
    width: '100%',
  },
  brandDivider: {
    width: 60,
    height: 1.2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 12,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '600',
    color: '#D1C4E9',
    opacity: 0.75,
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFE082',
    letterSpacing: 1.5,
  },
});

