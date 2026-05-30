/**
 * AnimatedDigit.tsx
 *
 * A single animated digit (0-9) for countdown displays.
 * When the value changes, the old digit scrolls up out of view
 * and the new digit scrolls in from below with a spring animation.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

type Props = {
  value: number;
  color?: string;
};

const DIGIT_HEIGHT = 40;
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function AnimatedDigit({ value, color = '#F5A623' }: Props) {
  const translateY = useSharedValue(-value * DIGIT_HEIGHT);

  useEffect(() => {
    translateY.value = withSpring(-value * DIGIT_HEIGHT, {
      damping: 12,
      stiffness: 120,
    });
  }, [value, translateY]);

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.strip, stripStyle]}>
        {DIGITS.map(d => (
          <View key={d} style={styles.digitCell}>
            <Text style={[styles.digitText, { color }]}>
              {d}
            </Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 28,
    height: DIGIT_HEIGHT,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  strip: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  digitCell: {
    width: 28,
    height: DIGIT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 22,
    fontWeight: '700',
  },
});
