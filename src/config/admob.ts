import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

export const ADMOB_REWARDED_CAPSULE_SLOT_CUSTOM_DATA = 'rewarded_capsule_slot';

export const ADMOB_REWARDED_CAPSULE_SLOT_PRODUCTION_AD_UNIT_ID =
  'ca-app-pub-5234300032655235/5576249552';

export const ADMOB_REWARDED_CAPSULE_SLOT_AD_UNIT_ID =
  Platform.OS === 'android' ? ADMOB_REWARDED_CAPSULE_SLOT_PRODUCTION_AD_UNIT_ID : '';
