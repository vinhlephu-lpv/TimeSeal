import React from 'react';
import { Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { AppIcon, ElevatedCard, PolishedInput, PrimaryButton, SoftScreen } from '../../components/ui/DesignPrimitives';
import { useTranslation } from '../../i18n';
import { normalizeInviteCode } from '../../services/inviteService';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type Props = NativeStackScreenProps<AppStackParamList, 'InviteCode'>;

export function InviteCodeScreen({ navigation }: Props) {
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Animation values
  const glowScale = useSharedValue(1);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);

  // 1. Hide default stack navigator header to prevent overlap
  // 2. Trigger entry and pulse animations on mount
  // 3. Register keyboard listeners to dynamically shrink UI spacing
  React.useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });

    // Outer ring breathing glow pulse animation
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Entry slide up + fade in animations
    contentOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    contentTranslateY.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) });

    // Keyboard listeners
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [navigation]);

  const submit = () => {
    const inviteCode = normalizeInviteCode(code);
    if (!inviteCode) {
      setError(t('Nhập mã mời hoặc liên kết mời trước đã.'));
      return;
    }
    setError('');
    navigation.navigate('InviteAccept', { inviteCode });
  };

  // Reanimated style declarations
  const outerGlowStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  const outerGlowStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + (glowScale.value - 1) * 0.7 }],
  }));

  const outerGlowStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + (glowScale.value - 1) * 0.4 }],
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <SoftScreen>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      
      {/* Custom Premium Header Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.softBorder }]}
          onPress={() => navigation.goBack()}
        >
          <AppIcon name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('Nhận ký ức')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(24, insets.bottom + 16) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.contentWrap, animatedContentStyle]}>
            {/* Visual key illustration badge with breathe pulse animation - hidden when keyboard is active to free up vertical space */}
            {!isKeyboardVisible && (
              <View style={styles.illustrationWrapper}>
                <Animated.View style={[styles.glowRing1, outerGlowStyle1, { backgroundColor: colors.primarySoft, opacity: 0.22 }]} />
                <Animated.View style={[styles.glowRing2, outerGlowStyle2, { backgroundColor: colors.primarySoft, opacity: 0.38 }]} />
                <Animated.View style={[styles.glowRing3, outerGlowStyle3, { backgroundColor: colors.primarySoft, opacity: 0.6 }]} />
                <Animated.View style={[styles.iconContainer, { backgroundColor: 'transparent' }]}>
                  <Image
                    source={require('../../assets/icon-app/Icon-app.png')}
                    style={styles.appIconImage}
                    resizeMode="contain"
                  />
                </Animated.View>
              </View>
            )}

            {/* Text details */}
            <Text style={styles.title}>{t('Nhập mã mời')}</Text>
            <Text style={styles.subtitle}>
              {t('Dán mã khóa hoặc liên kết mời bạn nhận được từ người thân để mở khóa và cùng lưu trữ hộp ký ức.')}
            </Text>

            {/* Input card wrapper */}
            <ElevatedCard style={styles.card}>
              <PolishedInput
                iconName="mail-open-outline"
                value={code}
                onChangeText={(text) => {
                  setCode(text);
                  if (error) { setError(''); }
                }}
                placeholder={t('Ví dụ: abc123xyz hoặc đường dẫn mời...')}
                autoCapitalize="none"
                autoCorrect={false}
                error={Boolean(error)}
                containerStyle={styles.input}
              />
              
              {error ? (
                <View style={styles.errorContainer}>
                  <AppIcon name="alert-circle-outline" size={14} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : (
                <Text style={styles.helperText}>
                  {t('* Mã mời thường có dạng một dãy chữ và số ngắn hoặc một đường link.')}
                </Text>
              )}

              <PrimaryButton
                label={t('Kiểm tra lời mời')}
                iconName="arrow-forward-outline"
                onPress={submit}
                style={styles.button}
              />
            </ElevatedCard>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SoftScreen>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    keyboardAvoid: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'flex-start',
      paddingHorizontal: 20,
      paddingTop: 30,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      zIndex: 10,
    },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    contentWrap: {
      alignItems: 'center',
      marginTop: 10,
    },
    illustrationWrapper: {
      width: 180,
      height: 180,
      position: 'relative',
      marginBottom: 24,
    },
    glowRing1: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 180,
      height: 180,
      borderRadius: 90,
    },
    glowRing2: {
      position: 'absolute',
      top: 15,
      left: 15,
      width: 150,
      height: 150,
      borderRadius: 75,
    },
    glowRing3: {
      position: 'absolute',
      top: 30,
      left: 30,
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    iconContainer: {
      position: 'absolute',
      top: 42,
      left: 42,
      width: 96,
      height: 96,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appIconImage: {
      width: 96,
      height: 96,
    },
    title: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '800',
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 10,
      color: colors.mutedText,
      fontSize: 14,
      lineHeight: 22,
      textAlign: 'center',
      paddingHorizontal: 12,
      marginBottom: 28,
    },
    card: {
      alignSelf: 'stretch',
      padding: 20,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.softBorder,
      backgroundColor: colors.card,
    },
    input: {
      alignSelf: 'stretch',
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      paddingHorizontal: 4,
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '500',
    },
    helperText: {
      marginTop: 10,
      color: colors.mutedText,
      fontSize: 11,
      fontStyle: 'italic',
      paddingHorizontal: 4,
    },
    button: {
      alignSelf: 'stretch',
      marginTop: 24,
    },
  });
