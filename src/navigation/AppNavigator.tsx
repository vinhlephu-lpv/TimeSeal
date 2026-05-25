import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Linking } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { configureGoogleSignIn } from '../config/googleSignIn';
import { SplashScreen } from '../screens/auth/SplashScreen';
import {
  setupMessagingForUser,
  setupNotificationOpenHandlers,
} from '../services/notificationService';
import { navigateFromPush, rootNavigationRef } from './navigationRef';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';

export function AppNavigator() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const authInitialized = useAuthStore(state => state.authInitialized);
  const initAuthListener = useAuthStore(state => state.initAuthListener);
  const [showSplash, setShowSplash] = useState(true);
  const [pendingInviteCapsuleId, setPendingInviteCapsuleId] = useState<string | null>(null);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  useEffect(() => {
    const unsubscribe = initAuthListener();
    return unsubscribe;
  }, [initAuthListener]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let unsubscribeMessageListener: (() => void) | undefined;

    setupMessagingForUser(user.id)
      .then(unsubscribe => {
        unsubscribeMessageListener = unsubscribe;
      })
      .catch(() => {});

    return () => {
      unsubscribeMessageListener?.();
    };
  }, [user?.id]);

  useEffect(() => {
    let unsubscribeOpen: (() => void) | undefined;
    setupNotificationOpenHandlers(capsuleId => {
      navigateFromPush(capsuleId);
    })
      .then(unsubscribe => {
        unsubscribeOpen = unsubscribe;
      })
      .catch(() => {});

    return () => {
      unsubscribeOpen?.();
    };
  }, []);

  useEffect(() => {
    const handleInviteUrl = (url: string) => {
      const match = url.match(/capsuleId=([^&]+)/);
      const capsuleId = match?.[1];
      if (!capsuleId) {
        return;
      }

      if (isAuthenticated && rootNavigationRef.isReady()) {
        rootNavigationRef.navigate('InviteAccept', { capsuleId });
        return;
      }

      setPendingInviteCapsuleId(capsuleId);
    };

    Linking.getInitialURL()
      .then(initialUrl => {
        if (initialUrl) {
          handleInviteUrl(initialUrl);
        }
      })
      .catch(() => {});

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleInviteUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!pendingInviteCapsuleId || !isAuthenticated || !rootNavigationRef.isReady()) {
      return;
    }

    rootNavigationRef.navigate('InviteAccept', {
      capsuleId: pendingInviteCapsuleId,
    });
    setPendingInviteCapsuleId(null);
  }, [pendingInviteCapsuleId, isAuthenticated]);

  if (showSplash || !authInitialized) {
    return <SplashScreen onFinished={() => setShowSplash(false)} />;
  }

  return (
    <NavigationContainer ref={rootNavigationRef}>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
