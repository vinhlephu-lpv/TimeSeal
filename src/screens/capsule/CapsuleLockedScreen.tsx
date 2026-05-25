import React from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCapsuleStore } from '../../store/capsuleStore';
import type { AppStackParamList } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { formatDate, getCountdownLabel } from '../../utils/dateHelpers';
import { AppIcon, PrimaryButton, SoftScreen, cardShadow, uiShadow } from '../../components/ui/DesignPrimitives';

type Props = NativeStackScreenProps<AppStackParamList, 'CapsuleLocked'>;

export function CapsuleLockedScreen({ navigation, route }: Props) {
  const capsule = useCapsuleStore(s => s.capsules.find(i => i.id === route.params.capsuleId));

  if (!capsule) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}><Text style={styles.title}>Không tìm thấy capsule</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SoftScreen variant="dark">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.hero}>
            <View style={[styles.memoryPhoto, styles.photoOne]} />
            <View style={[styles.memoryPhoto, styles.photoTwo]} />
            <View style={styles.lockIcon}>
              <AppIcon name="lock-closed" size={34} color={colors.warning} />
            </View>
          </View>
          <Text style={styles.lockLabel}>ĐANG KHOÁ</Text>
          <Text style={styles.title}>{capsule.title}</Text>
          <Text style={styles.meta}>Mở vào: {formatDate(capsule.openDateISO)}</Text>
          <View style={styles.countdownBox}>
            <AppIcon name="time-outline" size={20} color={colors.warning} />
            <Text style={styles.countdownText}>{getCountdownLabel(capsule.openDateISO)}</Text>
          </View>
          <PrimaryButton label="Chia sẻ link mời" iconName="share-social-outline"
            onPress={() => Share.share({ message: `Tham gia capsule: timeseal://invite?capsuleId=${capsule.id}` }).catch(() => {})}
            style={styles.shareButton} />
          <Pressable style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonLabel}>Về trang trước</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 72 },
  hero: { width: 300, height: 240, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  memoryPhoto: { position: 'absolute', borderRadius: 20, backgroundColor: '#2A2740', borderWidth: 1, borderColor: '#3A3658', ...cardShadow },
  photoOne: { width: 128, height: 150, left: 28, top: 26, transform: [{ rotate: '-8deg' }] },
  photoTwo: { width: 150, height: 180, right: 22, top: 48, transform: [{ rotate: '8deg' }] },
  lockIcon: { width: 76, height: 76, borderRadius: 28, backgroundColor: '#211F35', alignItems: 'center', justifyContent: 'center', ...uiShadow },
  lockLabel: { color: '#FFFFFF', opacity: 0.8, fontWeight: '700', letterSpacing: 1 },
  title: { marginTop: 18, color: '#FFFFFF', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  meta: { marginTop: 8, color: '#C0C0C0', fontSize: 14 },
  countdownBox: { marginTop: 24, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16, backgroundColor: '#FFFFFF', minWidth: '92%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, shadowColor: colors.warning, shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 5 },
  countdownText: { color: colors.warning, fontSize: 16, fontWeight: '600' },
  button: { marginTop: 12, borderWidth: 1, borderColor: '#FFFFFF', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  buttonLabel: { color: '#FFFFFF', fontWeight: '600' },
  shareButton: { marginTop: 20, minWidth: '92%' },
});
