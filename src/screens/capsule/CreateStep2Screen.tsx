import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import type { AppStackParamList } from '../../types/navigation';
import type { LocalMediaAsset } from '../../store/capsuleStore';
import { PremiumModal } from '../../components/modals/PremiumModal';
import { getPlanLimits } from '../../config/plans';
import { colors } from '../../theme/colors';
import { AppIcon, PrimaryButton, SoftScreen } from '../../components/ui/DesignPrimitives';

type CreateStep2ScreenProps = NativeStackScreenProps<AppStackParamList, 'CreateStep2'>;

export function CreateStep2Screen({ navigation, route }: CreateStep2ScreenProps) {
  const user = useAuthStore(state => state.user);
  const isPremium = Boolean(user?.isPremium);
  const limits = getPlanLimits(isPremium);

  const [message, setMessage] = useState('');
  const [mediaAssets, setMediaAssets] = useState<LocalMediaAsset[]>([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  const remainingMediaSlot = useMemo(
    () => Math.max(0, limits.maxMediaPerCapsule - mediaAssets.length),
    [limits.maxMediaPerCapsule, mediaAssets.length],
  );

  const onPickMedia = async () => {
    if (!remainingMediaSlot) {
      setShowPremiumModal(true);
      return;
    }

    const result = await launchImageLibrary({
      mediaType: 'mixed',
      selectionLimit: remainingMediaSlot,
      quality: 0.8,
      maxWidth: 1080,
      maxHeight: 1080,
    });

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
        } satisfies LocalMediaAsset;
      });

    if (!isPremium && pickedAssets.some(asset => asset.mediaKind === 'video')) {
      setInfoMessage('Gói Free không hỗ trợ video. Nâng cấp Premium để sử dụng video.');
      setShowPremiumModal(true);
    }

    const allowedAssets = isPremium
      ? pickedAssets
      : pickedAssets.filter(asset => asset.mediaKind === 'image');

    setMediaAssets(prev => [...prev, ...allowedAssets].slice(0, limits.maxMediaPerCapsule));
  };

  const onRemoveMedia = (index: number) => {
    setMediaAssets(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const onNext = () => {
    navigation.navigate('CreateStep3', {
      title: route.params.title,
      openDateISO: route.params.openDateISO,
      theme: route.params.theme,
      message: message.trim(),
      mediaAssets,
    });
  };

  return (
    <SoftScreen>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.step}>Bước 2/4</Text>
          <Text style={styles.heading}>Nội dung capsule</Text>

          <Text style={styles.previewTitle}>Tiêu đề: {route.params.title}</Text>

          <Text style={styles.label}>Lời nhắn</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            maxLength={500}
            placeholder="Viết điều bạn muốn gửi tới tương lai..."
            value={message}
            onChangeText={setMessage}
          />
          <Text style={styles.counter}>{message.length}/500</Text>

          <Text style={styles.label}>
            Media ({mediaAssets.length}/{limits.maxMediaPerCapsule})
          </Text>
          <Pressable style={styles.pickButton} onPress={onPickMedia}>
            <AppIcon name="image-outline" size={18} color={colors.primary} />
            <Text style={styles.pickButtonLabel}>Thêm ảnh/video từ thư viện</Text>
          </Pressable>

          <FlatList
            horizontal
            data={mediaAssets}
            keyExtractor={(item, index) => `${item.uri}-${index}`}
            contentContainerStyle={styles.mediaList}
            renderItem={({ item, index }) => (
              <View style={styles.mediaItem}>
                {item.mediaKind === 'video' ? (
                  <View style={styles.videoPlaceholder}>
                    <Text style={styles.videoLabel}>VIDEO</Text>
                  </View>
                ) : (
                  <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                )}
                <Pressable style={styles.removeButton} onPress={() => onRemoveMedia(index)}>
                  <AppIcon name="close" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            )}
          />

          <Text style={styles.info}>
            {isPremium
              ? 'Premium: tối đa 20 media, có hỗ trợ video.'
              : 'Free: tối đa 5 media, chỉ hỗ trợ ảnh.'}
          </Text>
          {infoMessage ? <Text style={styles.warning}>{infoMessage}</Text> : null}

          <PrimaryButton label="Tiếp theo" iconName="arrow-forward-outline" onPress={onNext} style={styles.button} />
        </View>
      </SafeAreaView>
      <PremiumModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 72,
  },
  step: {
    color: colors.mutedText,
    fontSize: 12,
  },
  heading: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  previewTitle: {
    marginTop: 12,
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  label: {
    marginTop: 20,
    fontSize: 13,
    color: colors.mutedText,
  },
  textArea: {
    marginTop: 8,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.softBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
    color: colors.text,
  },
  counter: {
    marginTop: 6,
    textAlign: 'right',
    fontSize: 12,
    color: colors.mutedText,
  },
  pickButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  pickButtonLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
  mediaList: {
    marginTop: 12,
    gap: 10,
  },
  mediaItem: {
    position: 'relative',
  },
  mediaImage: {
    width: 88,
    height: 88,
    borderRadius: 10,
  },
  videoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  removeButton: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    marginTop: 12,
    color: colors.mutedText,
    fontSize: 13,
  },
  warning: {
    marginTop: 8,
    color: colors.danger,
    fontSize: 13,
  },
  button: {
    marginTop: 20,
  },
});
