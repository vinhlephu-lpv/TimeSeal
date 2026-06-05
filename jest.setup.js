/* eslint-env jest */
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('@react-native-google-signin/google-signin', () => {
  const googleModule = {
    GoogleSignin: {
      configure: jest.fn(),
      hasPlayServices: jest.fn(async () => true),
      signIn: jest.fn(async () => ({
        type: 'success',
        data: {
          idToken: 'mock-id-token',
          user: { email: 'mock@example.com', name: 'Mock User' },
        },
      })),
      signOut: jest.fn(async () => null),
    },
    statusCodes: {
      SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
      IN_PROGRESS: 'IN_PROGRESS',
      PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
      SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
      NULL_PRESENTER: 'NULL_PRESENTER',
    },
    isCancelledResponse: jest.fn(response => response?.type === 'cancelled'),
    isErrorWithCode: jest.fn(() => false),
  };

  return googleModule;
});

jest.mock('@react-native-firebase/auth', () => {
  const authMock = {
    onAuthStateChanged: callback => {
      callback(null);
      return () => {};
    },
    signInWithEmailAndPassword: jest.fn(async email => ({
      user: {
        uid: 'mock-uid',
        email,
        displayName: 'Mock User',
        updateProfile: jest.fn(async () => {}),
      },
    })),
    createUserWithEmailAndPassword: jest.fn(async email => ({
      user: {
        uid: 'mock-uid',
        email,
        displayName: 'Mock User',
        updateProfile: jest.fn(async () => {}),
      },
    })),
    signInWithCredential: jest.fn(async () => ({
      user: {
        uid: 'mock-uid',
        email: 'mock@example.com',
        displayName: 'Mock User',
        updateProfile: jest.fn(async () => {}),
      },
    })),
    signOut: jest.fn(async () => {}),
  };

  const factory = () => authMock;
  factory.GoogleAuthProvider = {
    credential: jest.fn(() => ({ provider: 'google' })),
  };

  return factory;
});

jest.mock('@react-native-firebase/firestore', () => {
  const querySnapshot = { docs: [] };
  const docRef = {
    id: 'mock-doc-id',
    get: jest.fn(async () => ({ exists: false, data: () => ({}) })),
    set: jest.fn(async () => {}),
    update: jest.fn(async () => {}),
  };

  const collectionApi = {
    add: jest.fn(async () => ({})),
    where: jest.fn(() => ({
      where: jest.fn(() => ({
        onSnapshot: jest.fn(onNext => {
          onNext(querySnapshot);
          return () => {};
        }),
        get: jest.fn(async () => querySnapshot),
      })),
      onSnapshot: jest.fn(onNext => {
        onNext(querySnapshot);
        return () => {};
      }),
      get: jest.fn(async () => querySnapshot),
    })),
    doc: jest.fn(() => docRef),
    onSnapshot: jest.fn(onNext => {
      onNext(querySnapshot);
      return () => {};
    }),
    get: jest.fn(async () => querySnapshot),
  };

  return () => ({
    collection: jest.fn(() => collectionApi),
    batch: jest.fn(() => ({
      update: jest.fn(),
      set: jest.fn(),
      commit: jest.fn(async () => {}),
    })),
  });
});

jest.mock('@react-native-firebase/storage', () => {
  const reference = {
    putFile: jest.fn(() => {
      const promise = Promise.resolve();
      promise.on = jest.fn((_, cb) => {
        cb({ bytesTransferred: 1, totalBytes: 1 });
      });
      return promise;
    }),
    getDownloadURL: jest.fn(async () => 'https://example.com/mock.jpg'),
  };

  return () => ({
    ref: jest.fn(() => reference),
  });
});

jest.mock('@react-native-firebase/messaging', () => {
  const messagingApi = {
    registerDeviceForRemoteMessages: jest.fn(async () => {}),
    getToken: jest.fn(async () => 'mock-fcm-token'),
    onMessage: jest.fn(() => () => {}),
  };

  return () => messagingApi;
});

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(async () => ({ didCancel: true })),
}));

jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(async () => '/tmp/mock-capsule-card.jpg'),
}));

jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: {
    save: jest.fn(async () => 'mock-saved-uri'),
  },
}));

jest.mock('react-native-purchases', () => ({
  configure: jest.fn(),
  logIn: jest.fn(async () => ({ customerInfo: { entitlements: { active: {} } }, created: false })),
  getOfferings: jest.fn(async () => ({
    current: {
      availablePackages: [
        {
          identifier: '$rc_monthly',
          product: { priceString: '29.000d / thang' },
        },
      ],
    },
  })),
  purchasePackage: jest.fn(async () => ({
    customerInfo: { entitlements: { active: { premium: { identifier: 'premium' } } } },
  })),
  restorePurchases: jest.fn(async () => ({
    entitlements: { active: { premium: { identifier: 'premium' } } },
  })),
}));

jest.mock('react-native-permissions', () => ({
  RESULTS: {
    GRANTED: 'granted',
  },
  checkNotifications: jest.fn(async () => ({ status: 'granted', settings: {} })),
  requestNotifications: jest.fn(async () => ({ status: 'granted', settings: {} })),
}));
