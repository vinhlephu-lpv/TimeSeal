import { create } from 'zustand';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { configureGoogleSignIn } from '../config/googleSignIn';
import type { UserProfile } from '../types/models';

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
  logout: () => Promise<void>;
};

const mapAuthError = (code: string): string => {
  switch (code) {
    case 'auth/invalid-email':
      return 'Email không hợp lệ.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email hoặc mật khẩu không đúng.';
    case 'auth/email-already-in-use':
      return 'Email này đã được đăng ký.';
    case 'auth/weak-password':
      return 'Mật khẩu phải từ 6 ký tự trở lên.';
    case 'auth/network-request-failed':
      return 'Không kết nối được mạng. Vui lòng thử lại.';
    case 'auth/account-exists-with-different-credential':
      return 'Email này đã đăng ký bằng phương thức khác. Hãy đăng nhập bằng cách cũ rồi liên kết Google sau.';
    case 'auth/operation-not-allowed':
      return 'Google Sign-In chưa được bật trong Firebase Authentication.';
    case 'auth/app-not-authorized':
      return 'Ứng dụng Android chưa được Firebase cho phép. Kiểm tra package name và SHA-1/SHA-256.';
    default:
      return 'Đã có lỗi xảy ra, vui lòng thử lại.';
  }
};

const mapGoogleSignInError = (code: string): string | undefined => {
  switch (code) {
    case statusCodes.SIGN_IN_CANCELLED:
      return 'Bạn đã huỷ đăng nhập Google.';
    case statusCodes.IN_PROGRESS:
      return 'Đang có một phiên đăng nhập Google khác. Chờ vài giây rồi thử lại.';
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return 'Google Play Services chưa có hoặc cần cập nhật trên thiết bị.';
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
  avatarUrl: userDoc?.avatarUrl || firebaseUser.photoURL || undefined,
});

const ensureUserDoc = async (
  firebaseUser: FirebaseAuthTypes.User,
  fallbackDisplayName?: string,
): Promise<UserProfile> => {
  const userRef = firestore().collection('users').doc(firebaseUser.uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    const displayName =
      fallbackDisplayName ||
      firebaseUser.displayName ||
      firebaseUser.email?.split('@')[0] ||
      'TimeSeal User';

    const profile: UserProfile = {
      id: firebaseUser.uid,
      displayName,
      email: firebaseUser.email || '',
      isPremium: false,
      avatarUrl: firebaseUser.photoURL || undefined,
    };

    await userRef.set({
      uid: profile.id,
      displayName: profile.displayName,
      email: profile.email,
      isPremium: profile.isPremium,
      avatarUrl: profile.avatarUrl || null,
      createdAtISO: new Date().toISOString(),
    });

    return profile;
  }

  return buildProfileFromAuthUser(
    firebaseUser,
    userSnap.data() as Partial<UserProfile> | undefined,
  );
};

export const useAuthStore = create<AuthState>()(set => ({
  hasOnboarded: false,
  isAuthenticated: false,
  user: null,
  isLoading: false,
  authInitialized: false,
  finishOnboarding: () => set({ hasOnboarded: true }),
  initAuthListener: () => {
    const unsubscribe = auth().onAuthStateChanged(async firebaseUser => {
      if (!firebaseUser) {
        set({
          isAuthenticated: false,
          user: null,
          authInitialized: true,
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
      return { ok: false, error: 'Vui lòng nhập đầy đủ email và mật khẩu.' };
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
        return { ok: false, error: 'Bạn đã huỷ đăng nhập Google.' };
      }

      const idToken = signInResponse.data.idToken;
      if (!idToken) {
        set({ isLoading: false });
        return { ok: false, error: 'Không lấy được Google token.' };
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const credential = await auth().signInWithCredential(googleCredential);
      const profile = await ensureUserDoc(credential.user);

      set({
        isAuthenticated: true,
        user: profile,
        isLoading: false,
      });
      return { ok: true };
    } catch (error) {
      set({ isLoading: false });
      if (isErrorWithCode(error)) {
        return {
          ok: false,
          error: mapGoogleSignInError(error.code) || mapAuthError(error.code),
        };
      }
      return { ok: false, error: 'Đăng nhập Google thất bại.' };
    }
  },
  register: async (displayName, email, password) => {
    if (!displayName || !email || password.length < 6) {
      return {
        ok: false,
        error: 'Vui lòng nhập đúng dữ liệu (mật khẩu >= 6 ký tự).',
      };
    }

    set({ isLoading: true });
    try {
      const credential = await auth().createUserWithEmailAndPassword(email, password);
      await credential.user.updateProfile({ displayName });
      const profile = await ensureUserDoc(credential.user, displayName);
      set({
        isAuthenticated: true,
        user: profile,
        isLoading: false,
      });
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
  logout: async () => {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore Google sign-out failures to avoid blocking Firebase sign-out.
    }
    await auth().signOut();
    set({ isAuthenticated: false, user: null });
  },
}));
