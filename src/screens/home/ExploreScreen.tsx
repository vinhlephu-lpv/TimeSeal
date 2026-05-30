import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { AppIcon, ElevatedCard, PrimaryButton, SoftScreen } from '../../components/ui/DesignPrimitives';

export function ExploreScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <SoftScreen variant="info">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ElevatedCard style={styles.card}>
            <View style={styles.iconWrap}>
              <AppIcon name="compass-outline" size={40} color={colors.info} />
            </View>
            <Text style={styles.title}>Khám phá</Text>
            <Text style={styles.subtitle}>Tính năng này sẽ được mở ở giai đoạn 2. Hãy theo dõi để không bỏ lỡ nhé!</Text>
            <PrimaryButton label="Nhận thông báo khi ra mắt" variant="outline" style={styles.button} />
          </ElevatedCard>
        </View>
      </SafeAreaView>
    </SoftScreen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 32,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 14,
    color: colors.mutedText,
    textAlign: 'center',
  },
  button: {
    marginTop: 22,
    alignSelf: 'stretch',
  },
});
