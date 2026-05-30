import React, { useState, useCallback } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { AppIcon, SoftScreen, cardShadow } from '../../components/ui/DesignPrimitives';
import { useAuthStore } from '../../store/authStore';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

const UNLOCK_NOTI_KEY = '@timeseal_unlock_noti';
const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '1';

const SUPPORT_EMAIL = 'support@timeseal.app';
const TERMS_URL = 'https://timeseal.app/terms';
const PRIVACY_URL = 'https://timeseal.app/privacy';

/* ─────────── FAQ Accordion Item ─────────── */

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable style={styles.faqItem} onPress={() => setOpen(!open)}>
      <View style={styles.faqQuestionRow}>
        <Text style={styles.faqQuestionText}>{q}</Text>
        <AppIcon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
      </View>
      {open && (
        <View style={styles.faqAnswerContainer}>
          <Text style={styles.faqAnswerText}>{a}</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ─────────── Main SettingsScreen ─────────── */

export function SettingsScreen() {
  const navigation = useNavigation();
  const { colors, isDark, toggleDarkMode } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [unlockNoti, setUnlockNoti] = useState(true);
  const reduceMotion = useAuthStore(s => s.reduceMotion);
  const setReduceMotion = useAuthStore(s => s.setReduceMotion);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const isLoading = useAuthStore(s => s.isLoading);
  const refreshProfile = useAuthStore(s => s.refreshProfile);

  const [showEditName, setShowEditName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);

  const [biometricLock, setBiometricLock] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Load persisted settings on mount
  React.useEffect(() => {
    AsyncStorage.getItem('@timeseal_biometric_lock').then(val => {
      setBiometricLock(val === '1');
    });
    AsyncStorage.getItem(UNLOCK_NOTI_KEY).then(val => {
      if (val !== null) {
        setUnlockNoti(val === '1');
      }
    });
  }, []);

  /* ── Actions ── */

  const handleSaveName = async () => {
    if (!user?.id || !newName.trim()) return;
    setIsSavingName(true);
    try {
      await firestore().collection('users').doc(user.id).update({ displayName: newName.trim() });
      const currentUser = auth().currentUser;
      if (currentUser) {
        await currentUser.updateProfile({ displayName: newName.trim() });
      }
      await refreshProfile();
      setShowEditName(false);
      Alert.alert('Thành công', 'Tên hiển thị đã được cập nhật.');
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật tên. Vui lòng thử lại.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleToggleUnlockNoti = useCallback((val: boolean) => {
    setUnlockNoti(val);
    AsyncStorage.setItem(UNLOCK_NOTI_KEY, val ? '1' : '0');
  }, []);

  const handleToggleBiometric = useCallback((val: boolean) => {
    setBiometricLock(val);
    AsyncStorage.setItem('@timeseal_biometric_lock', val ? '1' : '0');
  }, []);

  const handleContactSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=TimeSeal%20Support`);
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  const switchTrackColor = {
    false: isDark ? '#3A3A3C' : '#D1D1D6',
    true: colors.primary,
  };

  /* ── Render ── */
  return (
    <SoftScreen variant="teal">
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Tài khoản ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tài khoản</Text>

            <Pressable style={styles.accountRow} onPress={() => setShowEditName(true)}>
              <AppIcon name="person-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>Tên hiển thị</Text>
              <Text style={styles.rowValue} numberOfLines={1}>{user?.displayName || 'Chưa đặt'}</Text>
              <AppIcon name="chevron-forward" size={17} color={colors.mutedText} />
            </Pressable>

            <View style={styles.divider} />

            <View style={styles.accountRow}>
              <AppIcon name="mail-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowValue} numberOfLines={1}>{user?.email || '—'}</Text>
            </View>
          </View>

          {/* ── Thông báo ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông báo</Text>
            <View style={styles.row}>
              <AppIcon name="notifications-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>Thông báo khi capsule mở</Text>
              <Switch
                value={unlockNoti}
                onValueChange={handleToggleUnlockNoti}
                trackColor={switchTrackColor}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* ── Giao diện ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Giao diện</Text>

            <View style={styles.row}>
              <AppIcon name="moon-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>Chế độ tối</Text>
              <Switch
                value={isDark}
                onValueChange={toggleDarkMode}
                trackColor={switchTrackColor}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <AppIcon name="flash-off-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>Giảm chuyển động</Text>
              <Switch
                value={reduceMotion}
                onValueChange={setReduceMotion}
                trackColor={switchTrackColor}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* ── Bảo mật ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bảo mật</Text>

            <View style={styles.row}>
              <AppIcon name="finger-print-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>Khoá bằng sinh trắc học</Text>
              <Switch
                value={biometricLock}
                onValueChange={handleToggleBiometric}
                trackColor={switchTrackColor}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <Pressable
              style={styles.linkRow}
              onPress={() => (navigation as any).navigate('HighSecurity')}>
              <AppIcon name="shield-outline" size={18} color={colors.danger} />
              <Text style={[styles.rowLabel, { color: colors.danger }]}>Bảo mật cao</Text>
              <AppIcon name="chevron-forward" size={17} color={colors.mutedText} />
            </Pressable>
          </View>

          {/* ── Hỗ trợ ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hỗ trợ</Text>

            <Pressable style={styles.linkRow} onPress={() => setShowFaq(true)}>
              <AppIcon name="help-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.linkLabel}>Câu hỏi thường gặp</Text>
              <AppIcon name="chevron-forward" size={17} color={colors.mutedText} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.linkRow} onPress={handleContactSupport}>
              <AppIcon name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
              <Text style={styles.linkLabel}>Liên hệ hỗ trợ</Text>
              <AppIcon name="chevron-forward" size={17} color={colors.mutedText} />
            </Pressable>
          </View>

          {/* ── Pháp lý ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pháp lý</Text>

            <Pressable style={styles.linkRow} onPress={() => setShowTerms(true)}>
              <AppIcon name="document-text-outline" size={18} color={colors.primary} />
              <Text style={styles.linkLabel}>Điều khoản sử dụng</Text>
              <AppIcon name="chevron-forward" size={17} color={colors.mutedText} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.linkRow} onPress={() => setShowPrivacy(true)}>
              <AppIcon name="shield-checkmark-outline" size={18} color={colors.primary} />
              <Text style={styles.linkLabel}>Chính sách bảo mật</Text>
              <AppIcon name="chevron-forward" size={17} color={colors.mutedText} />
            </Pressable>
          </View>

          {/* ── Dung lượng ── */}
          <View style={styles.section}>
            <Pressable
              style={styles.linkRow}
              onPress={() => (navigation as any).navigate('StorageManagement')}>
              <AppIcon name="server-outline" size={18} color={colors.primary} />
              <Text style={styles.linkLabel}>Quản lý dung lượng</Text>
              <AppIcon name="chevron-forward" size={17} color={colors.mutedText} />
            </Pressable>
          </View>

          {/* ── Đăng xuất ── */}
          <Pressable style={styles.logoutButton} onPress={handleLogout} disabled={isLoading}>
            <AppIcon name="log-out-outline" size={18} color={colors.danger} />
            <Text style={styles.logoutLabel}>
              {isLoading ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </Text>
          </Pressable>

          {/* ── Version ── */}
          <Text style={styles.versionText}>TimeSeal v{APP_VERSION} (build {BUILD_NUMBER})</Text>

        </ScrollView>
      </SafeAreaView>

      {/* ═══════ MODALS ═══════ */}

      {/* ── Edit Name Modal ── */}
      <Modal visible={showEditName} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Đổi tên hiển thị</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nhập tên mới"
              placeholderTextColor={colors.mutedText}
              maxLength={40}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setShowEditName(false)}>
                <Text style={styles.modalCancelText}>Huỷ</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, (!newName.trim() || isSavingName) && styles.disabledBtn]}
                onPress={handleSaveName}
                disabled={!newName.trim() || isSavingName}>
                <Text style={styles.modalConfirmText}>
                  {isSavingName ? 'Đang lưu...' : 'Lưu'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── FAQ Modal ── */}
      <Modal visible={showFaq} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.modalLarge]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Câu hỏi thường gặp</Text>
              <Pressable onPress={() => setShowFaq(false)}>
                <AppIcon name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.faqScroll}>
              <FAQItem
                q="TimeSeal là gì?"
                a="TimeSeal là ứng dụng Time Capsule kỹ thuật số, giúp bạn lưu giữ ký ức và mở lại vào một ngày trong tương lai."
              />
              <FAQItem
                q="Tôi có thể mở capsule sớm hơn không?"
                a="Không. Capsule được thiết kế để chỉ mở khi đến ngày bạn đã chọn. Đây là tính năng cốt lõi của TimeSeal."
              />
              <FAQItem
                q="Dữ liệu của tôi có an toàn không?"
                a="Có. Tất cả dữ liệu được mã hoá và lưu trữ trên hạ tầng Firebase của Google Cloud, đảm bảo bảo mật cao nhất."
              />
              <FAQItem
                q="Làm sao để nâng cấp gói Premium?"
                a="Vào trang Hồ sơ > bấm nút nâng cấp để xem các gói Premium có sẵn với nhiều tính năng mở rộng."
              />
              <FAQItem
                q="Tôi có thể mời bạn bè vào capsule chung?"
                a="Có! Khi tạo capsule, bạn có thể thêm email bạn bè ở bước 3. Họ sẽ nhận được lời mời và cùng đóng góp ký ức."
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Terms Modal ── */}
      <Modal visible={showTerms} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.modalLarge]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Điều khoản sử dụng</Text>
              <Pressable onPress={() => setShowTerms(false)}>
                <AppIcon name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.legalText}>
                {'Chào mừng bạn đến với TimeSeal. Bằng việc sử dụng ứng dụng, bạn đồng ý với các điều khoản sau:\n\n' +
                  '1. Tài khoản: Bạn chịu trách nhiệm bảo mật thông tin đăng nhập của mình.\n\n' +
                  '2. Nội dung: Bạn sở hữu toàn bộ nội dung mà bạn tạo ra trong TimeSeal. Chúng tôi không sử dụng nội dung của bạn cho bất kỳ mục đích thương mại nào.\n\n' +
                  '3. Capsule: Sau khi tạo, capsule không thể mở trước thời hạn. Đây là tính năng được thiết kế có chủ đích.\n\n' +
                  '4. Thanh toán: Các gói Premium được thanh toán qua Google Play. Bạn có thể huỷ bất cứ lúc nào.\n\n' +
                  '5. Chấm dứt: Chúng tôi có quyền tạm ngưng tài khoản vi phạm điều khoản sử dụng.\n\n' +
                  'Cập nhật lần cuối: Tháng 5, 2026.'}
              </Text>
              <Pressable style={styles.openExternalBtn} onPress={() => Linking.openURL(TERMS_URL)}>
                <Text style={styles.openExternalText}>Mở trên trình duyệt</Text>
                <AppIcon name="open-outline" size={15} color={colors.primary} />
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Privacy Modal ── */}
      <Modal visible={showPrivacy} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.modalLarge]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chính sách bảo mật</Text>
              <Pressable onPress={() => setShowPrivacy(false)}>
                <AppIcon name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.legalText}>
                {'TimeSeal cam kết bảo vệ quyền riêng tư của bạn.\n\n' +
                  '• Dữ liệu thu thập: Email, tên hiển thị, nội dung capsule (văn bản, hình ảnh, video).\n\n' +
                  '• Mục đích: Cung cấp dịch vụ TimeSeal, đồng bộ dữ liệu giữa các thiết bị.\n\n' +
                  '• Bảo mật: Dữ liệu được lưu trữ trên Firebase (Google Cloud) với mã hoá trong quá trình truyền tải và lưu trữ.\n\n' +
                  '• Chia sẻ: Chúng tôi KHÔNG bán hoặc chia sẻ dữ liệu cá nhân của bạn với bên thứ ba.\n\n' +
                  '• Xoá dữ liệu: Bạn có thể xoá tài khoản và toàn bộ dữ liệu bất cứ lúc nào qua mục Bảo mật cao.\n\n' +
                  'Cập nhật lần cuối: Tháng 5, 2026.'}
              </Text>
              <Pressable style={styles.openExternalBtn} onPress={() => Linking.openURL(PRIVACY_URL)}>
                <Text style={styles.openExternalText}>Mở trên trình duyệt</Text>
                <AppIcon name="open-outline" size={15} color={colors.primary} />
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SoftScreen>
  );
}

/* ─────────── Styles ─────────── */

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'transparent' },
    scrollContent: { padding: 16, paddingTop: 72, paddingBottom: 40 },

    // Sections
    section: {
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.primarySoft,
      borderRadius: 16,
      backgroundColor: colors.card,
      padding: 12,
      ...cardShadow,
    },
    sectionTitle: {
      color: colors.mutedText,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 8,
      textTransform: 'uppercase',
    },

    // Row / link
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
      gap: 10,
    },
    rowLabel: { color: colors.text, fontSize: 14, flex: 1 },
    rowValue: { color: colors.mutedText, fontSize: 13, maxWidth: 160, textAlign: 'right' },
    accountRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    linkRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 10 },
    linkLabel: { color: colors.primary, fontWeight: '600', flex: 1 },
    divider: { height: 1, backgroundColor: colors.softBorder, marginVertical: 4 },

    // Logout
    logoutButton: {
      minHeight: 48,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 6,
      ...cardShadow,
    },
    logoutLabel: { color: colors.danger, fontSize: 15, fontWeight: '700' },

    // Version
    versionText: {
      textAlign: 'center',
      color: colors.mutedText,
      fontSize: 12,
      marginTop: 18,
      marginBottom: 8,
    },

    // Modal shared
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      maxHeight: '55%',
    },
    modalLarge: { maxHeight: '75%' },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
    modalInput: {
      borderWidth: 1,
      borderColor: colors.softBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.background,
      marginBottom: 16,
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    modalCancelBtn: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.background,
    },
    modalCancelText: { color: colors.mutedText, fontWeight: '600' },
    modalConfirmBtn: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    modalConfirmText: { color: '#FFFFFF', fontWeight: '700' },
    disabledBtn: { opacity: 0.45 },

    // FAQ
    faqScroll: { maxHeight: '100%' },
    faqItem: {
      borderBottomWidth: 1,
      borderBottomColor: colors.softBorder,
      paddingVertical: 12,
    },
    faqQuestionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    faqQuestionText: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
    faqAnswerContainer: { marginTop: 8 },
    faqAnswerText: { color: colors.mutedText, fontSize: 13, lineHeight: 20 },

    // Legal
    legalText: { color: colors.text, fontSize: 14, lineHeight: 22 },
    openExternalBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 16,
      marginBottom: 8,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
    },
    openExternalText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  });
