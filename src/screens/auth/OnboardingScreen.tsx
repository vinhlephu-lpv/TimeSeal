import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import {
  PrimaryButton,
  SoftScreen,
  AppIcon,
  uiShadow,
} from '../../components/ui/DesignPrimitives';
import Animated, {
  type SharedValue,
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  interpolateColor,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from '../../i18n';

type OnboardingScreenProps = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const slides = [
  {
    title: 'Gói ghém năm tháng rực rỡ của chúng ta',
    body: 'Cùng hội tri kỷ gửi gắm hình ảnh vui nhộn, những câu chuyện chưa kể và lời chúc chân thành vào hộp ký ức chung.',
    visual: 'photo',
    tone: 'light',
    badge: 'camera-outline',
    badgeBg: '#7C3AED', // Deep modern violet
    step: 'GẮN KẾT',
  },
  {
    title: 'Niêm phong lời hứa thanh xuân',
    body: 'Đóng dấu sáp bảo mật cho ngày gặp lại. Chiếc hộp sẽ đếm ngược từng giây để giữ trọn vẹn sự bất ngờ.',
    visual: 'lock',
    tone: 'teal',
    badge: 'lock-closed-outline',
    badgeBg: '#0D9488', // Fresh teal
    step: 'HẸN ƯỚC',
  },
  {
    title: 'Đánh thức ký ức vô giá, vỡ òa ngày gặp lại',
    body: 'Đúng thời khắc, chiếc hộp tự động mở. Cả nhóm cùng nhận thông báo để sống lại những thước phim thanh xuân vô giá.',
    visual: 'envelope',
    tone: 'warm',
    badge: 'gift-outline',
    badgeBg: '#E11D48', // Vibrant rose red
    step: 'VỠ ÒA',
  },
] as const;

type OnboardingSlide = (typeof slides)[number];

type SlideItemProps = {
  item: OnboardingSlide;
  itemIndex: number;
  width: number;
  scrollX: SharedValue<number>;
};

type StepDotProps = {
  index: number;
  width: number;
  scrollX: SharedValue<number>;
};

/** Illustration 1: Layered Animated Photos */
function PhotoIllustration() {
  const { colors } = useTheme();
  const floatHeart = useSharedValue(0);
  const floatCamera = useSharedValue(0);
  const rotateCamera = useSharedValue(0);

  React.useEffect(() => {
    floatHeart.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(12, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    floatCamera.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    rotateCamera.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [floatHeart, floatCamera, rotateCamera]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatHeart.value }],
  }));

  const cameraStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatCamera.value },
      { rotate: `${rotateCamera.value}deg` },
    ],
  }));

  return (
    <View style={visualStyles.illustrationContainer}>
      {/* Glow Backdrop */}
      <View style={[visualStyles.glowBackdrop, { backgroundColor: colors.primarySoft }]} />

      {/* Layered Photo Cards */}
      <View style={[visualStyles.photoFrame, visualStyles.photoBack, { borderColor: colors.softBorder, backgroundColor: colors.card }]}>
        <AppIcon name="images-outline" size={32} color={colors.primaryPale} />
      </View>

      <View style={[visualStyles.photoFrame, visualStyles.photoFront, { borderColor: colors.primary, backgroundColor: colors.card }]}>
        <AppIcon name="image-outline" size={48} color={colors.primary} />
        <View style={[visualStyles.photoLabelLine, { backgroundColor: colors.primaryPale }]} />
        <View style={[visualStyles.photoLabelLine, visualStyles.photoLabelLineShort, { backgroundColor: colors.coralSoft }]} />
      </View>

      {/* Floating Heart */}
      <Animated.View style={[visualStyles.floatingHeart, heartStyle]}>
        <AppIcon name="heart" size={28} color={colors.coral} />
      </Animated.View>

      {/* Floating Camera Icon */}
      <Animated.View style={[visualStyles.floatingCamera, cameraStyle]}>
        <View style={[visualStyles.cameraIconBg, { backgroundColor: colors.primary, borderColor: colors.card }]}>
          <AppIcon name="camera-outline" size={20} color="#FFFFFF" />
        </View>
      </Animated.View>
    </View>
  );
}

/** Illustration 2: High-tech Vault Lock & Countdown Ring */
function LockIllustration() {
  const { colors } = useTheme();
  const floatShield = useSharedValue(0);
  const rotateHourglass = useSharedValue(0);
  const pulseLock = useSharedValue(1);

  React.useEffect(() => {
    floatShield.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 1600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    rotateHourglass.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );

    pulseLock.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      true
    );
  }, [floatShield, rotateHourglass, pulseLock]);

  const shieldStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatShield.value }],
  }));

  const hourglassStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateHourglass.value}deg` }],
  }));

  const lockStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseLock.value }],
  }));

  return (
    <View style={visualStyles.illustrationContainer}>
      {/* Glow Backdrop */}
      <View style={[visualStyles.glowBackdrop, { backgroundColor: colors.tealSoft }]} />

      {/* Futuristic Holographic Countdown Rings */}
      <View style={[visualStyles.countdownRing, { borderColor: colors.primarySoft }]} />
      <View style={[visualStyles.countdownRingOuter, { borderColor: colors.tealSoft }]} />

      {/* Cyberpunk Vault Lock */}
      <Animated.View style={[visualStyles.lockContainer, lockStyle]}>
        <View style={[visualStyles.newLockShackle, { borderColor: colors.primary, backgroundColor: colors.primarySoft }]} />
        <View style={[visualStyles.newLockBody, { borderColor: colors.softBorder, backgroundColor: colors.card }]}>
          <View style={[visualStyles.keyholeCenter, { backgroundColor: colors.primary }]}>
            <View style={visualStyles.keyholeDot} />
          </View>
        </View>
      </Animated.View>

      {/* Floating Shield */}
      <Animated.View style={[visualStyles.floatingShield, shieldStyle]}>
        <View style={[visualStyles.shieldIconBg, { backgroundColor: colors.success, borderColor: colors.card }]}>
          <AppIcon name="shield-checkmark-outline" size={18} color="#FFFFFF" />
        </View>
      </Animated.View>

      {/* Floating Hourglass */}
      <Animated.View style={[visualStyles.floatingHourglass, hourglassStyle]}>
        <AppIcon name="hourglass" size={24} color={colors.warning} />
      </Animated.View>
    </View>
  );
}

/** Illustration 3: Open Surprise Gift Envelope */
function EnvelopeIllustration() {
  const { colors } = useTheme();
  const floatEnvelope = useSharedValue(0);
  const scaleGift = useSharedValue(1);
  const floatStar = useSharedValue(0);

  React.useEffect(() => {
    floatEnvelope.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(6, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    scaleGift.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1500 }),
        withTiming(0.9, { duration: 1500 })
      ),
      -1,
      true
    );

    floatStar.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 1800 }),
        withTiming(8, { duration: 1800 })
      ),
      -1,
      true
    );
  }, [floatEnvelope, scaleGift, floatStar]);

  const envelopeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatEnvelope.value }],
  }));

  const giftStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleGift.value }],
  }));

  const starStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatStar.value }],
  }));

  return (
    <View style={visualStyles.illustrationContainer}>
      {/* Glow Backdrop */}
      <View style={[visualStyles.glowBackdrop, { backgroundColor: colors.warmSoft }]} />

      {/* Open Gift Envelope */}
      <Animated.View style={[visualStyles.envelopeContainer, envelopeStyle]}>
        {/* Envelope back panel */}
        <View style={[visualStyles.envelopeBackPanel, { backgroundColor: colors.warmSoft }]} />

        {/* Floating elements emerging */}
        <Animated.View style={[visualStyles.floatingGift, giftStyle]}>
          <AppIcon name="gift" size={32} color={colors.coral} />
        </Animated.View>

        <Animated.View style={[visualStyles.floatingStar1, starStyle]}>
          <AppIcon name="sparkles" size={22} color={colors.warning} />
        </Animated.View>

        <Animated.View style={[visualStyles.floatingStar2, starStyle]}>
          <AppIcon name="sparkles-outline" size={16} color={colors.success} />
        </Animated.View>

        {/* Envelope front body panel */}
        <View style={[visualStyles.envelopeFrontPanel, { borderColor: colors.softBorder, backgroundColor: colors.card }]}>
          <AppIcon name="heart" size={28} color={colors.coral} />
        </View>
      </Animated.View>
    </View>
  );
}

function OnboardingSlideItem({ item, itemIndex, width, scrollX }: SlideItemProps) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { t } = useTranslation();

  const renderVisual = () => {
    if (item.visual === 'lock') return <LockIllustration />;
    if (item.visual === 'envelope') return <EnvelopeIllustration />;
    return <PhotoIllustration />;
  };

  const animatedVisualStyle = useAnimatedStyle(() => {
    const inputRange = [
      (itemIndex - 1) * width,
      itemIndex * width,
      (itemIndex + 1) * width,
    ];

    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [-width * 0.4, 0, width * 0.4],
      Extrapolate.CLAMP,
    );

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolate.CLAMP,
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolate.CLAMP,
    );

    return {
      opacity,
      transform: [{ translateX }, { scale }],
    };
  });

  return (
    <View style={[styles.slideContainer, { width }]}>
      <Animated.View style={[styles.illustrationWrap, animatedVisualStyle]}>
        {renderVisual()}
      </Animated.View>

      <View style={styles.contentWrap}>
        <View style={styles.glassCard}>
          {/* Floating Icon Badge */}
          <View style={[styles.badgeContainer, { backgroundColor: item.badgeBg }]}>
            <AppIcon name={item.badge} size={20} color="#FFFFFF" />
          </View>

          {/* Small modern step tag */}
          <Text style={[styles.stepTag, { color: item.badgeBg }]}>{item.step}</Text>

          {/* Title with automatic dynamic font scaling */}
          <Text 
            style={styles.title}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {t(item.title)}
          </Text>

          {/* Stylized subtle divider */}
          <View style={[styles.divider, { backgroundColor: colors.softBorder }]} />

          {/* Body description - flows naturally with no cutoffs */}
          <Text style={styles.body}>
            {t(item.body)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ExpandingStepDot({ index, width, scrollX }: StepDotProps) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const dotStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const dotWidth = interpolate(
      scrollX.value,
      inputRange,
      [8, 22, 8],
      Extrapolate.CLAMP,
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.4, 1, 0.4],
      Extrapolate.CLAMP,
    );

    const backgroundColor = interpolateColor(
      scrollX.value,
      inputRange,
      [colors.primaryPale, colors.primary, colors.primaryPale],
    );

    return {
      width: dotWidth,
      opacity,
      backgroundColor,
    };
  });

  return <Animated.View style={[styles.dot, dotStyle]} />;
}

function ExpandingStepDots({
  width,
  scrollX,
}: {
  width: number;
  scrollX: SharedValue<number>;
}) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={styles.dotsWrap}>
      {slides.map((_, index) => (
        <ExpandingStepDot key={index} index={index} width={width} scrollX={scrollX} />
      ))}
    </View>
  );
}

export function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { t } = useTranslation();

  const finishOnboarding = useAuthStore(state => state.finishOnboarding);
  const [index, setIndex] = useState(0);
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);

  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollX.value = event.contentOffset.x;
    },
  });

  const isLast = useMemo(() => index === slides.length - 1, [index]);
  const activeSlide = slides[Math.min(Math.max(index, 0), slides.length - 1)];

  const onNext = () => {
    if (isLast) {
      finishOnboarding();
      navigation.replace('Login');
      return;
    }
    flatListRef.current?.scrollToIndex({
      index: index + 1,
      animated: true,
    });
  };

  const handleScrollEnd = (e: any) => {
    if (width <= 0) {
      return;
    }

    const offset = e.nativeEvent.contentOffset.x;
    const newIndex = Math.min(
      Math.max(Math.round(offset / width), 0),
      slides.length - 1,
    );
    setIndex(newIndex);
  };

  const insets = useSafeAreaInsets();

  return (
    <SoftScreen variant={activeSlide.tone}>
      <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: Math.max(28, insets.bottom + 16) }]}>
        {!isLast ? (
          <Pressable
            style={[styles.skipButton, { top: insets.top + 10 }]}
            onPress={() => {
              finishOnboarding();
              navigation.replace('Login');
            }}>
            <Text style={styles.skipLabel}>{t('Bỏ qua')}</Text>
          </Pressable>
        ) : null}

        {/* Animated Carousel List */}
        <Animated.FlatList
          ref={flatListRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScrollEnd}
          keyExtractor={(_, i) => i.toString()}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onScrollToIndexFailed={({ index: failedIndex }) => {
            flatListRef.current?.scrollToOffset({
              offset: failedIndex * width,
              animated: true,
            });
          }}
          style={styles.flatList}
          renderItem={({ item, index: i }) => {
            return <OnboardingSlideItem item={item} itemIndex={i} width={width} scrollX={scrollX} />;
          }}
        />

        <ExpandingStepDots width={width} scrollX={scrollX} />

        <PrimaryButton
          label={t(isLast ? 'Bắt đầu' : 'Tiếp theo')}
          iconName={isLast ? 'sparkles-outline' : 'arrow-forward-outline'}
          onPress={onNext}
          style={styles.button}
        />
      </View>
    </SoftScreen>
  );
}

const visualStyles = StyleSheet.create({
  illustrationContainer: {
    width: 260,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowBackdrop: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.15,
    transform: [{ scale: 1.25 }],
  },
  photoFrame: {
    width: 120,
    height: 150,
    borderRadius: 16,
    borderWidth: 1.2,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    ...uiShadow,
  },
  photoBack: {
    left: 45,
    top: 50,
    transform: [{ rotate: '-12deg' }],
    opacity: 0.8,
  },
  photoFront: {
    left: 85,
    top: 70,
    transform: [{ rotate: '6deg' }],
  },
  photoLabelLine: {
    width: 70,
    height: 6,
    borderRadius: 3,
    marginTop: 12,
  },
  photoLabelLineShort: {
    width: 45,
    marginTop: 6,
  },
  floatingHeart: {
    position: 'absolute',
    top: 30,
    right: 35,
  },
  floatingCamera: {
    position: 'absolute',
    bottom: 40,
    left: 45,
    zIndex: 10,
  },
  cameraIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...uiShadow,
  },
  countdownRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  countdownRingOuter: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
    opacity: 0.3,
  },
  lockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  newLockShackle: {
    width: 60,
    height: 70,
    borderRadius: 30,
    borderWidth: 4.5,
    borderBottomWidth: 0,
    marginBottom: -10,
  },
  newLockBody: {
    width: 110,
    height: 90,
    borderRadius: 20,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    ...uiShadow,
  },
  keyholeCenter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyholeDot: {
    width: 6,
    height: 10,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
    borderRadius: 1,
  },
  floatingShield: {
    position: 'absolute',
    top: 45,
    left: 40,
  },
  shieldIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...uiShadow,
  },
  floatingHourglass: {
    position: 'absolute',
    bottom: 50,
    right: 45,
  },
  envelopeContainer: {
    width: 180,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 20,
  },
  envelopeBackPanel: {
    position: 'absolute',
    top: 25,
    width: 140,
    height: 80,
    borderRadius: 12,
  },
  envelopeFrontPanel: {
    width: 170,
    height: 100,
    borderRadius: 16,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 10,
    ...uiShadow,
  },
  floatingGift: {
    position: 'absolute',
    top: -15,
    zIndex: 5,
  },
  floatingStar1: {
    position: 'absolute',
    top: 5,
    left: 15,
    zIndex: 5,
  },
  floatingStar2: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 5,
  },
});

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 42,
      paddingBottom: 28,
    },
    skipButton: {
      position: 'absolute',
      right: 24,
      top: 18,
      zIndex: 10,
      padding: 8,
    },
    skipLabel: {
      color: colors.mutedText,
      fontSize: 14,
      fontWeight: '600',
    },
    flatList: {
      flex: 1,
      width: '100%',
    },
    slideContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    illustrationWrap: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 28, // Perfectly balanced spacing to let badge and visuals breathe
    },
    contentWrap: {
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 8,
    },
    glassCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: colors.primarySoft,
      paddingTop: 36, // Increased top padding to accommodate the floating badge beautifully
      paddingBottom: 28,
      paddingHorizontal: 24,
      width: '100%',
      position: 'relative',
      ...uiShadow,
      shadowColor: colors.primary,
      shadowOpacity: isDark ? 0.25 : 0.08,
      shadowRadius: 24,
    },
    badgeContainer: {
      position: 'absolute',
      top: -24,
      alignSelf: 'center',
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.card,
      ...uiShadow,
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    stepTag: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.5,
      marginBottom: 8,
      textAlign: 'center',
      marginTop: 4,
    },
    title: {
      fontSize: 22,
      lineHeight: 32,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 0,
    },
    divider: {
      height: 1.2,
      width: 40,
      alignSelf: 'center',
      marginVertical: 14,
      opacity: 0.8,
    },
    body: {
      color: colors.mutedText,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      paddingHorizontal: 8,
    },
    dotsWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 12,
      marginBottom: 24,
    },
    dot: {
      height: 8,
      borderRadius: 4,
    },
    button: {
      alignSelf: 'stretch',
      marginHorizontal: 24,
    },
  });
