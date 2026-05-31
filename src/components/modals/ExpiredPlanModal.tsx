/**
 * ExpiredPlanModal.tsx
 *
 * Shown when a user whose subscription has expired tries to view a capsule
 * that was created while they had an active subscription.
 *
 * Copy directly from the implementation plan:
 * "Gói lưu trữ của bạn đã hết hạn, nhưng TimeSeal vẫn đang giữ an toàn
 *  những ký ức này cho bạn…"
 */
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { AppIcon, PrimaryButton } from '../ui/DesignPrimitives';

type Props = {
  visible: boolean;
  remainingFreeViews: number;
  onUseFreeView: () => void;
  onUpgrade: () => void;
  onDismiss: () => void;
};

export function ExpiredPlanModal({
  visible,
  remainingFreeViews,
  onUseFreeView,
  onUpgrade,
  onDismiss,
}: Props) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header icon */}
          <View style={styles.iconCircle}>
            <AppIcon name="lock-closed" size={28} color={colors.warning} />
          </View>

          <Text style={styles.title}>Gói lưu trữ đã hết hạn</Text>

          <Text style={styles.body}>
            Gói lưu trữ của bạn đã hết hạn, nhưng TimeSeal vẫn đang giữ an
            toàn những ký ức này cho bạn.
          </Text>

          <Text style={styles.body}>
            Vì mỗi lần xem hoặc tải ảnh/video gốc đều phát sinh chi phí lưu
            trữ và truyền tải riêng, TimeSeal tặng bạn{' '}
            <Text style={styles.highlight}>
              1 lượt xem và tải xuống miễn phí / 24h trong tháng
            </Text>{' '}
            cho các capsule đã mở.
          </Text>

          <Text style={styles.body}>
            Bạn có thể tranh thủ lưu lại những khoảnh khắc đẹp này về máy. Sau
            lượt miễn phí trong tháng, để tiếp tục xem hoặc tải nội dung chất
            lượng gốc, vui lòng gia hạn gói lưu trữ phù hợp.
          </Text>

          {remainingFreeViews > 0 && (
            <View style={styles.freeViewBadge}>
              <AppIcon name="gift" size={16} color={colors.success} />
              <Text style={styles.freeViewText}>
                Bạn còn {remainingFreeViews} lượt xem và tải xuống miễn phí tháng này (trong 24h)
              </Text>
            </View>
          )}

          {/* CTAs */}
          <View style={styles.actions}>
            {remainingFreeViews > 0 && (
              <PrimaryButton
                label="Xem & tải miễn phí 24h"
                iconName="eye-outline"
                onPress={onUseFreeView}
                style={styles.ctaButton}
              />
            )}

            <PrimaryButton
              label="Gia hạn để xem không giới hạn"
              iconName="star"
              variant="outline"
              onPress={onUpgrade}
              style={styles.ctaButton}
            />

            <Pressable onPress={onDismiss} style={styles.dismissRow}>
              <Text style={styles.dismissText}>Để sau</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 28,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      // shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 12,
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.warmSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    body: {
      fontSize: 14,
      color: colors.mutedText,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 10,
    },
    highlight: {
      color: colors.warning,
      fontWeight: '600',
    },
    freeViewBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.tealSoft,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      gap: 6,
      marginTop: 4,
      marginBottom: 8,
    },
    freeViewText: {
      fontSize: 13,
      color: colors.successDark,
      fontWeight: '600',
    },
    actions: {
      width: '100%',
      marginTop: 12,
      gap: 8,
    },
    ctaButton: {
      width: '100%',
      minHeight: 48,
    },
    dismissRow: {
      alignSelf: 'center',
      paddingVertical: 10,
    },
    dismissText: {
      fontSize: 14,
      color: colors.mutedText,
    },
  });
