import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import type { AppStackParamList } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { formatDate } from '../../utils/dateHelpers';
import { AppIcon, ElevatedCard, PrimaryButton, SoftScreen } from '../../components/ui/DesignPrimitives';

type Props = NativeStackScreenProps<AppStackParamList, 'InviteAccept'>;

export function InviteAcceptScreen({ route, navigation }: Props) {
  const user = useAuthStore(s => s.user);
  const [title, setTitle] = useState('Đang tải capsule...');
  const [openDateISO, setOpenDateISO] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    firestore().collection('capsules').doc(route.params.capsuleId).get()
      .then(doc => {
        const data = doc.data();
        if (!data) { setTitle('Không tìm thấy capsule'); return; }
        setTitle(String(data.title || 'Capsule'));
        setOpenDateISO(String(data.openDateISO || ''));
      })
      .catch(() => setTitle('Không tìm thấy capsule'));
  }, [route.params.capsuleId]);

  const joinCapsule = async () => {
    if (!user?.id) { setMessage('Bạn cần đăng nhập để tham gia capsule.'); return; }
    setLoading(true);
    try {
      await firestore().collection('capsules').doc(route.params.capsuleId)
        .set({ members: firestore.FieldValue.arrayUnion(user.id) }, { merge: true });
      setMessage('Tham gia capsule thành công!');
      navigation.replace('CapsuleLocked', { capsuleId: route.params.capsuleId });
    } catch {
      setMessage('Không thể tham gia capsule lúc này.');
    } finally { setLoading(false); }
  };

  return (
    <SoftScreen>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ElevatedCard style={styles.card}>
            <View style={styles.iconWrap}>
              <AppIcon name="mail-open" size={34} color={colors.primary} />
            </View>
            <Text style={styles.kicker}>Lời mời tham gia capsule</Text>
            <Text style={styles.title}>{title}</Text>
            {openDateISO ? <Text style={styles.meta}>Mở vào {formatDate(openDateISO)}</Text> : null}
            <Text style={styles.code}>Mã: {route.params.capsuleId}</Text>
            {message ? <Text style={styles.status}>{message}</Text> : null}
            <PrimaryButton label={loading ? 'Đang xử lý...' : 'Tham gia'}
              iconName="arrow-forward-outline" onPress={joinCapsule}
              disabled={loading || title === 'Không tìm thấy capsule'} style={styles.button} />
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.backLabel}>Nhập mã khác</Text>
            </Pressable>
          </ElevatedCard>
        </View>
      </SafeAreaView>
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, padding: 16, justifyContent: 'center', paddingTop: 72 },
  card: { alignItems: 'center', paddingVertical: 28 },
  iconWrap: { width: 76, height: 76, borderRadius: 26, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  kicker: { color: colors.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  title: { marginTop: 8, color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  meta: { marginTop: 8, color: colors.mutedText },
  code: { marginTop: 10, color: colors.mutedText, fontSize: 12 },
  status: { marginTop: 14, color: colors.primary, fontWeight: '700' },
  button: { alignSelf: 'stretch', marginTop: 20 },
  backLabel: { marginTop: 16, color: colors.primary, fontWeight: '700' },
});
