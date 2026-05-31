import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import { checkNotifications, requestNotifications, RESULTS } from 'react-native-permissions';
import { translate } from '../i18n';

type Unsubscribe = () => void;
type CapsuleHandler = (capsuleId: string) => void;

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
    const data = remoteMessage.data || {};
    const capsuleId = String(data.capsuleId || '');

    await firestore().collection('notifications').add({
      userId,
      capsuleId,
      type: 'capsule_unlocked',
      title: remoteMessage.notification?.title || translate('Thông báo mới'),
      body: remoteMessage.notification?.body || translate('Bạn có thông báo mới'),
      isRead: false,
      createdAtISO: new Date().toISOString(),
    });
  });

  return unsubscribeOnMessage;
};

export const setupNotificationOpenHandlers = async (
  onCapsuleOpen: CapsuleHandler,
): Promise<Unsubscribe> => {
  const unsubscribeOpen = messaging().onNotificationOpenedApp(remoteMessage => {
    const capsuleId = String(remoteMessage.data?.capsuleId || '');
    if (capsuleId) {
      onCapsuleOpen(capsuleId);
    }
  });

  const initial = await messaging().getInitialNotification();
  const initialCapsuleId = String(initial?.data?.capsuleId || '');
  if (initialCapsuleId) {
    onCapsuleOpen(initialCapsuleId);
  }

  return unsubscribeOpen;
};
