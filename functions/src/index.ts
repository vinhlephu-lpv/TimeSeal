import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

if (!admin.apps.length) {
  admin.initializeApp();
}

export {
  abandonCapsuleDraft,
  abandonAvatarDraft,
  acceptCapsuleInvite,
  cleanupStaleAvatarDrafts,
  cleanupStaleUploadDrafts,
  createAvatarDraft,
  createCapsuleDraft,
  deleteAccountData,
  deleteCapsule,
  finalizeCapsuleUpload,
  finalizeAvatarUpload,
  getAvatarAccess,
  getCapsuleInviteToken,
  getCapsuleMediaAccess,
  getCapsuleThumbnailUrls,
  getInvitePreview,
  markCapsuleOpened,
  revenuecatWebhook,
  revokeLegacyMediaTokens,
  unlockDueCapsules,
} from './api';

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

    const operations: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
    const pendingMessages: admin.messaging.Message[] = [];

    for (const doc of unlockTargets) {
      const data = doc.data();
      const ownerId = String(data.ownerId || '');
      if (!ownerId) {
        continue;
      }

      const memberIds = Array.isArray(data.members)
        ? data.members.map((value: unknown) => String(value))
        : [];
      const targetUserIds = Array.from(new Set([ownerId, ...memberIds]));

      for (const targetUserId of targetUserIds) {
        const userDoc = await db.collection('users').doc(targetUserId).get();
        const fcmToken = userDoc.data()?.fcmToken;

        const notifRef = db.collection('notifications').doc(`${doc.id}_${targetUserId}`);
        operations.push(batch => batch.set(notifRef, {
          userId: targetUserId,
          capsuleId: doc.id,
          type: 'capsule_unlocked',
          title: 'Capsule đã mở!',
          body: `"${String(data.title || 'Capsule')}" đã đến ngày mở.`,
          isRead: false,
          createdAtISO: new Date().toISOString(),
        }));

        if (fcmToken) {
          pendingMessages.push({
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
      operations.push(batch => batch.update(doc.ref, { status: 'unlocked' }));
    }

    for (let index = 0; index < operations.length; index += 400) {
      const batch = db.batch();
      operations.slice(index, index + 400).forEach(operation => operation(batch));
      await batch.commit();
    }
    for (const message of pendingMessages) {
      await admin.messaging().send(message).catch(() => {});
    }
  },
);
