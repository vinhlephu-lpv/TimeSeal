import React from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import type { LocalMediaAsset } from '../../store/capsuleStore';
import type { AppStackParamList } from '../../types/navigation';
import type { CapsuleTheme } from '../../types/models';
import { capsuleThemes, ThemeBackground } from '../../theme/capsuleThemes';
import { AppIcon, PrimaryButton } from '../../components/ui/DesignPrimitives';
import { getPlanLimits } from '../../config/plans';
import { getWaitingCapsuleDetail, updateContributionText } from '../../services/backendService';
import { saveCapsuleContributionWithUpload } from '../../services/waitingContributionUploadService';
import { suppressBiometricAutoLock } from '../../services/biometricLockGuard';
import { useTranslation } from '../../i18n';

type Props = NativeStackScreenProps<AppStackParamList, 'CapsuleContribution'>;

export function CapsuleContributionScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const isPremium = Boolean(user?.isPremium);
  const userPlan = user?.plan || (isPremium ? 'plus' : 'free');
  const limits = getPlanLimits(userPlan);
  const insets = useSafeAreaInsets();
  const [themeKey, setThemeKey] = React.useState<CapsuleTheme>('default');
  const activeTheme = capsuleThemes[themeKey] || capsuleThemes.default;
  const tc = activeTheme.colors;
  const [message, setMessage] = React.useState('');
  const [mediaAssets, setMediaAssets] = React.useState<LocalMediaAsset[]>([]);
  const [hasExistingContribution, setHasExistingContribution] = React.useState(false);
  const [existingThumbs, setExistingThumbs] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    navigation.setOptions({
      headerTransparent: false,
      headerStyle: { backgroundColor: tc.background },
      headerTintColor: tc.text,
      headerShadowVisible: false,
      title: hasExistingContribution ? t('Sửa đóng góp') : t('Đóng góp'),
    });
  }, [hasExistingContribution, navigation, t, tc]);

  React.useEffect(() => {
    let active = true;
    getWaitingCapsuleDetail(route.params.capsuleId)
      .then(detail => {
        if (!active) {
          return;
        }
        setThemeKey(detail.capsule.theme in capsuleThemes ? detail.capsule.theme as CapsuleTheme : 'default');
        const own = detail.contributions.find(item => item.contributorId === user?.id);
        if (own) {
          setHasExistingContribution(true);
          setMessage(own.message);
          setExistingThumbs(own.thumbnailUrls.filter(Boolean));
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : t('Không tải được đóng góp của bạn.')))
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [route.params.capsuleId, t, user?.id]);

  const pickMedia = async () => {
    const remaining = Math.max(0, limits.maxMediaPerCapsule - mediaAssets.length);
    if (!remaining) {
      setError(t('Đã đạt giới hạn media của gói hiện tại.'));
      return;
    }

    suppressBiometricAutoLock();
    let result;
    try {
      result = await launchImageLibrary({
        mediaType: 'mixed',
        selectionLimit: remaining,
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
    const picked = result.assets
      .filter(asset => Boolean(asset.uri))
      .map(asset => ({
        uri: asset.uri || '',
        fileName: asset.fileName,
        type: asset.type,
        mediaKind: asset.type?.startsWith('video/') ? ('video' as const) : ('image' as const),
        fileSize: asset.fileSize || 0,
        duration: asset.duration,
      }));
    const allowed = picked.filter(asset => {
      if (asset.mediaKind === 'video' && !limits.allowVideo) {
        return false;
      }
      if (asset.mediaKind === 'video' && Number(asset.duration || 0) > limits.maxVideoDurationSeconds) {
        return false;
      }
      return true;
    });
    setMediaAssets(prev => [...prev, ...allowed].slice(0, limits.maxMediaPerCapsule));
  };

  const removeMedia = (index: number) => {
    setMediaAssets(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const saveContribution = async () => {
    if (isSaving) {
      return;
    }
    if (!message.trim() && !mediaAssets.length && !hasExistingContribution) {
      setError(t('Hãy nhập nội dung hoặc chọn media để đóng góp.'));
      return;
    }
    try {
      setIsSaving(true);
      setError('');
      if (hasExistingContribution && mediaAssets.length === 0) {
        await updateContributionText(route.params.capsuleId, message);
        setProgress(100);
      } else {
        await saveCapsuleContributionWithUpload({
          capsuleId: route.params.capsuleId,
          message,
          mediaAssets,
        }, userPlan, setProgress);
      }
      navigation.replace('CapsuleWaiting', { capsuleId: route.params.capsuleId });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Không lưu được đóng góp.'));
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: tc.background }]}>
        <ThemeBackground themeKey={themeKey} />
        <ActivityIndicator color={tc.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: tc.background }]}>
      <ThemeBackground themeKey={themeKey} />
      <StatusBar barStyle={activeTheme.statusBar} translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
          <Text style={[styles.heading, { color: tc.text }]}>
            {hasExistingContribution ? t('Sửa đóng góp của tôi') : t('Đóng góp ký ức')}
          </Text>
          <Text style={[styles.subheading, { color: tc.mutedText }]}>
            {t('Bạn chỉ chỉnh sửa phần của mình. Nội dung của thành viên khác được giữ nguyên.')}
          </Text>

          <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <Text style={[styles.label, { color: tc.mutedText }]}>{t('LỜI NHẮN')}</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              editable={!isSaving}
              multiline
              maxLength={limits.maxMessageLength}
              textAlignVertical="top"
              placeholder={t('Viết phần đóng góp của bạn...')}
              placeholderTextColor={tc.inputPlaceholder}
              style={[styles.input, { color: tc.text, backgroundColor: tc.inputBg, borderColor: tc.inputBorder }]}
            />
            <Text style={[styles.counter, { color: tc.mutedText }]}>{message.length}/{limits.maxMessageLength}</Text>
          </View>

          {hasExistingContribution && existingThumbs.length > 0 && mediaAssets.length === 0 ? (
            <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
              <Text style={[styles.label, { color: tc.mutedText }]}>{t('MEDIA HIỆN TẠI')}</Text>
              <FlatList
                horizontal
                data={existingThumbs}
                keyExtractor={(item, index) => `${item}-${index}`}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => <Image source={{ uri: item }} style={styles.thumb} />}
                contentContainerStyle={styles.mediaRow}
              />
              <Text style={[styles.hint, { color: tc.mutedText }]}>
                {t('Không chọn media mới thì app chỉ cập nhật lời nhắn và giữ media hiện tại.')}
              </Text>
            </View>
          ) : null}

          <View style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.cardBorder }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.label, { color: tc.mutedText }]}>{t('MEDIA MỚI')}</Text>
              <Pressable onPress={pickMedia} disabled={isSaving} style={[styles.addMedia, { backgroundColor: tc.activeChipBg }]}>
                <AppIcon name="images-outline" size={16} color={tc.activeChipText} />
                <Text style={[styles.addMediaText, { color: tc.activeChipText }]}>{t('Chọn')}</Text>
              </Pressable>
            </View>
            {mediaAssets.length ? (
              <FlatList
                horizontal
                data={mediaAssets}
                keyExtractor={(item, index) => `${item.uri}-${index}`}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => (
                  <View style={styles.localMediaWrap}>
                    {item.mediaKind === 'video' ? (
                      <View style={[styles.thumb, styles.videoThumb]}>
                        <AppIcon name="videocam-outline" size={24} color="#FFFFFF" />
                      </View>
                    ) : (
                      <Image source={{ uri: item.uri }} style={styles.thumb} />
                    )}
                    <Pressable style={styles.removeBtn} onPress={() => removeMedia(index)}>
                      <AppIcon name="close" size={13} color="#FFFFFF" />
                    </Pressable>
                  </View>
                )}
                contentContainerStyle={styles.mediaRow}
              />
            ) : (
              <Text style={[styles.hint, { color: tc.mutedText }]}>{t('Có thể đóng góp chỉ bằng text hoặc đính kèm ảnh/video theo quota của bạn.')}</Text>
            )}
          </View>

          {isSaving ? (
            <View style={styles.progressBox}>
              <ActivityIndicator color={tc.primary} />
              <Text style={[styles.progressText, { color: tc.primary }]}>{progress}%</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label={isSaving ? t('Đang lưu...') : t('Lưu đóng góp')}
            iconName="cloud-upload-outline"
            disabled={isSaving}
            onPress={saveContribution}
            style={[styles.primary, { backgroundColor: tc.buttonBg }]}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingTop: 12 },
  heading: { fontSize: 26, fontWeight: '900' },
  subheading: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  card: { marginTop: 16, borderWidth: 1.2, borderRadius: 18, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  input: { marginTop: 10, minHeight: 150, borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, lineHeight: 21 },
  counter: { marginTop: 6, textAlign: 'right', fontSize: 11, fontWeight: '700' },
  addMedia: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  addMediaText: { fontSize: 12, fontWeight: '900' },
  mediaRow: { gap: 10, paddingTop: 12 },
  thumb: { width: 92, height: 92, borderRadius: 14, backgroundColor: '#CBD5E1' },
  videoThumb: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#334155' },
  localMediaWrap: { position: 'relative' },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { marginTop: 10, fontSize: 12, lineHeight: 18 },
  progressBox: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  progressText: { fontSize: 13, fontWeight: '900' },
  error: { marginTop: 14, color: '#EF4444', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  primary: { marginTop: 20, minHeight: 56, borderRadius: 16 },
});
