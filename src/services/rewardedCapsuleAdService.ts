import { Platform } from 'react-native';
import firestore from '@react-native-firebase/firestore';

import mobileAds, {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import {
  ADMOB_REWARDED_CAPSULE_SLOT_AD_UNIT_ID,
  ADMOB_REWARDED_CAPSULE_SLOT_CUSTOM_DATA,
} from '../config/admob';
import {
  getRewardedCapsuleSlotsGranted,
  REWARDED_CAPSULE_SLOT_LIMIT,
} from '../config/rewardCapsuleSlots';
import { useAuthStore } from '../store/authStore';

type RewardedCapsuleAdResult =
  | { status: 'confirmed'; granted: number }
  | { status: 'pending' }
  | { status: 'closed' }
  | { status: 'limit_reached' }
  | { status: 'unavailable'; message?: string };

let initializePromise: Promise<void> | null = null;
let activeRewardRequest: Promise<RewardedCapsuleAdResult> | null = null;

const wait = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

const readGrantedSlots = () =>
  getRewardedCapsuleSlotsGranted(
    useAuthStore.getState().user?.rewardedCapsuleSlots,
  );

const ensureMobileAdsInitialized = async () => {
  if (Platform.OS !== 'android' || !ADMOB_REWARDED_CAPSULE_SLOT_AD_UNIT_ID) {
    throw new Error('Rewarded ads are not configured for this platform.');
  }
  if (!initializePromise) {
    initializePromise = mobileAds()
      .initialize()
      .then(() => undefined);
  }
  await initializePromise;
};

const grantRewardDirectly = async (userId: string, previousGranted: number): Promise<number> => {
  const userRef = firestore().collection('users').doc(userId);
  let nextGranted = previousGranted + 1;

  await firestore().runTransaction(async transaction => {
    const userSnap = await transaction.get(userRef);
    if ((userSnap as any).exists) {
      const data = userSnap.data();

      const currentSlots = data?.rewardedCapsuleSlots;
      let currentGranted = 0;

      if (typeof currentSlots === 'number') {
        currentGranted = currentSlots;
      } else if (currentSlots && typeof currentSlots.granted === 'number') {
        currentGranted = currentSlots.granted;
      } else if (currentSlots && typeof currentSlots.count === 'number') {
        currentGranted = currentSlots.count;
      }

      nextGranted = Math.min(REWARDED_CAPSULE_SLOT_LIMIT, currentGranted + 1);

      if (typeof currentSlots === 'object' && currentSlots !== null) {
        transaction.update(userRef, {
          rewardedCapsuleSlots: {
            ...currentSlots,
            granted: nextGranted,
            count: nextGranted,
            updatedAtISO: new Date().toISOString(),
          },
        });
      } else {
        transaction.update(userRef, {
          rewardedCapsuleSlots: nextGranted,
        });
      }
    }
  });

  // Refresh user profile store to reflect changes immediately in UI
  await useAuthStore.getState().refreshProfile();
  return nextGranted;
};


const runRewardedAd = async (
  userId: string,
): Promise<RewardedCapsuleAdResult> => {
  const previousGranted = readGrantedSlots();
  if (previousGranted >= REWARDED_CAPSULE_SLOT_LIMIT) {
    return { status: 'limit_reached' };
  }

  await ensureMobileAdsInitialized();

  return new Promise(resolve => {
    let settled = false;
    let earnedReward = false;
    let showStarted = false;

    const rewardedAd = RewardedAd.createForAdRequest(
      ADMOB_REWARDED_CAPSULE_SLOT_AD_UNIT_ID,
      {
        serverSideVerificationOptions: {
          userId,
          customData: ADMOB_REWARDED_CAPSULE_SLOT_CUSTOM_DATA,
        },
      },
    );

    const finish = (result: RewardedCapsuleAdResult) => {
      if (settled) {
        return;
      }
      settled = true;
      rewardedAd.removeAllListeners();
      resolve(result);
    };

    rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      showStarted = true;
      rewardedAd.show().catch(error => {
        finish({
          status: 'unavailable',
          message: error instanceof Error ? error.message : undefined,
        });
      });
    });

    rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earnedReward = true;
      grantRewardDirectly(userId, previousGranted)
        .then(nextGranted => {
          finish({ status: 'confirmed', granted: nextGranted });
        })
        .catch(error => {
          console.warn('Failed to grant reward directly:', error);
          finish({ status: 'pending' });
        });
    });


    rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      if (!earnedReward) {
        // Wait a short bit in case EARNED_REWARD is delayed by the bridge
        setTimeout(() => {
          if (!earnedReward) {
            finish({ status: 'closed' });
          }
        }, 1500);
      }
    });

    rewardedAd.addAdEventListener(AdEventType.ERROR, error => {
      finish({
        status: 'unavailable',
        message: error?.message,
      });
    });

    setTimeout(() => {
      if (!showStarted) {
        finish({ status: 'unavailable' });
      }
    }, 30000);

    rewardedAd.load();
  });
};

export const showRewardedCapsuleSlotAd = async (userId: string) => {
  if (activeRewardRequest) {
    return activeRewardRequest;
  }
  activeRewardRequest = runRewardedAd(userId)
    .catch(error => ({
      status: 'unavailable' as const,
      message: error instanceof Error ? error.message : undefined,
    }))
    .finally(() => {
      activeRewardRequest = null;
    });
  return activeRewardRequest;
};
