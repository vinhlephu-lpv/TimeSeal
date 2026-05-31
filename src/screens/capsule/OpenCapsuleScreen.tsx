/**
 * OpenCapsuleScreen.tsx
 *
 * Full vault-opening animation sequence:
 *
 * Stage 1  (0-1.5s)  – "Đang giải mã thời gian…" + vault dial spins
 * Stage 2  (1.5-3s)  – "Capsule đang mở…" + wax seal cracks
 * Stage 3  (3-5s)    – Vault door opens, sparkles, warm glow
 * Stage 4  (5-6.5s)  – Scroll unrolls + message preview
 * Then auto-navigate  → CapsuleDetail
 *
 * Honours reduceMotion: if enabled, skips to a 1.5s simplified animation.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { useCapsuleStore } from '../../store/capsuleStore';
import { useAuthStore } from '../../store/authStore';
import { capsuleThemes, ThemeBackground } from '../../theme/capsuleThemes';
import { VaultDoor, WaxSeal, ScrollLetter } from '../../components/capsule/VaultIllustration';
import { ParticleEffect } from '../../components/capsule/ParticleEffect';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = NativeStackScreenProps<AppStackParamList, 'OpenCapsule'>;
type Stage = 'dial' | 'seal' | 'open' | 'scroll' | 'done';

// ---------------------------------------------------------------------------
// Stage subtitles
// ---------------------------------------------------------------------------

const STAGE_TEXT: Record<Stage, { title: string; subtitle: string }> = {
  dial: {
    title: 'Đang giải mã thời gian…',
    subtitle: 'Lắng nghe âm vang ký ức',
  },
  seal: {
    title: 'Phá niêm phong…',
    subtitle: 'Con dấu sáp đang được mở',
  },
  open: {
    title: 'Hộp ký ức đang mở…',
    subtitle: 'Khoảnh khắc của bạn ✨',
  },
  scroll: {
    title: 'Đọc ký ức…',
    subtitle: 'Cuộn giấy đang hiện ra',
  },
  done: {
    title: '',
    subtitle: '',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OpenCapsuleScreen({ navigation, route }: Props) {
  const markCapsuleOpened = useCapsuleStore(s => s.markCapsuleOpened);
  const capsule = useCapsuleStore(s =>
    s.capsules.find(c => c.id === route.params.capsuleId),
  );
  const reduceMotion = useAuthStore(s => s.reduceMotion);

  // Theme-aware colors
  const activeTheme = capsuleThemes[capsule?.theme || 'default'] || capsuleThemes.default;
  const tc = activeTheme.colors;

  const [stage, setStage] = useState<Stage>('dial');
  const [showParticles, setShowParticles] = useState(false);
  const navigatedRef = useRef(false);

  // Shared animation values
  const dialRotation = useSharedValue(0);
  const vaultOpen = useSharedValue(0);
  const sealCrack = useSharedValue(0);
  const scrollUnroll = useSharedValue(0);

  // Opacity shared values for crossfade between stages
  const vaultOpacity = useSharedValue(1);
  const sealOpacity = useSharedValue(0);
  const scrollOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(1);

  // Scale for vault breathing
  const vaultScale = useSharedValue(0.85);

  // Navigate to detail
  const navigateToDetail = useCallback(() => {
    if (navigatedRef.current) { return; }
    navigatedRef.current = true;
    navigation.replace('CapsuleDetail', { capsuleId: route.params.capsuleId });
  }, [navigation, route.params.capsuleId]);

  // Mark opened + navigate
  const finishAndNavigate = useCallback(async () => {
    await markCapsuleOpened(route.params.capsuleId);
    navigateToDetail();
  }, [markCapsuleOpened, route.params.capsuleId, navigateToDetail]);

  // --------------------------------───
  // Animation sequence (Honours reduceMotion with simplified transitions)
  // --------------------------------───
  useEffect(() => {
    // ── Phase Configs ──
    const dRotation = reduceMotion ? 90 : 810;
    const dialDuration = reduceMotion ? 500 : 1500;
    const stage2Start = reduceMotion ? 500 : 1500;
    const stage3Start = reduceMotion ? 1000 : 3000;
    const stage4Start = reduceMotion ? 1600 : 5000;
    const finishStart = reduceMotion ? 2200 : 6500;

    // Entry scale
    if (reduceMotion) {
      vaultScale.value = withTiming(1, { duration: 300 });
    } else {
      vaultScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    }
    textOpacity.value = 1;

    // --- Stage 1: Dial spin ---
    if (reduceMotion) {
      dialRotation.value = withTiming(dRotation, { duration: dialDuration, easing: Easing.inOut(Easing.ease) });
    } else {
      dialRotation.value = withSequence(
        withTiming(360, { duration: 600, easing: Easing.inOut(Easing.cubic) }),
        withTiming(720, { duration: 500, easing: Easing.inOut(Easing.cubic) }),
        withTiming(dRotation, { duration: 400, easing: Easing.out(Easing.cubic) }),
      );
    }

    // --- Stage 2: Wax seal crack ---
    const stage2Timer = setTimeout(() => {
      setStage('seal');
      const duration2 = reduceMotion ? 300 : 400;
      vaultOpacity.value = withTiming(0.3, { duration: duration2 });
      sealOpacity.value = withTiming(1, { duration: duration2 });

      sealCrack.value = withTiming(1, {
        duration: reduceMotion ? 400 : 1200,
        easing: reduceMotion ? Easing.linear : Easing.out(Easing.exp),
      });
    }, stage2Start);

    // --- Stage 3: Vault opens + particles ---
    const stage3Timer = setTimeout(() => {
      setStage('open');
      sealOpacity.value = withTiming(0, { duration: reduceMotion ? 150 : 300 });
      vaultOpacity.value = withTiming(1, { duration: reduceMotion ? 200 : 400 });

      vaultOpen.value = withTiming(1, {
        duration: reduceMotion ? 400 : 1000,
        easing: Easing.out(Easing.cubic),
      });

      setShowParticles(true);
    }, stage3Start);

    // --- Stage 4: Scroll unrolls ---
    const stage4Timer = setTimeout(() => {
      setStage('scroll');
      vaultOpacity.value = withTiming(0, { duration: reduceMotion ? 200 : 400 });
      scrollOpacity.value = withTiming(1, { duration: reduceMotion ? 300 : 500 });

      scrollUnroll.value = withTiming(1, {
        duration: reduceMotion ? 400 : 1200,
        easing: Easing.out(Easing.cubic),
      });
    }, stage4Start);

    // --- Navigate ---
    const navTimer = setTimeout(() => {
      setStage('done');
      finishAndNavigate();
    }, finishStart);

    return () => {
      clearTimeout(stage2Timer);
      clearTimeout(stage3Timer);
      clearTimeout(stage4Timer);
      clearTimeout(navTimer);
    };
  }, [
    reduceMotion,
    dialRotation,
    vaultOpen,
    sealCrack,
    scrollUnroll,
    vaultOpacity,
    sealOpacity,
    scrollOpacity,
    vaultScale,
    textOpacity,
    finishAndNavigate,
  ]);

  // ---------------------------------------------------------------------------
  // Animated styles
  // ---------------------------------------------------------------------------
  const vaultContainerStyle = useAnimatedStyle(() => ({
    opacity: vaultOpacity.value,
    transform: [{ scale: vaultScale.value }],
  }));

  const sealContainerStyle = useAnimatedStyle(() => ({
    opacity: sealOpacity.value,
    transform: [{ scale: 0.8 + sealOpacity.value * 0.2 }],
  }));

  const scrollContainerStyle = useAnimatedStyle(() => ({
    opacity: scrollOpacity.value,
    transform: [{ scale: 0.8 + scrollOpacity.value * 0.2 }],
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const currentText = STAGE_TEXT[stage];

  return (
    <View style={[styles.root, { backgroundColor: tc.background }]}>
      <ThemeBackground themeKey={capsule?.theme || 'default'} />
      <StatusBar barStyle={activeTheme.statusBar} translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Vault */}
          <Animated.View style={[styles.illustrationBox, vaultContainerStyle]}>
            <VaultDoor dialRotation={dialRotation} isOpen={vaultOpen} />
          </Animated.View>

          {/* Wax seal (overlays on top) */}
          <Animated.View style={[styles.illustrationBox, styles.overlay, sealContainerStyle]}>
            <WaxSeal crackProgress={sealCrack} />
          </Animated.View>

          {/* Scroll / letter */}
          <Animated.View style={[styles.illustrationBox, styles.overlay, scrollContainerStyle]}>
            <ScrollLetter unrollProgress={scrollUnroll} />
          </Animated.View>

          {/* Particles */}
          {showParticles && (
            <View style={styles.particleOrigin}>
              <ParticleEffect
                count={reduceMotion ? 6 : 28}
                spread={reduceMotion ? 80 : 160}
                duration={reduceMotion ? 800 : 1200}
                colors={[tc.accent, tc.primary, '#FFD700', '#FF6B6B', '#4ECDC4', tc.text]}
              />
            </View>
          )}

          {/* Text */}
          <Animated.View style={[styles.textBlock, textAnimStyle]}>
            <Text style={[styles.title, { color: tc.text }]}>{currentText.title}</Text>
            <Text style={[styles.subtitle, { color: tc.mutedText }]}>{currentText.subtitle}</Text>
            {capsule && stage === 'scroll' && (
              <Text style={[styles.messagePreview, { color: tc.accent }]} numberOfLines={2}>
                "{capsule.message?.slice(0, 80)}…"
              </Text>
            )}
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  illustrationBox: {
    width: 260,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
  },
  particleOrigin: {
    position: 'absolute',
    top: '42%',
    alignSelf: 'center',
  },
  textBlock: {
    marginTop: 32,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  messagePreview: {
    marginTop: 16,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
