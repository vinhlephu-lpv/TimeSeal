import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  interpolateColor,
} from 'react-native-reanimated';
import type { Capsule } from '../../types/models';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { getThemeStyle } from '../../theme/capsuleThemes';
import { formatDate, getCountdownLabel } from '../../utils/dateHelpers';
import { AppIcon, cardShadow } from '../ui/DesignPrimitives';
import { ThemeDecoration } from './ThemeDecorations';
import { useAuthStore } from '../../store/authStore';

type CapsuleCardProps = {
  capsule: Capsule;
  onPress?: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function getAvatarStyle(text: string, isDark: boolean) {
  const list = isDark ? [
    { bg: '#1A365D', text: '#90CDF4' },
    { bg: '#5F370E', text: '#FEEBC8' },
    { bg: '#14532D', text: '#A7F3D0' },
    { bg: '#742A2A', text: '#FED7D7' },
    { bg: '#4C1D95', text: '#E9D5FF' },
    { bg: '#7B341E', text: '#FFEDD5' },
  ] : [
    { bg: '#EBF8FF', text: '#2B6CB0' },
    { bg: '#FEFCBF', text: '#975A16' },
    { bg: '#E6FFFA', text: '#234E52' },
    { bg: '#FFF5F5', text: '#9B2C2C' },
    { bg: '#F3E8FF', text: '#6B46C1' },
    { bg: '#FFFAF0', text: '#DD6B20' },
  ];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % list.length;
  return list[index];
}

export function CapsuleCard({ capsule, onPress }: CapsuleCardProps) {
  const isLocked = capsule.status === 'locked';
  const isUnlocked = capsule.status === 'unlocked';
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const themeStyle = getThemeStyle(capsule.theme);
  const user = useAuthStore(state => state.user);
  const isOwner = capsule.ownerId === user?.id;
  const [creatorAvatar, setCreatorAvatar] = React.useState<string | undefined>(isOwner ? user?.avatarUrl : undefined);
  const [creatorName, setCreatorName] = React.useState<string | undefined>(isOwner ? 'Tôi' : undefined);

  useEffect(() => {
    if (isOwner) {
      setCreatorAvatar(user?.avatarUrl);
      setCreatorName('Tôi');
      return;
    }

    import('@react-native-firebase/firestore').then(({ default: firestore }) => {
      firestore().collection('users').doc(capsule.ownerId).get()
        .then(doc => {
          const data = doc.data();
          if (data) {
            if (data.avatarUrl) setCreatorAvatar(data.avatarUrl);
            setCreatorName(data.displayName || 'Người dùng');
          }
        })
        .catch(() => {});
    });
  }, [capsule.ownerId, isOwner, user?.avatarUrl]);

  // Reanimated Scale chạm nảy
  const scale = useSharedValue(1);

  // Reanimated viền phát sáng (Breathing pulsing border glow)
  const borderPulse = useSharedValue(0);

  const reduceMotion = useAuthStore(state => state.reduceMotion);

  useEffect(() => {
    if (isUnlocked && !reduceMotion) {
      borderPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200 }),
          withTiming(0, { duration: 1200 })
        ),
        -1, // Loop vô hạn
        true
      );
    } else {
      cancelAnimation(borderPulse);
      borderPulse.value = isUnlocked ? 0.5 : 0;
    }
    return () => {
      cancelAnimation(borderPulse);
    };
  }, [borderPulse, isUnlocked, reduceMotion]);

  const onPressIn = () => {
    if (reduceMotion) {
      scale.value = withTiming(0.98, { duration: 100 });
    } else {
      scale.value = withSpring(0.96, { damping: 10, stiffness: 120 });
    }
  };

  const onPressOut = () => {
    if (reduceMotion) {
      scale.value = withTiming(1.0, { duration: 100 });
    } else {
      scale.value = withSpring(1.0, { damping: 10, stiffness: 120 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      borderPulse.value,
      [0, 1],
      [colors.warning, '#FFEED3'] // Pulsing viền màu cam ấm sang màu nhũ nhạt
    );

    return {
      transform: [{ scale: scale.value }],
      borderColor: isUnlocked ? borderColor : colors.primarySoft,
      borderWidth: isUnlocked ? 2 : 1,
    };
  });

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <View style={[
        styles.cover,
        isLocked && styles.lockedCover,
        { backgroundColor: themeStyle.coverBg },
      ]}>
        <View style={[styles.coverSun, { backgroundColor: themeStyle.detailAccent }]} />
        <AppIcon
          name={isLocked ? 'lock-closed' : isUnlocked ? 'sparkles' : themeStyle.iconName}
          size={22}
          color={isUnlocked ? colors.warning : themeStyle.iconColor}
        />
        {/* Theme decoration overlay */}
        <ThemeDecoration pattern={themeStyle.cardPattern} compact />
        
        {/* Avatar overlay inside cover */}
        {capsule.type === 'personal' ? (
          <View style={styles.avatarOverlay}>
            {creatorAvatar ? (
              <Image source={{ uri: creatorAvatar }} style={styles.avatarOverlayImage} />
            ) : (
              <View style={[styles.avatarOverlayTextWrap, { backgroundColor: getAvatarStyle(creatorName || capsule.title, isDark).bg }]}>
                <Text style={[styles.avatarText, { color: getAvatarStyle(creatorName || capsule.title, isDark).text }]}>
                  {creatorName?.trim().charAt(0).toUpperCase() || capsule.title.trim().charAt(0).toUpperCase() || 'C'}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.groupAvatarContainer}>
            <View style={[styles.miniAvatar, styles.miniAvatar1]}>
              {creatorAvatar ? (
                <Image source={{ uri: creatorAvatar }} style={styles.miniAvatarImage} />
              ) : (
                <View style={[styles.miniAvatarTextWrap, { backgroundColor: getAvatarStyle((creatorName || capsule.title) + '1', isDark).bg }]}>
                  <Text style={[styles.miniAvatarText, { color: getAvatarStyle((creatorName || capsule.title) + '1', isDark).text }]}>
                    {creatorName?.trim().charAt(0).toUpperCase() || capsule.title.trim().charAt(0).toUpperCase() || 'G'}
                  </Text>
                </View>
              )}
            </View>
            <View style={[styles.miniAvatar, styles.miniAvatar2, { backgroundColor: getAvatarStyle(capsule.title + '2', isDark).bg }]}>
              <Text style={[styles.miniAvatarText, { color: getAvatarStyle(capsule.title + '2', isDark).text }]}>
                U
              </Text>
            </View>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{capsule.title}</Text>
        <Text style={styles.meta}>Mở vào {formatDate(capsule.openDateISO)}</Text>
        <Text style={styles.meta}>
          {isLocked ? getCountdownLabel(capsule.openDateISO) : 'Có thể mở ngay'}
        </Text>
        <View style={[styles.tag, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
          <AppIcon
            name={capsule.type === 'group' ? 'people-outline' : 'person-outline'}
            size={12}
            color={colors.primary}
          />
          <Text style={styles.tagLabel}>
            {capsule.type === 'group' ? 'Nhóm' : 'Cá nhân'}
          </Text>
        </View>
      </View>
      <AppIcon
        name={isLocked ? 'lock-closed-outline' : 'chevron-forward'}
        size={18}
        color={isUnlocked ? colors.warning : colors.mutedText}
      />
    </AnimatedPressable>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, minHeight: 120, marginBottom: 12, ...cardShadow },
  unlockedCard: { borderColor: colors.warning, borderWidth: 2 },
  cover: { width: 90, height: 90, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 1.2, borderColor: colors.primarySoft },
  lockedCover: { backgroundColor: isDark ? colors.primarySoft : '#E9E6FF' },
  coverSun: { position: 'absolute', width: 34, height: 34, borderRadius: 17, top: 13, right: 12, backgroundColor: colors.warning, opacity: 0.35 },
  content: { flex: 1 },
  title: { color: colors.text, fontSize: 16, fontWeight: '600' },
  meta: { marginTop: 4, color: colors.mutedText, fontSize: 13 },
  tag: { marginTop: 10, alignSelf: 'flex-start', borderRadius: 999, backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 5 },
  tagLabel: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  avatarOverlay: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: 'hidden',
  },
  avatarOverlayImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarOverlayTextWrap: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  groupAvatarContainer: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    flexDirection: 'row',
    width: 44,
    height: 28,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: 'hidden',
  },
  miniAvatarImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  miniAvatarTextWrap: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatar1: {
    right: 12,
    zIndex: 1,
  },
  miniAvatar2: {
    right: 0,
    zIndex: 2,
  },
  miniAvatarText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
