import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, Share, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import { useCachedAvatarUri } from '../../services/avatarCacheService';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useCapsuleStore } from '../../store/capsuleStore';
import { useAuthStore } from '../../store/authStore';
import { runUnlockSweep } from '../../services/capsuleService';
import type { AppStackParamList } from '../../types/navigation';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { formatDate, getCountdownValues } from '../../utils/dateHelpers';
import { AnimatedDigit } from '../../components/capsule/AnimatedDigit';
import { AppIcon, PrimaryButton, cardShadow, uiShadow } from '../../components/ui/DesignPrimitives';
import { capsuleThemes, ThemeBackground } from '../../theme/capsuleThemes';
import { useTranslation } from '../../i18n';
import { createCapsuleInviteUrl } from '../../services/inviteService';

type Props = NativeStackScreenProps<AppStackParamList, 'CapsuleLocked'>;

export function CapsuleLockedScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const capsule = useCapsuleStore(s => s.capsules.find(i => i.id === route.params.capsuleId));

  const activeTheme = capsuleThemes[capsule?.theme || 'default'] || capsuleThemes.default;
  const tc = activeTheme.colors;
  const userId = useAuthStore(s => s.user?.id);
  const didNavigateToOpen = useRef(false);
  const capsuleId = capsule?.id;
  const capsuleOpenDateISO = capsule?.openDateISO;
  const capsuleStatus = capsule?.status;
  const [countdown, setCountdown] = useState(
    capsule ? getCountdownValues(capsule.openDateISO) : { days: 0, hours: 0, minutes: 0, seconds: 0, isUnlocked: true }
  );

  // ---------------------------------------------------------------------------
  // Set screen header styles dynamically
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (capsule) {
      navigation.setOptions({
        headerTitle: t('Hộp ký ức đã khóa'),
        headerTransparent: false,
        headerStyle: {
          backgroundColor: tc.background,
        },
        headerTintColor: tc.text,
        headerShadowVisible: false,
      });
    }
  }, [capsule, tc, navigation, t]);

  // ---------------------------------------------------------------------------
  // Fetch Capsule Owner Profile details
  // ---------------------------------------------------------------------------
  const user = useAuthStore(s => s.user);
  const [ownerProfile, setOwnerProfile] = useState<{ displayName?: string; avatarUrl?: string; avatarPath?: string; avatarVersion?: string; email?: string } | null>(null);
  const ownerAvatarUri = useCachedAvatarUri(ownerProfile ? {
    userId: capsule?.ownerId,
    avatarPath: ownerProfile.avatarPath,
    avatarVersion: ownerProfile.avatarVersion,
    avatarUrl: ownerProfile.avatarUrl,
  } : null);

  useEffect(() => {
    if (!capsule?.ownerId) { return; }

    if (capsule.ownerId === userId) {
      setOwnerProfile({
        displayName: 'Tôi',
        avatarUrl: user?.avatarUrl,
        avatarPath: user?.avatarPath,
        avatarVersion: user?.avatarVersion,
        email: user?.email,
      });
      return;
    }

    firestore().collection('users').doc(capsule.ownerId).get()
      .then(doc => {
        const data = doc.data();
        if (data) {
          setOwnerProfile({
            displayName: data.displayName || 'Người dùng',
            avatarUrl: data.avatarUrl,
            avatarPath: data.avatarPath,
            avatarVersion: data.avatarVersion,
            email: data.email,
          });
        }
      })
      .catch(() => {});
  }, [capsule?.ownerId, userId, user]);

  // Capsule deletion while locked is removed as per product requirements to guarantee preservation.

  const reduceMotion = useAuthStore(s => s.reduceMotion);

  // Reanimated Ổ khoá Pulse (Nhịp thở)
  const lockPulse = useSharedValue(1);

  useEffect(() => {
    const pulseScale = reduceMotion ? 1.03 : 1.08;
    const pulseDuration = reduceMotion ? 2400 : 1200;

    lockPulse.value = withRepeat(
      withSequence(
        withTiming(pulseScale, { duration: pulseDuration, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: pulseDuration, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Loop vô hạn
      true
    );
    return () => {
      cancelAnimation(lockPulse);
    };
  }, [lockPulse, reduceMotion]);

  // Đồng bộ bộ đếm ngay khi vào màn hình, rồi tự mở khi đến hạn.
  useEffect(() => {
    if (!capsuleId || !capsuleOpenDateISO) {
      return;
    }

    let timer: ReturnType<typeof setInterval> | undefined;

    const syncCountdown = () => {
      const current = getCountdownValues(capsuleOpenDateISO);
      setCountdown(current);

      if (current.isUnlocked && !didNavigateToOpen.current) {
        didNavigateToOpen.current = true;
        if (capsuleStatus === 'locked' && userId) {
          runUnlockSweep(userId).catch(() => {});
        }
        if (timer) {
          clearInterval(timer);
        }
        navigation.replace('OpenCapsule', { capsuleId });
      }
    };

    syncCountdown();
    timer = setInterval(syncCountdown, 1000);

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [capsuleId, capsuleOpenDateISO, capsuleStatus, navigation, userId]);

  const animatedLockStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: lockPulse.value }],
    };
  });

  if (!capsule) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}><Text style={[styles.title, { color: tc.text }]}>{t('Không tìm thấy hộp ký ức')}</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tc.background }}>
      <ThemeBackground themeKey={capsule.theme} />
      <StatusBar barStyle={activeTheme.statusBar} translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>

          <View style={styles.hero}>
            <View style={[styles.memoryPhoto, styles.photoOne, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]} />
            <View style={[styles.memoryPhoto, styles.photoTwo, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]} />
            <Animated.View style={[styles.lockIcon, { backgroundColor: tc.inputBg }, animatedLockStyle]}>
              <AppIcon name="lock-closed" size={34} color={tc.accent} />
            </Animated.View>
          </View>
          <Text style={[styles.lockLabel, { color: tc.primary }]}>{t('ĐANG KHÓA')}</Text>
          <Text style={[styles.title, { color: tc.text }]}>{capsule.title}</Text>
          <Text style={[styles.meta, { color: tc.mutedText }]}>{t('Mở vào:')} {formatDate(capsule.openDateISO)}</Text>
          
          {/* Owner info badge */}
          {ownerProfile && (
            <View style={[styles.ownerBadge, { backgroundColor: tc.activeChipBg, borderColor: tc.cardBorder }]}>
              {ownerAvatarUri ? (
                <Image source={{ uri: ownerAvatarUri }} style={[styles.ownerAvatar, { borderColor: tc.primary }]} />
              ) : (
                <View style={[styles.ownerAvatarTextWrap, { backgroundColor: tc.activeChipBg, borderColor: tc.primary }]}>
                  <Text style={[styles.ownerAvatarText, { color: tc.activeChipText }]}>
                    {ownerProfile.displayName?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              <Text style={[styles.ownerNameText, { color: tc.mutedText }]}>
                {t('Tạo bởi:')} <Text style={{ color: tc.text, fontWeight: '700' }}>{ownerProfile.displayName || t('Thành viên')}</Text>
              </Text>
            </View>
          )}
          
          {/* Bộ đếm ngược 4 cột cao cấp */}
          <View style={styles.countdownGrid}>
            <View style={[styles.timeCard, { backgroundColor: tc.cardBg, shadowColor: tc.primary, borderColor: tc.cardBorder }]}>
              <View style={styles.digitRow}>
                <AnimatedDigit value={Math.floor(countdown.days / 10)} color={tc.primary} />
                <AnimatedDigit value={countdown.days % 10} color={tc.primary} />
              </View>
              <Text style={[styles.timeLbl, { color: tc.mutedText }]}>{t('Ngày')}</Text>
            </View>
            <View style={[styles.timeCard, { backgroundColor: tc.cardBg, shadowColor: tc.primary, borderColor: tc.cardBorder }]}>
              <View style={styles.digitRow}>
                <AnimatedDigit value={Math.floor(countdown.hours / 10)} color={tc.primary} />
                <AnimatedDigit value={countdown.hours % 10} color={tc.primary} />
              </View>
              <Text style={[styles.timeLbl, { color: tc.mutedText }]}>{t('Giờ')}</Text>
            </View>
            <View style={[styles.timeCard, { backgroundColor: tc.cardBg, shadowColor: tc.primary, borderColor: tc.cardBorder }]}>
              <View style={styles.digitRow}>
                <AnimatedDigit value={Math.floor(countdown.minutes / 10)} color={tc.primary} />
                <AnimatedDigit value={countdown.minutes % 10} color={tc.primary} />
              </View>
              <Text style={[styles.timeLbl, { color: tc.mutedText }]}>{t('Phút')}</Text>
            </View>
            <View style={[styles.timeCard, { backgroundColor: tc.cardBg, shadowColor: tc.primary, borderColor: tc.cardBorder }]}>
              <View style={styles.digitRow}>
                <AnimatedDigit value={Math.floor(countdown.seconds / 10)} color={tc.primary} />
                <AnimatedDigit value={countdown.seconds % 10} color={tc.primary} />
              </View>
              <Text style={[styles.timeLbl, { color: tc.mutedText }]}>{t('Giây')}</Text>
            </View>
          </View>

          <PrimaryButton label={t('Chia sẻ liên kết mời')} iconName="share-social-outline"
            onPress={() => Share.share({ message: `Tham gia hộp ký ức: ${createCapsuleInviteUrl(capsule.shareToken || '')}` }).catch(() => {})}
            disabled={!capsule.shareToken}
            style={[styles.shareButton, { backgroundColor: tc.buttonBg }]} />

          <Pressable style={[styles.button, { borderColor: tc.cardBorder }]} onPress={() => navigation.goBack()}>
            <Text style={[styles.buttonLabel, { color: tc.text }]}>{t('Về trang trước')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (colors: ThemeColors, _isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'transparent' },
    container: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', padding: 20, paddingTop: 16 },
    hero: { width: 260, height: 180, alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 8 },
    memoryPhoto: { position: 'absolute', borderRadius: 16, borderWidth: 1, ...cardShadow },
    photoOne: { width: 100, height: 120, left: 24, top: 12, transform: [{ rotate: '-8deg' }] },
    photoTwo: { width: 120, height: 140, right: 18, top: 24, transform: [{ rotate: '8deg' }] },
    lockIcon: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center', ...uiShadow },
    lockLabel: { fontWeight: '700', letterSpacing: 1 },
    title: { marginTop: 18, fontSize: 24, fontWeight: '700', textAlign: 'center' },
    meta: { marginTop: 8, fontSize: 14 },
    countdownGrid: {
      marginTop: 24,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      width: '100%',
    },
    timeCard: {
      borderRadius: 14,
      width: 72,
      height: 68,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    digitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeVal: {
      fontSize: 26,
      fontWeight: '700',
    },
    timeLbl: {
      fontSize: 10,
      marginTop: 2,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    button: { marginTop: 12, borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
    buttonLabel: { fontWeight: '600' },
    shareButton: { marginTop: 20, minWidth: '92%' },
    deleteButton: { marginTop: 12, backgroundColor: colors.danger },
    ownerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    ownerAvatar: {
      width: 20,
      height: 20,
      borderRadius: 10,
      marginRight: 6,
      borderWidth: 1,
    },
    ownerAvatarTextWrap: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
      borderWidth: 1,
    },
    ownerAvatarText: {
      fontSize: 10,
      fontWeight: '800',
    },
    ownerNameText: {
      fontSize: 11,
    },
  });
