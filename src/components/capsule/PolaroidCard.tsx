import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { Capsule } from '../../types/models';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeStyle } from '../../theme/capsuleThemes';
import { formatDate } from '../../utils/dateHelpers';
import { AppIcon, cardShadow } from '../ui/DesignPrimitives';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../i18n';
import {
  getCachedCapsuleSharpThumbnail,
  subscribeCachedCapsuleSharpThumbnail,
} from '../../services/thumbnailCacheService';
import { getCapsuleThumbnailUrls } from '../../services/backendService';
import { type AvatarReference, useCachedAvatarUri } from '../../services/avatarCacheService';

type PolaroidCardProps = {
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

export function PolaroidCard({ capsule, onPress }: PolaroidCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const themeStyle = getThemeStyle(capsule.theme);
  const user = useAuthStore(state => state.user);
  const isOwner = capsule.ownerId === user?.id;
  const [creatorAvatarRef, setCreatorAvatarRef] = React.useState<AvatarReference>(isOwner ? {
    userId: user?.id,
    avatarPath: user?.avatarPath,
    avatarVersion: user?.avatarVersion,
    avatarUrl: user?.avatarUrl,
  } : null);
  const creatorAvatar = useCachedAvatarUri(creatorAvatarRef);
  const [creatorName, setCreatorName] = React.useState<string | undefined>(isOwner ? 'Tôi' : undefined);
  const [sharpThumbnailUri, setSharpThumbnailUri] = React.useState<string | null>(null);
  const [previewThumbnailUri, setPreviewThumbnailUri] = React.useState<string | null>(null);

  useEffect(() => {
    if (isOwner) {
      setCreatorAvatarRef({
        userId: user?.id,
        avatarPath: user?.avatarPath,
        avatarVersion: user?.avatarVersion,
        avatarUrl: user?.avatarUrl,
      });
      setCreatorName('Tôi');
      return;
    }

    import('@react-native-firebase/firestore').then(({ default: firestore }) => {
      firestore().collection('users').doc(capsule.ownerId).get()
        .then(doc => {
          const data = doc.data();
          if (data) {
            setCreatorAvatarRef({
              userId: capsule.ownerId,
              avatarPath: data.avatarPath,
              avatarVersion: data.avatarVersion,
              avatarUrl: data.avatarUrl,
            });
            setCreatorName(data.displayName || 'Người dùng');
          }
        })
        .catch(() => {});
    });
  }, [capsule.ownerId, isOwner, user?.avatarPath, user?.avatarUrl, user?.avatarVersion, user?.id]);

  useEffect(() => {
    let active = true;
    getCachedCapsuleSharpThumbnail(capsule.id)
      .then(uri => {
        if (active) {
          setSharpThumbnailUri(uri);
        }
      })
      .catch(() => {});

    const unsubscribe = subscribeCachedCapsuleSharpThumbnail(capsule.id, uri => {
      if (active) {
        setSharpThumbnailUri(uri);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [capsule.id]);

  useEffect(() => {
    let active = true;
    getCapsuleThumbnailUrls(capsule.id)
      .then(urls => {
        if (active) {
          setPreviewThumbnailUri(urls[0] || null);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [capsule.id]);

  // Reanimated Touch animation
  const scale = useSharedValue(1);
  const reduceMotion = useAuthStore(state => state.reduceMotion);

  const onPressIn = () => {
    if (reduceMotion) {
      scale.value = withTiming(0.97, { duration: 100 });
    } else {
      scale.value = withSpring(0.95, { damping: 12, stiffness: 150 });
    }
  };

  const onPressOut = () => {
    if (reduceMotion) {
      scale.value = withTiming(1.0, { duration: 100 });
    } else {
      scale.value = withSpring(1.0, { damping: 12, stiffness: 150 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Check if capsule contains images
  // Never load full-size remote media from Home. Use the persistent local cover
  // only after Detail recorded quota, otherwise keep the lightweight thumbnail.
  const imageUrl = sharpThumbnailUri || previewThumbnailUri;

  return (
    <AnimatedPressable
      style={[styles.polaroidContainer, animatedStyle]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      {/* Polaroid Image Wrapper */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.gradientPlaceholder, { backgroundColor: themeStyle.coverBg }]}>
            <AppIcon name={themeStyle.iconName} size={30} color={themeStyle.iconColor} />
          </View>
        )}

        {/* Frosted Glass Overlay */}
        <View style={styles.frostedOverlay}>
          <View style={styles.shineBeam} />
          <View style={styles.glassBadge}>
            <AppIcon name="lock-open" size={13} color="#FFFFFF" />
            <Text style={styles.glassBadgeText}>{t('Đã mở')}</Text>
          </View>
        </View>
      </View>

      {/* Polaroid bottom metadata area */}
      <View style={styles.metaArea}>
        <Text style={styles.title} numberOfLines={1}>
          {capsule.title}
        </Text>
        <Text style={styles.dateText} numberOfLines={1}>
          {t('Mở vào')} {formatDate(capsule.openDateISO)}
        </Text>

        {/* Creator avatar badge */}
        <View style={styles.creatorRow}>
          <View style={[styles.tag, { flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
            <AppIcon
              name={capsule.type === 'group' ? 'people-outline' : 'person-outline'}
              size={10}
              color={colors.primary}
            />
            <Text style={styles.tagLabel}>
              {t(capsule.type === 'group' ? 'Nhóm' : 'Cá nhân')}
            </Text>
          </View>

          {/* Avatar */}
          {creatorAvatar ? (
            <Image source={{ uri: creatorAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarTextWrap, { backgroundColor: getAvatarStyle(creatorName || capsule.title, isDark).bg }]}>
              <Text style={[styles.avatarText, { color: getAvatarStyle(creatorName || capsule.title, isDark).text }]}>
                {creatorName?.trim().charAt(0).toUpperCase() || capsule.title.trim().charAt(0).toUpperCase() || 'C'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  polaroidContainer: {
    backgroundColor: isDark ? '#1C1C28' : '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(139, 127, 232, 0.15)' : 'rgba(83, 74, 183, 0.12)',
    padding: 10,
    paddingBottom: 14,
    marginBottom: 12,
    ...cardShadow,
    shadowColor: isDark ? '#000000' : '#534AB7',
    shadowOpacity: isDark ? 0.3 : 0.08,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: isDark ? '#121218' : '#FAF9F6',
    borderWidth: 1,
    borderColor: isDark ? '#2E2B4A' : '#EEEAFD',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  gradientPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
  frostedOverlay: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: isDark ? 'rgba(10, 10, 16, 0.25)' : 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 8,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 8,
  },
  shineBeam: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    transform: [{ rotate: '-15deg' }, { translateY: -15 }, { scaleX: 1.5 }],
  },
  glassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  glassBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaArea: {
    marginTop: 10,
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  dateText: {
    fontSize: 11,
    color: colors.mutedText,
    marginTop: 3,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  tag: {
    borderRadius: 99,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagLabel: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  avatarTextWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  avatarText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
