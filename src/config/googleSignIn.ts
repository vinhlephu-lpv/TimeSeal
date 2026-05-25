import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { firebaseProject } from './firebase';

let isConfigured = false;

export const configureGoogleSignIn = () => {
  if (isConfigured) {
    return;
  }

  GoogleSignin.configure({
    webClientId: firebaseProject.webClientId,
    offlineAccess: true,
  });
  isConfigured = true;
};
