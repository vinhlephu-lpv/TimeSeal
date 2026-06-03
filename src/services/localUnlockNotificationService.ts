import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {
  AlarmType,
  AndroidCategory,
  AndroidImportance,
  AuthorizationStatus,
  EventType,
  TriggerType,
  type TimestampTrigger,
} from '@notifee/react-native';
import type { Capsule } from '../types/models';

type CapsuleOpenHandler = (capsuleId: string) => void;

const CHANNEL_ID = 'timeseal_capsule_unlocks';
const SCHEDULED_UNLOCKS_KEY = '@timeseal_scheduled_unlocks';
const UNLOCK_NOTI_KEY = '@timeseal_unlock_noti';

const notificationIdForCapsule = (capsuleId: string) => `timeseal-unlock-${capsuleId}`;

const readScheduledUnlocks = async (): Promise<Record<string, string>> => {
  const raw = await AsyncStorage.getItem(SCHEDULED_UNLOCKS_KEY).catch(() => null);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeScheduledUnlocks = async (scheduled: Record<string, string>) => {
  await AsyncStorage.setItem(SCHEDULED_UNLOCKS_KEY, JSON.stringify(scheduled)).catch(() => {});
};

const ensurePermission = async (): Promise<boolean> => {
  const settings = await notifee.requestPermission().catch(() => null);
  return !!settings && settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
};

const ensureChannel = async (): Promise<string> =>
  notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Capsule mở khóa',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });

export const cancelAllLocalUnlockNotifications = async (): Promise<void> => {
  const scheduled = await readScheduledUnlocks();
  await Promise.all(
    Object.keys(scheduled).map(async capsuleId => {
      const id = notificationIdForCapsule(capsuleId);
      await notifee.cancelTriggerNotification(id).catch(() => {});
      await notifee.cancelNotification(id).catch(() => {});
    }),
  );
  await AsyncStorage.removeItem(SCHEDULED_UNLOCKS_KEY).catch(() => {});
};

export const syncLocalUnlockNotifications = async (capsules: Capsule[]): Promise<void> => {
  const unlockNotificationsEnabled = await AsyncStorage.getItem(UNLOCK_NOTI_KEY).catch(() => null);
  if (unlockNotificationsEnabled === '0') {
    await cancelAllLocalUnlockNotifications();
    return;
  }

  const now = Date.now();
  const scheduled = await readScheduledUnlocks();
  const nextScheduled: Record<string, string> = {};
  const channelId = await ensureChannel();
  const hasPermission = await ensurePermission();
  if (!hasPermission) {
    return;
  }

  const unlockableCapsules = capsules.filter(capsule => {
    const openAt = new Date(capsule.openDateISO).getTime();
    return (
      Number.isFinite(openAt) &&
      openAt > now &&
      (capsule.status === 'locked' || capsule.status === 'waiting')
    );
  });

  const unlockableIds = new Set(unlockableCapsules.map(capsule => capsule.id));
  await Promise.all(
    Object.keys(scheduled).map(async capsuleId => {
      const existing = unlockableCapsules.find(capsule => capsule.id === capsuleId);
      if (!unlockableIds.has(capsuleId) || existing?.openDateISO !== scheduled[capsuleId]) {
        const id = notificationIdForCapsule(capsuleId);
        await notifee.cancelTriggerNotification(id).catch(() => {});
        await notifee.cancelNotification(id).catch(() => {});
      }
    }),
  );

  for (const capsule of unlockableCapsules) {
    const notificationId = notificationIdForCapsule(capsule.id);
    nextScheduled[capsule.id] = capsule.openDateISO;
    if (scheduled[capsule.id] === capsule.openDateISO) {
      continue;
    }

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: new Date(capsule.openDateISO).getTime(),
      alarmManager: {
        type: AlarmType.SET_AND_ALLOW_WHILE_IDLE,
      },
    };

    await notifee.createTriggerNotification(
      {
        id: notificationId,
        title: 'Capsule đã mở!',
        body: `"${capsule.title || 'Capsule'}" đã đến giờ mở.`,
        data: {
          capsuleId: capsule.id,
          type: 'capsule_unlocked',
          source: 'local_unlock',
          screen: 'OpenCapsule',
        },
        android: {
          channelId,
          category: AndroidCategory.REMINDER,
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
      },
      trigger,
    ).catch(() => {});
  }

  await writeScheduledUnlocks(nextScheduled);
};

export const setupLocalUnlockNotificationOpenHandlers = async (
  onCapsuleOpen: CapsuleOpenHandler,
): Promise<() => void> => {
  const handleNotificationPress = (capsuleId: unknown) => {
    const value = String(capsuleId || '');
    if (value) {
      onCapsuleOpen(value);
    }
  };

  const unsubscribeForeground = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      handleNotificationPress(detail.notification?.data?.capsuleId);
    }
  });

  const initial = await notifee.getInitialNotification().catch(() => null);
  if (initial) {
    handleNotificationPress(initial.notification.data?.capsuleId);
  }

  return unsubscribeForeground;
};
