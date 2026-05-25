import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import { PremiumModal } from '../../components/modals/PremiumModal';
import { colors } from '../../theme/colors';
import { AppIcon, PrimaryButton, SoftScreen } from '../../components/ui/DesignPrimitives';

type CreateStep3ScreenProps = NativeStackScreenProps<AppStackParamList, 'CreateStep3'>;

export function CreateStep3Screen({ navigation, route }: CreateStep3ScreenProps) {
  const user = useAuthStore(state => state.user);
  const isPremium = Boolean(user?.isPremium);
  const [emailInput, setEmailInput] = useState('');
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const canAddMore = useMemo(() => memberEmails.length < 20, [memberEmails.length]);

  const addMember = () => {
    const email = emailInput.trim().toLowerCase();
    if (!isPremium || !email || !canAddMore || memberEmails.includes(email)) { return; }
    setMemberEmails(prev => [...prev, email]);
    setEmailInput('');
  };

  const removeMember = (target: string) => {
    setMemberEmails(prev => prev.filter(item => item !== target));
  };

  const goPreview = () => {
    navigation.navigate('CreatePreview', {
      title: route.params.title, openDateISO: route.params.openDateISO,
      theme: route.params.theme, message: route.params.message,
      mediaAssets: route.params.mediaAssets, memberEmails,
    });
  };

  return (
    <SoftScreen variant="teal">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.step}>Bước 3/4</Text>
          <Text style={styles.heading}>Thêm thành viên</Text>
          {!isPremium ? (
            <View style={styles.premiumBox}>
              <Text style={styles.premiumTitle}>👑 Tính năng Premium</Text>
              <Text style={styles.premiumText}>
                Bạn cần nâng cấp Premium để mời thành viên. Bạn vẫn có thể tiếp tục tạo capsule cá nhân.
              </Text>
              <Pressable style={styles.premiumButton} onPress={() => setShowPremiumModal(true)}>
                <Text style={styles.premiumButtonLabel}>Nâng cấp Premium</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={styles.label}>Email thành viên ({memberEmails.length}/20)</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, !isPremium && styles.inputDisabled]}
              value={emailInput} onChangeText={setEmailInput} editable={isPremium}
              autoCapitalize="none" keyboardType="email-address" placeholder="nhập-email@example.com" />
            <Pressable style={styles.addButton} onPress={addMember} disabled={!isPremium || !canAddMore}>
              <Text style={styles.addButtonLabel}>Thêm</Text>
            </Pressable>
          </View>
          <FlatList data={memberEmails} keyExtractor={item => item}
            ListEmptyComponent={<Text style={styles.empty}>Chưa có thành viên nào.</Text>}
            renderItem={({ item }) => (
              <View style={styles.memberRow}>
                <AppIcon name="person-outline" size={16} color={colors.mutedText} />
                <Text style={styles.memberEmail}>{item}</Text>
                <Pressable onPress={() => removeMember(item)}>
                  <AppIcon name="close-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            )} contentContainerStyle={styles.listContent} />
          <PrimaryButton label="Tiếp theo" iconName="arrow-forward-outline" onPress={goPreview} style={styles.button} />
        </View>
      </SafeAreaView>
      <PremiumModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, padding: 16, paddingTop: 72 },
  step: { color: colors.mutedText, fontSize: 12 },
  heading: { marginTop: 8, fontSize: 24, fontWeight: '700', color: colors.text },
  premiumBox: { marginTop: 16, borderWidth: 1, borderColor: colors.primary, borderRadius: 12, padding: 12, backgroundColor: '#F1EFFE' },
  premiumTitle: { color: colors.primary, fontWeight: '700' },
  premiumText: { marginTop: 6, color: colors.text, lineHeight: 20 },
  premiumButton: { marginTop: 10, backgroundColor: colors.primary, borderRadius: 10, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8 },
  premiumButtonLabel: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  label: { marginTop: 18, color: colors.mutedText, fontSize: 13 },
  row: { marginTop: 8, flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.softBorder, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFFFFF', color: colors.text },
  inputDisabled: { backgroundColor: '#F2F2F2' },
  addButton: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  addButtonLabel: { color: '#FFFFFF', fontWeight: '600' },
  listContent: { marginTop: 12, paddingBottom: 12 },
  empty: { color: colors.mutedText, fontSize: 13 },
  memberRow: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  memberEmail: { color: colors.text, fontSize: 14, flex: 1 },
  button: { marginTop: 'auto' },
});
