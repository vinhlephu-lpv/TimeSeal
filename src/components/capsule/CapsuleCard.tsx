import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Capsule } from '../../types/models';
import { colors } from '../../theme/colors';
import { formatDate, getCountdownLabel } from '../../utils/dateHelpers';
import { AppIcon, cardShadow } from '../ui/DesignPrimitives';
import { useAuthStore } from '../../store/authStore';

type CapsuleCardProps = {
  capsule: Capsule;
  onPress?: () => void;
};

function getAvatarStyle(text: string) {
  const list = [
    { bg: '#EBF8FF', text: '#2B6CB0' }, // Blue
    { bg: '#FEFCBF', text: '#975A16' }, // Yellow
    { bg: '#E6FFFA', text: '#234E52' }, // Teal
    { bg: '#FFF5F5', text: '#9B2C2C' }, // Red
    { bg: '#F3E8FF', text: '#6B46C1' }, // Purple
    { bg: '#FFFAF0', text: '#DD6B20' }, // Orange
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
  const avatarTheme = getAvatarStyle(capsule.title);
  const user = useAuthStore(state => state.user);
  const isOwner = capsule.ownerId === user?.id;
  const creatorAvatar = isOwner ? user?.avatarUrl : undefined;

  return (
    <Pressable style={[styles.card, isUnlocked && styles.unlockedCard]} onPress={onPress}>
      <View style={[styles.cover, isLocked && styles.lockedCover]}>
        <View style={styles.coverSun} />
        <AppIcon
          name={isLocked ? 'lock-closed' : isUnlocked ? 'sparkles' : 'cube'}
          size={22}
          color={isUnlocked ? colors.warning : colors.primary}
        />
        
        {/* Avatar overlay inside cover */}
        {capsule.type === 'personal' ? (
          <View style={styles.avatarOverlay}>
            {creatorAvatar ? (
              <Image source={{ uri: creatorAvatar }} style={styles.avatarOverlayImage} />
            ) : (
              <View style={[styles.avatarOverlayTextWrap, { backgroundColor: avatarTheme.bg }]}>
                <Text style={[styles.avatarText, { color: avatarTheme.text }]}>
                  {capsule.title.trim().charAt(0).toUpperCase() || 'C'}
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
                <View style={[styles.miniAvatarTextWrap, { backgroundColor: getAvatarStyle(capsule.title + '1').bg }]}>
                  <Text style={[styles.miniAvatarText, { color: getAvatarStyle(capsule.title + '1').text }]}>
                    {capsule.title.trim().charAt(0).toUpperCase() || 'G'}
                  </Text>
                </View>
              )}
            </View>
            <View style={[styles.miniAvatar, styles.miniAvatar2, { backgroundColor: getAvatarStyle(capsule.title + '2').bg }]}>
              <Text style={[styles.miniAvatarText, { color: getAvatarStyle(capsule.title + '2').text }]}>
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
        <View style={styles.tag}>
          <Text style={styles.tagLabel}>
            {capsule.type === 'group' ? '👥 Nhóm' : '👤 Cá nhân'}
          </Text>
        </View>
      </View>
      <AppIcon
        name={isLocked ? 'lock-closed-outline' : 'chevron-forward'}
        size={18}
        color={isUnlocked ? colors.warning : colors.mutedText}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, minHeight: 120, marginBottom: 12, ...cardShadow },
  unlockedCard: { borderColor: colors.warning, borderWidth: 2 },
  cover: { width: 90, height: 90, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  lockedCover: { backgroundColor: '#E9E6FF' },
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
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
