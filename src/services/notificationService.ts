import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PolishedAlert } from '../store/alertStore';
import { checkNotifications, requestNotifications, RESULTS } from 'react-native-permissions';

type Unsubscribe = () => void;
type CapsuleHandler = (capsuleId: string, screen?: 'CapsuleLocked' | 'CapsuleWaiting' | 'OpenCapsule') => void;
const UNLOCK_NOTI_KEY = '@timeseal_unlock_noti';

const ensureNotificationPermission = async (): Promise<boolean> => {
  const { status } = await checkNotifications();
  if (status === RESULTS.GRANTED) {
    return true;
  }

  const requestResult = await requestNotifications(['alert', 'sound', 'badge']);
  return requestResult.status === RESULTS.GRANTED;
};

export const setupMessagingForUser = async (userId: string): Promise<Unsubscribe> => {
  const granted = await ensureNotificationPermission();
  if (!granted) {
    return () => {};
  }

  await messaging().registerDeviceForRemoteMessages();
  const token = await messaging().getToken();

  await firestore().collection('users').doc(userId).set(
    {
      fcmToken: token,
      updatedAtISO: new Date().toISOString(),
    },
    { merge: true },
  );

  const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
    const unlockNotificationsEnabled = await AsyncStorage.getItem(UNLOCK_NOTI_KEY).catch(() => null);
    if (remoteMessage.data?.type === 'capsule_unlocked' && unlockNotificationsEnabled === '0') {
      return;
    }
    PolishedAlert.show(
      remoteMessage.notification?.title || 'Thông báo mới',
      remoteMessage.notification?.body || 'Bạn có thông báo mới.',
    );
  });

  return unsubscribeOnMessage;
};

export const setupNotificationOpenHandlers = async (
  onCapsuleOpen: CapsuleHandler,
): Promise<Unsubscribe> => {
  const unsubscribeOpen = messaging().onNotificationOpenedApp(remoteMessage => {
    const capsuleId = String(remoteMessage.data?.capsuleId || '');
    if (capsuleId) {
      const screen = remoteMessage.data?.screen === 'CapsuleLocked'
        ? 'CapsuleLocked'
        : remoteMessage.data?.screen === 'CapsuleWaiting'
          ? 'CapsuleWaiting'
          : remoteMessage.data?.screen === 'OpenCapsule'
            ? 'OpenCapsule'
            : undefined;
      onCapsuleOpen(capsuleId, screen);
    }
  });

  const initial = await messaging().getInitialNotification();
  const initialCapsuleId = String(initial?.data?.capsuleId || '');
  if (initialCapsuleId) {
    const screen = initial?.data?.screen === 'CapsuleLocked'
      ? 'CapsuleLocked'
      : initial?.data?.screen === 'CapsuleWaiting'
        ? 'CapsuleWaiting'
        : initial?.data?.screen === 'OpenCapsule'
          ? 'OpenCapsule'
          : undefined;
    onCapsuleOpen(initialCapsuleId, screen);
  }

  return unsubscribeOpen;
};
