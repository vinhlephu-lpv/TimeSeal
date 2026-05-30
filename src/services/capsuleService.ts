import firestore from '@react-native-firebase/firestore';

export const runUnlockSweep = async (ownerId: string): Promise<void> => {
  const now = new Date();
  const snapshot = await firestore()
    .collection('capsules')
    .where('ownerId', '==', ownerId)
    .where('status', '==', 'locked')
    .get();

  const unlockTargets = snapshot.docs.filter(doc => {
    const data = doc.data();
    const openDateISO = String(data.openDateISO || '');
    if (!openDateISO) {
      return false;
    }
    return new Date(openDateISO) <= now;
  });

  if (!unlockTargets.length) {
    return;
  }

  const batch = firestore().batch();
  unlockTargets.forEach(doc => {
    const data = doc.data();
    batch.update(doc.ref, {
      status: 'unlocked',
    });

    const notificationRef = firestore().collection('notifications').doc();
    batch.set(notificationRef, {
      userId: ownerId,
      capsuleId: doc.id,
      type: 'capsule_unlocked',
      title: 'Capsule đã mở!',
      body: `"${String(data.title || 'Capsule')}" đã đến ngày mở.`,
      isRead: false,
      createdAtISO: now.toISOString(),
    });
  });

  await batch.commit();
};
