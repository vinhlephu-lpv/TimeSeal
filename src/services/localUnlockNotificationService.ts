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

type LocalCapsuleScreen = 'CapsuleWaiting' | 'OpenCapsule';
type CapsuleOpenHandler = (capsuleId: string, screen?: LocalCapsuleScreen) => void;

const CHANNEL_ID = 'timeseal_capsule_unlocks';
const SCHEDULED_UNLOCKS_KEY = '@timeseal_scheduled_unlocks';
const SCHEDULED_DEADLINES_KEY = '@timeseal_scheduled_contribution_deadlines';
const UNLOCK_NOTI_KEY = '@timeseal_unlock_noti';

const notificationIdForCapsule = (capsuleId: string) => `timeseal-unlock-${capsuleId}`;
const notificationIdForContributionDeadline = (capsuleId: string) => `timeseal-deadline-${capsuleId}`;

const readScheduledRecord = async (key: string): Promise<Record<string, string>> => {
  const raw = await AsyncStorage.getItem(key).catch(() => null);
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

const writeScheduledRecord = async (key: string, scheduled: Record<string, string>) => {
  await AsyncStorage.setItem(key, JSON.stringify(scheduled)).catch(() => {});
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
  const [scheduledUnlocks, scheduledDeadlines] = await Promise.all([
    readScheduledRecord(SCHEDULED_UNLOCKS_KEY),
    readScheduledRecord(SCHEDULED_DEADLINES_KEY),
  ]);
  await Promise.all(
    Object.keys(scheduledUnlocks).map(async capsuleId => {
      const id = notificationIdForCapsule(capsuleId);
      await notifee.cancelTriggerNotification(id).catch(() => {});
      await notifee.cancelNotification(id).catch(() => {});
    }),
  );
  await Promise.all(
    Object.keys(scheduledDeadlines).map(async capsuleId => {
      const id = notificationIdForContributionDeadline(capsuleId);
      await notifee.cancelTriggerNotification(id).catch(() => {});
      await notifee.cancelNotification(id).catch(() => {});
    }),
  );
  await Promise.all([
    AsyncStorage.removeItem(SCHEDULED_UNLOCKS_KEY).catch(() => {}),
    AsyncStorage.removeItem(SCHEDULED_DEADLINES_KEY).catch(() => {}),
  ]);
};

export const syncLocalUnlockNotifications = async (capsules: Capsule[]): Promise<void> => {
  const unlockNotificationsEnabled = await AsyncStorage.getItem(UNLOCK_NOTI_KEY).catch(() => null);
  if (unlockNotificationsEnabled === '0') {
    await cancelAllLocalUnlockNotifications();
    return;
  }

  const now = Date.now();
  const [scheduledUnlocks, scheduledDeadlines] = await Promise.all([
    readScheduledRecord(SCHEDULED_UNLOCKS_KEY),
    readScheduledRecord(SCHEDULED_DEADLINES_KEY),
  ]);
  const nextScheduled: Record<string, string> = {};
  const nextScheduledDeadlines: Record<string, string> = {};
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
    Object.keys(scheduledUnlocks).map(async capsuleId => {
      const existing = unlockableCapsules.find(capsule => capsule.id === capsuleId);
      if (!unlockableIds.has(capsuleId) || existing?.openDateISO !== scheduledUnlocks[capsuleId]) {
        const id = notificationIdForCapsule(capsuleId);
        await notifee.cancelTriggerNotification(id).catch(() => {});
        await notifee.cancelNotification(id).catch(() => {});
      }
    }),
  );

  for (const capsule of unlockableCapsules) {
    const notificationId = notificationIdForCapsule(capsule.id);
    nextScheduled[capsule.id] = capsule.openDateISO;
    if (scheduledUnlocks[capsule.id] === capsule.openDateISO) {
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

  const deadlineCapsules = capsules.filter(capsule => {
    const deadlineAt = new Date(capsule.contributionDeadlineISO || '').getTime();
    const openAt = new Date(capsule.openDateISO).getTime();
    return (
      capsule.status === 'waiting' &&
      Number.isFinite(deadlineAt) &&
      deadlineAt > now &&
      (!Number.isFinite(openAt) || openAt > now)
    );
  });

  const deadlineIds = new Set(deadlineCapsules.map(capsule => capsule.id));
  await Promise.all(
    Object.keys(scheduledDeadlines).map(async capsuleId => {
      const existing = deadlineCapsules.find(capsule => capsule.id === capsuleId);
      if (!deadlineIds.has(capsuleId) || existing?.contributionDeadlineISO !== scheduledDeadlines[capsuleId]) {
        const id = notificationIdForContributionDeadline(capsuleId);
        await notifee.cancelTriggerNotification(id).catch(() => {});
        await notifee.cancelNotification(id).catch(() => {});
      }
    }),
  );

  for (const capsule of deadlineCapsules) {
    const deadlineISO = capsule.contributionDeadlineISO || '';
    const notificationId = notificationIdForContributionDeadline(capsule.id);
    nextScheduledDeadlines[capsule.id] = deadlineISO;
    if (scheduledDeadlines[capsule.id] === deadlineISO) {
      continue;
    }

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: new Date(deadlineISO).getTime(),
      alarmManager: {
        type: AlarmType.SET_AND_ALLOW_WHILE_IDLE,
      },
    };

    await notifee.createTriggerNotification(
      {
        id: notificationId,
        title: 'Đến hạn đóng góp capsule',
        body: `"${capsule.title || 'Capsule'}" đã đến giờ chốt đóng góp.`,
        data: {
          capsuleId: capsule.id,
          type: 'waiting_deadline',
          source: 'local_deadline',
          screen: 'CapsuleWaiting',
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

  await Promise.all([
    writeScheduledRecord(SCHEDULED_UNLOCKS_KEY, nextScheduled),
    writeScheduledRecord(SCHEDULED_DEADLINES_KEY, nextScheduledDeadlines),
  ]);
};

export const setupLocalUnlockNotificationOpenHandlers = async (
  onCapsuleOpen: CapsuleOpenHandler,
): Promise<() => void> => {
  const handleNotificationPress = (capsuleId: unknown, screenValue?: unknown) => {
    const value = String(capsuleId || '');
    if (value) {
      const screen = screenValue === 'CapsuleWaiting' ? 'CapsuleWaiting' : 'OpenCapsule';
      onCapsuleOpen(value, screen);
    }
  };

  const unsubscribeForeground = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      handleNotificationPress(
        detail.notification?.data?.capsuleId,
        detail.notification?.data?.screen,
      );
    }
  });

  const initial = await notifee.getInitialNotification().catch(() => null);
  if (initial) {
    handleNotificationPress(
      initial.notification.data?.capsuleId,
      initial.notification.data?.screen,
    );
  }

  return unsubscribeForeground;
};
