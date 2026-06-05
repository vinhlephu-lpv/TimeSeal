import { Platform } from 'react-native';

// Android only setup:
// - debug key: can use Test Store key for local QA
// - release key: must use Android public SDK key (prefix "goog_")
const REVENUECAT_ANDROID_KEYS = {
  debug: 'goog_lrdGnSNhmvBeMGqRjzeYHXQhIlk',
  release: 'goog_lrdGnSNhmvBeMGqRjzeYHXQhIlk',
};

export const REVENUECAT_ENTITLEMENT_ID = 'premium';

export const getRevenueCatApiKey = (): string => {
  if (Platform.OS !== 'android') {
    return '';
  }

  if (__DEV__) {
    return REVENUECAT_ANDROID_KEYS.debug || REVENUECAT_ANDROID_KEYS.release;
  }

  return REVENUECAT_ANDROID_KEYS.release;
};
