import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import {
  MemoryIllustration,
  PrimaryButton,
  SoftScreen,
  StepDots,
} from '../../components/ui/DesignPrimitives';

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

export function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const finishOnboarding = useAuthStore(state => state.finishOnboarding);
  const [index, setIndex] = useState(0);

  const isLast = useMemo(() => index === slides.length - 1, [index]);

  const onNext = () => {
    if (isLast) {
      finishOnboarding();
      navigation.replace('Login');
      return;
    }

    setIndex(prev => prev + 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SoftScreen variant={slides[index].tone}>
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

        <MemoryIllustration variant={slides[index].visual} />
        <Text style={styles.title}>{slides[index].title}</Text>
        <Text style={styles.body}>{slides[index].body}</Text>

        <StepDots total={slides.length} active={index} />

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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 42,
    paddingBottom: 28,
  },
  skipButton: {
    position: 'absolute',
    right: 24,
    top: 18,
    zIndex: 2,
    padding: 8,
  },
  skipLabel: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    marginTop: -10,
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    marginTop: -22,
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  button: {
    width: '100%',
  },
});
