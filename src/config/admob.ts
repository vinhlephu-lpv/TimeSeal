import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

export const ADMOB_REWARDED_CAPSULE_SLOT_CUSTOM_DATA = 'rewarded_capsule_slot';

export const ADMOB_REWARDED_CAPSULE_SLOT_PRODUCTION_AD_UNIT_ID =
  'ca-app-pub-5234300032655235/5576249552';

export const ADMOB_REWARDED_CAPSULE_SLOT_AD_UNIT_ID =
  Platform.OS === 'android' ? ADMOB_REWARDED_CAPSULE_SLOT_PRODUCTION_AD_UNIT_ID : '';

export const ADMOB_NATIVE_PRODUCTION_AD_UNIT_ID =
  'ca-app-pub-5234300032655235/6672944465'; // Đã cập nhật ID thực tế của bạn

export const ADMOB_NATIVE_AD_UNIT_ID =
  Platform.OS === 'android'
    ? __DEV__
      ? TestIds.NATIVE
      : ADMOB_NATIVE_PRODUCTION_AD_UNIT_ID
    : '';

