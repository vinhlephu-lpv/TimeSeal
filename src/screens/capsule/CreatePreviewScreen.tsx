import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, StatusBar, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { useCapsuleStore } from '../../store/capsuleStore';
import { PremiumModal } from '../../components/modals/PremiumModal';
import type { AppStackParamList } from '../../types/navigation';
import { PLAN_LIMITS } from '../../config/plans';
import { formatDate } from '../../utils/dateHelpers';
import { countMediaByType, formatFileSize } from '../../services/mediaService';
import { AppIcon, PrimaryButton } from '../../components/ui/DesignPrimitives';
import { capsuleThemes, ThemeBackground } from '../../theme/capsuleThemes';

type Props = NativeStackScreenProps<AppStackParamList, 'CreatePreview'>;

export function CreatePreviewScreen({ navigation, route }: Props) {
  const { title, openDateISO, theme, message, mediaAssets, memberEmails } = route.params;

  const user = useAuthStore(s => s.user);
  const isPremium = Boolean(user?.isPremium);
  const subscriptionSync = useAuthStore(s => s.subscriptionSync);
  const usedStorageMb = subscriptionSync?.usedStorageMb ?? 0;
  const existingCapsules = useCapsuleStore(s => s.capsules);
  const createCapsule = useCapsuleStore(s => s.createCapsule);
  const isLoading = useCapsuleStore(s => s.isLoading);
  const uploadProgress = useCapsuleStore(s => s.uploadProgress);
  const capsuleError = useCapsuleStore(s => s.error);
  const [localError, setLocalError] = useState('');
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const activeTheme = capsuleThemes[theme] || capsuleThemes.default;
  const tc = activeTheme.colors;
  const insets = useSafeAreaInsets();
  const mediaSummary = React.useMemo(() => {
    const { photos, videos } = countMediaByType(mediaAssets);
    const totalBytes = mediaAssets.reduce((sum, item) => sum + (item.fileSize || 0), 0);
    const parts: string[] = [];
    if (photos > 0) {
      parts.push(`${photos} ảnh`);
    }
    if (videos > 0) {
      parts.push(`${videos} video`);
    }
    const sizeLabel = totalBytes > 0 ? ` (~${formatFileSize(totalBytes)})` : '';
    return parts.length > 0 ? `${parts.join(', ')}${sizeLabel}` : 'Không có media';
  }, [mediaAssets]);

  const onConfirmCreate = async () => {
    if (!user?.id) {
      setLocalError('Bạn cần đăng nhập lại để tạo capsule.');
      return;
    }
    const ownedCapsules = existingCapsules.filter(
      item => item.ownerId === user?.id && item.id !== 'screenshot-opened-capsule'
    );
    if (!isPremium && ownedCapsules.length >= PLAN_LIMITS.free.maxCapsules) {
      setShowPremiumModal(true);
      return;
    }

    const userPlan = user?.plan || (isPremium ? 'plus' : 'free');
    const limits = PLAN_LIMITS[userPlan];
    
    // Calculate total size of new assets in MB
    const totalSizeMb = Number(
      (mediaAssets.reduce((sum, item) => sum + (item.fileSize || 0), 0) / (1024 * 1024)).toFixed(2)
    );

    if (usedStorageMb + totalSizeMb > limits.maxAccountStorageMb) {
      setLocalError(`Hết dung lượng cho tháng này, vui lòng nâng cấp hoặc gia hạn ở tháng sau.\n\nĐã dùng: ${usedStorageMb} MB / ${limits.maxAccountStorageMb} MB (bao gồm việc xem, tải lên, tải xuống Firebase).`);
      return;
    }

    const success = await createCapsule(
      {
        title,
        openDateISO,
        theme,
        message,
        mediaAssets,
        memberEmails,
      },
      user.id,
      isPremium,
      userPlan,
    );
    if (!success) {
      setLocalError('Không tạo được capsule. Vui lòng thử lại.');
      return;
    }
    navigation.popToTop();
  };

  // Large themed icon corresponding to the theme
  const getThemeIcon = () => {
    switch (theme) {
      case 'vintage':
        return { name: 'hourglass', color: tc.primary };
      case 'cyberpunk':
        return { name: 'compass-outline', color: tc.accent };
      case 'aurora':
        return { name: 'sparkles-outline', color: tc.primary };
      case 'zen':
        return { name: 'compass', color: tc.primary };
      case 'sunset':
        return { name: 'heart', color: tc.primary };
      case 'royal':
        return { name: 'sparkles', color: tc.primary };
      case 'crystal':
        return { name: 'diamond-outline', color: tc.primary };
      case 'starry':
        return { name: 'sparkles-outline', color: tc.accent };
      default:
        return { name: 'cube-outline', color: tc.primary };
    }
  };

  const themeIcon = getThemeIcon();

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
            <Text style={[styles.badgeText, { color: tc.activeChipText }]}>Bước 4/4</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.introSection}>
            <Text style={[styles.heading, { color: tc.text }]}>Xem Trước Capsule</Text>
            <Text style={[styles.subheading, { color: tc.mutedText }]}>
              Xem lại bức tranh tổng quan của Capsule trước khi nó được khóa chặt và gửi tới tương lai.
            </Text>
          </View>

          {/* Dynamic Polaroid/Hologram Card based on Active Theme */}
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: tc.cardBg,
                borderColor: tc.cardBorder,
              },
              theme === 'vintage' && styles.polaroidCard,
              theme === 'cyberpunk' && styles.hologramCard,
              theme === 'aurora' && styles.glassCard,
              theme === 'royal' && styles.royalCard,
              theme === 'crystal' && styles.crystalCard,
            ]}>
            {/* Hologram scan line */}
            {theme === 'cyberpunk' && <View style={styles.cyberScanline} />}

            <View style={[styles.previewIcon, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
              <AppIcon name={themeIcon.name} size={32} color={themeIcon.color} />
            </View>

            <Text style={[styles.previewTitle, { color: tc.text }, theme === 'vintage' && styles.vintageTitleFont]}>
              {title}
            </Text>

            <View style={[styles.metaDivider, { backgroundColor: tc.cardBorder }]} />

            <View style={styles.metaRow}>
              <AppIcon name="calendar-outline" size={16} color={tc.primary} />
              <Text style={[styles.metaText, { color: tc.text }]}>
                Mở vào: <Text style={styles.boldText}>{formatDate(openDateISO)}</Text>
              </Text>
            </View>

            <View style={styles.metaRow}>
              <AppIcon name="sparkles-outline" size={16} color={tc.primary} />
              <Text style={[styles.metaText, { color: tc.text }]}>
                Chủ đề: <Text style={styles.boldText}>{activeTheme.name}</Text>
              </Text>
            </View>

            <View style={styles.metaRow}>
              <AppIcon name="image-outline" size={16} color={tc.primary} />
              <Text style={[styles.metaText, { color: tc.text }]}>
                Ảnh/Video: <Text style={styles.boldText}>{mediaSummary}</Text>
              </Text>
            </View>

            <View style={styles.metaRow}>
              <AppIcon name="people-outline" size={16} color={tc.primary} />
              <Text style={[styles.metaText, { color: tc.text }]}>
                Thành viên: <Text style={styles.boldText}>{memberEmails.length} người</Text>
              </Text>
            </View>

            {message ? (
              <View style={[styles.messagePreview, { backgroundColor: tc.inputBg, borderColor: tc.inputBorder }]}>
                <Text style={[styles.messagePreviewTitle, { color: tc.mutedText }]}>💌 LỜI NHẮN</Text>
                <Text style={[styles.messagePreviewText, { color: tc.text }]} numberOfLines={3}>
                  "{message}"
                </Text>
              </View>
            ) : null}
          </View>

          {/* Safety Alert Box */}
          <View style={[styles.warningBox, { backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
            <AppIcon name="lock-closed-outline" size={16} color="#EF4444" />
            <Text style={styles.warningText}>
              Sau khi Capsule được tạo, mọi nội dung bên trong sẽ được khóa chặt và không thể chỉnh sửa cho đến ngày mở.
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.progressContainer}>
              <Text style={[styles.infoText, { color: tc.primary }]}>Đang đóng gói ký ức của bạn...</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { backgroundColor: tc.primary, width: `${uploadProgress}%` }]} />
              </View>
              <Text style={[styles.progressPercent, { color: tc.mutedText }]}>{uploadProgress}% hoàn thành</Text>
            </View>
          ) : null}

          {localError ? (
            <View style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              borderColor: 'rgba(239, 68, 68, 0.25)',
              borderWidth: 1.2,
              borderRadius: 16,
              padding: 14,
              marginTop: 18,
              alignItems: 'center',
              gap: 10,
            }}>
              <AppIcon name="alert-circle-outline" size={20} color="#EF4444" />
              <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 }}>
                {localError}
              </Text>
            </View>
          ) : null}
          {!localError && capsuleError ? (
            <View style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              borderColor: 'rgba(239, 68, 68, 0.25)',
              borderWidth: 1.2,
              borderRadius: 16,
              padding: 14,
              marginTop: 18,
              alignItems: 'center',
              gap: 10,
            }}>
              <AppIcon name="alert-circle-outline" size={20} color="#EF4444" />
              <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 }}>
                {capsuleError}
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton
              label="Quay lại"
              variant="outline"
              onPress={() => navigation.goBack()}
              style={[styles.actionButtonBack, { borderColor: tc.primary }]}
              textColor={tc.primary}
            />
            <PrimaryButton
              label={isLoading ? 'Đang tạo...' : 'Tạo & Khoá'}
              iconName="lock-closed-outline"
              onPress={onConfirmCreate}
              disabled={isLoading}
              style={[styles.actionButtonCreate, { backgroundColor: tc.buttonBg }]}
            />
          </View>
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
  previewCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  // Theme Special Cards styling
  polaroidCard: {
    borderRadius: 8,
    borderBottomWidth: 40, // Polaroid bottom extra margin
    borderBottomColor: '#FCF9F2',
  },
  hologramCard: {
    borderWidth: 1.5,
    borderColor: '#00FFFF',
    shadowColor: '#00FFFF',
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  glassCard: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  royalCard: {
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  crystalCard: {
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  cyberScanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '40%',
    height: 1.5,
    backgroundColor: 'rgba(0, 255, 255, 0.25)',
    zIndex: 10,
  },
  previewIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  vintageTitleFont: {
    fontFamily: 'serif',
  },
  metaDivider: {
    height: 1,
    marginVertical: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 5,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  boldText: {
    fontWeight: '700',
  },
  messagePreview: {
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  messagePreviewTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  messagePreviewText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  warningBox: {
    flexDirection: 'row',
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    alignItems: 'center',
  },
  warningText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    flex: 1,
  },
  progressContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  error: {
    marginTop: 14,
    color: '#E24B4A',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    marginTop: 30,
    flexDirection: 'row',
    gap: 12,
  },
  actionButtonBack: {
    flex: 1,
    borderRadius: 16,
    minHeight: 56,
  },
  actionButtonCreate: {
    flex: 1.2,
    borderRadius: 16,
    minHeight: 56,
  },
});
