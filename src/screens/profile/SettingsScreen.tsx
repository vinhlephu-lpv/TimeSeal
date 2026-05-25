import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { AppIcon, SoftScreen, cardShadow } from '../../components/ui/DesignPrimitives';

export function SettingsScreen() {
  const [unlockNoti, setUnlockNoti] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <SoftScreen variant="teal">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông báo</Text>
            <View style={styles.row}>
              <AppIcon name="notifications-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>Thông báo khi capsule mở</Text>
              <Switch value={unlockNoti} onValueChange={setUnlockNoti} />
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Giao diện</Text>
            <View style={styles.row}>
              <AppIcon name="moon-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>Chế độ tối (cơ bản)</Text>
              <Switch value={darkMode} onValueChange={setDarkMode} />
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pháp lý</Text>
            <Pressable style={styles.linkRow}>
              <AppIcon name="document-text-outline" size={18} color={colors.primary} />
              <Text style={styles.linkLabel}>Điều khoản sử dụng</Text>
              <AppIcon name="chevron-forward" size={17} color={colors.mutedText} />
            </Pressable>
            <Pressable style={styles.linkRow}>
              <AppIcon name="shield-checkmark-outline" size={18} color={colors.primary} />
              <Text style={styles.linkLabel}>Chính sách bảo mật</Text>
              <AppIcon name="chevron-forward" size={17} color={colors.mutedText} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, padding: 16, paddingTop: 72 },
  section: { marginBottom: 18, borderWidth: 1, borderColor: colors.primarySoft, borderRadius: 16, backgroundColor: '#FFFFFF', padding: 12, ...cardShadow },
  sectionTitle: { color: colors.mutedText, fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, gap: 10 },
  rowLabel: { color: colors.text, fontSize: 14, flex: 1 },
  linkRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkLabel: { color: colors.primary, fontWeight: '600', flex: 1 },
});
