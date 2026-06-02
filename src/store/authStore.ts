import { create } from 'zustand';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { configureGoogleSignIn } from '../config/googleSignIn';
import { syncPlanOnAppOpen, type SubscriptionSyncResult } from '../services/subscriptionService';
import Purchases from 'react-native-purchases';
import type { UserProfile } from '../types/models';
import { translate } from '../i18n';

const REDUCE_MOTION_KEY = '@timeseal_reduce_motion';
const DARK_MODE_KEY = '@timeseal_dark_mode';

type AuthActionResult = {
  ok: boolean;
  error?: string;
};

type AuthState = {
  hasOnboarded: boolean;
  isAuthenticated: boolean;
  user: UserProfile | null;
  isLoading: boolean;
  authInitialized: boolean;
  reduceMotion: boolean;
  darkMode: boolean;
  /** Result of the last subscription sync (null = not yet synced). */
  subscriptionSync: SubscriptionSyncResult | null;
  setReduceMotion: (val: boolean) => void;
  setDarkMode: (val: boolean) => void;
  finishOnboarding: () => void;
  initAuthListener: () => () => void;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  loginWithGoogle: () => Promise<AuthActionResult>;
  register: (
    displayName: string,
    email: string,
    password: string,
  ) => Promise<AuthActionResult>;
  refreshProfile: () => Promise<void>;
  syncSubscription: () => Promise<void>;
  logout: () => Promise<void>;
};

const mapAuthError = (code: string): string => {
  switch (code) {
    case 'auth/invalid-email':
      return translate('Email không hợp lệ.');
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return translate('Email hoặc mật khẩu không đúng.');
    case 'auth/email-already-in-use':
      return translate('Email này đã được đăng ký.');
    case 'auth/weak-password':
      return translate('Mật khẩu phải từ 6 ký tự trở lên.');
    case 'auth/network-request-failed':
      return translate('Không kết nối được mạng. Vui lòng thử lại.');
    case 'auth/account-exists-with-different-credential':
      return translate('Email này đã đăng ký bằng phương thức khác. Hãy đăng nhập bằng cách cũ rồi liên kết Google sau.');
    case 'auth/operation-not-allowed':
      return translate('Đăng nhập bằng Google hiện chưa khả dụng. Vui lòng thử lại sau.');
    case 'auth/app-not-authorized':
      return translate('Thiết bị chưa thể xác thực ứng dụng. Vui lòng cập nhật TimeSeal hoặc liên hệ hỗ trợ.');
    default:
      return translate('Đã có lỗi xảy ra, vui lòng thử lại.');
  }
};

const mapGoogleSignInError = (code: string): string | undefined => {
  switch (code) {
    case statusCodes.SIGN_IN_CANCELLED:
      return translate('Bạn đã hủy đăng nhập Google.');
    case statusCodes.IN_PROGRESS:
      return translate('Đang có một phiên đăng nhập Google khác. Chờ vài giây rồi thử lại.');
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return translate('Google Play Services chưa có hoặc cần cập nhật trên thiết bị.');
    default:
      return undefined;
  }
};

const buildProfileFromAuthUser = (
  firebaseUser: FirebaseAuthTypes.User,
  userDoc?: Partial<UserProfile> | undefined,
): UserProfile => ({
  id: firebaseUser.uid,
  displayName:
    userDoc?.displayName ||
    firebaseUser.displayName ||
    firebaseUser.email?.split('@')[0] ||
    'TimeSeal User',
  email: userDoc?.email || firebaseUser.email || '',
  isPremium: Boolean(userDoc?.isPremium),
  plan: userDoc?.plan || (userDoc?.isPremium ? 'plus' : 'free'),
  avatarUrl: userDoc?.avatarUrl || firebaseUser.photoURL || undefined,
  avatarPath: userDoc?.avatarPath,
  avatarVersion: userDoc?.avatarVersion,
});

const ensureUserDoc = async (
  firebaseUser: FirebaseAuthTypes.User,
  fallbackDisplayName?: string,
): Promise<UserProfile> => {
  const userRef = firestore().collection('users').doc(firebaseUser.uid);
  const userSnap = await userRef.get();
  const requestedDisplayName = fallbackDisplayName?.trim();

  if (!userSnap.exists) {
    const displayName =
      requestedDisplayName ||
      firebaseUser.displayName ||
      firebaseUser.email?.split('@')[0] ||
      'TimeSeal User';

    const profile: UserProfile = {
      id: firebaseUser.uid,
      displayName,
      email: firebaseUser.email || '',
      isPremium: false,
      plan: 'free',
      avatarUrl: firebaseUser.photoURL || undefined,
    };

    await userRef.set({
      uid: profile.id,
      displayName: profile.displayName,
      email: profile.email,
      isPremium: profile.isPremium,
      plan: profile.plan,
      avatarUrl: profile.avatarUrl || null,
      createdAtISO: new Date().toISOString(),
    });

    return profile;
  }

  const userData = userSnap.data() as Partial<UserProfile> | undefined;
  if (requestedDisplayName && userData?.displayName !== requestedDisplayName) {
    await userRef.set(
      {
        displayName: requestedDisplayName,
        updatedAtISO: new Date().toISOString(),
      },
      { merge: true },
    );
    return buildProfileFromAuthUser(firebaseUser, {
      ...userData,
      displayName: requestedDisplayName,
    });
  }

  return buildProfileFromAuthUser(
    firebaseUser,
    userData,
  );
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  hasOnboarded: false,
  isAuthenticated: false,
  user: null,
  isLoading: false,
  authInitialized: false,
  reduceMotion: false,
  darkMode: false,
  subscriptionSync: null,
  setReduceMotion: (val: boolean) => {
    set({ reduceMotion: val });
    AsyncStorage.setItem(REDUCE_MOTION_KEY, val ? '1' : '0').catch(() => {});
  },
  setDarkMode: (val: boolean) => {
    set({ darkMode: val });
    AsyncStorage.setItem(DARK_MODE_KEY, val ? '1' : '0').catch(() => {});
  },
  finishOnboarding: () => {
    set({ hasOnboarded: true });
    AsyncStorage.setItem('@timeseal_has_onboarded', '1').catch(() => {});
  },
  initAuthListener: () => {
    // Load persisted onboarding status
    AsyncStorage.getItem('@timeseal_has_onboarded')
      .then(val => {
        if (val === '1') {
          set({ hasOnboarded: true });
        }
      })
      .catch(() => {});

    // Load persisted reduceMotion setting
    AsyncStorage.getItem(REDUCE_MOTION_KEY)
      .then(val => {
        if (val === '1') {
          set({ reduceMotion: true });
        }
      })
      .catch(() => {});

    // Load persisted darkMode setting
    AsyncStorage.getItem(DARK_MODE_KEY)
      .then(val => {
        if (val === '1') {
          set({ darkMode: true });
        }
      })
      .catch(() => {});

    const unsubscribe = auth().onAuthStateChanged(async firebaseUser => {
      if (!firebaseUser) {
        set({
          isAuthenticated: false,
          user: null,
          authInitialized: true,
          subscriptionSync: null,
        });
        return;
      }

      try {
        const profile = await ensureUserDoc(firebaseUser);
        set({
          isAuthenticated: true,
          user: profile,
          authInitialized: true,
        });

        // Sync subscription status from RevenueCat silently
        syncPlanOnAppOpen(firebaseUser.uid, profile.email)
          .then(syncResult => {
            set({ subscriptionSync: syncResult });
            // Update user plan if changed
            if (syncResult.currentPlan !== profile.plan || syncResult.isAdminOverride) {
              set({
                user: { ...profile, plan: syncResult.currentPlan, isPremium: syncResult.currentPlan !== 'free' },
              });
            }
          })
          .catch(() => {});
      } catch {
        set({
          isAuthenticated: true,
          user: buildProfileFromAuthUser(firebaseUser),
          authInitialized: true,
        });
      }
    });

    return unsubscribe;
  },
  login: async (email, password) => {
    if (!email || !password) {
      return { ok: false, error: translate('Vui lòng nhập đầy đủ email và mật khẩu.') };
    }

    set({ isLoading: true });
    try {
      const credential = await auth().signInWithEmailAndPassword(email, password);
      const profile = await ensureUserDoc(credential.user);
      set({
        isAuthenticated: true,
        user: profile,
        isLoading: false,
      });
      get().syncSubscription();
      return { ok: true };
    } catch (error) {
      const authError = error as FirebaseAuthTypes.NativeFirebaseAuthError;
      set({ isLoading: false });
      return {
        ok: false,
        error: mapAuthError(authError.code),
      };
    }
  },
  loginWithGoogle: async () => {
    set({ isLoading: true });
    try {
      configureGoogleSignIn();
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResponse = await GoogleSignin.signIn();
      if (isCancelledResponse(signInResponse)) {
        set({ isLoading: false });
        return { ok: false, error: translate('Bạn đã hủy đăng nhập Google.') };
      }

      const idToken = signInResponse.data.idToken;
      if (!idToken) {
        set({ isLoading: false });
        return { ok: false, error: translate('Không thể xác thực đăng nhập Google. Vui lòng thử lại.') };
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const credential = await auth().signInWithCredential(googleCredential);
      const profile = await ensureUserDoc(credential.user);

      set({
        isAuthenticated: true,
        user: profile,
        isLoading: false,
      });
      get().syncSubscription();
      return { ok: true };
    } catch (error) {
      set({ isLoading: false });
      if (isErrorWithCode(error)) {
        return {
          ok: false,
          error: mapGoogleSignInError(error.code) || mapAuthError(error.code),
        };
      }
      return { ok: false, error: translate('Đăng nhập Google thất bại.') };
    }
  },
  register: async (displayName, email, password) => {
    const cleanDisplayName = displayName.trim();
    if (!cleanDisplayName || !email || password.length < 6) {
      return {
        ok: false,
        error: translate('Vui lòng nhập đúng dữ liệu (mật khẩu >= 6 ký tự).'),
      };
    }

    set({ isLoading: true });
    try {
      const credential = await auth().createUserWithEmailAndPassword(email, password);
      await credential.user.updateProfile({ displayName: cleanDisplayName });
      const profile = await ensureUserDoc(credential.user, cleanDisplayName);
      set({
        isAuthenticated: true,
        user: profile,
        isLoading: false,
      });
      get().syncSubscription();
      return { ok: true };
    } catch (error) {
      const authError = error as FirebaseAuthTypes.NativeFirebaseAuthError;
      set({ isLoading: false });
      return {
        ok: false,
        error: mapAuthError(authError.code),
      };
    }
  },
  refreshProfile: async () => {
    const firebaseUser = auth().currentUser;
    if (!firebaseUser) {
      set({
        isAuthenticated: false,
        user: null,
      });
      return;
    }

    try {
      const profile = await ensureUserDoc(firebaseUser);
      set({
        isAuthenticated: true,
        user: profile,
      });
    } catch {
      set({
        isAuthenticated: true,
        user: buildProfileFromAuthUser(firebaseUser),
      });
    }
  },
  syncSubscription: async () => {
    const user = get().user;
    if (!user?.id) {
      return;
    }
    try {
      const syncResult = await syncPlanOnAppOpen(user.id, user.email);
      set({ subscriptionSync: syncResult });
      if (syncResult.currentPlan !== user.plan || syncResult.isAdminOverride) {
        set({
          user: { ...user, plan: syncResult.currentPlan, isPremium: syncResult.currentPlan !== 'free' },
        });
      }
    } catch {
      // silently fail
    }
  },
  logout: async () => {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore Google sign-out failures to avoid blocking Firebase sign-out.
    }
    try {
      await Purchases.logOut();
    } catch {
      // Silently ignore RevenueCat logOut failures to avoid blocking Auth logout
    }
    await auth().signOut();
    set({ isAuthenticated: false, user: null, subscriptionSync: null });
  },
}));
