import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { CapsuleTheme } from '../types/models';

export interface ThemeColors {
  background: string;
  cardBg: string;
  cardBorder: string;
  text: string;
  mutedText: string;
  inputBg: string;
  inputBorder: string;
  inputPlaceholder: string;
  primary: string;
  buttonBg: string;
  buttonText: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
  activeChipBg: string;
  activeChipBorder: string;
  activeChipText: string;
  stepDotActive: string;
  stepDotInactive: string;
  accent: string;
}

export interface ThemeConfig {
  key: CapsuleTheme;
  name: string;
  emoji: string;
  isPremium: boolean;
  statusBar: 'light-content' | 'dark-content';
  colors: ThemeColors;
}

export type ThemeStyle = {
  cardGradient: [string, string];
  cardPattern: 'none' | 'balloons' | 'sparkles' | 'confetti' | 'paper' | 'neon';
  detailBg: string;
  detailAccent: string;
  iconName: string;
  iconColor: string;
  screenVariant: 'light' | 'dark' | 'warm' | 'info' | 'teal';
  coverBg: string;
  coverBorder: string;
};

export const capsuleThemes: Record<CapsuleTheme, ThemeConfig> = {
  default: {
    key: 'default',
    name: 'Mặc Định',
    emoji: '🎨',
    isPremium: false,
    statusBar: 'dark-content',
    colors: {
      background: '#FBFAFF',
      cardBg: '#FFFFFF',
      cardBorder: '#DDD9F5',
      text: '#111111',
      mutedText: '#888780',
      inputBg: '#FFFFFF',
      inputBorder: '#DDD9F5',
      inputPlaceholder: '#A0A0A0',
      primary: '#534AB7',
      buttonBg: '#534AB7',
      buttonText: '#FFFFFF',
      chipBg: '#FFFFFF',
      chipBorder: '#D3D1C7',
      chipText: '#111111',
      activeChipBg: '#EEEDFE',
      activeChipBorder: '#534AB7',
      activeChipText: '#534AB7',
      stepDotActive: '#534AB7',
      stepDotInactive: '#CECBF6',
      accent: '#EF9F27',
    },
  },
  vintage: {
    key: 'vintage',
    name: 'Hoài Niệm',
    emoji: '⏳',
    isPremium: false,
    statusBar: 'dark-content',
    colors: {
      background: '#FAF6EE',
      cardBg: '#FCF9F2',
      cardBorder: '#E6DEC9',
      text: '#3E2723',
      mutedText: '#8D7B68',
      inputBg: '#F7F3E9',
      inputBorder: '#DBCFB4',
      inputPlaceholder: '#B5A890',
      primary: '#A0522D',
      buttonBg: '#8B4513',
      buttonText: '#FDFBF7',
      chipBg: '#F4EFEB',
      chipBorder: '#D6C5B3',
      chipText: '#5C4033',
      activeChipBg: '#EEDCC6',
      activeChipBorder: '#8B4513',
      activeChipText: '#8B4513',
      stepDotActive: '#8B4513',
      stepDotInactive: '#E3D5CA',
      accent: '#CD853F',
    },
  },
  cyberpunk: {
    key: 'cyberpunk',
    name: 'Tương Lai',
    emoji: '⚡',
    isPremium: false,
    statusBar: 'light-content',
    colors: {
      background: '#09090E',
      cardBg: '#12121E',
      cardBorder: '#2E1E50',
      text: '#E2E8F0',
      mutedText: '#707E94',
      inputBg: '#181829',
      inputBorder: '#FF007F',
      inputPlaceholder: '#4B526D',
      primary: '#FF007F',
      buttonBg: '#FF007F',
      buttonText: '#FFFFFF',
      chipBg: '#1A1230',
      chipBorder: '#3B225F',
      chipText: '#A5B4FC',
      activeChipBg: '#27184A',
      activeChipBorder: '#00FFFF',
      activeChipText: '#00FFFF',
      stepDotActive: '#00FFFF',
      stepDotInactive: '#22163E',
      accent: '#00FFFF',
    },
  },
  future: {
    key: 'future',
    name: 'Tương Lai',
    emoji: '⚡',
    isPremium: false,
    statusBar: 'light-content',
    colors: {
      background: '#09090E',
      cardBg: '#12121E',
      cardBorder: '#2E1E50',
      text: '#E2E8F0',
      mutedText: '#707E94',
      inputBg: '#181829',
      inputBorder: '#FF007F',
      inputPlaceholder: '#4B526D',
      primary: '#FF007F',
      buttonBg: '#FF007F',
      buttonText: '#FFFFFF',
      chipBg: '#1A1230',
      chipBorder: '#3B225F',
      chipText: '#A5B4FC',
      activeChipBg: '#27184A',
      activeChipBorder: '#00FFFF',
      activeChipText: '#00FFFF',
      stepDotActive: '#00FFFF',
      stepDotInactive: '#22163E',
      accent: '#00FFFF',
    },
  },
  aurora: {
    key: 'aurora',
    name: 'Cực Quang',
    emoji: '🌌',
    isPremium: false,
    statusBar: 'light-content',
    colors: {
      background: '#0E1129',
      cardBg: 'rgba(22, 28, 62, 0.75)',
      cardBorder: 'rgba(56, 189, 248, 0.25)',
      text: '#F0FDFA',
      mutedText: '#94A3B8',
      inputBg: 'rgba(15, 23, 42, 0.6)',
      inputBorder: 'rgba(45, 212, 191, 0.45)',
      inputPlaceholder: '#64748B',
      primary: '#2DD4BF',
      buttonBg: '#0EA5E9',
      buttonText: '#FFFFFF',
      chipBg: 'rgba(30, 41, 59, 0.5)',
      chipBorder: 'rgba(148, 163, 184, 0.2)',
      chipText: '#CBD5E1',
      activeChipBg: 'rgba(45, 212, 191, 0.15)',
      activeChipBorder: '#2DD4BF',
      activeChipText: '#2DD4BF',
      stepDotActive: '#2DD4BF',
      stepDotInactive: 'rgba(45, 212, 191, 0.2)',
      accent: '#818CF8',
    },
  },
  zen: {
    key: 'zen',
    name: 'Tĩnh Lặng',
    emoji: '🍃',
    isPremium: false,
    statusBar: 'dark-content',
    colors: {
      background: '#F2F5F3',
      cardBg: '#FDFDFD',
      cardBorder: '#E2E8F0',
      text: '#243E36',
      mutedText: '#6E7E75',
      inputBg: '#FAFAF9',
      inputBorder: '#CBD5E1',
      inputPlaceholder: '#94A3B8',
      primary: '#2E5A44',
      buttonBg: '#3B7A57',
      buttonText: '#FFFFFF',
      chipBg: '#ECEFEF',
      chipBorder: '#CBD4CD',
      chipText: '#4A5A50',
      activeChipBg: '#D8E2DC',
      activeChipBorder: '#2E5A44',
      activeChipText: '#2E5A44',
      stepDotActive: '#2E5A44',
      stepDotInactive: '#CBD4CD',
      accent: '#E6C229',
    },
  },
  sunset: {
    key: 'sunset',
    name: 'Hoàng Hôn',
    emoji: '🌅',
    isPremium: false,
    statusBar: 'dark-content',
    colors: {
      background: '#FFF8F5',
      cardBg: '#FFFDFD',
      cardBorder: '#FFE9E0',
      text: '#5C2518',
      mutedText: '#A07166',
      inputBg: '#FFFBF9',
      inputBorder: '#FFD2C4',
      inputPlaceholder: '#C9A097',
      primary: '#E76F51',
      buttonBg: '#E76F51',
      buttonText: '#FFFFFF',
      chipBg: '#FFF2EE',
      chipBorder: '#FAD2C8',
      chipText: '#7C3E2D',
      activeChipBg: '#FCD5CE',
      activeChipBorder: '#E76F51',
      activeChipText: '#E76F51',
      stepDotActive: '#E76F51',
      stepDotInactive: '#FCD5CE',
      accent: '#F4A261',
    },
  },
  royal: {
    key: 'royal',
    name: 'Hoàng Gia',
    emoji: '👑',
    isPremium: true,
    statusBar: 'light-content',
    colors: {
      background: '#0A1128',
      cardBg: '#101B3A',
      cardBorder: 'rgba(212, 175, 55, 0.4)',
      text: '#F1F5F9',
      mutedText: '#94A3B8',
      inputBg: '#0F1834',
      inputBorder: '#D4AF37',
      inputPlaceholder: '#475569',
      primary: '#D4AF37',
      buttonBg: '#D4AF37',
      buttonText: '#0A1128',
      chipBg: '#0D1735',
      chipBorder: 'rgba(212, 175, 55, 0.2)',
      chipText: '#94A3B8',
      activeChipBg: 'rgba(212, 175, 55, 0.15)',
      activeChipBorder: '#D4AF37',
      activeChipText: '#D4AF37',
      stepDotActive: '#D4AF37',
      stepDotInactive: '#1E293B',
      accent: '#F4D068',
    },
  },
  crystal: {
    key: 'crystal',
    name: 'Pha Lê',
    emoji: '💎',
    isPremium: true,
    statusBar: 'dark-content',
    colors: {
      background: '#F5F7FC',
      cardBg: 'rgba(255, 255, 255, 0.75)',
      cardBorder: 'rgba(255, 255, 255, 0.8)',
      text: '#1E293B',
      mutedText: '#64748B',
      inputBg: 'rgba(255, 255, 255, 0.8)',
      inputBorder: '#CBD5E1',
      inputPlaceholder: '#94A3B8',
      primary: '#0EA5E9',
      buttonBg: '#0EA5E9',
      buttonText: '#FFFFFF',
      chipBg: '#FFFFFF',
      chipBorder: '#E2E8F0',
      chipText: '#475569',
      activeChipBg: 'rgba(14, 165, 233, 0.12)',
      activeChipBorder: '#0EA5E9',
      activeChipText: '#0EA5E9',
      stepDotActive: '#0EA5E9',
      stepDotInactive: '#E2E8F0',
      accent: '#22D3EE',
    },
  },
  starry: {
    key: 'starry',
    name: 'Sao Băng',
    emoji: '☄️',
    isPremium: true,
    statusBar: 'light-content',
    colors: {
      background: '#05050A',
      cardBg: '#0C0C14',
      cardBorder: '#271B43',
      text: '#F8FAFC',
      mutedText: '#64748B',
      inputBg: '#0A0A10',
      inputBorder: '#8B5CF6',
      inputPlaceholder: '#475569',
      primary: '#FDE047',
      buttonBg: '#8B5CF6',
      buttonText: '#FFFFFF',
      chipBg: '#0F0E16',
      chipBorder: '#232230',
      chipText: '#94A3B8',
      activeChipBg: 'rgba(139, 92, 246, 0.15)',
      activeChipBorder: '#FDE047',
      activeChipText: '#FDE047',
      stepDotActive: '#FDE047',
      stepDotInactive: '#1E1B4B',
      accent: '#FDE047',
    },
  },
  birthday: {
    key: 'default',
    name: 'Mặc Định',
    emoji: '🎨',
    isPremium: false,
    statusBar: 'dark-content',
    colors: {
      background: '#FBFAFF',
      cardBg: '#FFFFFF',
      cardBorder: '#DDD9F5',
      text: '#111111',
      mutedText: '#888780',
      inputBg: '#FFFFFF',
      inputBorder: '#DDD9F5',
      inputPlaceholder: '#A0A0A0',
      primary: '#534AB7',
      buttonBg: '#534AB7',
      buttonText: '#FFFFFF',
      chipBg: '#FFFFFF',
      chipBorder: '#D3D1C7',
      chipText: '#111111',
      activeChipBg: '#EEEDFE',
      activeChipBorder: '#534AB7',
      activeChipText: '#534AB7',
      stepDotActive: '#534AB7',
      stepDotInactive: '#CECBF6',
      accent: '#EF9F27',
    },
  },
  new_year: {
    key: 'default',
    name: 'Mặc Định',
    emoji: '🎨',
    isPremium: false,
    statusBar: 'dark-content',
    colors: {
      background: '#FBFAFF',
      cardBg: '#FFFFFF',
      cardBorder: '#DDD9F5',
      text: '#111111',
      mutedText: '#888780',
      inputBg: '#FFFFFF',
      inputBorder: '#DDD9F5',
      inputPlaceholder: '#A0A0A0',
      primary: '#534AB7',
      buttonBg: '#534AB7',
      buttonText: '#FFFFFF',
      chipBg: '#FFFFFF',
      chipBorder: '#D3D1C7',
      chipText: '#111111',
      activeChipBg: '#EEEDFE',
      activeChipBorder: '#534AB7',
      activeChipText: '#534AB7',
      stepDotActive: '#534AB7',
      stepDotInactive: '#CECBF6',
      accent: '#EF9F27',
    },
  },
  graduation: {
    key: 'default',
    name: 'Mặc Định',
    emoji: '🎨',
    isPremium: false,
    statusBar: 'dark-content',
    colors: {
      background: '#FBFAFF',
      cardBg: '#FFFFFF',
      cardBorder: '#DDD9F5',
      text: '#111111',
      mutedText: '#888780',
      inputBg: '#FFFFFF',
      inputBorder: '#DDD9F5',
      inputPlaceholder: '#A0A0A0',
      primary: '#534AB7',
      buttonBg: '#534AB7',
      buttonText: '#FFFFFF',
      chipBg: '#FFFFFF',
      chipBorder: '#D3D1C7',
      chipText: '#111111',
      activeChipBg: '#EEEDFE',
      activeChipBorder: '#534AB7',
      activeChipText: '#534AB7',
      stepDotActive: '#534AB7',
      stepDotInactive: '#CECBF6',
      accent: '#EF9F27',
    },
  },
};

const toScreenVariant = (theme: ThemeConfig): ThemeStyle['screenVariant'] => {
  if (theme.key === 'vintage' || theme.key === 'sunset') {
    return 'warm';
  }
  if (theme.key === 'zen') {
    return 'teal';
  }
  return theme.statusBar === 'light-content' ? 'dark' : 'light';
};

const toCardPattern = (theme: CapsuleTheme): ThemeStyle['cardPattern'] => {
  switch (theme) {
    case 'vintage':
      return 'paper';
    case 'cyberpunk':
    case 'future':
      return 'neon';
    case 'birthday':
      return 'balloons';
    case 'new_year':
    case 'royal':
    case 'crystal':
    case 'starry':
    case 'aurora':
      return 'sparkles';
    case 'graduation':
      return 'confetti';
    default:
      return 'none';
  }
};

const toIconName = (theme: CapsuleTheme): string => {
  switch (theme) {
    case 'vintage':
      return 'hourglass-outline';
    case 'cyberpunk':
    case 'future':
      return 'flash-outline';
    case 'aurora':
    case 'starry':
      return 'sparkles-outline';
    case 'zen':
      return 'leaf-outline';
    case 'sunset':
      return 'heart-outline';
    case 'royal':
      return 'diamond-outline';
    case 'crystal':
      return 'diamond';
    case 'birthday':
      return 'gift';
    case 'new_year':
      return 'sparkles';
    case 'graduation':
      return 'school-outline';
    default:
      return 'cube';
  }
};

export function getThemeStyle(theme?: CapsuleTheme | string): ThemeStyle {
  const key = theme && theme in capsuleThemes ? (theme as CapsuleTheme) : 'default';
  const config = capsuleThemes[key];
  return {
    cardGradient: [config.colors.cardBg, config.colors.background],
    cardPattern: toCardPattern(key),
    detailBg: config.colors.background,
    detailAccent: config.colors.primary,
    iconName: toIconName(key),
    iconColor: config.colors.primary,
    screenVariant: toScreenVariant(config),
    coverBg: config.colors.cardBg,
    coverBorder: config.colors.cardBorder,
  };
}

export function ThemeBackground({ themeKey }: { themeKey: CapsuleTheme }) {
  const config = capsuleThemes[themeKey] || capsuleThemes.default;
  const { background } = config.colors;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: background, overflow: 'hidden' }]} pointerEvents="none">
      {themeKey === 'vintage' && (
        <View style={StyleSheet.absoluteFill}>
          <View style={[styles.vintageFrame, { borderColor: config.colors.cardBorder }]} />
          <View style={[styles.vintageCorner, styles.vintageTL, { borderColor: config.colors.cardBorder }]} />
          <View style={[styles.vintageCorner, styles.vintageTR, { borderColor: config.colors.cardBorder }]} />
          <View style={[styles.vintageCorner, styles.vintageBL, { borderColor: config.colors.cardBorder }]} />
          <View style={[styles.vintageCorner, styles.vintageBR, { borderColor: config.colors.cardBorder }]} />
        </View>
      )}

      {(themeKey === 'cyberpunk' || themeKey === 'future') && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.cyberGridRow1} />
          <View style={styles.cyberGridRow2} />
          <View style={styles.cyberGridCol1} />
          <View style={styles.cyberGridCol2} />
          <View style={[styles.cyberBorder, { borderColor: 'rgba(255, 0, 127, 0.15)' }]} />
          <View style={[styles.cyberL, styles.cyberL_TL]} />
          <View style={[styles.cyberL, styles.cyberL_TR]} />
          <View style={[styles.cyberL, styles.cyberL_BL]} />
          <View style={[styles.cyberL, styles.cyberL_BR]} />
        </View>
      )}

      {themeKey === 'aurora' && (
        <View style={StyleSheet.absoluteFill}>
          <View style={[styles.auroraBlob, styles.auroraGreen]} />
          <View style={[styles.auroraBlob, styles.auroraBlue]} />
          <View style={[styles.auroraBlob, styles.auroraPurple]} />
          <View style={[styles.starSpec, { top: '15%', left: '20%', opacity: 0.8 }]} />
          <View style={[styles.starSpec, { top: '35%', right: '15%', opacity: 0.6, width: 4, height: 4 }]} />
          <View style={[styles.starSpec, { bottom: '25%', left: '10%', opacity: 0.7 }]} />
          <View style={[styles.starSpec, { bottom: '40%', right: '30%', opacity: 0.5, width: 3, height: 3 }]} />
          <View style={[styles.starSpec, { top: '65%', left: '45%', opacity: 0.9, width: 5, height: 5 }]} />
        </View>
      )}

      {themeKey === 'zen' && (
        <View style={StyleSheet.absoluteFill}>
          <View style={[styles.zenRipple, { width: 140, height: 140, borderRadius: 70, top: '12%', right: -30 }]} />
          <View style={[styles.zenRipple, { width: 220, height: 220, borderRadius: 110, top: '8%', right: -70 }]} />
          <View style={[styles.zenRipple, { width: 300, height: 300, borderRadius: 150, top: '3%', right: -110 }]} />
          <View style={[styles.zenRipple, { width: 180, height: 180, borderRadius: 90, bottom: '15%', left: -50 }]} />
          <View style={[styles.zenRipple, { width: 260, height: 260, borderRadius: 130, bottom: '10%', left: -90 }]} />
          <View style={styles.zenStone1} />
          <View style={styles.zenStone2} />
        </View>
      )}

      {themeKey === 'sunset' && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.sunsetSun} />
          <View style={styles.sunsetRay1} />
          <View style={styles.sunsetRay2} />
          <View style={styles.sunsetRay3} />
          <View style={styles.sunsetStripe1} />
          <View style={styles.sunsetStripe2} />
        </View>
      )}

      {themeKey === 'royal' && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.royalOuterBorder} />
          <View style={styles.royalInnerBorder} />
          <View style={[styles.royalCorner, styles.royalCornerTL]} />
          <View style={[styles.royalCorner, styles.royalCornerTR]} />
          <View style={[styles.royalCorner, styles.royalCornerBL]} />
          <View style={[styles.royalCorner, styles.royalCornerBR]} />
        </View>
      )}

      {themeKey === 'crystal' && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.crystalBgGrad1} />
          <View style={styles.crystalBgGrad2} />
          <View style={[styles.crystalPrism, { top: '15%', left: '15%', transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.crystalPrism, { top: '32%', right: '10%', width: 50, height: 50, transform: [{ rotate: '30deg' }] }]} />
          <View style={[styles.crystalPrism, { bottom: '25%', left: '5%', width: 70, height: 70, transform: [{ rotate: '55deg' }] }]} />
          <View style={[styles.crystalPrism, { bottom: '38%', right: '22%', width: 45, height: 45, transform: [{ rotate: '15deg' }] }]} />
        </View>
      )}

      {themeKey === 'starry' && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.starryNebula} />
          <View style={[styles.starPoint, { top: '18%', left: '25%', opacity: 0.9 }]} />
          <View style={[styles.starPoint, { top: '38%', right: '25%', opacity: 0.4 }]} />
          <View style={[styles.starPoint, { top: '55%', left: '15%', opacity: 0.7 }]} />
          <View style={[styles.starPoint, { bottom: '30%', right: '15%', opacity: 0.8 }]} />
          <View style={[styles.meteorTrail, { top: '10%', right: '5%' }]} />
          <View style={[styles.meteorTrail, { top: '28%', right: '40%', width: 80 }]} />
          <View style={[styles.meteorTrail, { top: '52%', right: '15%', width: 140 }]} />
        </View>
      )}

      {themeKey === 'default' && (
        <View style={StyleSheet.absoluteFill}>
          <View style={[styles.defaultBlob, styles.defaultBlobTop]} />
          <View style={[styles.defaultBlob, styles.defaultBlobCenter]} />
          <View style={[styles.defaultBlob, styles.defaultBlobSide]} />
          <View style={[styles.defaultBlob, styles.defaultBlobBottom]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // VINTAGE STYLES
  vintageFrame: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
    borderWidth: 1,
    borderRadius: 8,
    opacity: 0.4,
  },
  vintageCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderWidth: 2,
  },
  vintageTL: { top: 10, left: 10, borderRightWidth: 0, borderBottomWidth: 0 },
  vintageTR: { top: 10, right: 10, borderLeftWidth: 0, borderBottomWidth: 0 },
  vintageBL: { bottom: 10, left: 10, borderRightWidth: 0, borderTopWidth: 0 },
  vintageBR: { bottom: 10, right: 10, borderLeftWidth: 0, borderTopWidth: 0 },

  // CYBERPUNK STYLES
  cyberGridRow1: { position: 'absolute', left: 0, right: 0, top: '25%', height: 1, backgroundColor: 'rgba(0, 255, 255, 0.05)' },
  cyberGridRow2: { position: 'absolute', left: 0, right: 0, top: '65%', height: 1, backgroundColor: 'rgba(0, 255, 255, 0.05)' },
  cyberGridCol1: { position: 'absolute', top: 0, bottom: 0, left: '20%', width: 1, backgroundColor: 'rgba(0, 255, 255, 0.05)' },
  cyberGridCol2: { position: 'absolute', top: 0, bottom: 0, right: '20%', width: 1, backgroundColor: 'rgba(0, 255, 255, 0.05)' },
  cyberBorder: { position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, borderWidth: 1, borderRadius: 12 },
  cyberL: { position: 'absolute', width: 12, height: 12, borderColor: '#00FFFF', borderWidth: 2 },
  cyberL_TL: { top: 6, left: 6, borderRightWidth: 0, borderBottomWidth: 0 },
  cyberL_TR: { top: 6, right: 6, borderLeftWidth: 0, borderBottomWidth: 0 },
  cyberL_BL: { bottom: 6, left: 6, borderRightWidth: 0, borderTopWidth: 0 },
  cyberL_BR: { bottom: 6, right: 6, borderLeftWidth: 0, borderTopWidth: 0 },

  // AURORA STYLES
  auroraBlob: { position: 'absolute', borderRadius: 999, opacity: 0.14 },
  auroraGreen: { width: 300, height: 300, backgroundColor: '#10B981', top: -50, left: -50 },
  auroraBlue: { width: 280, height: 280, backgroundColor: '#0EA5E9', bottom: 100, right: -50 },
  auroraPurple: { width: 250, height: 250, backgroundColor: '#8B5CF6', top: '35%', left: -80 },
  starSpec: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },

  // ZEN STYLES
  zenRipple: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(46, 90, 68, 0.06)' },
  zenStone1: { position: 'absolute', width: 120, height: 80, borderRadius: 60, backgroundColor: 'rgba(210, 183, 136, 0.06)', bottom: '5%', right: '10%' },
  zenStone2: { position: 'absolute', width: 80, height: 60, borderRadius: 40, backgroundColor: 'rgba(110, 126, 117, 0.05)', top: '15%', left: '8%' },

  // SUNSET STYLES
  sunsetSun: { position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: 'rgba(231, 111, 81, 0.08)', bottom: -120, right: -70 },
  sunsetRay1: { position: 'absolute', width: 600, height: 1, backgroundColor: 'rgba(244, 162, 97, 0.04)', bottom: '30%', left: -100, transform: [{ rotate: '15deg' }] },
  sunsetRay2: { position: 'absolute', width: 600, height: 1, backgroundColor: 'rgba(244, 162, 97, 0.04)', bottom: '40%', left: -100, transform: [{ rotate: '25deg' }] },
  sunsetRay3: { position: 'absolute', width: 600, height: 1, backgroundColor: 'rgba(244, 162, 97, 0.04)', bottom: '50%', left: -100, transform: [{ rotate: '35deg' }] },
  sunsetStripe1: { position: 'absolute', left: 0, right: 0, bottom: 40, height: 1.2, backgroundColor: 'rgba(231, 111, 81, 0.03)' },
  sunsetStripe2: { position: 'absolute', left: 0, right: 0, bottom: 80, height: 1.2, backgroundColor: 'rgba(231, 111, 81, 0.03)' },

  // ROYAL STYLES
  royalOuterBorder: { position: 'absolute', top: 12, left: 12, right: 12, bottom: 12, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.15)', borderRadius: 10 },
  royalInnerBorder: { position: 'absolute', top: 16, left: 16, right: 16, bottom: 16, borderWidth: 1.5, borderColor: 'rgba(212, 175, 55, 0.3)', borderRadius: 8 },
  royalCorner: { position: 'absolute', width: 28, height: 28, borderWidth: 1, borderColor: '#D4AF37', borderRadius: 6, opacity: 0.6 },
  royalCornerTL: { top: 10, left: 10 },
  royalCornerTR: { top: 10, right: 10 },
  royalCornerBL: { bottom: 10, left: 10 },
  royalCornerBR: { bottom: 10, right: 10 },

  // CRYSTAL STYLES
  crystalBgGrad1: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(243, 232, 255, 0.6)', top: -30, left: -30 },
  crystalBgGrad2: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(224, 242, 254, 0.6)', bottom: -40, right: -40 },
  crystalPrism: { position: 'absolute', width: 60, height: 60, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.8)', backgroundColor: 'rgba(255, 255, 255, 0.18)', borderRadius: 4 },

  // STARRY STYLES
  starryNebula: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(139, 92, 246, 0.05)', top: '10%', left: '5%' },
  starPoint: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FDE047' },
  meteorTrail: { position: 'absolute', width: 110, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.18)', transform: [{ rotate: '-35deg' }] },

  // DEFAULT STYLES
  defaultBlob: { position: 'absolute', borderRadius: 999 },
  defaultBlobTop: { width: 270, height: 230, left: -84, top: -92, backgroundColor: '#EEEAFD' },
  defaultBlobCenter: { width: 240, height: 240, left: -120, top: '38%', backgroundColor: '#F2F0FF', opacity: 0.6 },
  defaultBlobSide: { width: 180, height: 170, right: -62, top: 110, backgroundColor: '#FFE7DA' },
  defaultBlobBottom: { width: 540, height: 240, left: -75, bottom: -125, backgroundColor: '#F2F0FF' },
});
