import { Platform } from 'react-native';

export const ADMOB_REWARDED_CAPSULE_SLOT_CUSTOM_DATA = 'rewarded_capsule_slot';

export const ADMOB_REWARDED_CAPSULE_SLOT_AD_UNIT_ID =
  Platform.OS === 'android'
    ? 'ca-app-pub-5234300032655235/5576249552'
    : '';
