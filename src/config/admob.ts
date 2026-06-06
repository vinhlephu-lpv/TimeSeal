import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

export const ADMOB_REWARDED_CAPSULE_SLOT_CUSTOM_DATA = 'rewarded_capsule_slot';

export const ADMOB_TEST_DEVICE_IDENTIFIERS = [
  '625414BF0B03EEC42FDB6088FD4DB37B',
];

export const ADMOB_REWARDED_CAPSULE_SLOT_PRODUCTION_AD_UNIT_ID =
  'ca-app-pub-5234300032655235/5576249552';

export const ADMOB_REWARDED_CAPSULE_SLOT_TEST_AD_UNIT_ID =
  Platform.OS === 'android' ? TestIds.REWARDED : '';

export const ADMOB_REWARDED_CAPSULE_SLOT_AD_UNIT_ID =
  Platform.OS === 'android'
    ? __DEV__
      ? ADMOB_REWARDED_CAPSULE_SLOT_TEST_AD_UNIT_ID
      : ADMOB_REWARDED_CAPSULE_SLOT_PRODUCTION_AD_UNIT_ID
    : '';
