import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

admin.initializeApp();

export const unlockCapsules = onSchedule(
  {
    schedule: '0 7 * * *',
    timeZone: 'Asia/Ho_Chi_Minh',
  },
  async () => {
    const db = admin.firestore();
    const nowIso = new Date().toISOString();

    const snapshot = await db
      .collection('capsules')
      .where('status', '==', 'locked')
      .where('openDateISO', '<=', nowIso)
      .get();
    const unlockTargets = snapshot.docs;

    if (!unlockTargets.length) {
      return;
    }

    const batch = db.batch();

    for (const doc of unlockTargets) {
      const data = doc.data();
      const ownerId = String(data.ownerId || '');
      if (!ownerId) {
        continue;
      }

      batch.update(doc.ref, { status: 'unlocked' });

      const memberIds = Array.isArray(data.members)
        ? data.members.map((value: unknown) => String(value))
        : [];
      const targetUserIds = Array.from(new Set([ownerId, ...memberIds]));

      for (const targetUserId of targetUserIds) {
        const userDoc = await db.collection('users').doc(targetUserId).get();
        const fcmToken = userDoc.data()?.fcmToken;

        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, {
          userId: targetUserId,
          capsuleId: doc.id,
          type: 'capsule_unlocked',
          title: 'Capsule đã mở!',
          body: `"${String(data.title || 'Capsule')}" đã đến ngày mở.`,
          isRead: false,
          createdAtISO: new Date().toISOString(),
        });

        if (fcmToken) {
          await admin.messaging().send({
            token: fcmToken,
            notification: {
              title: 'Capsule đã mở!',
              body: `"${String(data.title || 'Capsule')}" đã đến ngày mở.`,
            },
            data: {
              capsuleId: doc.id,
              userId: targetUserId,
            },
          });
        }
      }
    }

    await batch.commit();
  },
);
