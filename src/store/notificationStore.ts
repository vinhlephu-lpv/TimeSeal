import { create } from 'zustand';
import firestore from '@react-native-firebase/firestore';
import type { AppNotification } from '../types/models';

type NotificationState = {
  notifications: AppNotification[];
  isLoading: boolean;
  error: string | null;
  subscribeNotifications: (userId: string) => () => void;
  markAllRead: (userId: string) => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
};

export const useNotificationStore = create<NotificationState>()(set => ({
  notifications: [],
  isLoading: false,
  error: null,
  subscribeNotifications: userId => {
    set({ isLoading: true, error: null });

    const unsubscribe = firestore()
      .collection('notifications')
      .where('userId', '==', userId)
      .onSnapshot(
        snapshot => {
          const notifications = snapshot.docs
            .map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                userId: String(data.userId || ''),
                capsuleId: String(data.capsuleId || ''),
                type: (data.type as AppNotification['type']) || 'capsule_unlocked',
                title: String(data.title || ''),
                body: String(data.body || ''),
                isRead: Boolean(data.isRead),
                createdAtISO: String(data.createdAtISO || new Date().toISOString()),
              } satisfies AppNotification;
            })
            .sort(
              (a, b) =>
                new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime(),
            );

          set({ notifications, isLoading: false, error: null });
        },
        () => {
          set({
            isLoading: false,
            error: 'Không tải được danh sách thông báo.',
          });
        },
      );

    return unsubscribe;
  },
  markAllRead: async userId => {
    const snapshot = await firestore()
      .collection('notifications')
      .where('userId', '==', userId)
      .where('isRead', '==', false)
      .get();

    if (!snapshot.docs.length) {
      return;
    }

    const batch = firestore().batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });
    await batch.commit();
  },
  markRead: async notificationId => {
    await firestore().collection('notifications').doc(notificationId).set(
      {
        isRead: true,
      },
      { merge: true },
    );
  },
}));
