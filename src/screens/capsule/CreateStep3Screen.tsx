import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import { PremiumModal } from '../../components/modals/PremiumModal';
import { AppIcon, PrimaryButton } from '../../components/ui/DesignPrimitives';
import { capsuleThemes, ThemeBackground } from '../../theme/capsuleThemes';

type CreateStep3ScreenProps = NativeStackScreenProps<AppStackParamList, 'CreateStep3'>;

export function CreateStep3Screen({ navigation, route }: CreateStep3ScreenProps) {
  const { title, openDateISO, theme, message, mediaAssets } = route.params;

  const user = useAuthStore(state => state.user);
  const userPlan = user?.plan || 'free';
  const isAllowedGroup = userPlan === 'pro' || userPlan === 'pro_max';

  const [emailInput, setEmailInput] = useState('');
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const activeTheme = capsuleThemes[theme] || capsuleThemes.default;
  const tc = activeTheme.colors;

  const isLightTheme = theme === 'crystal' || theme === 'zen';
  const premiumBoxBg = isLightTheme ? '#EFF6FF' : '#1E1B4B';
  const premiumBoxBorder = isLightTheme ? '#3B82F6' : '#F5D060';
  const premiumCrownColor = isLightTheme ? '#3B82F6' : '#F5D060';
  const premiumTitleColor = isLightTheme ? '#1E40AF' : '#F5D060';
  const premiumTextColor = isLightTheme ? '#1E293B' : '#E2E8F0';
  const premiumBtnBg = isLightTheme ? '#3B82F6' : '#F5D060';
  const premiumBtnText = isLightTheme ? '#FFFFFF' : '#1E1B4B';

  const maxMembers = useMemo(() => {
    if (userPlan === 'pro') return 5;
    if (userPlan === 'pro_max') return Infinity;
    return 0;
  }, [userPlan]);

  const canAddMore = useMemo(() => memberEmails.length < maxMembers, [memberEmails.length, maxMembers]);

  const addMember = () => {
    const email = emailInput.trim().toLowerCase();
    if (!isAllowedGroup || !email || !canAddMore || memberEmails.includes(email)) {
      return;
    }
    setMemberEmails(prev => [...prev, email]);
    setEmailInput('');
  };

  const removeMember = (target: string) => {
    setMemberEmails(prev => prev.filter(item => item !== target));
  };

  const goPreview = () => {
    navigation.navigate('CreatePreview', {
      title,
      openDateISO,
      theme,
      message,
      mediaAssets,
      memberEmails,
    });
  };

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
            <Text style={[styles.badgeText, { color: tc.activeChipText }]}>Bước 3/4</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.introSection}>
            <Text style={[styles.heading, { color: tc.text }]}>Thành Viên Nhóm</Text>
            <Text style={[styles.subheading, { color: tc.mutedText }]}>
              Mời người thân hoặc bạn bè cùng đóng góp vào hộp thời gian và cùng nhau mở khoá trong tương lai.
            </Text>
          </View>

          {/* Premium Locked Banner */}
          {!isAllowedGroup ? (
            <View style={[styles.premiumCrownBox, { backgroundColor: premiumBoxBg, borderColor: premiumBoxBorder }]}>
              <View style={styles.crownRow}>
                <AppIcon name="sparkles" size={26} color={premiumCrownColor} />
                <Text style={[styles.premiumCrownTitle, { color: premiumTitleColor }]}>ĐẶC QUYỀN PRO & PRO MAX</Text>
              </View>
              <Text style={[styles.premiumCrownText, { color: premiumTextColor }]}>
                Tính năng Capsule nhóm hiện chỉ hỗ trợ cho tài khoản gói PRO và PRO MAX. Bạn vẫn có thể tiếp tục tạo Capsule cá nhân tuyệt đẹp!
              </Text>
              <Pressable
                style={[styles.premiumCrownButton, { backgroundColor: premiumBtnBg }]}
                onPress={() => setShowPremiumModal(true)}>
                <AppIcon name="diamond-outline" size={14} color={premiumBtnText} />
                <Text style={[styles.premiumCrownButtonText, { color: premiumBtnText }]}>Nâng Cấp Gói PRO / PRO MAX</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder, marginTop: 14 }]}>
            <Text style={[styles.label, { color: tc.mutedText }]}>
              EMAIL THÀNH VIÊN ({memberEmails.length}/{maxMembers === Infinity ? 'Vô hạn' : maxMembers})
            </Text>

            <View style={styles.row}>
              <View style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: tc.inputBg,
                      borderColor: tc.inputBorder,
                      color: tc.text,
                      opacity: isAllowedGroup ? 1 : 0.6,
                      paddingLeft: isAllowedGroup ? 14 : 36,
                    },
                  ]}
                  value={emailInput}
                  onChangeText={setEmailInput}
                  editable={isAllowedGroup}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder={isAllowedGroup ? "nhap-email@example.com" : "Nâng cấp gói PRO/PRO MAX để nhập email"}
                  placeholderTextColor={tc.inputPlaceholder}
                />
                {!isAllowedGroup && (
                  <View style={{ position: 'absolute', left: 12, opacity: 0.5 }}>
                    <AppIcon name="lock-closed" size={16} color={tc.text} />
                  </View>
                )}
              </View>
              <Pressable
                style={[
                  styles.addButton,
                  {
                    backgroundColor: isAllowedGroup && canAddMore && emailInput.trim() ? tc.buttonBg : tc.chipBorder,
                  },
                ]}
                onPress={addMember}
                disabled={!isAllowedGroup || !canAddMore || !emailInput.trim()}>
                <Text style={[styles.addButtonLabel, { color: tc.buttonText }]}>Thêm</Text>
              </Pressable>
            </View>

            <View style={styles.memberListHeader}>
              <Text style={[styles.label, { color: tc.mutedText, marginTop: 18 }]}>DANH SÁCH THÀNH VIÊN</Text>
            </View>

            {memberEmails.length > 0 ? (
              <View style={styles.listContainer}>
                {memberEmails.map(item => (
                  <View key={item} style={[styles.memberRow, { backgroundColor: tc.inputBg, borderColor: tc.cardBorder }]}>
                    <AppIcon name="person-outline" size={16} color={tc.primary} />
                    <Text style={[styles.memberEmail, { color: tc.text }]} numberOfLines={1}>
                      {item}
                    </Text>
                    <Pressable style={styles.removeMemberBtn} onPress={() => removeMember(item)}>
                      <AppIcon name="close" size={14} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <AppIcon name="people-outline" size={32} color={tc.mutedText} style={styles.emptyIcon} />
                <Text style={[styles.emptyText, { color: tc.mutedText }]}>
                  Chưa có thành viên nào được mời.
                </Text>
              </View>
            )}
          </View>

          <PrimaryButton
            label="Tiếp theo"
            iconName="arrow-forward-outline"
            onPress={goPreview}
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
    marginBottom: 20,
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
  premiumCrownBox: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    gap: 8,
  },
  crownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumCrownTitle: {
    color: '#F5D060',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1.5,
  },
  premiumCrownText: {
    color: '#E2E8F0',
    lineHeight: 20,
    fontSize: 13,
  },
  premiumCrownButton: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 6,
  },
  premiumCrownButtonText: {
    color: '#1E1B4B',
    fontWeight: '800',
    fontSize: 12,
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
  row: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1.2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  addButton: {
    borderRadius: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  addButtonLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  memberListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listContainer: {
    marginTop: 10,
    gap: 8,
  },
  memberRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberEmail: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  removeMemberBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    marginBottom: 8,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    marginTop: 30,
    borderRadius: 16,
    minHeight: 56,
  },
});
