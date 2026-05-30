/**
 * ThemeDecorations.tsx
 *
 * Reusable animated decoration overlays for capsule themes.
 * Each decoration is a pure View-based animation using Reanimated.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import type { ThemeStyle } from '../../theme/capsuleThemes';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type DecorationProps = {
  pattern: ThemeStyle['cardPattern'];
  /** Whether to show a compact version (for cards) */
  compact?: boolean;
};

// ---------------------------------------------------------------------------
// Shared floating particle
// ---------------------------------------------------------------------------

function FloatingDot({
  color,
  size,
  x,
  y,
  delay,
  duration,
}: {
  color: string;
  size: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-20, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: duration * 0.6 }),
          withTiming(0.3, { duration: duration * 0.4 }),
        ),
        -1,
        true,
      ),
    );
  }, [delay, duration, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        decorStyles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: x,
          top: y,
        },
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Balloon Decoration (Birthday)
// ---------------------------------------------------------------------------

function BalloonDecoration({ compact }: { compact?: boolean }) {
  const balloonColors = ['#FF6B8A', '#FFB6C1', '#FF85A2', '#E84393', '#F8B500'];
  const count = compact ? 4 : 7;

  return (
    <View style={decorStyles.container} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => {
        const x = (i / count) * 100;
        const y = compact ? 10 + Math.random() * 40 : 20 + Math.random() * 60;
        return (
          <FloatingDot
            key={i}
            color={balloonColors[i % balloonColors.length]}
            size={compact ? 8 : 12}
            x={x}
            y={y}
            delay={i * 200}
            duration={2000 + Math.random() * 1000}
          />
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sparkle Decoration (New Year)
// ---------------------------------------------------------------------------

function SparkleDecoration({ compact }: { compact?: boolean }) {
  const count = compact ? 5 : 10;

  return (
    <View style={decorStyles.container} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => {
        const x = Math.random() * 100;
        const y = Math.random() * (compact ? 60 : 100);
        return (
          <FloatingDot
            key={i}
            color="#FFD700"
            size={compact ? 4 : 6}
            x={x}
            y={y}
            delay={i * 150}
            duration={1500 + Math.random() * 800}
          />
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Confetti Decoration (Graduation)
// ---------------------------------------------------------------------------

function ConfettiDecoration({ compact }: { compact?: boolean }) {
  const confettiColors = ['#FFD700', '#4ECDC4', '#FF6B6B', '#7F77DD', '#F8B500'];
  const count = compact ? 5 : 9;

  return (
    <View style={decorStyles.container} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => {
        const x = (i / count) * 100;
        const y = Math.random() * (compact ? 50 : 80);
        return (
          <FloatingDot
            key={i}
            color={confettiColors[i % confettiColors.length]}
            size={compact ? 5 : 8}
            x={x}
            y={y}
            delay={i * 120}
            duration={1800 + Math.random() * 600}
          />
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Paper/Vintage Decoration
// ---------------------------------------------------------------------------

function PaperDecoration({ compact }: { compact?: boolean }) {
  return (
    <View style={decorStyles.container} pointerEvents="none">
      {/* Subtle aged-paper stain circles */}
      <View style={[decorStyles.stain, { left: 8, top: compact ? 6 : 20, opacity: 0.12 }]} />
      <View style={[decorStyles.stain, decorStyles.stainSmall, { right: 12, top: compact ? 12 : 40, opacity: 0.08 }]} />
      {!compact && (
        <View style={[decorStyles.stain, { left: '40%', bottom: 30, opacity: 0.06 }]} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Neon Decoration (Future)
// ---------------------------------------------------------------------------

function NeonDecoration({ compact }: { compact?: boolean }) {
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={decorStyles.container} pointerEvents="none">
      {/* Horizontal neon line */}
      <Animated.View
        style={[
          decorStyles.neonLine,
          compact && decorStyles.neonLineCompact,
          glowStyle,
        ]}
      />
      {/* Vertical accent line */}
      {!compact && (
        <Animated.View
          style={[decorStyles.neonLineVertical, glowStyle]}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Theme Decoration Dispatcher
// ---------------------------------------------------------------------------

export function ThemeDecoration({ pattern, compact }: DecorationProps) {
  switch (pattern) {
    case 'balloons':
      return <BalloonDecoration compact={compact} />;
    case 'sparkles':
      return <SparkleDecoration compact={compact} />;
    case 'confetti':
      return <ConfettiDecoration compact={compact} />;
    case 'paper':
      return <PaperDecoration compact={compact} />;
    case 'neon':
      return <NeonDecoration compact={compact} />;
    case 'none':
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const decorStyles = StyleSheet.create({
  container: {
    ...(StyleSheet.absoluteFill as object),
    overflow: 'hidden',
  },
  dot: {
    position: 'absolute',
  },
  stain: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#B8956A',
  },
  stainSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  neonLine: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: '#00F5FF',
    borderRadius: 1,
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 2,
  },
  neonLineCompact: {
    bottom: 6,
    left: 8,
    right: 8,
    height: 1.5,
  },
  neonLineVertical: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 2,
    height: 60,
    backgroundColor: '#FF00FF',
    borderRadius: 1,
    shadowColor: '#FF00FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 2,
  },
});
