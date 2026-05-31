import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useCapsuleStore } from '../../store/capsuleStore';
import { useAuthStore } from '../../store/authStore';
import { PremiumModal } from '../../components/modals/PremiumModal';
import { runUnlockSweep } from '../../services/capsuleService';
import type { AppStackParamList, BottomTabParamList } from '../../types/navigation';
import type { Capsule } from '../../types/models';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { CapsuleCard } from '../../components/capsule/CapsuleCard';
import {
  AppIcon,
  ElevatedCard,
  PrimaryButton,
  SectionTitle,
  SoftScreen,
  uiShadow,
} from '../../components/ui/DesignPrimitives';

type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<BottomTabParamList, 'Home'>,
  NativeStackScreenProps<AppStackParamList>
>;

function Section({
  title,
  iconName,
  iconColor,
  items,
  onOpen,
}: {
  title: string;
  iconName: string;
  iconColor?: string;
  items: Capsule[];
  onOpen: (capsule: Capsule) => void;
}) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, false), [colors]);

  if (!items.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: title === 'Mở ngay!' ? 8 : 4, marginBottom: 10 }}>
        <AppIcon name={iconName} size={15} color={iconColor || colors.mutedText} />
        <SectionTitle tone={title === 'Mở ngay!' ? 'success' : 'muted'} style={{ marginTop: 0, marginBottom: 0 }}>{title}</SectionTitle>
      </View>
      <Animated.FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <CapsuleCard capsule={item} onPress={() => onOpen(item)} />}
        scrollEnabled={false}
        contentContainerStyle={styles.sectionList}
      />
    </View>
  );
}

function HomeLoadingState({ reduceMotion }: { reduceMotion: boolean }) {
  const spin = useSharedValue(0);
  const glow = useSharedValue(0);
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, false), [colors]);

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
      <Text style={styles.loadingTitle}>Đang mở kho capsule...</Text>
      <Text style={styles.loadingSubtitle}>TimeSeal đang sắp xếp ký ức của bạn.</Text>
    </View>
  );
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const user = useAuthStore(state => state.user);
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

  useEffect(() => {
    reduceMotionShared.value = reduceMotion;
  }, [reduceMotion, reduceMotionShared]);

  // Notification bell wobble when there are unlocked capsules
  const bellRotate = useSharedValue(0);
  const hasUnlocked = capsules.some(c => c.status === 'unlocked');

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

  // Reanimated FAB ẩn hiện & xoay theo scroll
  const scrollY = useSharedValue(0);
  const fabScale = useSharedValue(1);
  const fabRotate = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      const currentY = event.contentOffset.y;
      const diffY = currentY - scrollY.value;

      if (reduceMotionShared.value) {
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

    if (capsule.status === 'locked') {
      parent.navigate('CapsuleLocked', { capsuleId: capsule.id });
      return;
    }

    if (capsule.status === 'unlocked') {
      parent.navigate('OpenCapsule', { capsuleId: capsule.id });
      return;
    }

    parent.navigate('CapsuleDetail', { capsuleId: capsule.id });
  };

  const onCreatePress = () => {
    if (!isPremium && capsules.length >= 5) {
      setShowPremiumModal(true);
      return;
    }
    navigation.getParent()?.navigate('CreateStep1');
  };

  const unlocked = capsules.filter(item => item.status === 'unlocked');
  const waiting = capsules.filter(item => item.status === 'locked');
  const opened = capsules.filter(item => item.status === 'opened');
  const shouldShowHomeLoading = showHomeIntro || (isLoading && !capsules.length);

  return (
    <SoftScreen>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>TimeSeal</Text>
              <Text style={styles.headerTitle}>Capsule của tôi</Text>
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
                <Text style={styles.inviteLabel}>Mời</Text>
              </Pressable>
              <Pressable
                onPress={onCreatePress}
                style={styles.plusButton}>
                <AppIcon name="add" size={25} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {error && !shouldShowHomeLoading ? <Text style={styles.errorText}>{error}</Text> : null}

          {shouldShowHomeLoading ? (
            <HomeLoadingState reduceMotion={reduceMotion} />
          ) : !capsules.length ? (
            <ElevatedCard style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <AppIcon name="cube-outline" size={36} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Tạo capsule đầu tiên của bạn</Text>
              <Text style={styles.emptySubTitle}>Nhấn nút + để bắt đầu lưu giữ ký ức.</Text>
              <PrimaryButton label="Tạo capsule" iconName="add" onPress={onCreatePress} style={styles.emptyButton} />
            </ElevatedCard>
          ) : (
            <Animated.FlatList
              data={[{ key: 'sections' }]}
              keyExtractor={item => item.key}
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              renderItem={() => (
                <>
                  <Section title="Mở ngay!" iconName="sparkles" iconColor={colors.success} items={unlocked} onOpen={openCapsule} />
                  <Section title="Đang chờ" iconName="hourglass-outline" iconColor={colors.mutedText} items={waiting} onOpen={openCapsule} />
                  <Section title="Đã mở" iconName="cube" iconColor={colors.primary} items={opened} onOpen={openCapsule} />
                </>
              )}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
        {!shouldShowHomeLoading ? (
          <Animated.View style={[styles.fabContainer, animatedFabStyle]}>
            <Pressable style={styles.fab} onPress={onCreatePress}>
              <AppIcon name="add" size={30} color="#FFFFFF" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 18,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
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
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...uiShadow,
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
