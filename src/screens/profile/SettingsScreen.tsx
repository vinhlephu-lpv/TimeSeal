import React, { useState, useCallback } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PolishedAlert } from '../../store/alertStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { AppIcon, SoftScreen, cardShadow } from '../../components/ui/DesignPrimitives';
import { useAuthStore } from '../../store/authStore';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import ReactNativeBiometrics from 'react-native-biometrics';
import { useTranslation } from '../../i18n';
import { getLocalAppVersion } from '../../services/appUpdateService';
import { cancelAllLocalUnlockNotifications } from '../../services/localUnlockNotificationService';
import {
  BIOMETRIC_LOCK_DELAY_ENABLED_KEY,
  BIOMETRIC_LOCK_DELAY_VALUE_KEY,
  BIOMETRIC_LOCK_KEY,
  DEFAULT_BIOMETRIC_LOCK_DELAY_SECONDS,
  normalizeBiometricLockDelaySeconds,
} from '../../config/biometricLock';

const rnBiometrics = new ReactNativeBiometrics();

const UNLOCK_NOTI_KEY = '@timeseal_unlock_noti';

const SUPPORT_EMAIL = 'support.aurasoft1204@gmail.com';
const PRIVACY_POLICY_URL = 'https://gist.github.com/vinhlephu-lpv/e398f3a17c2a9ed823ed2aeffea69322';

/* ─────────── FAQ Accordion Item ─────────── */

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useTranslation();

  const [unlockNoti, setUnlockNoti] = useState(true);
  const [appVersion, setAppVersion] = useState('');
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
  const [showLanguage, setShowLanguage] = useState(false);

  const [graceEnabled, setGraceEnabled] = useState(true);
  const [graceValue, setGraceValue] = useState(DEFAULT_BIOMETRIC_LOCK_DELAY_SECONDS);
  const [showGraceModal, setShowGraceModal] = useState(false);

  // Biometric / Motion Generic Toast states
  const [toastConfig, setToastConfig] = useState<{ visible: boolean; message: string; type: 'success' | 'warning' | 'info' }>({
    visible: false,
    message: '',
    type: 'info',
  });
  const toastY = useSharedValue(120);
  const toastOpacity = useSharedValue(0);

  const animatedToastStyle = useAnimatedStyle(() => {
    return {
      opacity: toastOpacity.value,
      transform: [{ translateY: toastY.value }],
    };
  });

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setToastConfig({ visible: true, message, type });
  }, []);

  React.useEffect(() => {
    if (toastConfig.visible) {
      toastY.value = withSpring(0, { damping: 14, stiffness: 90 });
      toastOpacity.value = withTiming(1, { duration: 300 });
      const timer = setTimeout(() => {
        setToastConfig(prev => ({ ...prev, visible: false }));
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      toastY.value = withSpring(120, { damping: 14, stiffness: 90 });
      toastOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [toastConfig.visible, toastY, toastOpacity]);

  const handleToggleReduceMotion = useCallback((val: boolean) => {
    setReduceMotion(val);
    if (!val) {
      showToast(t('Tắt "Giảm chuyển động" có thể làm mỏi mắt hoặc ảnh hưởng đến sự mượt mà trên một số thiết bị.'), 'warning');
    }
  }, [setReduceMotion, showToast, t]);

  // Load persisted settings on mount
  React.useEffect(() => {
    getLocalAppVersion()
      .then(version => setAppVersion(version.versionName))
      .catch(() => {});
    AsyncStorage.getItem(UNLOCK_NOTI_KEY).then(val => {
      if (val !== null) {
        setUnlockNoti(val === '1');
      }
    });
    Promise.all([
      AsyncStorage.getItem(BIOMETRIC_LOCK_KEY),
      AsyncStorage.getItem(BIOMETRIC_LOCK_DELAY_ENABLED_KEY),
      AsyncStorage.getItem(BIOMETRIC_LOCK_DELAY_VALUE_KEY),
    ]).then(([lockValue, delayEnabledValue, delayValue]) => {
      const enabled = lockValue === '1';
      setBiometricLock(enabled);
      setGraceEnabled(enabled ? true : delayEnabledValue !== '0');
      setGraceValue(normalizeBiometricLockDelaySeconds(delayValue));
      if (enabled) {
        AsyncStorage.setItem(BIOMETRIC_LOCK_DELAY_ENABLED_KEY, '1').catch(() => {});
      }
    }).catch(() => {});
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
      PolishedAlert.show(t('Thành công'), t('Tên hiển thị đã được cập nhật.'));
    } catch {
      PolishedAlert.show(t('Lỗi'), t('Không thể cập nhật tên. Vui lòng thử lại.'));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleToggleUnlockNoti = useCallback((val: boolean) => {
    setUnlockNoti(val);
    AsyncStorage.setItem(UNLOCK_NOTI_KEY, val ? '1' : '0');
    if (!val) {
      cancelAllLocalUnlockNotifications().catch(() => {});
    }
    if (user?.id) {
      firestore().collection('users').doc(user.id).set(
        { unlockNotificationsEnabled: val },
        { merge: true },
      ).catch(() => {});
    }
  }, [user?.id]);

  const handleToggleBiometric = useCallback(async (val: boolean) => {
    if (val) {
      try {
        const { available } = await rnBiometrics.isSensorAvailable();
        if (!available) {
          PolishedAlert.show(t('Không khả dụng'), t('Thiết bị của bạn không hỗ trợ bảo mật sinh trắc học.'));
          setBiometricLock(false);
          return;
        }

        const { success } = await rnBiometrics.simplePrompt({
          promptMessage: t('Xác thực vân tay/Face ID để kích hoạt'),
        });

        if (success) {
          setBiometricLock(true);
          setGraceEnabled(true);
          await AsyncStorage.multiSet([
            [BIOMETRIC_LOCK_KEY, '1'],
            [BIOMETRIC_LOCK_DELAY_ENABLED_KEY, '1'],
            [BIOMETRIC_LOCK_DELAY_VALUE_KEY, String(graceValue || DEFAULT_BIOMETRIC_LOCK_DELAY_SECONDS)],
          ]);
          showToast(t('Đã bật xác thực sinh trắc học thành công!'), 'success');
        } else {
          setBiometricLock(false);
        }
      } catch (e) {
        console.log('Biometric activation error: ', e);
        PolishedAlert.show(t('Lỗi xác thực'), t('Không thể hoàn thành quét sinh trắc học.'));
        setBiometricLock(false);
      }
    } else {
      setBiometricLock(false);
      await AsyncStorage.setItem(BIOMETRIC_LOCK_KEY, '0');
    }
  }, [graceValue, showToast, t]);

  const handleToggleGrace = useCallback(async (val: boolean) => {
    if (!val) {
      setGraceEnabled(true);
      await AsyncStorage.setItem(BIOMETRIC_LOCK_DELAY_ENABLED_KEY, '1');
      return;
    }
    setGraceEnabled(true);
    await AsyncStorage.setItem(BIOMETRIC_LOCK_DELAY_ENABLED_KEY, '1');
  }, []);

  const handleSelectGraceValue = useCallback(async (secs: number) => {
    const normalizedSeconds = normalizeBiometricLockDelaySeconds(secs);
    setGraceValue(normalizedSeconds);
    await AsyncStorage.multiSet([
      [BIOMETRIC_LOCK_DELAY_ENABLED_KEY, '1'],
      [BIOMETRIC_LOCK_DELAY_VALUE_KEY, String(normalizedSeconds)],
    ]);
    setShowGraceModal(false);
  }, []);

  const handleContactSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=TimeSeal%20Support`);
  };

  const handleLogout = () => {
    PolishedAlert.show(t('Đăng xuất'), t('Bạn có chắc muốn đăng xuất?'), [
      { text: t('Hủy'), style: 'cancel' },
      { text: t('Đăng xuất'), style: 'destructive', onPress: logout },
    ]);
  };

  const switchTrackColor = {
    false: isDark ? '#3A3A3C' : '#D1D1D6',
    true: colors.primary,
  };
  /* ── Render ── */
  return (
    <SoftScreen variant="teal">
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 20) }]} showsVerticalScrollIndicator={false}>

          {/* ── Tài khoản ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('Tài khoản')}</Text>

            <Pressable style={styles.accountRow} onPress={() => setShowEditName(true)}>
              <AppIcon name="person-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>{t('Tên hiển thị')}</Text>
              <Text style={styles.rowValue} numberOfLines={1}>{user?.displayName || t('Chưa đặt')}</Text>
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
            <Text style={styles.sectionTitle}>{t('Thông báo')}</Text>
            <View style={styles.row}>
              <AppIcon name="notifications-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>{t('Thông báo khi hộp ký ức mở')}</Text>
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
            <Text style={styles.sectionTitle}>{t('Giao diện')}</Text>

            <View style={styles.row}>
              <AppIcon name="moon-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>{t('Chế độ tối')}</Text>
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
              <Text style={styles.rowLabel}>{t('Giảm chuyển động')}</Text>
              <Switch
                value={reduceMotion}
                onValueChange={handleToggleReduceMotion}
                trackColor={switchTrackColor}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <Pressable style={styles.linkRow} onPress={() => setShowLanguage(true)}>
              <AppIcon name="language-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>{t('Ngôn ngữ')}</Text>
              <Text style={styles.rowValue}>{language === 'vi' ? 'Tiếng Việt' : 'English'}</Text>
              <AppIcon name="chevron-forward" size={17} color={colors.mutedText} />
            </Pressable>
          </View>

          {/* ── Bảo mật ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('Bảo mật')}</Text>

            <View style={styles.row}>
              <AppIcon name="finger-print-outline" size={18} color={colors.primary} />
              <Text style={styles.rowLabel}>{t('Khóa bằng sinh trắc học')}</Text>
              <Switch
                value={biometricLock}
                onValueChange={handleToggleBiometric}
                trackColor={switchTrackColor}
                thumbColor="#FFFFFF"
              />
            </View>

            {biometricLock && (
              <>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <AppIcon name="time-outline" size={18} color={colors.primary} />
                  <Text style={styles.rowLabel}>{t('Thời gian tự động khóa')}</Text>
                  <Switch
                    value={graceEnabled}
                    onValueChange={handleToggleGrace}
                    trackColor={switchTrackColor}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {graceEnabled && (
                  <>
                    <View style={styles.divider} />
                    <Pressable style={styles.linkRow} onPress={() => setShowGraceModal(true)}>
                      <AppIcon name="hourglass-outline" size={18} color={colors.primary} />
                      <Text style={styles.rowLabel}>{t('Mốc thời gian chờ')}</Text>
                      <Text style={styles.rowValue}>
                        {t(graceValue === 15 ? '15 giây' : graceValue === 60 ? '1 phút' : graceValue === 300 ? '5 phút' : graceValue === 900 ? '15 phút' : 'Ngay lập tức')}
                      </Text>
                      <AppIcon name="chevron-forward" size={17} color={colors.mutedText} />
                    </Pressable>
                  </>
                )}
              </>
            )}

            <View style={styles.divider} />

            <Pressable
              style={styles.linkRow}
              onPress={() => (navigation as any).navigate('HighSecurity')}>
              <AppIcon name="shield-outline" size={18} color={colors.danger} />
              <Text style={[styles.rowLabel, { color: colors.danger }]}>{t('Bảo mật cao')}</Text>
              <AppIcon name="chevron-forward" size={17} color={colors.mutedText} />
            </Pressable>
          </View>

          {/* ── Hỗ trợ ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('Hỗ trợ')}</Text>

            <Pressable style={styles.linkRow} onPress={() => setShowFaq(true)}>
              <AppIcon name="help-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.linkLabel}>{t('Câu hỏi thường gặp')}</Text>
              <AppIcon name="chevron-forward" size={17} color={colors.mutedText} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.linkRow} onPress={handleContactSupport}>
              <AppIcon name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
              <Text style={styles.linkLabel}>{t('Liên hệ hỗ trợ')}</Text>
              <AppIcon name="chevron-forward" size={17} color={colors.mutedText} />
            </Pressable>
          </View>

          {/* ── Pháp lý ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('Pháp lý')}</Text>

            <Pressable style={styles.linkRow} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
              <AppIcon name="shield-checkmark-outline" size={18} color={colors.primary} />
              <Text style={styles.linkLabel}>{t('Chính sách quyền riêng tư & bảo mật')}</Text>
              <AppIcon name="open-outline" size={17} color={colors.mutedText} />
            </Pressable>
          </View>

          {/* ── Dung lượng ── */}
          <View style={styles.section}>
            <Pressable
              style={styles.linkRow}
              onPress={() => (navigation as any).navigate('StorageManagement')}>
              <AppIcon name="server-outline" size={18} color={colors.primary} />
              <Text style={styles.linkLabel}>{t('Quản lý dung lượng')}</Text>
              <AppIcon name="chevron-forward" size={17} color={colors.mutedText} />
            </Pressable>
          </View>

          {/* ── Đăng xuất ── */}
          <Pressable style={styles.logoutButton} onPress={handleLogout} disabled={isLoading}>
            <AppIcon name="log-out-outline" size={18} color={colors.danger} />
            <Text style={styles.logoutLabel}>
              {t(isLoading ? 'Đang đăng xuất...' : 'Đăng xuất')}
            </Text>
          </Pressable>

          {/* ── Version ── */}
          {appVersion ? <Text style={styles.versionText}>TimeSeal v{appVersion}</Text> : null}

        </ScrollView>
      </SafeAreaView>

      {/* ═══════ MODALS ═══════ */}

      {/* ── Edit Name Modal ── */}
      <Modal visible={showEditName} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('Đổi tên hiển thị')}</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder={t('Nhập tên mới')}
              placeholderTextColor={colors.mutedText}
              maxLength={40}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setShowEditName(false)}>
                <Text style={styles.modalCancelText}>{t('Hủy')}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, (!newName.trim() || isSavingName) && styles.disabledBtn]}
                onPress={handleSaveName}
                disabled={!newName.trim() || isSavingName}>
                <Text style={styles.modalConfirmText}>
                  {t(isSavingName ? 'Đang lưu...' : 'Lưu')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Language Modal ── */}
      <Modal visible={showLanguage} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('Chọn ngôn ngữ')}</Text>
            <Text style={[styles.faqAnswerText, { marginTop: 6, marginBottom: 12 }]}>
              {t('Ngôn ngữ sẽ được áp dụng ngay lập tức.')}
            </Text>
            {([
              { value: 'vi', label: 'Tiếng Việt' },
              { value: 'en', label: 'English' },
            ] as const).map(item => (
              <Pressable
                key={item.value}
                style={styles.languageRow}
                onPress={() => {
                  setLanguage(item.value).catch(() => {});
                  setShowLanguage(false);
                }}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                {language === item.value ? <AppIcon name="checkmark" size={18} color={colors.primary} /> : null}
              </Pressable>
            ))}
            <Pressable style={[styles.modalCancelBtn, { marginTop: 12, alignItems: 'center' }]} onPress={() => setShowLanguage(false)}>
              <Text style={styles.modalCancelText}>{t('Đóng')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── FAQ Modal ── */}
      <Modal visible={showFaq} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.modalLarge]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Câu hỏi thường gặp')}</Text>
              <Pressable onPress={() => setShowFaq(false)}>
                <AppIcon name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.faqScroll}>
              <FAQItem
                q={t('TimeSeal là gì?')}
                a={t('TimeSeal là chiếc hộp thời gian kỹ thuật số, giúp bạn cất giữ những lời nhắn, hình ảnh và video ý nghĩa để gửi tới chính mình hoặc những người thân yêu trong tương lai.')}
              />
              <FAQItem
                q={t('Tôi có thể mở hộp ký ức sớm hơn ngày hẹn không?')}
                a={t('Hoàn toàn không thể. Khi chiếc hộp đã được khóa và niêm phong, không ai (kể cả chính bạn hay nhà phát triển hệ thống) có thể mở ra trước mốc thời gian đã định. Đây là cam kết thiêng liêng để bảo toàn giá trị bất ngờ của ký ức.')}
              />
              <FAQItem
                q={t('Tại sao tôi không thể xóa hộp ký ức đang khóa?')}
                a={t('Để đảm bảo cam kết bảo toàn thời gian và ngăn chặn việc vô tình xóa mất những ký ức vô giá, TimeSeal nghiêm cấm xóa mọi chiếc hộp đang khóa. Đối với chiếc hộp đã được mở, bạn chỉ có thể tiến hành xóa sau 90 ngày kể từ ngày mở.')}
              />
              <FAQItem
                q={t('Dung lượng và quota trọn đời được tính như thế nào?')}
                a={t('Tài khoản Free có hạn mức quota trọn đời là 50MB cho việc lưu trữ, xem và tải media từ cloud. Khi xem ảnh chất lượng cao, tải ảnh/video gốc, hoặc app phải tải lại dữ liệu vì mất cache, quota của account sẽ được tiêu thụ. Quota này không tự làm mới theo tháng; để giảm hao quota, hãy tận dụng bộ nhớ đệm và chỉ mở/tải media gốc khi cần.')}
              />
              <FAQItem
                q={t('Tôi có thể tạo hộp ký ức nhóm chung với bạn bè không?')}
                a={t('Có! Tính năng này khả dụng trên các gói cao cấp (PRO và PRO MAX). Bạn có thể mời bạn bè qua email tại Bước 3 khi khởi tạo hộp ký ức. Sau khi tạo, thành viên đã đăng ký sẽ nhận thông báo và cùng chờ đến ngày mở khóa.')}
              />
              <FAQItem
                q={t('Làm thế nào để bảo mật hộp ký ức của tôi trước người khác?')}
                a={t('Bạn có thể kích hoạt tính năng "Khóa bằng sinh trắc học" trong mục Cài đặt này. Ứng dụng sẽ tự động khóa và yêu cầu quét vân tay hoặc Face ID ngay khi bạn thoát khỏi ứng dụng.')}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Generic Toast */}
      {toastConfig.visible && (
        <Animated.View
          style={[
            styles.motionToast,
            toastConfig.type === 'success' && {
              borderColor: '#34C759',
              backgroundColor: isDark ? 'rgba(20, 40, 25, 0.95)' : 'rgba(230, 250, 235, 0.95)',
            },
            animatedToastStyle,
          ]}
          pointerEvents="none"
        >
          <AppIcon
            name={toastConfig.type === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
            size={20}
            color={
              toastConfig.type === 'success'
                ? '#34C759'
                : isDark
                ? '#FFB03A'
                : '#D07B00'
            }
          />
          <Text
            style={[
              styles.motionToastText,
              toastConfig.type === 'success' && { color: isDark ? '#30D158' : '#1C7D32' },
            ]}
          >
            {toastConfig.message}
          </Text>
        </Animated.View>
      )}

      {/* ── Grace Period Modal ── */}
      <Modal visible={showGraceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { marginBottom: 14 }]}>{t('Thời gian tự động khóa')}</Text>
            {[
              { label: '15 giây', value: 15 },
              { label: '1 phút', value: 60 },
              { label: '5 phút', value: 300 },
              { label: '15 phút', value: 900 },
            ].map(item => (
              <Pressable
                key={item.value}
                style={{
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.softBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onPress={() => handleSelectGraceValue(item.value)}
              >
                <Text style={{ fontSize: 15, color: colors.text, fontWeight: graceValue === item.value ? '700' : '500' }}>
                  {t(item.label)}
                </Text>
                {graceValue === item.value && (
                  <AppIcon name="checkmark" size={18} color={colors.primary} />
                )}
              </Pressable>
            ))}
            <Pressable
              style={{
                marginTop: 18,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: colors.background,
                alignItems: 'center',
              }}
              onPress={() => setShowGraceModal(false)}
            >
              <Text style={{ color: colors.mutedText, fontWeight: '700', fontSize: 14 }}>{t('Đóng')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </SoftScreen>
  );
}

/* ─────────── Styles ─────────── */

const createStyles = (colors: ThemeColors, isDark: boolean) =>
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
    languageRow: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.softBorder,
    },

    // Custom warning toast
    motionToast: {
      position: 'absolute',
      bottom: 40,
      left: 20,
      right: 20,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: '#FF9500',
      backgroundColor: isDark ? 'rgba(40, 30, 20, 0.95)' : 'rgba(255, 245, 230, 0.95)',
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      ...cardShadow,
      zIndex: 100,
    },
    motionToastText: {
      flex: 1,
      fontSize: 12.5,
      fontWeight: '600',
      color: isDark ? '#FFB03A' : '#D07B00',
      lineHeight: 18,
    },
  });
