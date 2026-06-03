import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PolishedAlert } from '../../store/alertStore';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useCapsuleStore } from '../../store/capsuleStore';
import { useAuthStore } from '../../store/authStore';
import { PremiumModal } from '../../components/modals/PremiumModal';
import { runUnlockSweep, runWaitingCloseSweep } from '../../services/capsuleService';
import type { AppStackParamList, BottomTabParamList } from '../../types/navigation';
import type { Capsule } from '../../types/models';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { CapsuleCard } from '../../components/capsule/CapsuleCard';
import { PolaroidCard } from '../../components/capsule/PolaroidCard';
import {
  AppIcon,
  ElevatedCard,
  PrimaryButton,
  SectionTitle,
  SoftScreen,
  uiShadow,
} from '../../components/ui/DesignPrimitives';
import { useTranslation } from '../../i18n';
import { PLAN_LIMITS } from '../../config/plans';

type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<BottomTabParamList, 'Home'>,
  NativeStackScreenProps<AppStackParamList>
>;

function HomeLoadingState({ reduceMotion }: { reduceMotion: boolean }) {
  const spin = useSharedValue(0);
  const glow = useSharedValue(0);
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, false), [colors]);
  const { t } = useTranslation();

  React.useEffect(() => {
    if (reduceMotion) {
      spin.value = 0;
      glow.value = 1;
      return;
    }

    spin.value = withRepeat(
      withTiming(360, {
        duration: 1200,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    glow.value = withRepeat(
      withTiming(1, {
        duration: 900,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(spin);
      cancelAnimation(glow);
    };
  }, [glow, reduceMotion, spin]);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + glow.value * 0.45,
    transform: [{ scale: 0.94 + glow.value * 0.08 }],
  }));

  return (
    <View style={styles.loadingWrap}>
      <View style={styles.loadingOrb}>
        <Animated.View style={[styles.loadingGlow, glowStyle]} />
        <Animated.View style={[styles.loadingRing, spinnerStyle]}>
          <View style={styles.loadingRingHead} />
        </Animated.View>
        <AppIcon name="cube-outline" size={30} color={colors.primary} />
      </View>
      <Text style={styles.loadingTitle}>{t('Đang mở kho ký ức...')}</Text>
      <Text style={styles.loadingSubtitle}>{t('TimeSeal đang sắp xếp ký ức của bạn.')}</Text>
    </View>
  );
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const user = useAuthStore(state => state.user);
  const subscriptionSync = useAuthStore(state => state.subscriptionSync);
  const isPremium = Boolean(user?.isPremium);
  const capsules = useCapsuleStore(state => state.capsules);
  const isLoading = useCapsuleStore(state => state.isLoading);
  const error = useCapsuleStore(state => state.error);
  const subscribeCapsules = useCapsuleStore(state => state.subscribeCapsules);
  const clearCapsules = useCapsuleStore(state => state.clearCapsules);
  const [showPremiumModal, setShowPremiumModal] = React.useState(false);

  const reduceMotion = useAuthStore(state => state.reduceMotion);
  const reduceMotionShared = useSharedValue(reduceMotion);
  const [showHomeIntro, setShowHomeIntro] = React.useState(true);

  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { t } = useTranslation();

  useEffect(() => {
    reduceMotionShared.value = reduceMotion;
  }, [reduceMotion, reduceMotionShared]);

  // Phân tích thời gian để trả lời chào động theo buổi (Vector Icon, không dùng Emoji)
  const getGreeting = () => {
    const hours = new Date().getHours();
    const displayName = user?.displayName || user?.email?.split('@')[0] || t('bạn');
    
    if (hours >= 5 && hours < 11) {
      return {
        title: t('Chào buổi sáng,'),
        name: displayName,
        subtitle: t('Hôm nay bạn muốn gửi gắm điều gì?'),
        icon: 'sunny-outline',
        color: colors.warning,
      };
    } else if (hours >= 11 && hours < 17) {
      return {
        title: t('Chào buổi chiều,'),
        name: displayName,
        subtitle: t('Ký ức đang đợi bạn.'),
        icon: 'cafe-outline',
        color: colors.coral || '#E76F51',
      };
    } else {
      return {
        title: t('Chào buổi tối,'),
        name: displayName,
        subtitle: t('Hãy cùng nhìn lại hành trình.'),
        icon: 'moon-outline',
        color: isDark ? '#A89EF0' : '#534AB7',
      };
    }
  };

  // Real-time ticking timer for locked-to-unlocked transition
  const [now, setNow] = React.useState(() => new Date());

  useEffect(() => {
    const hasLocked = capsules.some(c => c.status === 'locked');
    if (!hasLocked) {
      return;
    }

    const intervalId = setInterval(() => {
      const currentNow = new Date();
      setNow(currentNow);

      const hasAnyJustUnlocked = capsules.some(
        c => c.status === 'locked' && new Date(c.openDateISO) <= currentNow
      );
      if (hasAnyJustUnlocked && user?.id) {
        runUnlockSweep(user.id).catch(() => {});
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [capsules, user?.id]);

  // Notification bell wobble when there are unlocked capsules
  const bellRotate = useSharedValue(0);
  const hasUnlocked = capsules.some(
    c => c.status === 'unlocked' || (c.status === 'locked' && new Date(c.openDateISO) <= now)
  );

  useEffect(() => {
    if (hasUnlocked && !reduceMotion) {
      bellRotate.value = withRepeat(
        withSequence(
          withTiming(12, { duration: 120 }),
          withTiming(-12, { duration: 120 }),
          withTiming(8, { duration: 100 }),
          withTiming(-8, { duration: 100 }),
          withTiming(0, { duration: 80 }),
          withTiming(0, { duration: 2000 }), // pause between wobbles
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(bellRotate);
      bellRotate.value = 0;
    }
    return () => cancelAnimation(bellRotate);
  }, [hasUnlocked, reduceMotion, bellRotate]);

  const bellAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bellRotate.value}deg` }],
  }));

  const scrollY = useSharedValue(0);
  const fabScale = useSharedValue(1);
  const fabRotate = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const diffY = currentY - scrollY.value;

      if (reduceMotion) {
        if (currentY <= 10) {
          fabScale.value = withTiming(1, { duration: 150 });
          fabRotate.value = 0;
        } else if (diffY > 5) {
          fabScale.value = withTiming(0, { duration: 150 });
          fabRotate.value = 0;
        } else if (diffY < -5) {
          fabScale.value = withTiming(1, { duration: 150 });
          fabRotate.value = 0;
        }
      } else {
        if (currentY <= 10) {
          fabScale.value = withSpring(1, { damping: 15 });
          fabRotate.value = withSpring(0, { damping: 15 });
        } else if (diffY > 5) {
          fabScale.value = withSpring(0, { damping: 15 });
          fabRotate.value = withSpring(90, { damping: 15 });
        } else if (diffY < -5) {
          fabScale.value = withSpring(1, { damping: 15 });
          fabRotate.value = withSpring(0, { damping: 15 });
        }
      }

      scrollY.value = currentY;
    },
  });

  const animatedFabStyle = useAnimatedStyle(() => {
    return {
      opacity: fabScale.value,
      transform: [
        { scale: fabScale.value },
        { rotate: `${fabRotate.value}deg` },
      ],
    };
  });

  useEffect(() => {
    if (!user?.id) {
      clearCapsules();
      return;
    }

    setShowHomeIntro(true);
    const introTimer = setTimeout(() => {
      setShowHomeIntro(false);
    }, 700);

    runUnlockSweep(user.id).catch(() => {});
    const unsubscribe = subscribeCapsules(user.id);
    return () => {
      clearTimeout(introTimer);
      unsubscribe();
    };
  }, [user?.id, subscribeCapsules, clearCapsules]);

  const openCapsule = (capsule: Capsule) => {
    const parent = navigation.getParent();
    if (!parent) {
      return;
    }

    const isDue = capsule.status === 'locked' && new Date(capsule.openDateISO) <= now;

    if (capsule.status === 'waiting') {
      parent.navigate('CapsuleWaiting', { capsuleId: capsule.id });
      return;
    }

    if (capsule.status === 'locked' && !isDue) {
      parent.navigate('CapsuleLocked', { capsuleId: capsule.id });
      return;
    }

    if (capsule.status === 'unlocked' || isDue) {
      if (isDue && user?.id) {
    runUnlockSweep(user.id).catch(() => {});
    runWaitingCloseSweep().catch(() => {});
      }
      parent.navigate('OpenCapsule', { capsuleId: capsule.id });
      return;
    }

    parent.navigate('CapsuleDetail', { capsuleId: capsule.id });
  };

  const onCreatePress = () => {
    const ownedCapsules = capsules.filter(
      item => item.ownerId === user?.id && item.id !== 'screenshot-opened-capsule',
    );
    if (!isPremium && ownedCapsules.length >= PLAN_LIMITS.free.maxCapsules) {
      setShowPremiumModal(true);
      return;
    }
    if (subscriptionSync?.isOverQuota) {
      PolishedAlert.show(
        t('Hết dung lượng'),
        t('Tài khoản của bạn đã vượt quá hạn mức dung lượng tháng này. Vui lòng giải phóng bộ nhớ hoặc nâng cấp gói để tiếp tục.'),
        [
          { text: t('Nâng cấp gói'), onPress: () => setShowPremiumModal(true) },
          { text: t('Quản lý dung lượng'), onPress: () => navigation.navigate('StorageManagement' as never) },
          { text: t('Hủy'), style: 'cancel' }
        ]
      );
      return;
    }
    navigation.getParent()?.navigate('CreateStep1');
  };

  const unlocked = capsules
    .filter(item => item.status === 'unlocked' || (item.status === 'locked' && new Date(item.openDateISO) <= now))
    .map(item => item.status === 'locked' ? { ...item, status: 'unlocked' as const } : item);
  const waitingContributions = capsules.filter(item => item.status === 'waiting');
  const waiting = capsules.filter(item => item.status === 'locked' && new Date(item.openDateISO) > now);
  const opened = capsules.filter(item => item.status === 'opened');
  const shouldShowHomeLoading = showHomeIntro || (isLoading && !capsules.length);
  const greeting = getGreeting();

  return (
    <SoftScreen>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          {/* Header Row: Logo & Actions */}
          <View style={styles.headerRow}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/icon-app/Icon-app.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.appName}>TimeSeal</Text>
            </View>
            <View style={styles.headerActions}>
              <Animated.View style={bellAnimStyle}>
                <Pressable
                  onPress={() => navigation.getParent()?.navigate('Notifications')}
                  style={styles.iconButton}>
                  <AppIcon name="notifications-outline" size={19} color={colors.text} />
                  {hasUnlocked && <View style={styles.bellDot} />}
                </Pressable>
              </Animated.View>
              <Pressable
                onPress={() => navigation.getParent()?.navigate('InviteCode')}
                style={styles.inviteButton}>
                <AppIcon name="mail-open" size={18} color={colors.primary} />
                <Text style={styles.inviteLabel}>{t('Mời')}</Text>
              </Pressable>
              <Pressable
                onPress={onCreatePress}
                style={styles.plusButton}>
                <AppIcon name="add" size={25} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* Lời chào động theo buổi (Spacious Dynamic Greeting Card) */}
          <View style={styles.greetingContainer}>
            <View style={styles.greetingHeaderRow}>
              <AppIcon name={greeting.icon} size={17} color={greeting.color} />
              <Text style={styles.greetingTitle}>
                {greeting.title} <Text style={styles.greetingName}>{greeting.name}</Text>!
              </Text>
            </View>
            <Text style={styles.greetingSubtitle}>{greeting.subtitle}</Text>
          </View>

          {error && !shouldShowHomeLoading ? <Text style={styles.errorText}>{error}</Text> : null}

          {shouldShowHomeLoading ? (
            <HomeLoadingState reduceMotion={reduceMotion} />
          ) : !capsules.length ? (
            <ElevatedCard style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <AppIcon name="cube-outline" size={36} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>{t('Tạo hộp ký ức đầu tiên của bạn')}</Text>
              <Text style={styles.emptySubTitle}>{t('Nhấn nút + để bắt đầu lưu giữ ký ức.')}</Text>
              <PrimaryButton label={t('Tạo hộp ký ức')} iconName="add" onPress={onCreatePress} style={styles.emptyButton} />
            </ElevatedCard>
          ) : (
            <Animated.FlatList
              data={[{ key: 'sections' }]}
              keyExtractor={item => item.key}
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              renderItem={() => (
                <>
                  {/* 1. Mở ngay! (Horizontal Carousel với hiệu ứng phát sáng hạt bụi) */}
                  {unlocked.length > 0 && (
                    <View style={styles.section}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 12 }}>
                        <AppIcon name="sparkles" size={15} color={colors.success} />
                        <SectionTitle tone="success" style={{ marginTop: 0, marginBottom: 0 }}>{t('Mở ngay!')}</SectionTitle>
                      </View>
                      
                      <Animated.FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={unlocked}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                          <View style={styles.carouselItemContainer}>
                            <View style={styles.sparkleContainer}>
                              <AppIcon name="sparkles-outline" size={10} color={colors.warning} style={styles.sparkleParticle1} />
                              <AppIcon name="sparkles-outline" size={12} color={colors.warning} style={styles.sparkleParticle2} />
                            </View>
                            <CapsuleCard capsule={item} onPress={() => openCapsule(item)} />
                          </View>
                        )}
                        contentContainerStyle={styles.carouselList}
                      />
                    </View>
                  )}

                  {waitingContributions.length > 0 && (
                    <View style={styles.section}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9, marginBottom: 10 }}>
                        <AppIcon name="people-outline" size={15} color={colors.primary} />
                        <SectionTitle tone="info" style={{ marginTop: 0, marginBottom: 0 }}>{t('Chờ đóng góp')}</SectionTitle>
                      </View>
                      <Animated.FlatList
                        data={waitingContributions}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => <CapsuleCard capsule={item} onPress={() => openCapsule(item)} />}
                        scrollEnabled={false}
                        contentContainerStyle={styles.sectionList}
                      />
                    </View>
                  )}

                  {/* 2. Đang chờ (Vertical Circular Progress list) */}
                  {waiting.length > 0 && (
                    <View style={styles.section}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9, marginBottom: 10 }}>
                        <AppIcon name="hourglass-outline" size={15} color={colors.mutedText} />
                        <SectionTitle tone="muted" style={{ marginTop: 0, marginBottom: 0 }}>{t('Đang chờ')}</SectionTitle>
                      </View>
                      <Animated.FlatList
                        data={waiting}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => <CapsuleCard capsule={item} onPress={() => openCapsule(item)} />}
                        scrollEnabled={false}
                        contentContainerStyle={styles.sectionList}
                      />
                    </View>
                  )}

                  {/* 3. Đã mở (Masonry Polaroid Grid hoài niệm) */}
                  {opened.length > 0 && (
                    <View style={styles.section}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 12 }}>
                        <AppIcon name="cube" size={15} color={colors.primary} />
                        <SectionTitle tone="info" style={{ marginTop: 0, marginBottom: 0 }}>{t('Đã mở')}</SectionTitle>
                      </View>
                      <View style={styles.masonryGrid}>
                        <View style={styles.masonryColumn}>
                          {opened.filter((_, idx) => idx % 2 === 0).map(item => (
                            <PolaroidCard key={item.id} capsule={item} onPress={() => openCapsule(item)} />
                          ))}
                        </View>
                        <View style={styles.masonryColumn}>
                          {opened.filter((_, idx) => idx % 2 !== 0).map(item => (
                            <PolaroidCard key={item.id} capsule={item} onPress={() => openCapsule(item)} />
                          ))}
                        </View>
                      </View>
                    </View>
                  )}
                </>
              )}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>

        {/* Simple circular FAB containing just the + sign */}
        {!shouldShowHomeLoading ? (
          <Animated.View style={[styles.fabContainer, styles.fab, animatedFabStyle]}>
            <Pressable style={styles.fabPressable} onPress={onCreatePress}>
              <AppIcon name="add" size={26} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        ) : null}
      </SafeAreaView>
      <PremiumModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </SoftScreen>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 10,
    marginTop: -5,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 30,
    height: 30,
  },
  appName: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  greetingContainer: {
    marginTop: 3,
    marginBottom: 2,
    paddingTop: 4,
    paddingBottom: 0,
  },
  greetingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greetingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  greetingName: {
    fontWeight: '800',
    color: colors.primary,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: colors.mutedText,
    marginTop: 4,
    paddingLeft: 23,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  inviteButton: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 4,
    backgroundColor: colors.card,
  },
  inviteLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 92,
  },
  section: {
    marginTop: 4,
  },
  sectionList: {
    gap: 10,
  },
  emptyState: {
    marginTop: 80,
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '600',
  },
  emptySubTitle: {
    marginTop: 8,
    fontSize: 14,
    color: colors.mutedText,
  },
  emptyButton: {
    marginTop: 22,
    alignSelf: 'stretch',
  },
  loadingWrap: {
    marginTop: 82,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingOrb: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    ...uiShadow,
  },
  loadingGlow: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.primarySoft,
  },
  loadingRing: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: isDark ? 'rgba(139,127,232,0.18)' : 'rgba(83,74,183,0.18)',
    borderTopColor: colors.primary,
  },
  loadingRingHead: {
    position: 'absolute',
    top: -4,
    alignSelf: 'center',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  loadingTitle: {
    marginTop: 18,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  loadingSubtitle: {
    marginTop: 6,
    color: colors.mutedText,
    fontSize: 13,
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    right: 22,
    bottom: 92,
    zIndex: 10,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    ...uiShadow,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fabPressable: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  fabTextContainer: {
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginLeft: 4,
  },
  carouselList: {
    paddingRight: 16,
    gap: 12,
    paddingBottom: 8,
  },
  carouselItemContainer: {
    width: 325,
  },
  masonryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  masonryColumn: {
    flex: 1,
  },
  sparkleContainer: {
    position: 'absolute',
    top: -6,
    right: 12,
    zIndex: 11,
    flexDirection: 'row',
    gap: 4,
  },
  sparkleParticle1: {
    transform: [{ rotate: '15deg' }],
  },
  sparkleParticle2: {
    transform: [{ rotate: '-10deg' }],
    marginTop: 4,
  },
  infoText: {
    color: colors.mutedText,
    fontSize: 13,
    marginBottom: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 8,
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
});
