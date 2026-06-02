import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Linking, View } from 'react-native';
import { PolishedAlert } from '../store/alertStore';
import { useAuthStore } from '../store/authStore';
import { configureGoogleSignIn } from '../config/googleSignIn';
import { SplashScreen } from '../screens/auth/SplashScreen';
import {
  setupMessagingForUser,
  setupNotificationOpenHandlers,
} from '../services/notificationService';
import { getPlanDisplayName } from '../services/subscriptionService';
import { navigateFromPush, rootNavigationRef } from './navigationRef';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';

import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from '../i18n';
import { normalizeInviteCode } from '../services/inviteService';

export function AppNavigator() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const authInitialized = useAuthStore(state => state.authInitialized);
  const initAuthListener = useAuthStore(state => state.initAuthListener);
  const subscriptionSync = useAuthStore(state => state.subscriptionSync);
  const [showSplash, setShowSplash] = useState(true);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const [hasPresentedSyncAlert, setHasPresentedSyncAlert] = useState(false);
  const { colors } = useTheme();
  const { t } = useTranslation();

  const handleSplashFinished = React.useCallback(() => {
    setShowSplash(false);
  }, []);

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
    setupNotificationOpenHandlers((capsuleId, screen) => {
      navigateFromPush(capsuleId, screen);
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
      const inviteCode = normalizeInviteCode(url);
      if (!inviteCode || inviteCode === url) {
        return;
      }

      if (isAuthenticated && rootNavigationRef.isReady()) {
        rootNavigationRef.navigate('InviteAccept', { inviteCode });
        return;
      }

      setPendingInviteCode(inviteCode);
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
    if (!pendingInviteCode || !isAuthenticated || !rootNavigationRef.isReady()) {
      return;
    }

    rootNavigationRef.navigate('InviteAccept', {
      inviteCode: pendingInviteCode,
    });
    setPendingInviteCode(null);
  }, [pendingInviteCode, isAuthenticated]);

  // Show a one-time alert when subscription sync detects a plan change
  useEffect(() => {
    if (!subscriptionSync || hasPresentedSyncAlert || showSplash) {
      return;
    }

    if (subscriptionSync.isExpired) {
      setHasPresentedSyncAlert(true);
      const prevName = getPlanDisplayName(subscriptionSync.previousPlan);
      PolishedAlert.show(
        t('Gói đã hết hạn'),
        t('Gói {{plan}} của bạn đã hết hạn. Ký ức của bạn vẫn an toàn! Bạn có thể gia hạn bất cứ lúc nào để mở lại quyền xem/tải đầy đủ.', { plan: prevName }),
        [{ text: t('Đã hiểu'), style: 'default' }],
      );
    } else if (subscriptionSync.isDowngraded) {
      setHasPresentedSyncAlert(true);
      const currentName = getPlanDisplayName(subscriptionSync.currentPlan);
      PolishedAlert.show(
        t('Gói đã thay đổi'),
        t('Tài khoản đã chuyển sang gói {{plan}}. Các giới hạn mới sẽ được áp dụng.', { plan: currentName }),
        [{ text: t('Đã hiểu'), style: 'default' }],
      );
    }
  }, [subscriptionSync, hasPresentedSyncAlert, showSplash, t]);

  if (showSplash || !authInitialized) {
    return <SplashScreen onFinished={handleSplashFinished} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NavigationContainer ref={rootNavigationRef}>
        {isAuthenticated ? <AppStack /> : <AuthStack />}
      </NavigationContainer>
    </View>
  );
}
