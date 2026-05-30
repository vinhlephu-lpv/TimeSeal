/**
 * VaultIllustration.tsx
 *
 * View-based vintage vault illustration with animated dial and wax seal.
 * All rendering uses pure React Native Views (no SVG/images).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

// ---------------------------------------------------------------------------
// Vault Door
// ---------------------------------------------------------------------------

type VaultDoorProps = {
  /** Shared rotation value for the dial (degrees) */
  dialRotation: SharedValue<number>;
  /** Whether the door is open (controls handle + glow) */
  isOpen: SharedValue<number>; // 0 = closed, 1 = open
};

export function VaultDoor({ dialRotation, isOpen }: VaultDoorProps) {
  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${dialRotation.value}deg` }],
  }));

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${isOpen.value * -90}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: isOpen.value * 0.9,
  }));

  return (
    <View style={vaultStyles.frame}>
      {/* Vault body */}
      <View style={vaultStyles.body}>
        {/* Decorative rivets */}
        <View style={[vaultStyles.rivet, vaultStyles.rivetTL]} />
        <View style={[vaultStyles.rivet, vaultStyles.rivetTR]} />
        <View style={[vaultStyles.rivet, vaultStyles.rivetBL]} />
        <View style={[vaultStyles.rivet, vaultStyles.rivetBR]} />

        {/* Dial ring */}
        <View style={vaultStyles.dialOuter}>
          <Animated.View style={[vaultStyles.dialInner, dialStyle]}>
            {/* Tick marks */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
              <View
                key={deg}
                style={[
                  vaultStyles.tick,
                  { transform: [{ rotate: `${deg}deg` }, { translateY: -38 }] },
                ]}
              />
            ))}
            {/* Center knob */}
            <View style={vaultStyles.knob}>
              <View style={vaultStyles.knobInner} />
            </View>
            {/* Indicator marker */}
            <View style={vaultStyles.indicator} />
          </Animated.View>
        </View>

        {/* Handle */}
        <Animated.View style={[vaultStyles.handleBar, handleStyle]}>
          <View style={vaultStyles.handleKnob} />
        </Animated.View>

        {/* Warm glow when opening */}
        <Animated.View style={[vaultStyles.glow, glowStyle]} />
      </View>

      {/* Vault border / bezel */}
      <View style={vaultStyles.bezel} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Wax Seal
// ---------------------------------------------------------------------------

type WaxSealProps = {
  /** 0 = intact, 1 = cracked */
  crackProgress: SharedValue<number>;
};

export function WaxSeal({ crackProgress }: WaxSealProps) {
  const sealStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - crackProgress.value * 0.15 }],
    opacity: 1 - crackProgress.value * 0.3,
  }));

  // Crack fragments that fly outward
  const fragment1 = useAnimatedStyle(() => ({
    transform: [
      { translateX: crackProgress.value * 30 },
      { translateY: crackProgress.value * -20 },
      { rotate: `${crackProgress.value * 45}deg` },
    ],
    opacity: crackProgress.value > 0.1 ? 1 - crackProgress.value : 0,
  }));

  const fragment2 = useAnimatedStyle(() => ({
    transform: [
      { translateX: crackProgress.value * -25 },
      { translateY: crackProgress.value * 15 },
      { rotate: `${crackProgress.value * -60}deg` },
    ],
    opacity: crackProgress.value > 0.1 ? 1 - crackProgress.value : 0,
  }));

  const fragment3 = useAnimatedStyle(() => ({
    transform: [
      { translateX: crackProgress.value * 10 },
      { translateY: crackProgress.value * 30 },
      { rotate: `${crackProgress.value * 30}deg` },
    ],
    opacity: crackProgress.value > 0.1 ? 1 - crackProgress.value : 0,
  }));

  return (
    <View style={sealStyles.container}>
      {/* Main seal body */}
      <Animated.View style={[sealStyles.seal, sealStyle]}>
        {/* Wavy edge ring */}
        <View style={sealStyles.outerRing} />
        {/* Inner circle */}
        <View style={sealStyles.innerCircle}>
          <Text style={sealStyles.logo}>TS</Text>
        </View>
        {/* Ribbon ends */}
        <View style={[sealStyles.ribbon, sealStyles.ribbonLeft]} />
        <View style={[sealStyles.ribbon, sealStyles.ribbonRight]} />
      </Animated.View>

      {/* Crack fragments */}
      <Animated.View style={[sealStyles.fragment, fragment1]} />
      <Animated.View style={[sealStyles.fragment, sealStyles.fragmentMed, fragment2]} />
      <Animated.View style={[sealStyles.fragment, sealStyles.fragmentSmall, fragment3]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Scroll / Letter
// ---------------------------------------------------------------------------

type ScrollLetterProps = {
  /** 0 = rolled up, 1 = fully unrolled */
  unrollProgress: SharedValue<number>;
};

export function ScrollLetter({ unrollProgress }: ScrollLetterProps) {
  const scrollStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 0.1 + unrollProgress.value * 0.9 }],
    opacity: 0.3 + unrollProgress.value * 0.7,
  }));

  return (
    <Animated.View style={[scrollStyles.scroll, scrollStyle]}>
      {/* Parchment texture lines */}
      <View style={scrollStyles.lineThick} />
      <View style={scrollStyles.line} />
      <View style={scrollStyles.line} />
      <View style={scrollStyles.lineShort} />
      {/* Curl at top */}
      <View style={scrollStyles.curlTop} />
      {/* Curl at bottom */}
      <View style={scrollStyles.curlBottom} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Vault Styles
// ---------------------------------------------------------------------------

const vaultStyles = StyleSheet.create({
  frame: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    width: 220,
    height: 220,
    borderRadius: 24,
    backgroundColor: '#8B7355', // Brass/bronze
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#A0895C',
    // Inner shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  bezel: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: '#6B5B3E',
    opacity: 0.3,
  },
  rivet: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#C4A96A',
    borderWidth: 1.5,
    borderColor: '#9A8250',
  },
  rivetTL: { top: 12, left: 12 },
  rivetTR: { top: 12, right: 12 },
  rivetBL: { bottom: 12, left: 12 },
  rivetBR: { bottom: 12, right: 12 },
  dialOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#3A3530',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#C4A96A',
  },
  dialInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#2A2520',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    position: 'absolute',
    width: 2,
    height: 8,
    backgroundColor: '#C4A96A',
    borderRadius: 1,
  },
  knob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#C4A96A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#9A8250',
  },
  knobInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6B5B3E',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    width: 4,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#FF6347',
  },
  handleBar: {
    position: 'absolute',
    right: 18,
    width: 40,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#C4A96A',
    borderWidth: 1,
    borderColor: '#9A8250',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  handleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D4B96A',
    borderWidth: 2,
    borderColor: '#9A8250',
    marginRight: -4,
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    opacity: 0,
  },
});

// ---------------------------------------------------------------------------
// Seal Styles
// ---------------------------------------------------------------------------

const sealStyles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seal: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C41E3A', // Deep wax red
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  outerRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: '#E8485C',
    borderStyle: 'dashed',
  },
  innerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#9B1B30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E8485C',
  },
  logo: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  ribbon: {
    position: 'absolute',
    bottom: -12,
    width: 16,
    height: 24,
    backgroundColor: '#C41E3A',
    borderRadius: 2,
  },
  ribbonLeft: {
    left: 20,
    transform: [{ rotate: '-15deg' }],
  },
  ribbonRight: {
    right: 20,
    transform: [{ rotate: '15deg' }],
  },
  fragment: {
    position: 'absolute',
    width: 18,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#C41E3A',
  },
  fragmentMed: {
    width: 14,
    height: 10,
    backgroundColor: '#9B1B30',
  },
  fragmentSmall: {
    width: 10,
    height: 8,
    backgroundColor: '#E8485C',
  },
});

// ---------------------------------------------------------------------------
// Scroll Styles
// ---------------------------------------------------------------------------

const scrollStyles = StyleSheet.create({
  scroll: {
    width: 200,
    height: 280,
    borderRadius: 12,
    backgroundColor: '#F5E6C8', // Parchment color
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: '#D4C4A0',
    gap: 12,
  },
  lineThick: {
    width: '80%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D4C4A0',
  },
  line: {
    width: '90%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E0D4B8',
  },
  lineShort: {
    width: '60%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E0D4B8',
    alignSelf: 'flex-start',
  },
  curlTop: {
    position: 'absolute',
    top: -6,
    width: '100%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E8D8B4',
    borderWidth: 1,
    borderColor: '#D4C4A0',
  },
  curlBottom: {
    position: 'absolute',
    bottom: -6,
    width: '100%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E8D8B4',
    borderWidth: 1,
    borderColor: '#D4C4A0',
  },
});
