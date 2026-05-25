import React, { useMemo, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { AppIcon, PolishedInput, PrimaryButton, SoftScreen } from '../../components/ui/DesignPrimitives';

type CreateStep1ScreenProps = NativeStackScreenProps<AppStackParamList, 'CreateStep1'>;

const themes = [
  { key: 'default', label: '🎨 Mặc định' },
  { key: 'birthday', label: '🎂 Sinh nhật' },
  { key: 'new_year', label: '🎆 Năm mới' },
  { key: 'graduation', label: '🎓 Tốt nghiệp' },
] as const;

export function CreateStep1Screen({ navigation }: CreateStep1ScreenProps) {
  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  }, []);

  const [title, setTitle] = useState('');
  const [openDate, setOpenDate] = useState(tomorrow);
  const [theme, setTheme] = useState<(typeof themes)[number]['key']>('default');
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');

  const onNext = () => {
    if (!title.trim()) {
      setError('Tiêu đề là bắt buộc.');
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

  return (
    <SoftScreen variant="warm">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.step}>Bước 1/4</Text>
          <Text style={styles.heading}>Thông tin cơ bản</Text>

          <Text style={styles.label}>Tiêu đề capsule *</Text>
          <PolishedInput
            iconName="cube-outline"
            value={title}
            onChangeText={setTitle}
            maxLength={60}
            placeholder="Nhập tiêu đề capsule"
            containerStyle={styles.input}
          />

          <Text style={styles.counter}>{title.length}/60</Text>

          <Text style={styles.label}>Ngày mở *</Text>
          <Pressable style={styles.dateInput} onPress={() => setShowPicker(true)}>
            <AppIcon name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.dateText}>{openDate.toLocaleDateString('vi-VN')}</Text>
          </Pressable>

          {showPicker ? (
            <DateTimePicker
              value={openDate}
              minimumDate={tomorrow}
              mode="date"
              onChange={(_, selectedDate) => {
                setShowPicker(false);
                if (selectedDate) {
                  setOpenDate(selectedDate);
                }
              }}
            />
          ) : null}

          <Text style={styles.label}>Chủ đề giao diện</Text>
          <View style={styles.themeRow}>
            {themes.map(item => {
              const active = item.key === theme;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setTheme(item.key)}
                  style={[styles.themeChip, active && styles.activeThemeChip]}>
                  <Text style={[styles.themeLabel, active && styles.activeThemeLabel]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton label="Tiếp theo" iconName="arrow-forward-outline" onPress={onNext} style={styles.button} />
        </View>
      </SafeAreaView>
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 72,
  },
  step: {
    color: colors.mutedText,
    fontSize: 12,
  },
  heading: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    marginTop: 20,
    fontSize: 13,
    color: colors.mutedText,
  },
  input: {
    marginTop: 8,
  },
  counter: {
    marginTop: 6,
    textAlign: 'right',
    fontSize: 12,
    color: colors.mutedText,
  },
  dateInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.softBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    color: colors.text,
    fontSize: 15,
  },
  themeRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  activeThemeChip: {
    borderColor: colors.primary,
    backgroundColor: '#EEEDFE',
  },
  themeLabel: {
    color: colors.text,
    fontSize: 13,
  },
  activeThemeLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
  error: {
    marginTop: 14,
    color: colors.danger,
    fontSize: 13,
  },
  button: {
    marginTop: 24,
  },
});
