import React, { useMemo, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Pressable, StyleSheet, Text, View, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import { AppIcon, PolishedInput, PrimaryButton } from '../../components/ui/DesignPrimitives';
import { capsuleThemes, ThemeBackground } from '../../theme/capsuleThemes';
import type { CapsuleTheme } from '../../types/models';
import { PremiumModal } from '../../components/modals/PremiumModal';

type CreateStep1ScreenProps = NativeStackScreenProps<AppStackParamList, 'CreateStep1'>;

const THEME_OPTIONS: Array<CapsuleTheme> = [
  'default',
  'vintage',
  'cyberpunk',
  'aurora',
  'zen',
  'sunset',
  'royal',
  'crystal',
  'starry',
];

export function CreateStep1Screen({ navigation }: CreateStep1ScreenProps) {
  const user = useAuthStore(state => state.user);
  const isPremium = Boolean(user?.isPremium);

  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  }, []);

  const [title, setTitle] = useState('');
  const [openDate, setOpenDate] = useState(tomorrow);
  const [theme, setTheme] = useState<CapsuleTheme>('default');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [error, setError] = useState('');
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const activeTheme = capsuleThemes[theme] || capsuleThemes.default;
  const tc = activeTheme.colors;
  const insets = useSafeAreaInsets();

  const onSelectTheme = (selectedKey: CapsuleTheme) => {
    const targetConfig = capsuleThemes[selectedKey];
    if (targetConfig.isPremium && !isPremium) {
      // User is free and selected a premium theme -> trigger PremiumModal
      setShowPremiumModal(true);
      return;
    }
    setTheme(selectedKey);
  };

  const openDateTimePicker = () => {
    setPickerMode('date');
    setShowPicker(true);
  };

  const onPickerChange = (_: unknown, selectedDate?: Date) => {
    if (!selectedDate) {
      setShowPicker(false);
      return;
    }

    if (pickerMode === 'date') {
      const nextDate = new Date(openDate);
      nextDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setOpenDate(nextDate);
      setPickerMode('time');
      setShowPicker(false);
      setTimeout(() => setShowPicker(true), 120);
      return;
    }

    const nextDate = new Date(openDate);
    nextDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    setOpenDate(nextDate);
    setShowPicker(false);
  };

  const onNext = () => {
    if (!title.trim()) {
      setError('Tiêu đề là bắt buộc.');
      return;
    }

    if (title.trim().length > 51) {
      setError('Tiêu đề không được vượt quá 51 ký tự.');
      return;
    }

    const now = new Date();
    if (openDate <= now) {
      setError('Ngày mở phải sau hôm nay.');
      return;
    }

    setError('');
    navigation.navigate('CreateStep2', {
      title: title.trim(),
      openDateISO: openDate.toISOString(),
      theme,
    });
  };

  const formattedDateString = `${openDate.toLocaleDateString('vi-VN')} lúc ${openDate.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  return (
    <View style={styles.screen}>
      <ThemeBackground themeKey={theme} />
      <StatusBar barStyle={activeTheme.statusBar} translucent backgroundColor="transparent" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={[styles.backBtn, { backgroundColor: tc.inputBg, borderColor: tc.cardBorder }]} onPress={() => navigation.goBack()}>
            <AppIcon name="chevron-back" size={22} color={tc.primary} />
          </Pressable>
          <View style={[styles.badge, { backgroundColor: tc.activeChipBg, borderColor: tc.activeChipBorder }]}>
            <Text style={[styles.badgeText, { color: tc.activeChipText }]}>Bước 1/4</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.introSection}>
            <Text style={[styles.heading, { color: tc.text }]}>Khởi Tạo Hành Trình</Text>
            <Text style={[styles.subheading, { color: tc.mutedText }]}>
              Thiết lập các thông tin cơ bản và lựa chọn chiếc hộp thời gian nghệ thuật của bạn.
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <Text style={[styles.label, { color: tc.mutedText }]}>TIÊU ĐỀ CAPSULE *</Text>
            <PolishedInput
              iconName="cube-outline"
              value={title}
              onChangeText={setTitle}
              maxLength={51}
              placeholder="Nhập tiêu đề capsule..."
              placeholderTextColor={tc.inputPlaceholder}
              containerStyle={[styles.input, { backgroundColor: tc.inputBg, borderColor: tc.inputBorder }]}
              style={{ color: tc.text }}
            />
            <Text style={[styles.counter, { color: tc.mutedText }]}>{title.length}/51</Text>

            <Text style={[styles.label, { color: tc.mutedText, marginTop: 14 }]}>NGÀY MỞ *</Text>
            <Pressable
              style={[styles.dateInput, { backgroundColor: tc.inputBg, borderColor: tc.inputBorder }]}
              onPress={openDateTimePicker}>
              <AppIcon name="calendar-outline" size={18} color={tc.primary} />
              <Text style={[styles.dateText, { color: tc.text }]}>{formattedDateString}</Text>
            </Pressable>

            {showPicker ? (
              <DateTimePicker
                value={openDate}
                minimumDate={pickerMode === 'date' ? new Date() : undefined}
                mode={pickerMode}
                is24Hour
                onChange={onPickerChange}
              />
            ) : null}
          </View>

          {/* Theme Section */}
          <View style={styles.themeSection}>
            <Text style={[styles.sectionTitle, { color: tc.text }]}>Chủ Đề Thiết Kế</Text>
            <Text style={[styles.sectionSubtitle, { color: tc.mutedText }]}>
              Giao diện 4 bước sẽ đồng bộ theo tác phẩm nghệ thuật bạn chọn.
            </Text>

            <View style={styles.themeGrid}>
              {THEME_OPTIONS.map(key => {
                const config = capsuleThemes[key];
                const active = key === theme;
                const locked = config.isPremium && !isPremium;

                return (
                  <Pressable
                    key={key}
                    onPress={() => onSelectTheme(key)}
                    style={[
                      styles.themeChip,
                      { backgroundColor: tc.cardBg, borderColor: tc.cardBorder },
                      active && [styles.activeChip, { backgroundColor: tc.activeChipBg, borderColor: tc.activeChipBorder }],
                    ]}>
                    <View style={styles.chipHeader}>
                      <Text style={styles.emoji}>{config.emoji}</Text>
                      {locked && <AppIcon name="lock-closed" size={14} color="#D4AF37" style={styles.lockIcon} />}
                    </View>
                    <Text style={[styles.themeLabel, { color: active ? tc.activeChipText : tc.text }, active && styles.boldText]}>
                      {config.name}
                    </Text>

                    {/* Color Preview Dots */}
                    <View style={styles.colorPreview}>
                      <View style={[styles.colorDot, { backgroundColor: config.colors.primary }]} />
                      <View style={[styles.colorDot, { backgroundColor: config.colors.background }]} />
                      <View style={[styles.colorDot, { backgroundColor: config.colors.cardBorder }]} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label="Tiếp theo"
            iconName="arrow-forward-outline"
            onPress={onNext}
            style={[styles.button, { backgroundColor: tc.buttonBg }]}
          />
        </ScrollView>
      </SafeAreaView>

      <PremiumModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    height: 60,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    borderWidth: 1.2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  introSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  input: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1.2,
  },
  counter: {
    marginTop: 6,
    textAlign: 'right',
    fontSize: 11,
  },
  dateInput: {
    marginTop: 8,
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '500',
  },
  themeSection: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeChip: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 10,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  activeChip: {
    borderWidth: 2,
  },
  chipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  lockIcon: {
    marginTop: -2,
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  boldText: {
    fontWeight: '800',
  },
  colorPreview: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  error: {
    marginTop: 16,
    color: '#E24B4A',
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    marginTop: 30,
    borderRadius: 16,
    minHeight: 56,
  },
});
