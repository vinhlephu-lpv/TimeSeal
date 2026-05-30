import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import type { AppStackParamList } from '../../types/navigation';
import type { LocalMediaAsset } from '../../store/capsuleStore';
import { PremiumModal } from '../../components/modals/PremiumModal';
import { getPlanLimits } from '../../config/plans';
import { AppIcon, PrimaryButton } from '../../components/ui/DesignPrimitives';
import { capsuleThemes, ThemeBackground } from '../../theme/capsuleThemes';
import { suppressBiometricAutoLock } from '../../services/biometricLockGuard';

type CreateStep2ScreenProps = NativeStackScreenProps<AppStackParamList, 'CreateStep2'>;

export function CreateStep2Screen({ navigation, route }: CreateStep2ScreenProps) {
  const { title, openDateISO, theme } = route.params;

  const user = useAuthStore(state => state.user);
  const isPremium = Boolean(user?.isPremium);
  const userPlan = user?.plan || (isPremium ? 'plus' : 'free');
  const limits = getPlanLimits(userPlan);
  const planName = userPlan === 'pro_max' ? 'Pro Max' : userPlan === 'pro' ? 'Pro' : userPlan === 'plus' ? 'Plus' : 'Free';

  const [message, setMessage] = useState('');
  const [mediaAssets, setMediaAssets] = useState<LocalMediaAsset[]>([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  const activeTheme = capsuleThemes[theme] || capsuleThemes.default;
  const tc = activeTheme.colors;

  const remainingMediaSlot = useMemo(
    () => Math.max(0, limits.maxMediaPerCapsule - mediaAssets.length),
    [limits.maxMediaPerCapsule, mediaAssets.length],
  );
  const selectedPhotos = useMemo(
    () => mediaAssets.filter(asset => asset.mediaKind !== 'video').length,
    [mediaAssets],
  );
  const selectedVideos = useMemo(
    () => mediaAssets.filter(asset => asset.mediaKind === 'video').length,
    [mediaAssets],
  );
  const remainingPhotoSlot = useMemo(
    () => Math.max(0, limits.maxPhotosPerCapsule - selectedPhotos),
    [limits.maxPhotosPerCapsule, selectedPhotos],
  );
  const remainingVideoSlot = useMemo(
    () => Math.max(0, limits.maxVideosPerCapsule - selectedVideos),
    [limits.maxVideosPerCapsule, selectedVideos],
  );

  const onPickMedia = async () => {
    if (!remainingMediaSlot) {
      setShowPremiumModal(true);
      return;
    }

    suppressBiometricAutoLock();

    let result;
    try {
      result = await launchImageLibrary({
        mediaType: 'mixed',
        selectionLimit: remainingMediaSlot,
        quality: 0.8,
        maxWidth: 1080,
        maxHeight: 1080,
      });
    } finally {
      suppressBiometricAutoLock(2000);
    }

    if (result.didCancel || !result.assets) {
      return;
    }

    const pickedAssets = result.assets
      .filter(asset => Boolean(asset.uri))
      .map(asset => {
        const mediaKind: 'image' | 'video' = asset.type?.startsWith('video/') ? 'video' : 'image';
        return {
          uri: asset.uri || '',
          fileName: asset.fileName,
          type: asset.type,
          mediaKind,
          fileSize: asset.fileSize || 0,
          duration: asset.duration,
        } satisfies LocalMediaAsset;
      });

    if (!limits.allowVideo && pickedAssets.some(asset => asset.mediaKind === 'video')) {
      setInfoMessage('Gói Free không hỗ trợ video. Nâng cấp Premium để sử dụng video.');
      setShowPremiumModal(true);
    }

    const shortEnoughAssets = pickedAssets.filter(asset => {
      if (asset.mediaKind !== 'video') {
        return true;
      }
      return Number(asset.duration || 0) <= limits.maxVideoDurationSeconds;
    });

    const allowedAssets = limits.allowVideo
      ? shortEnoughAssets
      : shortEnoughAssets.filter(asset => asset.mediaKind === 'image');

    let acceptedVideos = 0;
    let acceptedPhotos = 0;
    const cappedAssets = allowedAssets.filter(asset => {
      if (asset.mediaKind === 'video') {
        if (acceptedVideos >= remainingVideoSlot) {
          return false;
        }
        acceptedVideos += 1;
        return true;
      }
      if (acceptedPhotos >= remainingPhotoSlot) {
        return false;
      }
      acceptedPhotos += 1;
      return true;
    });

    const rejectedLongVideos = pickedAssets.length - shortEnoughAssets.length;
    const rejectedExtraMedia = allowedAssets.length - cappedAssets.length;

    if (rejectedLongVideos > 0) {
      const durationLabel = limits.maxVideoDurationSeconds >= 60
        ? `${Math.floor(limits.maxVideoDurationSeconds / 60)} phút`
        : `${limits.maxVideoDurationSeconds} giây`;
      setInfoMessage(`Video bị từ chối do quá dài! Gói ${planName} chỉ hỗ trợ video dưới ${durationLabel}. Vui lòng chọn video ngắn hơn hoặc nâng cấp gói cước.`);
    } else if (rejectedExtraMedia > 0) {
      setInfoMessage(`Đã vượt quá số lượng tệp tối đa của gói ${planName} (Tối đa ${limits.maxPhotosPerCapsule} ảnh + ${limits.maxVideosPerCapsule} video).`);
    } else {
      setInfoMessage('');
    }

    setMediaAssets(prev => [...prev, ...cappedAssets].slice(0, limits.maxMediaPerCapsule));
  };

  const onRemoveMedia = (index: number) => {
    setMediaAssets(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const onNext = () => {
    navigation.navigate('CreateStep3', {
      title,
      openDateISO,
      theme,
      message: message.trim(),
      mediaAssets,
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
            <Text style={[styles.badgeText, { color: tc.activeChipText }]}>Bước 2/4</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.introSection}>
            <Text style={[styles.heading, { color: tc.text }]}>Nội Dung Capsule</Text>
            <Text style={[styles.subheading, { color: tc.mutedText }]}>
              Hãy viết ra những gửi gắm cho tương lai và lưu đính kèm những hình ảnh/video đẹp đẽ nhất.
            </Text>
            <View style={[styles.capsuleInfoCard, { backgroundColor: tc.activeChipBg, borderColor: tc.activeChipBorder }]}>
              <AppIcon name="cube-outline" size={16} color={tc.activeChipText} />
              <Text style={[styles.capsuleTitleText, { color: tc.activeChipText }]}>
                Đang tạo: <Text style={styles.boldText}>{title}</Text>
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <Text style={[styles.label, { color: tc.mutedText }]}>LỜI NHẮN ĐẾN TƯƠNG LAI</Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: tc.inputBg,
                  borderColor: tc.inputBorder,
                  color: tc.text,
                },
              ]}
              multiline
              numberOfLines={6}
              maxLength={limits.maxMessageLength}
              placeholder="Viết điều bạn muốn gửi tới tương lai..."
              placeholderTextColor={tc.inputPlaceholder}
              value={message}
              onChangeText={setMessage}
            />
            <Text style={[styles.counter, { color: tc.mutedText }]}>{message.length}/{limits.maxMessageLength}</Text>

            <Text style={[styles.label, { color: tc.mutedText, marginTop: 14 }]}>
              MEDIA ĐÍNH KÈM ({selectedPhotos}/{limits.maxPhotosPerCapsule} ảnh, {selectedVideos}/{limits.maxVideosPerCapsule} video)
            </Text>

            <Pressable
              style={[
                styles.pickButton,
                {
                  backgroundColor: tc.inputBg,
                  borderColor: tc.primary,
                },
              ]}
              onPress={onPickMedia}>
              <View style={[styles.dashedBorder, { borderColor: tc.primary }]}>
                <AppIcon name="image-outline" size={24} color={tc.primary} />
                <Text style={[styles.pickButtonLabel, { color: tc.primary }]}>Thêm ảnh/video từ thư viện</Text>
              </View>
            </Pressable>

            {mediaAssets.length > 0 ? (
              <View style={styles.mediaContainer}>
                <FlatList
                  horizontal
                  data={mediaAssets}
                  keyExtractor={(item, index) => `${item.uri}-${index}`}
                  contentContainerStyle={styles.mediaList}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item, index }) => (
                    <View style={[styles.mediaItem, { borderColor: tc.cardBorder }]}>
                      {item.mediaKind === 'video' ? (
                        <View style={styles.videoPlaceholder}>
                          <AppIcon name="sparkles" size={20} color="#FFFFFF" style={styles.videoIcon} />
                          <Text style={styles.videoLabel}>VIDEO</Text>
                        </View>
                      ) : (
                        <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                      )}
                      <Pressable style={styles.removeButton} onPress={() => onRemoveMedia(index)}>
                        <AppIcon name="close" size={12} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  )}
                />
              </View>
            ) : null}

            <Text style={[styles.info, { color: tc.mutedText }]}>
              {isPremium
                ? `${planName}: tối đa ${limits.maxMessageLength} ký tự, ${limits.maxCapsuleSizeMb}MB/capsule, tổng ${limits.maxAccountStorageMb / 1024}GB.`
                : 'Free: tối đa 500 ký tự, tối đa 5 ảnh, không video, tổng lưu trữ 50MB.'}
            </Text>
            {infoMessage ? (
              <View style={{
                flexDirection: 'row',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                borderColor: 'rgba(239, 68, 68, 0.25)',
                borderWidth: 1.2,
                borderRadius: 16,
                padding: 14,
                marginTop: 12,
                alignItems: 'center',
                gap: 10,
              }}>
                <AppIcon name="alert-circle-outline" size={20} color="#EF4444" />
                <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 }}>
                  {infoMessage}
                </Text>
              </View>
            ) : null}
          </View>

          <PrimaryButton
            label="Tiếp theo"
            iconName="arrow-forward-outline"
            onPress={onNext}
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
    marginBottom: 24,
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
  capsuleInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    alignSelf: 'stretch',
  },
  capsuleTitleText: {
    fontSize: 13,
    flex: 1,
  },
  boldText: {
    fontWeight: '700',
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
  textArea: {
    marginTop: 8,
    minHeight: 140,
    borderWidth: 1.2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  counter: {
    marginTop: 6,
    textAlign: 'right',
    fontSize: 11,
  },
  pickButton: {
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  dashedBorder: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  pickButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  mediaContainer: {
    marginTop: 16,
    height: 100,
  },
  mediaList: {
    gap: 12,
    paddingRight: 10,
  },
  mediaItem: {
    position: 'relative',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mediaImage: {
    width: 88,
    height: 88,
  },
  videoPlaceholder: {
    width: 88,
    height: 88,
    backgroundColor: '#1E1B4B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIcon: {
    marginBottom: 4,
  },
  videoLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  removeButton: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(226, 75, 74, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  info: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
  },
  warning: {
    marginTop: 10,
    color: '#E24B4A',
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    marginTop: 30,
    borderRadius: 16,
    minHeight: 56,
  },
});
