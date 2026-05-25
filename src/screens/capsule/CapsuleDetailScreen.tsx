import React from 'react';
import { Alert, Image, Modal, PermissionsAndroid, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { useCapsuleStore } from '../../store/capsuleStore';
import { colors } from '../../theme/colors';
import { formatDate } from '../../utils/dateHelpers';
import { AppIcon, ElevatedCard, PrimaryButton, SoftScreen } from '../../components/ui/DesignPrimitives';

type Props = NativeStackScreenProps<AppStackParamList, 'CapsuleDetail'>;

const isValidImageUri = (uri: unknown): uri is string =>
  typeof uri === 'string' && /^(https?:|file:|content:|data:image\/)/.test(uri);

async function requestSavePermission() {
  if (Platform.OS !== 'android') { return true; }
  const version = Number(Platform.Version);
  if (Number.isFinite(version) && version >= 29) { return true; }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function CapsuleDetailScreen({ route }: Props) {
  const [previewVisible, setPreviewVisible] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const capsule = useCapsuleStore(s => s.capsules.find(i => i.id === route.params.capsuleId));

  if (!capsule) {
    return (<SafeAreaView style={styles.safeArea}><View style={styles.container}><Text style={styles.title}>Không tìm thấy capsule</Text></View></SafeAreaView>);
  }

  const mediaUrls = (capsule.mediaUrls || []).filter(isValidImageUri);
  const heroUri = mediaUrls[0];

  const shareCapsule = async () => {
    await Share.share({ title: capsule.title, message: `Xem capsule: timeseal://invite?capsuleId=${capsule.id}`, url: heroUri }).catch(() => {});
  };

  const saveHeroImage = async () => {
    if (!heroUri) { Alert.alert('Chưa có ảnh', 'Capsule này chưa có ảnh để lưu.'); return; }
    const allowed = await requestSavePermission();
    if (!allowed) { Alert.alert('Cần quyền lưu ảnh', 'Hãy cấp quyền bộ nhớ/thư viện ảnh để TimeSeal lưu ảnh.'); return; }
    try {
      setIsSaving(true);
      await CameraRoll.save(heroUri, { type: 'photo', album: 'TimeSeal' });
      Alert.alert('Đã lưu ảnh', 'Ảnh đã được lưu vào thư viện TimeSeal.');
    } catch {
      Alert.alert('Chưa lưu được ảnh', 'Thử lại sau hoặc chia sẻ ảnh về máy trước.');
    } finally { setIsSaving(false); }
  };

  return (
    <SoftScreen variant="warm">
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            <Pressable style={styles.coverHero} onPress={() => { if (heroUri) { setPreviewVisible(true); } }}>
              {heroUri ? (<Image source={{ uri: heroUri }} style={styles.coverImage} resizeMode="cover" />) :
                (<AppIcon name="images-outline" size={46} color={colors.warningDark} />)}
            </Pressable>
            <ElevatedCard style={styles.shareCard}>
              <Text style={styles.title}>{capsule.title}</Text>
              <Text style={styles.meta}>Tạo ngày {formatDate(capsule.createdAtISO)} · Mở ngày {formatDate(capsule.openDateISO)}</Text>
            </ElevatedCard>
            <ElevatedCard style={styles.messageBox}>
              <Text style={styles.messageTitle}>💌 Lời nhắn</Text>
              <Text style={styles.message}>{capsule.message || 'Chưa có lời nhắn.'}</Text>
            </ElevatedCard>
            <View style={styles.photoHeader}>
              <Text style={styles.sectionTitle}>📷 Ảnh ({mediaUrls.length})</Text>
              {heroUri ? <Text style={styles.photoHint}>Bấm vào ảnh để xem lớn</Text> : null}
            </View>
            <View style={styles.actions}>
              <PrimaryButton label="Chia sẻ" iconName="share-social-outline" variant="outline" onPress={shareCapsule} style={styles.actionButton} />
              <PrimaryButton label={isSaving ? 'Đang lưu...' : 'Lưu ảnh'} iconName="download-outline" variant="outline" onPress={saveHeroImage} disabled={isSaving || !heroUri} style={styles.actionButton} />
            </View>
            {!heroUri ? (<Text style={styles.emptyMedia}>Chưa có ảnh trong capsule này.</Text>) : null}
          </View>
        </ScrollView>
        <Modal visible={previewVisible} transparent animationType="fade">
          <View style={styles.previewOverlay}>
            <Pressable style={styles.previewClose} onPress={() => setPreviewVisible(false)}>
              <AppIcon name="close" size={22} color="#FFFFFF" />
            </Pressable>
            {heroUri ? (<Image source={{ uri: heroUri }} style={styles.previewImage} resizeMode="contain" />) : null}
          </View>
        </Modal>
      </SafeAreaView>
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingTop: 72, paddingBottom: 24 },
  container: { padding: 16 },
  coverHero: { height: 220, borderRadius: 24, backgroundColor: colors.warmSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#FFE0BD', overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%' },
  shareCard: { padding: 14 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  meta: { marginTop: 8, color: colors.mutedText, fontSize: 13 },
  messageBox: { marginTop: 16 },
  messageTitle: { color: colors.text, fontWeight: '700' },
  message: { marginTop: 8, color: colors.text, lineHeight: 22 },
  photoHeader: { marginTop: 20 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  photoHint: { marginTop: 4, color: colors.mutedText, fontSize: 12 },
  emptyMedia: { marginTop: 8, color: colors.mutedText, fontSize: 13 },
  actions: { marginTop: 12, flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, minHeight: 48 },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.92)', alignItems: 'center', justifyContent: 'center' },
  previewClose: { position: 'absolute', top: 42, right: 18, zIndex: 2, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255, 255, 255, 0.16)' },
  previewImage: { width: '100%', height: '82%' },
});
