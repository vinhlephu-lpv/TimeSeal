/**
 * ParticleEffect.tsx
 *
 * Reusable sparkle / confetti particle system using Reanimated.
 * Renders N small animated circles that fly outward from an origin,
 * optionally with gravity, fade-out, and random trajectories.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

type ParticleConfig = {
  /** Number of particles. Default 20 */
  count?: number;
  /** Colors to pick from randomly */
  colors?: string[];
  /** Spread radius in pixels. Default 120 */
  spread?: number;
  /** Animation duration ms. Default 900 */
  duration?: number;
  /** Minimum particle size. Default 4 */
  minSize?: number;
  /** Maximum particle size. Default 10 */
  maxSize?: number;
  /** Whether to auto-start. Default true */
  autoStart?: boolean;
  /** Called when all particles have finished */
  onComplete?: () => void;
};

type SingleParticleProps = {
  color: string;
  size: number;
  angle: number;
  distance: number;
  delay: number;
  duration: number;
  index: number;
  total: number;
  onFinish?: () => void;
};

function SingleParticle({
  color,
  size,
  angle,
  distance,
  delay: delayMs,
  duration,
  onFinish,
}: SingleParticleProps) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(
      delayMs,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) }),
    );
    opacity.value = withDelay(
      delayMs + duration * 0.5,
      withTiming(0, { duration: duration * 0.5 }, finished => {
        if (finished && onFinish) {
          runOnJS(onFinish)();
        }
      }),
    );
  }, [delayMs, distance, duration, onFinish, opacity, progress]);

  const animStyle = useAnimatedStyle(() => {
    const rad = (angle * Math.PI) / 180;
    const tx = Math.cos(rad) * distance * progress.value;
    const ty = Math.sin(rad) * distance * progress.value;

    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: 1 - progress.value * 0.4 },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
}

export function ParticleEffect({
  count = 20,
  colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FFFFFF', '#FF9FF3', '#F8B500'],
  spread = 120,
  duration = 900,
  minSize = 4,
  maxSize = 10,
  autoStart = true,
  onComplete,
}: ParticleConfig) {
  const [started] = React.useState(autoStart);
  const finishedCount = React.useRef(0);

  const handleParticleFinish = React.useCallback(() => {
    finishedCount.current += 1;
    if (finishedCount.current >= count && onComplete) {
      onComplete();
    }
  }, [count, onComplete]);

  if (!started) {
    return null;
  }

  const particles = Array.from({ length: count }).map((_, i) => {
    const angle = (360 / count) * i + (Math.random() * 30 - 15);
    const distance = spread * (0.5 + Math.random() * 0.5);
    const size = minSize + Math.random() * (maxSize - minSize);
    const color = colors[i % colors.length];
    const delay = Math.random() * 150;

    return (
      <SingleParticle
        key={i}
        index={i}
        total={count}
        color={color}
        size={size}
        angle={angle}
        distance={distance}
        delay={delay}
        duration={duration}
        onFinish={i === count - 1 ? handleParticleFinish : undefined}
      />
    );
  });

  return <View style={styles.container}>{particles}</View>;
}

/**
 * Confetti variant – larger rectangular shapes with rotation.
 */
export function ConfettiEffect({
  count = 30,
  colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF9FF3', '#7F77DD', '#F8B500'],
  duration = 1500,
  onComplete,
}: {
  count?: number;
  colors?: string[];
  duration?: number;
  onComplete?: () => void;
}) {
  return (
    <ParticleEffect
      count={count}
      colors={colors}
      spread={180}
      duration={duration}
      minSize={6}
      maxSize={14}
      onComplete={onComplete}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 1,
    height: 1,
  },
});
