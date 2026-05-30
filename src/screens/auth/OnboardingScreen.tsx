import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import {
  MemoryIllustration,
  PrimaryButton,
  SoftScreen,
} from '../../components/ui/DesignPrimitives';
import Animated, {
  type SharedValue,
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  interpolateColor,
} from 'react-native-reanimated';

type OnboardingScreenProps = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const slides = [
  {
    title: 'Ghi lại khoảnh khắc ý nghĩa',
    body: 'Ảnh, lời nhắn và cảm xúc của bạn được cất giữ an toàn.',
    visual: 'photo',
    tone: 'light',
  },
  {
    title: 'Khoá đến ngày bạn chọn',
    body: 'Chọn mốc thời gian và để TimeSeal giữ ký ức cho bạn.',
    visual: 'lock',
    tone: 'teal',
  },
  {
    title: 'Mở ra và sống lại ký ức đó',
    body: 'Đúng ngày hẹn, capsule sẽ mở lại như một món quà bất ngờ.',
    visual: 'envelope',
    tone: 'warm',
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

function OnboardingSlideItem({ item, itemIndex, width, scrollX }: SlideItemProps) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
        <MemoryIllustration variant={item.visual} />
      </Animated.View>

      <View style={styles.contentWrap}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <SoftScreen variant={activeSlide.tone}>
        <View style={styles.container}>
          {!isLast ? (
            <Pressable
              style={styles.skipButton}
              onPress={() => {
                finishOnboarding();
                navigation.replace('Login');
              }}>
              <Text style={styles.skipLabel}>Bỏ qua</Text>
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
            label={isLast ? 'Bắt đầu' : 'Tiếp theo'}
            iconName={isLast ? 'sparkles-outline' : 'arrow-forward-outline'}
            onPress={onNext}
            style={styles.button}
          />
        </View>
      </SoftScreen>
    </SafeAreaView>
  );
}

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
      marginBottom: 40,
    },
    contentWrap: {
      alignItems: 'center',
      width: '100%',
    },
    title: {
      fontSize: 22,
      lineHeight: 32,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 16,
    },
    body: {
      color: colors.mutedText,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      paddingHorizontal: 16,
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
