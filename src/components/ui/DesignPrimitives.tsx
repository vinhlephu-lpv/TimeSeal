import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../theme/colors';

type SoftScreenProps = {
  children: React.ReactNode;
  variant?: 'light' | 'dark' | 'warm' | 'info' | 'teal';
  style?: StyleProp<ViewStyle>;
};

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
  iconName?: string;
  style?: StyleProp<ViewStyle>;
};

type PolishedInputProps = TextInputProps & {
  iconName?: string;
  error?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

type StepDotsProps = {
  total: number;
  active: number;
};

export function SoftScreen({ children, variant = 'light', style }: SoftScreenProps) {
  const dark = variant === 'dark';
  return (
    <View style={[styles.screen, dark && styles.darkScreen, style]}>
      <StatusBar
        barStyle={dark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View
          style={[
            styles.blob,
            styles.topBlob,
            variant === 'warm' && styles.warmBlob,
            variant === 'info' && styles.infoBlob,
            variant === 'teal' && styles.tealBlob,
            dark && styles.darkPurpleBlob,
          ]}
        />
        <View
          style={[
            styles.blob,
            styles.centerBlob,
            variant === 'warm' && styles.tealBlob,
            variant === 'info' && styles.warmBlob,
            variant === 'teal' && styles.lavenderBlob,
            dark && styles.darkPurpleBlob,
          ]}
        />
        <View
          style={[
            styles.blob,
            styles.sideBlob,
            variant === 'warm' && styles.lavenderBlob,
            variant === 'info' && styles.lavenderBlob,
            variant === 'teal' && styles.infoBlob,
            dark && styles.darkAmberBlob,
          ]}
        />
        <View style={[styles.blob, styles.bottomBlob, dark && styles.darkBottomBlob]} />
      </View>
      {children}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  iconName,
  style,
}: PrimaryButtonProps) {
  const outline = variant === 'outline';
  const danger = variant === 'danger';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        outline && styles.outlineButton,
        danger && styles.dangerButton,
        disabled && styles.disabledButton,
        style,
      ]}>
      {iconName ? (
        <AppIcon
          name={iconName}
          size={18}
          color={outline ? colors.primary : '#FFFFFF'}
          style={styles.buttonIcon}
        />
      ) : null}
      <Text style={[styles.buttonLabel, outline && styles.outlineButtonLabel]}>{label}</Text>
    </Pressable>
  );
}

export function PolishedInput({
  iconName,
  error,
  style,
  containerStyle,
  placeholderTextColor = colors.mutedText,
  ...props
}: PolishedInputProps) {
  return (
    <View style={[styles.inputWrap, error && styles.inputWrapError, containerStyle]}>
      {iconName ? <AppIcon name={iconName} size={18} color={colors.mutedText} /> : null}
      <TextInput
        {...props}
        placeholderTextColor={placeholderTextColor}
        style={[styles.input, style]}
      />
    </View>
  );
}

export function ElevatedCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.elevatedCard, style]}>{children}</View>;
}

export function StepDots({ total, active }: StepDotsProps) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, index) => (
        <View key={index} style={[styles.dot, index === active && styles.activeDot]} />
      ))}
    </View>
  );
}

export function MemoryIllustration({ variant = 'photo' }: { variant?: 'photo' | 'lock' | 'envelope' }) {
  if (variant === 'lock') {
    return (
      <View style={styles.illustration}>
        <View style={styles.lockShackle} />
        <View style={styles.lockBody}>
          <View style={styles.keyhole} />
        </View>
      </View>
    );
  }

  if (variant === 'envelope') {
    return (
      <View style={styles.illustration}>
        <View style={styles.letter} />
        <View style={styles.envelope}>
          <AppIcon name="heart" size={34} color={colors.coral} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.illustration}>
      <View style={[styles.photoCard, styles.photoBack]} />
      <View style={styles.photoCard}>
        <View style={styles.sun} />
        <View style={styles.memoryLine} />
        <View style={[styles.memoryLine, styles.shortLine]} />
      </View>
    </View>
  );
}

export function AppIcon({
  name,
  size = 18,
  color = colors.text,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const ionName = ioniconsMap[name] || name;
  return <Icon name={ionName} size={size} color={color} style={style} />;
}

export function SectionTitle({
  children,
  tone = 'success',
  style,
}: {
  children: React.ReactNode;
  tone?: 'success' | 'muted' | 'warning' | 'info';
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[
        styles.sectionTitle,
        tone === 'muted' && styles.sectionTitleMuted,
        tone === 'warning' && styles.sectionTitleWarning,
        tone === 'info' && styles.sectionTitleInfo,
        style,
      ]}>
      {children}
    </Text>
  );
}

export const uiShadow = {
  shadowColor: colors.primary,
  shadowOpacity: 0.18,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 5,
};

export const cardShadow = {
  shadowColor: colors.black,
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

/** Maps short icon names used across the app to actual Ionicons glyph names */
const ioniconsMap: Record<string, string> = {
  add: 'add',
  'arrow-forward-outline': 'arrow-forward-outline',
  'chevron-forward': 'chevron-forward',
  'compass-outline': 'compass-outline',
  'cube-outline': 'cube-outline',
  cube: 'cube',
  'diamond-outline': 'diamond-outline',
  'download-outline': 'download-outline',
  heart: 'heart',
  home: 'home',
  hourglass: 'hourglass-outline',
  'images-outline': 'images-outline',
  'lock-closed': 'lock-closed',
  'lock-closed-outline': 'lock-closed-outline',
  'logo-google': 'logo-google',
  'mail-open': 'mail-open-outline',
  'mail-outline': 'mail-outline',
  'notifications-outline': 'notifications-outline',
  person: 'person',
  'person-outline': 'person-outline',
  compass: 'compass-outline',
  'settings-outline': 'settings-outline',
  'share-social-outline': 'share-social-outline',
  'shield-checkmark-outline': 'shield-checkmark-outline',
  sparkles: 'sparkles',
  'sparkles-outline': 'sparkles-outline',
  'camera-outline': 'camera-outline',
  'image-outline': 'image-outline',
  'trash-outline': 'trash-outline',
  'close-outline': 'close-outline',
  'close': 'close',
  'calendar-outline': 'calendar-outline',
  'time-outline': 'time-outline',
  'people-outline': 'people-outline',
  'log-out-outline': 'log-out-outline',
  'moon-outline': 'moon-outline',
  'document-text-outline': 'document-text-outline',
  'chevron-back': 'chevron-back',
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceTint,
    overflow: 'hidden',
  },
  darkScreen: {
    backgroundColor: colors.ink,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  topBlob: {
    width: 270,
    height: 230,
    left: -84,
    top: -92,
    backgroundColor: colors.primarySoft,
  },
  centerBlob: {
    width: 240,
    height: 240,
    left: -120,
    top: '38%',
    backgroundColor: colors.lavenderWash,
    opacity: 0.6,
  },
  sideBlob: {
    width: 180,
    height: 170,
    right: -62,
    top: 110,
    backgroundColor: colors.coralSoft,
  },
  bottomBlob: {
    width: 540,
    height: 240,
    left: -75,
    bottom: -125,
    backgroundColor: colors.lavenderWash,
  },
  warmBlob: {
    backgroundColor: colors.warmSoft,
  },
  lavenderBlob: {
    backgroundColor: colors.primarySoft,
  },
  infoBlob: {
    backgroundColor: colors.infoLight,
  },
  tealBlob: {
    backgroundColor: colors.tealSoft,
  },
  darkPurpleBlob: {
    backgroundColor: '#2D276F',
  },
  darkAmberBlob: {
    backgroundColor: '#3A2A20',
  },
  darkBottomBlob: {
    backgroundColor: '#17172A',
  },
  button: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 18,
    ...uiShadow,
  },
  outlineButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  dangerButton: {
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  outlineButtonLabel: {
    color: colors.primary,
  },
  inputWrap: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: colors.softBorder,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 0,
    marginLeft: 8,
  },
  elevatedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    padding: 16,
    ...cardShadow,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryPale,
  },
  activeDot: {
    width: 20,
    backgroundColor: colors.primary,
  },
  illustration: {
    width: 260,
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCard: {
    width: 138,
    height: 172,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.softBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  photoBack: {
    position: 'absolute',
    left: 46,
    top: 64,
    transform: [{ rotate: '-10deg' }],
    opacity: 0.9,
  },
  sun: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.warning,
    marginBottom: 36,
  },
  memoryLine: {
    width: 92,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primaryPale,
    marginBottom: 10,
  },
  shortLine: {
    width: 58,
    backgroundColor: colors.coralSoft,
  },
  lockShackle: {
    position: 'absolute',
    top: 38,
    width: 76,
    height: 92,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  lockBody: {
    width: 142,
    height: 118,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.softBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 70,
    ...cardShadow,
  },
  keyhole: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  letter: {
    position: 'absolute',
    top: 44,
    width: 150,
    height: 104,
    borderRadius: 18,
    backgroundColor: colors.warmSoft,
  },
  envelope: {
    width: 220,
    height: 126,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: '#FFE0BD',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 70,
    shadowColor: colors.warning,
    shadowOpacity: 0.14,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  sectionTitle: {
    color: colors.success,
    fontSize: 13,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 0,
  },
  sectionTitleMuted: {
    color: colors.mutedText,
  },
  sectionTitleWarning: {
    color: colors.warningDark,
  },
  sectionTitleInfo: {
    color: colors.info,
  },
});
