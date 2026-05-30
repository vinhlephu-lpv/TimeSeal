import React, { useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useAuthStore } from '../../store/authStore';
import { purchasePremium, restorePremium } from '../../services/premiumService';
import type { PlanType } from '../../config/plans';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { AppIcon, PrimaryButton, cardShadow } from '../ui/DesignPrimitives';

type PremiumModalProps = { visible: boolean; onClose: () => void };
type PaidPlanType = Exclude<PlanType, 'free'>;

function SparkleOrb({ delay, x, y }: { delay: number; x: number; y: number }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x }, { translateY: y }, { scale: 0.5 + opacity.value * 0.5 }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.warning,
        },
        style,
      ]}
    />
  );
}

export function PremiumModal({ visible, onClose }: PremiumModalProps) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const user = useAuthStore(s => s.user);
  const refreshProfile = useAuthStore(s => s.refreshProfile);
  const [isBusy, setIsBusy] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<PaidPlanType>('pro');
  const [statusMessage, setStatusMessage] = React.useState('');

  const onUpgrade = async () => {
    if (!user?.id) {
      setStatusMessage('Bạn cần đăng nhập để nâng cấp Premium.');
      return;
    }
    setIsBusy(true);
    setStatusMessage('');
    const result = await purchasePremium(user.id, selectedPlan);
    if (result.ok) {
      await refreshProfile();
      setIsBusy(false);
      onClose();
      return;
    }
    setStatusMessage(result.message);
    setIsBusy(false);
  };

  const onRestore = async () => {
    if (!user?.id) {
      setStatusMessage('Bạn cần đăng nhập để khôi phục gói Premium.');
      return;
    }
    setIsBusy(true);
    setStatusMessage('');
    const result = await restorePremium(user.id);
    if (result.ok) {
      await refreshProfile();
      setIsBusy(false);
      onClose();
      return;
    }
    setStatusMessage(result.message);
    setIsBusy(false);
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay} edges={['bottom', 'left', 'right']}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <AppIcon name="sparkles" size={28} color={colors.warning} />
              {/* Sparkle particles */}
              <SparkleOrb delay={0} x={-18} y={-14} />
              <SparkleOrb delay={300} x={20} y={-10} />
              <SparkleOrb delay={600} x={-10} y={18} />
              <SparkleOrb delay={900} x={16} y={14} />
            </View>
            <View>
              <Text style={styles.title}>Nâng cấp TimeSeal</Text>
              <Text style={styles.subtitle}>Mở rộng giới hạn lưu giữ ký ức</Text>
            </View>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.plansContainer}>
              <Pressable
                style={[
                  styles.planCard,
                  selectedPlan === 'plus' && styles.planCardSelected,
                ]}
                onPress={() => setSelectedPlan('plus')}
              >
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, selectedPlan === 'plus' && styles.planNameSelected]}>Gói PLUS</Text>
                  {selectedPlan === 'plus' && (
                    <AppIcon name="checkmark-circle" size={18} color={colors.primary} />
                  )}
                </View>
                <Text style={styles.planPrice}>29.000 VNĐ<Text style={styles.planPeriod}>/tháng</Text></Text>
                <View style={styles.featuresList}>
                  <Text style={styles.planFeature}>⚡ Vô hạn Capsules cá nhân</Text>
                  <Text style={styles.planFeature}>⚡ Đính kèm 13 tệp (10 ảnh + 3 video)</Text>
                  <Text style={styles.planFeature}>⚡ Mỗi video dưới 1 phút</Text>
                  <Text style={styles.planFeature}>⚡ 50MB/Capsule & 1.5GB tổng dung lượng tháng</Text>
                </View>
              </Pressable>

              <Pressable
                style={[
                  styles.planCard,
                  styles.planCardPro,
                  selectedPlan === 'pro' && styles.planCardSelectedPro,
                ]}
                onPress={() => setSelectedPlan('pro')}
              >
                <View style={styles.badgePro}>
                  <Text style={styles.badgeProText}>👑 KHUYÊN DÙNG</Text>
                </View>
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, styles.planNamePro, selectedPlan === 'pro' && styles.planNameSelectedPro]}>Gói PRO</Text>
                  {selectedPlan === 'pro' ? (
                    <AppIcon name="checkmark-circle" size={18} color={colors.warning} />
                  ) : (
                    <AppIcon name="sparkles" size={14} color={colors.warning} />
                  )}
                </View>
                <Text style={styles.planPrice}>79.000 VNĐ<Text style={styles.planPeriod}>/tháng</Text></Text>
                <View style={styles.featuresList}>
                  <Text style={styles.planFeature}>👑 Vô hạn Capsules cá nhân & Capsules nhóm</Text>
                  <Text style={styles.planFeature}>⚡ Đính kèm 25 tệp (20 ảnh + 5 video)</Text>
                  <Text style={styles.planFeature}>⚡ Mỗi video dưới 3 phút</Text>
                  <Text style={styles.planFeature}>⚡ 500MB/Capsule & 5GB tổng dung lượng tháng</Text>
                </View>
              </Pressable>

              <Pressable
                style={[
                  styles.planCard,
                  styles.planCardMax,
                  selectedPlan === 'pro_max' && styles.planCardSelectedMax,
                ]}
                onPress={() => setSelectedPlan('pro_max')}
              >
                <View style={styles.badgeMax}>
                  <Text style={styles.badgeProText}>MAX</Text>
                </View>
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, styles.planNameMax, selectedPlan === 'pro_max' && styles.planNameSelectedMax]}>Gói PRO MAX</Text>
                  {selectedPlan === 'pro_max' ? (
                    <AppIcon name="checkmark-circle" size={18} color={colors.primary} />
                  ) : (
                    <AppIcon name="flash" size={14} color={colors.primary} />
                  )}
                </View>
                <Text style={styles.planPrice}>199.000 VNĐ<Text style={styles.planPeriod}>/tháng</Text></Text>
                <View style={styles.featuresList}>
                  <Text style={styles.planFeature}>👑 Vô hạn Capsules nhóm & Vô hạn thành viên đóng góp</Text>
                  <Text style={styles.planFeature}>⚡ Đính kèm 40 tệp (30 ảnh + 10 video)</Text>
                  <Text style={styles.planFeature}>⚡ Mỗi video dưới 7 phút</Text>
                  <Text style={styles.planFeature}>⚡ 1GB/Capsule & 20GB tổng dung lượng tháng</Text>
                </View>
              </Pressable>
            </View>

            {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}
          </ScrollView>
          
          <PrimaryButton 
            label={isBusy ? 'Đang xử lý...' : `Đăng ký gói ${selectedPlan.toUpperCase()}`} 
            onPress={onUpgrade}
            disabled={isBusy} 
            iconName="diamond-outline" 
            style={styles.primaryButton} 
          />
          
          <View style={styles.footerActions}>
            <Pressable style={styles.footerLink} onPress={onRestore} disabled={isBusy}>
              <Text style={styles.footerLinkLabel}>Khôi phục gói</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.footerLink} onPress={onClose}>
              <Text style={styles.footerLinkLabel}>Để sau</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    overlay: { 
      flex: 1, 
      backgroundColor: 'rgba(0, 0, 0, 0.55)', 
      justifyContent: 'flex-end',
    },
    sheet: { 
      backgroundColor: colors.card, 
      borderTopLeftRadius: 28, 
      borderTopRightRadius: 28, 
      padding: 24, 
      gap: 12, 
      maxHeight: '92%',
      ...cardShadow,
    },
    scrollArea: {
      flexShrink: 1,
    },
    scrollContent: {
      paddingBottom: 4,
    },
    handle: { 
      width: 48, 
      height: 5, 
      borderRadius: 2.5, 
      backgroundColor: colors.border, 
      alignSelf: 'center', 
      marginBottom: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 6,
    },
    headerIcon: { 
      width: 50, 
      height: 50, 
      borderRadius: 16, 
      backgroundColor: colors.warmSoft, 
      alignItems: 'center', 
      justifyContent: 'center',
    },
    title: { 
      color: colors.text, 
      fontSize: 20, 
      fontWeight: '800',
    },
    subtitle: {
      color: colors.mutedText,
      fontSize: 13,
      marginTop: 2,
    },
    plansContainer: {
      flexDirection: 'column',
      gap: 10,
      marginTop: 10,
      marginBottom: 10,
      width: '100%',
    },
    planCard: {
      width: '100%',
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 14,
      backgroundColor: colors.card,
      position: 'relative',
      shadowColor: '#000000',
      shadowOpacity: 0.02,
      shadowRadius: 10,
      elevation: 1,
    },
    planCardPro: {
      borderColor: isDark ? 'rgba(255, 170, 0, 0.2)' : '#FFEEDD',
    },
    planCardMax: {
      borderColor: colors.primaryPale,
    },
    planCardSelected: {
      borderColor: colors.primary,
      backgroundColor: isDark ? 'rgba(114, 91, 237, 0.1)' : '#F7F6FF',
      shadowColor: colors.primary,
      shadowOpacity: 0.08,
      shadowRadius: 15,
    },
    planCardSelectedPro: {
      borderColor: colors.warning,
      backgroundColor: isDark ? 'rgba(255, 170, 0, 0.1)' : '#FFFDF0',
      shadowColor: colors.warning,
      shadowOpacity: 0.12,
      shadowRadius: 18,
    },
    planCardSelectedMax: {
      borderColor: colors.primary,
      backgroundColor: isDark ? 'rgba(0, 204, 180, 0.1)' : '#F1FFFD',
      shadowColor: colors.primary,
      shadowOpacity: 0.12,
      shadowRadius: 18,
    },
    planHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    planName: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.mutedText,
    },
    planNamePro: {
      color: colors.warningDark,
    },
    planNameMax: {
      color: colors.primary,
    },
    planNameSelected: {
      color: colors.primary,
    },
    planNameSelectedPro: {
      color: colors.warningDark,
    },
    planNameSelectedMax: {
      color: colors.primary,
    },
    planPrice: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    planPeriod: {
      fontSize: 10,
      fontWeight: '500',
      color: colors.mutedText,
    },
    badgePro: {
      position: 'absolute',
      top: -11,
      right: 12,
      backgroundColor: colors.warning,
      paddingHorizontal: 7,
      paddingVertical: 3.5,
      borderRadius: 8,
    },
    badgeMax: {
      position: 'absolute',
      top: -11,
      right: 12,
      backgroundColor: colors.primary,
      paddingHorizontal: 7,
      paddingVertical: 3.5,
      borderRadius: 8,
    },
    badgeProText: {
      color: '#FFFFFF',
      fontSize: 7.5,
      fontWeight: '900',
    },
    featuresList: {
      marginTop: 10,
      gap: 4,
    },
    planFeature: {
      fontSize: 10,
      color: colors.text,
      opacity: 0.85,
      lineHeight: 14,
    },
    primaryButton: { 
      marginTop: 10,
    },
    statusMessage: { 
      color: colors.danger, 
      fontSize: 13,
      textAlign: 'center',
    },
    footerActions: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
      marginTop: 8,
    },
    footerLink: {
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    footerLinkLabel: {
      color: colors.mutedText,
      fontWeight: '600',
      fontSize: 13,
    },
    divider: {
      width: 1,
      height: 14,
      backgroundColor: colors.border,
    },
  });
