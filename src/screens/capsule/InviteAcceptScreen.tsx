import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import type { AppStackParamList } from '../../types/navigation';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { formatDate } from '../../utils/dateHelpers';
import { AppIcon, ElevatedCard, PrimaryButton, SoftScreen } from '../../components/ui/DesignPrimitives';
import { useTranslation } from '../../i18n';
import { acceptCapsuleInvite, getInvitePreview } from '../../services/backendService';
import { useCapsuleStore } from '../../store/capsuleStore';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type Props = NativeStackScreenProps<AppStackParamList, 'InviteAccept'>;

export function InviteAcceptScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const [title, setTitle] = useState(t('Đang tải hộp ký ức...'));
  const [openDateISO, setOpenDateISO] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const syncCapsule = useCapsuleStore(s => s.syncCapsule);
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // Animation values for premium entry & breathing glow
  const glowScale = useSharedValue(1);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);

  useEffect(() => {
    getInvitePreview(route.params.inviteCode)
      .then(preview => {
        setTitle(preview.title || t('Hộp ký ức'));
        setOpenDateISO(preview.openDateISO);
      })
      .catch(() => setTitle(t('Không tìm thấy hộp ký ức')));

    // Breathing glow animation
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Fade-in & slide-up entry animation
    contentOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    contentTranslateY.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [route.params.inviteCode, t]);

  const joinCapsule = async () => {
    if (!user?.id) {
      setMessage(t('Bạn cần đăng nhập để tham gia hộp ký ức.'));
      return;
    }
    setLoading(true);
    try {
      const result = await acceptCapsuleInvite(route.params.inviteCode);
      await syncCapsule(result.capsuleId).catch(() => null);
      setMessage(t('Tham gia hộp ký ức thành công!'));
      navigation.replace('CapsuleLocked', { capsuleId: result.capsuleId });
    } catch {
      setMessage(t('Không thể tham gia hộp ký ức lúc này.'));
    } finally {
      setLoading(false);
    }
  };

  // Animated styles
  const outerGlowStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  const outerGlowStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + (glowScale.value - 1) * 0.7 }],
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <SoftScreen>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Animated.View style={[styles.cardContainer, animatedContentStyle]}>
            <ElevatedCard style={styles.card}>
              {/* Pulsing glow vector ring for invitation */}
              <View style={styles.illustrationWrapper}>
                <Animated.View style={[styles.glowRing1, outerGlowStyle1, { backgroundColor: colors.primarySoft, opacity: 0.15 }]} />
                <Animated.View style={[styles.glowRing2, outerGlowStyle2, { backgroundColor: colors.primarySoft, opacity: 0.3 }]} />
                <View style={[styles.iconWrap, { backgroundColor: colors.card, borderColor: colors.softBorder, borderWidth: 1 }]}>
                  <AppIcon name="mail-open" size={36} color={colors.primary} />
                </View>
              </View>

              <Text style={styles.kicker}>{t('Lời mời tham gia hộp ký ức')}</Text>
              
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>

              {/* Open date badge */}
              {openDateISO ? (
                <View style={[styles.badge, { backgroundColor: colors.primarySoft + '1A', borderColor: colors.primarySoft + '50' }]}>
                  <AppIcon name="calendar-outline" size={14} color={colors.primary} />
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {t('Mở vào')} {formatDate(openDateISO)}
                  </Text>
                </View>
              ) : null}

              {/* Code badge */}
              <View style={[styles.codeBadge, { backgroundColor: isDark ? '#2E2D38' : '#F5F5FA', borderColor: colors.softBorder }]}>
                <AppIcon name="cube-outline" size={14} color={colors.mutedText} />
                <Text style={styles.codeLabel}>{t('Mã mời:')}</Text>
                <Text style={styles.codeText}>{route.params.inviteCode}</Text>
              </View>

              {/* Vector status alerts */}
              {message ? (
                <View style={[
                  styles.statusBox, 
                  { 
                    backgroundColor: message.includes('thành công') ? colors.success + '1A' : colors.danger + '1A',
                    borderColor: message.includes('thành công') ? colors.success + '40' : colors.danger + '40'
                  }
                ]}>
                  <AppIcon 
                    name={message.includes('thành công') ? 'checkmark-circle-outline' : 'alert-circle-outline'} 
                    size={16} 
                    color={message.includes('thành công') ? colors.success : colors.danger} 
                  />
                  <Text style={[styles.statusText, { color: message.includes('thành công') ? colors.success : colors.danger }]}>
                    {message}
                  </Text>
                </View>
              ) : null}

              <PrimaryButton 
                label={t(loading ? 'Đang xử lý...' : 'Tham gia')}
                iconName="arrow-forward-outline"
                onPress={joinCapsule}
                disabled={loading || title === t('Không tìm thấy hộp ký ức')}
                style={styles.button}
              />

              <Pressable onPress={() => navigation.goBack()}>
                <Text style={styles.backLabel}>{t('Nhập mã khác')}</Text>
              </Pressable>
            </ElevatedCard>
          </Animated.View>
        </View>
      </SafeAreaView>
    </SoftScreen>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: 'transparent' 
  },
  container: { 
    flex: 1, 
    padding: 24, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cardContainer: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  card: { 
    alignSelf: 'stretch',
    alignItems: 'center', 
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: colors.softBorder,
    backgroundColor: colors.card,
  },
  illustrationWrapper: {
    width: 140,
    height: 140,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  glowRing1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  glowRing2: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  iconWrap: { 
    width: 80, 
    height: 80, 
    borderRadius: 28, 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  kicker: { 
    color: colors.primary, 
    fontSize: 12, 
    fontWeight: '800', 
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: { 
    marginTop: 12, 
    color: colors.text, 
    fontSize: 24, 
    fontWeight: '800', 
    textAlign: 'center',
    lineHeight: 30,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'center',
  },
  codeLabel: {
    fontSize: 12,
    color: colors.mutedText,
    fontWeight: '500',
  },
  codeText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'stretch',
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  button: { 
    alignSelf: 'stretch', 
    marginTop: 24 
  },
  backLabel: { 
    marginTop: 18, 
    color: colors.primary, 
    fontWeight: '700',
    fontSize: 14,
  },
});

