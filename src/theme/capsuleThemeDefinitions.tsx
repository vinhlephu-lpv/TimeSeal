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
  icon: string;
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
    name: 'Mặc định',
    icon: 'color-palette-outline',
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
    name: 'Hoài niệm',
    icon: 'hourglass-outline',
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
    icon: 'flash-outline',
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
    icon: 'flash-outline',
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
    icon: 'planet-outline',
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
    name: 'Tĩnh lặng',
    icon: 'leaf-outline',
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
    name: 'Hoàng hôn',
    icon: 'sunny-outline',
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
    name: 'Mây pastel',
    icon: 'sparkles-outline',
    isPremium: true,
    statusBar: 'dark-content',
    colors: {
      background: '#FFF7FB',
      cardBg: '#FFFCFE',
      cardBorder: '#EAD7FF',
      text: '#3D2A56',
      mutedText: '#8C779F',
      inputBg: '#FFF9FD',
      inputBorder: '#DCC6F6',
      inputPlaceholder: '#B8A5C8',
      primary: '#9B7EDC',
      buttonBg: '#9B7EDC',
      buttonText: '#FFFFFF',
      chipBg: '#F8EEFF',
      chipBorder: '#E8D6FA',
      chipText: '#6B5680',
      activeChipBg: '#F1E4FF',
      activeChipBorder: '#B997E8',
      activeChipText: '#7F5CC4',
      stepDotActive: '#B997E8',
      stepDotInactive: '#EFE3F7',
      accent: '#F0B8C8',
    },
  },
  crystal: {
    key: 'crystal',
    name: 'Pha lê',
    icon: 'diamond',
    isPremium: true,
    statusBar: 'dark-content',
    colors: {
      background: '#F5F7FC',
      cardBg: '#FFFFFF',
      cardBorder: '#E2E8F0',
      text: '#1E293B',
      mutedText: '#64748B',
      inputBg: '#F8FAFF',
      inputBorder: '#CBD5E1',
      inputPlaceholder: '#94A3B8',
      primary: '#0EA5E9',
      buttonBg: '#0EA5E9',
      buttonText: '#FFFFFF',
      chipBg: '#FFFFFF',
      chipBorder: '#E2E8F0',
      chipText: '#475569',
      activeChipBg: '#E0F2FE',
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
    icon: 'sparkles',
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
    name: 'Mặc định',
    icon: 'gift-outline',
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
    name: 'Mặc định',
    icon: 'sparkles',
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
    name: 'Mặc định',
    icon: 'school-outline',
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
      return 'sparkles-outline';
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
          <View style={[styles.royalCloud, styles.royalCloudTop]} />
          <View style={[styles.royalCloud, styles.royalCloudSide]} />
          <View style={[styles.royalCloud, styles.royalCloudBottom]} />
          <View style={styles.royalMoon} />
          <View style={[styles.royalRibbon, styles.royalRibbonOne]} />
          <View style={[styles.royalRibbon, styles.royalRibbonTwo]} />
          <View style={[styles.royalSparkle, { top: '14%', left: '22%', opacity: 0.75 }]} />
          <View style={[styles.royalSparkle, { top: '31%', right: '18%', opacity: 0.55, transform: [{ rotate: '18deg' }] }]} />
          <View style={[styles.royalSparkle, { bottom: '28%', left: '16%', opacity: 0.5, transform: [{ rotate: '-16deg' }] }]} />
          <View style={[styles.royalDot, { top: '46%', left: '28%' }]} />
          <View style={[styles.royalDot, { bottom: '18%', right: '24%', width: 6, height: 6, borderRadius: 3 }]} />
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

  // PASTEL CLOUD STYLES (keeps the legacy royal key for saved capsules)
  royalCloud: { position: 'absolute', borderRadius: 999 },
  royalCloudTop: { width: 300, height: 210, top: -74, left: -58, backgroundColor: 'rgba(232, 214, 250, 0.72)' },
  royalCloudSide: { width: 240, height: 240, top: 92, right: -78, backgroundColor: 'rgba(255, 222, 235, 0.68)' },
  royalCloudBottom: { width: 420, height: 190, bottom: -86, left: -60, backgroundColor: 'rgba(218, 238, 255, 0.62)' },
  royalMoon: { position: 'absolute', top: '18%', right: '22%', width: 78, height: 78, borderRadius: 39, backgroundColor: 'rgba(255, 255, 255, 0.72)', borderWidth: 1, borderColor: 'rgba(220, 198, 246, 0.58)' },
  royalRibbon: { position: 'absolute', width: 520, height: 18, borderRadius: 999, opacity: 0.24 },
  royalRibbonOne: { top: '35%', left: -80, backgroundColor: '#B997E8', transform: [{ rotate: '-14deg' }] },
  royalRibbonTwo: { bottom: '30%', right: -120, backgroundColor: '#F0B8C8', transform: [{ rotate: '17deg' }] },
  royalSparkle: { position: 'absolute', width: 20, height: 20, borderRadius: 5, borderWidth: 1.4, borderColor: 'rgba(155, 126, 220, 0.62)', backgroundColor: 'rgba(255, 255, 255, 0.32)', transform: [{ rotate: '45deg' }] },
  royalDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(155, 126, 220, 0.42)' },

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
