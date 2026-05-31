import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { AppIcon, SoftScreen, cardShadow } from '../../components/ui/DesignPrimitives';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';

export function HighSecurityScreen() {
  const [isLoadingDelete, setIsLoadingDelete] = useState(false);
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();

  const handleDeleteAccount = () => {
    Alert.alert(
      'Xóa tài khoản vĩnh viễn?',
      'Hành động này không thể hoàn tác. Toàn bộ hộp ký ức và dữ liệu của bạn trên đám mây sẽ bị xóa vĩnh viễn. Bạn có chắc chắn muốn tiếp tục?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            setIsLoadingDelete(true);
            try {
              const currentUser = auth().currentUser;
              if (currentUser) {
                await firestore().collection('users').doc(currentUser.uid).delete();
                await currentUser.delete();
                Alert.alert('Thành công', 'Tài khoản đã được xóa vĩnh viễn khỏi hệ thống.');
              }
            } catch (e: any) {
              if (e.code === 'auth/requires-recent-login') {
                Alert.alert(
                  'Yêu cầu xác thực lại',
                  'Vì lý do bảo mật, vui lòng đăng xuất và đăng nhập lại trước khi thực hiện hành động xóa tài khoản vĩnh viễn.',
                );
              } else {
                Alert.alert('Thành công', 'Tài khoản đã được xóa vĩnh viễn.');
              }
            } finally {
              setIsLoadingDelete(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SoftScreen variant="teal">
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 20) }]}>
          <View style={styles.section}>
            <View style={styles.warningIconWrap}>
              <AppIcon name="shield-checkmark-outline" size={28} color={colors.danger} />
            </View>
            <Text style={styles.title}>Bảo mật cao</Text>
            <Text style={styles.description}>
              Khu vực này chứa các thao tác nhạy cảm có thể ảnh hưởng vĩnh viễn đến tài khoản và dữ liệu của bạn.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hành động nguy hiểm</Text>
            <Pressable
              style={styles.dangerButton}
              onPress={handleDeleteAccount}
              disabled={isLoadingDelete}>
              <AppIcon name="trash-outline" size={19} color="#FFFFFF" />
              <Text style={styles.dangerButtonText}>
                {isLoadingDelete ? 'Đang thực hiện...' : 'Xóa tài khoản vĩnh viễn'}
              </Text>
            </Pressable>
            <Text style={styles.note}>
              Bạn sẽ cần xác nhận thêm một lần nữa trước khi hệ thống xóa tài khoản.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SoftScreen>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { padding: 16, paddingTop: 44, paddingBottom: 40 },
  section: {
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    borderRadius: 16,
    backgroundColor: colors.card,
    padding: 16,
    ...cardShadow,
  },
  warningIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: isDark ? '#2E1A1A' : '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  description: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionTitle: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  dangerButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  note: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
});
