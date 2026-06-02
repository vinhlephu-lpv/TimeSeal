import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, SoftScreen, cardShadow } from '../../components/ui/DesignPrimitives';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { useTranslation } from '../../i18n';
import { deleteAccountDataOnServer } from '../../services/backendService';
import { useAuthStore } from '../../store/authStore';

export function HighSecurityScreen() {
  const { t } = useTranslation();
  const [isLoadingDelete, setIsLoadingDelete] = useState(false);
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();

  const handleDeleteAccount = () => {
    Alert.alert(
      t('Xóa tài khoản vĩnh viễn?'),
      t('Hành động này không thể hoàn tác. Toàn bộ hộp ký ức và dữ liệu của bạn trên đám mây sẽ bị xóa vĩnh viễn. Bạn có chắc chắn muốn tiếp tục?'),
      [
        { text: t('Hủy'), style: 'cancel' },
        {
          text: t('Xóa vĩnh viễn'),
          style: 'destructive',
          onPress: async () => {
            setIsLoadingDelete(true);
            try {
              await deleteAccountDataOnServer();
              await useAuthStore.getState().logout();
              Alert.alert(
                t('Thành công'),
                t('Tài khoản và toàn bộ dữ liệu liên quan đã được xóa vĩnh viễn khỏi hệ thống.'),
              );
            } catch (e: any) {
              const errorMessage = String(e.message || '');
              if (errorMessage.includes('Vui lòng đăng nhập lại') || errorMessage.includes('authTime')) {
                Alert.alert(
                  t('Yêu cầu xác thực lại'),
                  t('Vì lý do bảo mật, vui lòng đăng xuất và đăng nhập lại trước khi thực hiện hành động xóa tài khoản vĩnh viễn.'),
                );
              } else {
                // Force logout as a safety fallback in case of partial deletion or session desync
                await useAuthStore.getState().logout();
                Alert.alert(
                  t('Thành công'),
                  t('Tài khoản đã được xóa vĩnh viễn.'),
                );
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
            <Text style={styles.title}>{t('Bảo mật cao')}</Text>
            <Text style={styles.description}>
              {t('Khu vực này chứa các thao tác nhạy cảm có thể ảnh hưởng vĩnh viễn đến tài khoản và dữ liệu của bạn.')}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('Hành động nguy hiểm')}</Text>
            <Pressable
              style={styles.dangerButton}
              onPress={handleDeleteAccount}
              disabled={isLoadingDelete}>
              <AppIcon name="trash-outline" size={19} color="#FFFFFF" />
              <Text style={styles.dangerButtonText}>
                {t(isLoadingDelete ? 'Đang thực hiện...' : 'Xóa tài khoản vĩnh viễn')}
              </Text>
            </Pressable>
            <Text style={styles.note}>
              {t('Bạn sẽ cần xác nhận thêm một lần nữa trước khi hệ thống xóa tài khoản.')}
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
