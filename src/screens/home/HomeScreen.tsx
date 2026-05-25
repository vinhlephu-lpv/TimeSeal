import React, { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCapsuleStore } from '../../store/capsuleStore';
import { useAuthStore } from '../../store/authStore';
import { PremiumModal } from '../../components/modals/PremiumModal';
import { runUnlockSweep } from '../../services/capsuleService';
import type { AppStackParamList, BottomTabParamList } from '../../types/navigation';
import type { Capsule } from '../../types/models';
import { colors } from '../../theme/colors';
import { CapsuleCard } from '../../components/capsule/CapsuleCard';
import {
  AppIcon,
  ElevatedCard,
  PrimaryButton,
  SectionTitle,
  SoftScreen,
  uiShadow,
} from '../../components/ui/DesignPrimitives';

type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<BottomTabParamList, 'Home'>,
  NativeStackScreenProps<AppStackParamList>
>;

function Section({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: Capsule[];
  onOpen: (capsule: Capsule) => void;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionTitle tone={title === '🎉 Mở ngay!' ? 'success' : 'muted'} style={{ marginTop: 18, marginBottom: 10 }}>{title}</SectionTitle>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <CapsuleCard capsule={item} onPress={() => onOpen(item)} />}
        scrollEnabled={false}
        contentContainerStyle={styles.sectionList}
      />
    </View>
  );
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const user = useAuthStore(state => state.user);
  const isPremium = Boolean(user?.isPremium);
  const capsules = useCapsuleStore(state => state.capsules);
  const isLoading = useCapsuleStore(state => state.isLoading);
  const error = useCapsuleStore(state => state.error);
  const subscribeCapsules = useCapsuleStore(state => state.subscribeCapsules);
  const clearCapsules = useCapsuleStore(state => state.clearCapsules);
  const [showPremiumModal, setShowPremiumModal] = React.useState(false);

  useEffect(() => {
    if (!user?.id) {
      clearCapsules();
      return;
    }

    runUnlockSweep(user.id).catch(() => {});
    const unsubscribe = subscribeCapsules(user.id);
    return unsubscribe;
  }, [user?.id, subscribeCapsules, clearCapsules]);

  const openCapsule = (capsule: Capsule) => {
    const parent = navigation.getParent();
    if (!parent) {
      return;
    }

    if (capsule.status === 'locked') {
      parent.navigate('CapsuleLocked', { capsuleId: capsule.id });
      return;
    }

    if (capsule.status === 'unlocked') {
      parent.navigate('OpenCapsule', { capsuleId: capsule.id });
      return;
    }

    parent.navigate('CapsuleDetail', { capsuleId: capsule.id });
  };

  const onCreatePress = () => {
    if (!isPremium && capsules.length >= 3) {
      setShowPremiumModal(true);
      return;
    }
    navigation.getParent()?.navigate('CreateStep1');
  };

  const unlocked = capsules.filter(item => item.status === 'unlocked');
  const waiting = capsules.filter(item => item.status === 'locked');
  const opened = capsules.filter(item => item.status === 'opened');

  return (
    <SoftScreen>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>TimeSeal</Text>
              <Text style={styles.headerTitle}>Capsule của tôi</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => navigation.getParent()?.navigate('Notifications')}
                style={styles.iconButton}>
                <AppIcon name="notifications-outline" size={19} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => navigation.getParent()?.navigate('InviteCode')}
                style={styles.inviteButton}>
                <AppIcon name="mail-open" size={18} color={colors.primary} />
                <Text style={styles.inviteLabel}>Mời</Text>
              </Pressable>
              <Pressable
                onPress={onCreatePress}
                style={styles.plusButton}>
                <AppIcon name="add" size={25} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {isLoading ? <Text style={styles.infoText}>Đang tải capsule...</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!capsules.length ? (
            <ElevatedCard style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <AppIcon name="cube-outline" size={36} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Tạo capsule đầu tiên của bạn</Text>
              <Text style={styles.emptySubTitle}>Nhấn nút + để bắt đầu lưu giữ ký ức.</Text>
              <PrimaryButton label="Tạo capsule" iconName="add" onPress={onCreatePress} style={styles.emptyButton} />
            </ElevatedCard>
          ) : (
            <FlatList
              data={[{ key: 'sections' }]}
              keyExtractor={item => item.key}
              renderItem={() => (
                <>
                  <Section title="🎉 Mở ngay!" items={unlocked} onOpen={openCapsule} />
                  <Section title="⏳ Đang chờ" items={waiting} onOpen={openCapsule} />
                  <Section title="📦 Đã mở" items={opened} onOpen={openCapsule} />
                </>
              )}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
        <Pressable style={styles.fab} onPress={onCreatePress}>
          <AppIcon name="add" size={30} color="#FFFFFF" />
        </Pressable>
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
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 18,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  inviteButton: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 4,
    backgroundColor: '#FFFFFF',
  },
  inviteLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 92,
  },
  section: {
    marginTop: 12,
  },
  sectionList: {
    gap: 10,
  },
  emptyState: {
    marginTop: 80,
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '600',
  },
  emptySubTitle: {
    marginTop: 8,
    fontSize: 14,
    color: colors.mutedText,
  },
  emptyButton: {
    marginTop: 22,
    alignSelf: 'stretch',
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 92,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...uiShadow,
  },
  infoText: {
    color: colors.mutedText,
    fontSize: 13,
    marginBottom: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 8,
  },
});
