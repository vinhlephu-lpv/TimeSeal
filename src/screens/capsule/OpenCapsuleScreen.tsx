import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
import { useCapsuleStore } from '../../store/capsuleStore';
import { AppIcon, SoftScreen, uiShadow } from '../../components/ui/DesignPrimitives';

type Props = NativeStackScreenProps<AppStackParamList, 'OpenCapsule'>;

export function OpenCapsuleScreen({ navigation, route }: Props) {
  const markCapsuleOpened = useCapsuleStore(s => s.markCapsuleOpened);

  useEffect(() => {
    const timer = setTimeout(async () => {
      await markCapsuleOpened(route.params.capsuleId);
      navigation.replace('CapsuleDetail', { capsuleId: route.params.capsuleId });
    }, 1800);
    return () => clearTimeout(timer);
  }, [navigation, route.params.capsuleId, markCapsuleOpened]);

  return (
    <SoftScreen variant="dark">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.envelope}>
            <AppIcon name="mail-open" size={72} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Đang mở capsule...</Text>
          <Text style={styles.subtitle}>Khoảnh khắc của bạn đang được mở khoá ✨</Text>
        </View>
      </SafeAreaView>
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 72 },
  envelope: { width: 180, height: 180, borderRadius: 36, backgroundColor: '#24213A', alignItems: 'center', justifyContent: 'center', marginBottom: 26, ...uiShadow },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  subtitle: { marginTop: 10, color: '#A9A9A9', fontSize: 14 },
});
