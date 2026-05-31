import React, { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useCapsuleStore } from '../../store/capsuleStore';
import type { AppStackParamList } from '../../types/navigation';
import { useTheme, type ThemeColors } from '../../theme/ThemeContext';
import { formatDate } from '../../utils/dateHelpers';
import { AppIcon, SoftScreen, cardShadow } from '../../components/ui/DesignPrimitives';
import { useTranslation } from '../../i18n';

type Props = NativeStackScreenProps<AppStackParamList, 'Notifications'>;

export function NotificationsScreen({ navigation }: Props) {
  const user = useAuthStore(s => s.user);
  const capsules = useCapsuleStore(s => s.capsules);
  const notifications = useNotificationStore(s => s.notifications);
  const isLoading = useNotificationStore(s => s.isLoading);
  const error = useNotificationStore(s => s.error);
  const subscribeNotifications = useNotificationStore(s => s.subscribeNotifications);
  const markAllRead = useNotificationStore(s => s.markAllRead);
  const markRead = useNotificationStore(s => s.markRead);

  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  useEffect(() => {
    if (!user?.id) { return; }
    const unsubscribe = subscribeNotifications(user.id);
    return unsubscribe;
  }, [user?.id, subscribeNotifications]);

  return (
    <SoftScreen variant="info">
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => { if (!user?.id) { return; } markAllRead(user.id).catch(() => {}); }}>
              <Text style={styles.markRead}>{t('Đánh dấu đã đọc')}</Text>
            </Pressable>
          </View>
          {isLoading ? <Text style={styles.info}>{t('Đang tải thông báo...')}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <FlatList data={notifications} keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: Math.max(20, insets.bottom + 16) }}
            ListEmptyComponent={<View style={styles.emptyWrap}><AppIcon name="notifications-outline" size={40} color={colors.mutedText} /><Text style={styles.empty}>{t('Chưa có thông báo nào.')}</Text></View>}
            renderItem={({ item }) => (
              <Pressable style={[styles.item, !item.isRead && styles.itemUnread]}
                onPress={() => {
                  markRead(item.id).catch(() => {});
                  if (item.capsuleId) {
                    const capsule = capsules.find(v => v.id === item.capsuleId);
                    if (!capsule || capsule.status === 'locked') { navigation.navigate('CapsuleLocked', { capsuleId: item.capsuleId }); return; }
                    if (capsule.status === 'unlocked') { navigation.navigate('OpenCapsule', { capsuleId: item.capsuleId }); return; }
                    navigation.navigate('CapsuleDetail', { capsuleId: item.capsuleId });
                  }
                }}>
                <View style={styles.itemRow}>
                  <View style={[styles.itemIcon, !item.isRead && styles.itemIconUnread]}>
                    <AppIcon name="notifications-outline" size={18} color={item.isRead ? colors.mutedText : colors.info} />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemBody}>{item.body}</Text>
                    <Text style={styles.itemTime}>{formatDate(item.createdAtISO)}</Text>
                  </View>
                </View>
              </Pressable>
            )} />
        </View>
      </SafeAreaView>
    </SoftScreen>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, padding: 16, paddingTop: 72 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12 },
  markRead: { color: colors.primary, fontWeight: '600' },
  info: { color: colors.mutedText, marginBottom: 8 },
  error: { color: colors.danger, marginBottom: 8 },
  emptyWrap: { marginTop: 100, alignItems: 'center', gap: 12 },
  empty: { color: colors.mutedText, fontSize: 14 },
  item: { borderWidth: 1, borderColor: colors.primarySoft, borderRadius: 12, backgroundColor: colors.card, padding: 12, marginBottom: 10, ...cardShadow },
  itemUnread: { borderColor: colors.primary, backgroundColor: colors.infoLight },
  itemRow: { flexDirection: 'row', gap: 12 },
  itemIcon: { width: 36, height: 36, borderRadius: 14, backgroundColor: isDark ? colors.background : '#F6F6F6', alignItems: 'center', justifyContent: 'center' },
  itemIconUnread: { backgroundColor: colors.card },
  itemContent: { flex: 1 },
  itemTitle: { color: colors.text, fontWeight: '700' },
  itemBody: { marginTop: 4, color: colors.text },
  itemTime: { marginTop: 6, color: colors.mutedText, fontSize: 12 },
});
