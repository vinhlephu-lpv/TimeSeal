import { Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import {
  ADMOB_REWARDED_CAPSULE_SLOT_AD_UNIT_ID,
  ADMOB_REWARDED_CAPSULE_SLOT_CUSTOM_DATA,
  ADMOB_TEST_DEVICE_IDENTIFIERS,
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
      .setRequestConfiguration({
        testDeviceIdentifiers: ADMOB_TEST_DEVICE_IDENTIFIERS,
      })
      .then(() => mobileAds().initialize())
      .then(() => undefined);
  }
  await initializePromise;
};

const waitForServerRewardConfirmation = async (previousGranted: number) => {
  const refreshProfile = useAuthStore.getState().refreshProfile;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await wait(attempt === 0 ? 1200 : 1000);
    await refreshProfile();
    const nextGranted = readGrantedSlots();
    if (nextGranted > previousGranted) {
      return nextGranted;
    }
  }
  return null;
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
        requestNonPersonalizedAdsOnly: true,
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
      waitForServerRewardConfirmation(previousGranted)
        .then(nextGranted => {
          finish(
            nextGranted === null
              ? { status: 'pending' }
              : { status: 'confirmed', granted: nextGranted },
          );
        })
        .catch(() => finish({ status: 'pending' }));
    });

    rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      if (!earnedReward) {
        finish({ status: 'closed' });
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
