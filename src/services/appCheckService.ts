import { getApp } from '@react-native-firebase/app';
import {
  getToken,
  initializeAppCheck,
  type AppCheck,
} from '@react-native-firebase/app-check';

let appCheckPromise: Promise<AppCheck> | null = null;

export const initializeFirebaseAppCheck = () => {
  if (!appCheckPromise) {
    appCheckPromise = initializeAppCheck(getApp(), {
      provider: {
        providerOptions: {
          android: {
            provider: __DEV__ ? 'debug' : 'playIntegrity',
          },
        },
      },
      isTokenAutoRefreshEnabled: true,
    });
  }
  return appCheckPromise;
};

export const getFirebaseAppCheckToken = async () => {
  const appCheck = await initializeFirebaseAppCheck();
  return (await getToken(appCheck)).token;
};

