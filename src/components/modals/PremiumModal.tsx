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
import { PolishedAlert } from '../../store/alertStore';
import { purchasePremium, restorePremium } from '../../services/premiumService';
import type { PlanType } from '../../config/plans';
import { getPlanPriority } from '../../config/subscriptionProducts';
import { getPlanDisplayName } from '../../services/subscriptionService';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { AppIcon, PrimaryButton, cardShadow } from '../ui/DesignPrimitives';
import { useTranslation } from '../../i18n';

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

const getFeaturesForPlan = (plan: PaidPlanType): string[] => {
  switch (plan) {
    case 'plus':
      return [
        'Vô hạn hộp ký ức cá nhân',
        'Đính kèm tối đa 13 tệp (10 ảnh & 3 video) mỗi hộp ký ức',
        'Thời lượng video tối đa 1 phút/video',
        'Dung lượng tải lên tối đa 50MB/hộp ký ức',
        'Tổng dung lượng tài khoản 1.5GB',
        'Thư gửi tương lai dài tối đa 1.500 ký tự',
        'Mở khóa 3 chủ đề cao cấp độc quyền',
      ];
    case 'pro':
      return [
        'Tất cả quyền lợi của gói PLUS, cùng với:',
        'Hỗ trợ tạo hộp ký ức nhóm, tối đa 5 người',
        'Đính kèm tối đa 25 tệp (20 ảnh & 5 video) mỗi hộp ký ức',
        'Nâng thời lượng video lên tới 3 phút',
        'Dung lượng tải lên tối đa 500MB/hộp ký ức',
        'Tổng dung lượng tài khoản nâng cấp lên 5 GB',
        'Thư gửi tương lai dài tối đa 3.000 ký tự',
        'Mở khóa toàn bộ kho chủ đề cao cấp',
      ];
    case 'pro_max':
      return [
        'Tất cả quyền lợi của gói PRO, cùng với:',
        'Vô hạn hộp ký ức nhóm và thành viên đóng góp',
        'Đính kèm tối đa 40 tệp (30 ảnh & 10 video) mỗi hộp ký ức',
        'Nâng thời lượng video lên tối đa 7 phút',
        'Dung lượng tối đa 1GB (1024MB) mỗi hộp ký ức',
        'Tổng dung lượng tài khoản siêu lớn tới 20 GB',
        'Thư gửi tương lai dài tối đa 10.000 ký tự',
        'Ưu tiên băng thông tải lên cao',
      ];
  }
};

const getPlanColor = (plan: PaidPlanType, colors: any) => {
  switch (plan) {
    case 'plus':
      return colors.primary;
    case 'pro':
      return colors.warning;
    case 'pro_max':
      return colors.success;
  }
};

export function PremiumModal({ visible, onClose }: PremiumModalProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const user = useAuthStore(s => s.user);
  const syncSubscription = useAuthStore(s => s.syncSubscription);
  const [isBusy, setIsBusy] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<PaidPlanType>('pro');
  const [statusMessage, setStatusMessage] = React.useState('');
  const currentPlan = user?.plan || 'free';
  const isCurrentPlan = selectedPlan === currentPlan;
  const isDowngrade =
    currentPlan !== 'free' &&
    getPlanPriority(selectedPlan) < getPlanPriority(currentPlan);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setSelectedPlan(
      currentPlan === 'free'
        ? 'plus'
        : currentPlan === 'plus'
          ? 'pro'
          : 'pro_max',
    );
    setStatusMessage('');
  }, [currentPlan, visible]);

  const runUpgrade = async () => {
    if (!user?.id) {
      setStatusMessage(t('Bạn cần đăng nhập để nâng cấp gói.'));
      return;
    }
    setIsBusy(true);
    setStatusMessage('');
    const result = await purchasePremium(user.id, selectedPlan);
    if (result.ok) {
      await syncSubscription(result.customerInfo);
      setIsBusy(false);
      onClose();
      PolishedAlert.show(t('Thành công'), result.message);
      return;
    }
    setStatusMessage(result.message);
    setIsBusy(false);
  };

  const onUpgrade = () => {
    if (isCurrentPlan) {
      setStatusMessage(t('Bạn đang sử dụng gói này.'));
      return;
    }
    if (isDowngrade) {
      PolishedAlert.show(
        t('Xác nhận chuyển gói'),
        t('Bạn đang chuyển từ gói {{currentPlan}} xuống {{nextPlan}}. Gói hiện tại vẫn giữ nguyên đến hết kỳ thanh toán, sau đó Google Play mới áp dụng gói mới. Bạn muốn tiếp tục?', {
          currentPlan: getPlanDisplayName(currentPlan),
          nextPlan: getPlanDisplayName(selectedPlan),
        }),
        [
          { text: t('Hủy'), style: 'cancel' },
          { text: t('Tiếp tục'), onPress: () => void runUpgrade() },
        ],
      );
      return;
    }
    const isUpgrade =
      currentPlan !== 'free' &&
      getPlanPriority(selectedPlan) > getPlanPriority(currentPlan);
    if (!isUpgrade) {
      void runUpgrade();
      return;
    }

    PolishedAlert.show(
      t('Xác nhận nâng cấp'),
      t('Bạn đang chuyển từ gói {{currentPlan}} lên {{nextPlan}}. Google Play sẽ quyết định phần tiền được khấu trừ hoặc hoàn lại theo chính sách tính phí hiện hành. TimeSeal không tự hứa hoàn tiền. Bạn muốn tiếp tục?', {
        currentPlan: getPlanDisplayName(currentPlan),
        nextPlan: getPlanDisplayName(selectedPlan),
      }),
      [
        { text: t('Hủy'), style: 'cancel' },
        { text: t('Tiếp tục'), onPress: () => void runUpgrade() },
      ],
    );
  };

  const onRestore = async () => {
    if (!user?.id) {
      setStatusMessage(t('Bạn cần đăng nhập để khôi phục gói.'));
      return;
    }
    setIsBusy(true);
    setStatusMessage('');
    const result = await restorePremium(user.id);
    if (result.ok) {
      await syncSubscription(result.customerInfo);
      setIsBusy(false);
      onClose();
      PolishedAlert.show(t('Thành công'), result.message);
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
              <Text style={styles.title}>{t('Nâng cấp TimeSeal')}</Text>
              <Text style={styles.subtitle}>{t('Mở rộng giới hạn lưu giữ ký ức')}</Text>
            </View>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.plansContainerHorizontal}>
              {(['plus', 'pro', 'pro_max'] as PaidPlanType[]).map(planKey => {
                const isSelected = selectedPlan === planKey;
                return (
                  <Pressable
                    key={planKey}
                    style={[
                      styles.planTabCard,
                      isSelected && styles.planTabCardSelected,
                      planKey === 'plus' && isSelected && styles.planTabCardSelectedPlus,
                      planKey === 'pro' && styles.planTabCardPro,
                      planKey === 'pro' && isSelected && styles.planTabCardSelectedPro,
                      planKey === 'pro_max' && styles.planTabCardMax,
                      planKey === 'pro_max' && isSelected && styles.planTabCardSelectedMax,
                    ]}
                    onPress={() => setSelectedPlan(planKey)}
                  >
                    {planKey === 'pro' && (
                      <View style={styles.tabBadgePro}>
                        <Text style={styles.tabBadgeText}>HOT</Text>
                      </View>
                    )}
                    {planKey === 'pro_max' && (
                      <View style={styles.tabBadgeMax}>
                        <Text style={styles.tabBadgeText}>MAX</Text>
                      </View>
                    )}

                    <Text
                      style={[
                        styles.tabPlanName,
                        isSelected && styles.tabPlanNameSelected,
                        planKey === 'plus' && isSelected && { color: colors.primary },
                        planKey === 'pro' && { color: colors.warningDark },
                        planKey === 'pro_max' && { color: colors.success },
                      ]}
                    >
                      {planKey === 'plus' ? 'PLUS' : planKey === 'pro' ? 'PRO' : 'PRO MAX'}
                    </Text>

                    <Text style={styles.tabPlanPrice}>
                      {planKey === 'plus' ? '29K' : planKey === 'pro' ? '79K' : '199K'}
                    </Text>
                    <Text style={styles.tabPlanPeriod}>{t('/tháng')}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.featuresContainer}>
              <View style={styles.featuresTitleRow}>
                <AppIcon name="diamond" size={15} color={getPlanColor(selectedPlan, colors)} />
                <Text style={styles.featuresTitle}>
                  {t('Chi tiết quyền lợi gói')} {selectedPlan === 'plus' ? 'PLUS' : selectedPlan === 'pro' ? 'PRO' : 'PRO MAX'}
                </Text>
              </View>

              <View style={styles.featuresList}>
                {getFeaturesForPlan(selectedPlan).map((feature, i) => {
                  const isHeader = i === 0 && (selectedPlan === 'pro' || selectedPlan === 'pro_max');
                  return (
                    <View key={i} style={styles.featureRow}>
                      <AppIcon
                        name={isHeader ? "sparkles" : "checkmark-circle"}
                        size={14}
                        color={getPlanColor(selectedPlan, colors)}
                      />
                      <Text style={[styles.featureText, isHeader && styles.featureTextHeader]}>
                        {t(feature)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}
          </ScrollView>
          
          <PrimaryButton 
            label={
              isBusy
                ? t('Đang xử lý...')
                : isCurrentPlan
                  ? `${t('Gói hiện tại')}: ${selectedPlan.toUpperCase()}`
                  : isDowngrade
                    ? `${t('Chuyển sang gói')} ${selectedPlan.toUpperCase()}`
                    : `${t('Đăng ký gói')} ${selectedPlan.toUpperCase()}`
            }
            onPress={onUpgrade}
            disabled={isBusy || isCurrentPlan}
            iconName="diamond-outline" 
            style={styles.primaryButton} 
          />
          
          <View style={styles.footerActions}>
            <Pressable style={styles.footerLink} onPress={onRestore} disabled={isBusy}>
              <Text style={styles.footerLinkLabel}>{t('Khôi phục gói')}</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.footerLink} onPress={onClose}>
              <Text style={styles.footerLinkLabel}>{t('Để sau')}</Text>
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
    plansContainerHorizontal: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
      marginBottom: 14,
      width: '100%',
    },
    planTabCard: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 4,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      minHeight: 88,
      shadowColor: '#000000',
      shadowOpacity: 0.02,
      shadowRadius: 8,
      elevation: 1,
    },
    planTabCardPro: {
      borderColor: isDark ? 'rgba(255, 170, 0, 0.2)' : '#FFEEDD',
    },
    planTabCardMax: {
      borderColor: isDark ? 'rgba(29, 158, 117, 0.2)' : '#E0F6F0',
    },
    planTabCardSelected: {
      borderWidth: 2,
      elevation: 3,
    },
    planTabCardSelectedPlus: {
      borderColor: colors.primary,
      backgroundColor: isDark ? 'rgba(114, 91, 237, 0.08)' : '#F7F6FF',
      shadowColor: colors.primary,
      shadowOpacity: 0.08,
      shadowRadius: 15,
    },
    planTabCardSelectedPro: {
      borderColor: colors.warning,
      backgroundColor: isDark ? 'rgba(255, 170, 0, 0.08)' : '#FFFDF0',
      shadowColor: colors.warning,
      shadowOpacity: 0.12,
      shadowRadius: 18,
    },
    planTabCardSelectedMax: {
      borderColor: colors.success,
      backgroundColor: isDark ? 'rgba(29, 158, 117, 0.08)' : '#F1FFFD',
      shadowColor: colors.success,
      shadowOpacity: 0.12,
      shadowRadius: 18,
    },
    tabBadgePro: {
      position: 'absolute',
      top: -9,
      backgroundColor: colors.warning,
      paddingHorizontal: 6,
      paddingVertical: 2.5,
      borderRadius: 6,
    },
    tabBadgeMax: {
      position: 'absolute',
      top: -9,
      backgroundColor: colors.success,
      paddingHorizontal: 6,
      paddingVertical: 2.5,
      borderRadius: 6,
    },
    tabBadgeText: {
      color: '#FFFFFF',
      fontSize: 7.5,
      fontWeight: '900',
      letterSpacing: 0.2,
    },
    tabPlanName: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.mutedText,
      marginBottom: 3,
    },
    tabPlanNameSelected: {
      fontWeight: '900',
    },
    tabPlanPrice: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.text,
    },
    tabPlanPeriod: {
      fontSize: 8,
      fontWeight: '500',
      color: colors.mutedText,
      marginTop: 1,
    },
    featuresContainer: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : colors.lavenderWash,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.softBorder,
      marginBottom: 10,
    },
    featuresTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.softBorder,
      paddingBottom: 8,
    },
    featuresTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    featuresList: {
      gap: 8,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    featureText: {
      fontSize: 11.5,
      color: colors.text,
      opacity: 0.85,
      flex: 1,
      lineHeight: 16,
    },
    featureTextHeader: {
      fontWeight: '700',
      opacity: 0.95,
    },
    primaryButton: { 
      marginTop: 8,
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
