import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { getPremiumOfferingSummary, purchasePremium, restorePremium } from '../../services/premiumService';
import { colors } from '../../theme/colors';
import { AppIcon, PrimaryButton, cardShadow } from '../ui/DesignPrimitives';

type PremiumModalProps = { visible: boolean; onClose: () => void };

export function PremiumModal({ visible, onClose }: PremiumModalProps) {
  const user = useAuthStore(s => s.user);
  const refreshProfile = useAuthStore(s => s.refreshProfile);
  const [isBusy, setIsBusy] = React.useState(false);
  const [priceLabel, setPriceLabel] = React.useState('29.000đ / tháng');
  const [statusMessage, setStatusMessage] = React.useState('');

  React.useEffect(() => {
    let isMounted = true;
    const loadPrice = async () => {
      if (!visible || !user?.id) { return; }
      const summary = await getPremiumOfferingSummary(user.id);
      if (!isMounted) { return; }
      setPriceLabel(summary.displayPrice);
      setStatusMessage(summary.message || '');
    };
    loadPrice();
    return () => { isMounted = false; };
  }, [visible, user?.id]);

  const onUpgrade = async () => {
    if (!user?.id) { setStatusMessage('Bạn cần đăng nhập để nâng cấp Premium.'); return; }
    setIsBusy(true);
    const result = await purchasePremium(user.id);
    if (result.ok) { await refreshProfile(); setStatusMessage(result.message); setIsBusy(false); onClose(); return; }
    setStatusMessage(result.message); setIsBusy(false);
  };

  const onRestore = async () => {
    if (!user?.id) { setStatusMessage('Bạn cần đăng nhập để khôi phục gói Premium.'); return; }
    setIsBusy(true);
    const result = await restorePremium(user.id);
    if (result.ok) { await refreshProfile(); setStatusMessage(result.message); setIsBusy(false); onClose(); return; }
    setStatusMessage(result.message); setIsBusy(false);
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay} edges={['bottom', 'left', 'right']}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerIcon}>
            <AppIcon name="sparkles" size={28} color={colors.warning} />
          </View>
          <Text style={styles.title}>Nâng cấp Premium</Text>
          <Text style={styles.price}>{priceLabel}</Text>
          <Text style={styles.feature}>✅ Không giới hạn số capsule</Text>
          <Text style={styles.feature}>✅ Thêm thành viên nhóm</Text>
          <Text style={styles.feature}>✅ Dung lượng media cao hơn</Text>
          <Text style={styles.feature}>✅ Mở khoá video cho capsule</Text>
          {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}
          <PrimaryButton label={isBusy ? 'Đang xử lý...' : 'Nâng cấp ngay'} onPress={onUpgrade}
            disabled={isBusy} iconName="diamond-outline" style={styles.primaryButton} />
          <PrimaryButton label="Khôi phục giao dịch" onPress={onRestore} disabled={isBusy} variant="outline" />
          <Pressable style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonLabel}>Đóng</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 8, ...cardShadow },
  handle: { width: 54, height: 6, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 8 },
  headerIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.warmSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  price: { color: colors.primary, fontSize: 16, fontWeight: '600', marginBottom: 6 },
  feature: { color: colors.text, fontSize: 14, paddingVertical: 2 },
  primaryButton: { marginTop: 10 },
  secondaryButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  secondaryButtonLabel: { color: colors.text, fontWeight: '600' },
  statusMessage: { marginTop: 4, color: colors.mutedText, fontSize: 13 },
});
