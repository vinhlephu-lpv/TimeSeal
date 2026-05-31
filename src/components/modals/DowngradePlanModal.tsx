/**
 * DowngradePlanModal.tsx
 *
 * Shown when a user who previously had a higher-tier plan (e.g. Pro Max)
 * renews at a lower tier (e.g. Plus) and their stored data exceeds the
 * new plan's quota.
 *
 * Copy directly from the implementation plan:
 * "Bạn đang lưu nhiều ký ức hơn giới hạn của gói Plus…"
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
import { getPlanDisplayName, getPlanStorageLabel } from '../../services/subscriptionService';
import type { PlanType } from '../../config/plans';

type Props = {
  visible: boolean;
  currentPlan: PlanType;
  usedStorageMb: number;
  onStayInLimit: () => void;
  onUpgrade: () => void;
  onManageStorage: () => void;
  onDismiss: () => void;
};

export function DowngradePlanModal({
  visible,
  currentPlan,
  usedStorageMb,
  onStayInLimit,
  onUpgrade,
  onManageStorage,
  onDismiss,
}: Props) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const planName = getPlanDisplayName(currentPlan);
  const storageLabel = getPlanStorageLabel(currentPlan);
  const usedLabel =
    usedStorageMb >= 1024
      ? `${(usedStorageMb / 1024).toFixed(1)}GB`
      : `${usedStorageMb.toFixed(0)}MB`;

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
            <AppIcon name="cloud-outline" size={28} color={colors.info} />
          </View>

          <Text style={styles.title}>Dung lượng vượt gói {planName}</Text>

          <Text style={styles.body}>
            Bạn đang lưu nhiều ký ức hơn giới hạn của gói {planName}.
          </Text>

          <Text style={styles.body}>
            Gói {planName} hỗ trợ{' '}
            <Text style={styles.highlight}>{storageLabel}</Text> lưu trữ và
            xem/tải nội dung gốc trong phạm vi {storageLabel} này. Những
            hộp ký ức vượt quá giới hạn vẫn được TimeSeal giữ an toàn, nhưng sẽ
            chỉ hiển thị bản xem trước nhẹ cho đến khi bạn nâng lên gói phù
            hợp hơn hoặc giải phóng bớt dung lượng.
          </Text>

          <Text style={styles.body}>
            Nếu bạn muốn xem và tải lại toàn bộ ký ức chất lượng gốc như trước,
            bạn có thể chọn gói Pro hoặc Pro Max bất cứ lúc nào.
          </Text>

          {/* Usage bar */}
          <View style={styles.usageRow}>
            <View style={styles.usageBarBg}>
              <View
                style={[
                  styles.usageBarFill,
                  {
                    width: `${Math.min(100, (usedStorageMb / (usedStorageMb + 1)) * 100)}%`,
                    backgroundColor:
                      usedStorageMb > 0 ? colors.warning : colors.success,
                  },
                ]}
              />
            </View>
            <Text style={styles.usageLabel}>
              {usedLabel} / {storageLabel}
            </Text>
          </View>

          {/* CTAs */}
          <View style={styles.actions}>
            <PrimaryButton
              label={`Dùng trong giới hạn ${storageLabel}`}
              iconName="checkmark-circle-outline"
              onPress={onStayInLimit}
              style={styles.ctaButton}
            />

            <PrimaryButton
              label="Nâng lên Pro / Pro Max"
              iconName="star"
              variant="outline"
              onPress={onUpgrade}
              style={styles.ctaButton}
            />

            <PrimaryButton
              label="Quản lý dung lượng"
              iconName="settings-outline"
              variant="outline"
              onPress={onManageStorage}
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
      backgroundColor: colors.infoLight,
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
      color: colors.info,
      fontWeight: '600',
    },
    usageRow: {
      width: '100%',
      marginVertical: 12,
    },
    usageBarBg: {
      height: 8,
      borderRadius: 4,
      backgroundColor: isDark ? '#333' : '#EEE',
      overflow: 'hidden',
    },
    usageBarFill: {
      height: 8,
      borderRadius: 4,
    },
    usageLabel: {
      marginTop: 6,
      fontSize: 12,
      color: colors.mutedText,
      textAlign: 'right',
    },
    actions: {
      width: '100%',
      marginTop: 8,
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
