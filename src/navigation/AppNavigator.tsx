import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Linking, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PolishedAlert } from '../store/alertStore';
import { useAuthStore } from '../store/authStore';
import { configureGoogleSignIn } from '../config/googleSignIn';
import { SplashScreen, isSplashCompleted } from '../screens/auth/SplashScreen';
import {
  setupMessagingForUser,
  setupNotificationOpenHandlers,
} from '../services/notificationService';
import { setupLocalUnlockNotificationOpenHandlers } from '../services/localUnlockNotificationService';
import { getPlanDisplayName } from '../services/subscriptionService';
import { navigateFromPush, rootNavigationRef, type PushCapsuleScreen } from './navigationRef';
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
  const [showSplash, setShowSplash] = useState(!isSplashCompleted);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const [pendingPushTarget, setPendingPushTarget] = useState<{
    capsuleId: string;
    screen?: PushCapsuleScreen;
  } | null>(null);
  const [navigationReady, setNavigationReady] = useState(false);
  const [presentedSyncAlertKey, setPresentedSyncAlertKey] = useState<string | null>(null);
  const syncAlertKeyInitializedRef = useRef(false);
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
      setPendingPushTarget({ capsuleId, screen });
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
    let unsubscribeOpen: (() => void) | undefined;
    setupLocalUnlockNotificationOpenHandlers((capsuleId, screen) => {
      setPendingPushTarget({ capsuleId, screen: screen || 'OpenCapsule' });
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
  }, []);

  useEffect(() => {
    if (!pendingInviteCode || !isAuthenticated || !navigationReady || !rootNavigationRef.isReady()) {
      return;
    }

    rootNavigationRef.navigate('InviteAccept', {
      inviteCode: pendingInviteCode,
    });
    setPendingInviteCode(null);
  }, [pendingInviteCode, isAuthenticated, navigationReady]);

  useEffect(() => {
    if (!pendingPushTarget || !isAuthenticated || !navigationReady || !rootNavigationRef.isReady()) {
      return;
    }

    navigateFromPush(pendingPushTarget.capsuleId, pendingPushTarget.screen);
    setPendingPushTarget(null);
  }, [pendingPushTarget, isAuthenticated, navigationReady]);

  // Load persisted sync alert key on mount
  useEffect(() => {
    AsyncStorage.getItem('@timeseal_subscription_alert_key')
      .then(stored => {
        if (stored) {
          setPresentedSyncAlertKey(stored);
        }
        syncAlertKeyInitializedRef.current = true;
      })
      .catch(() => {
        syncAlertKeyInitializedRef.current = true;
      });
  }, []);

  const previousUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    // Chỉ xoá cache alert khi người dùng thực sự đăng xuất hoặc chuyển tài khoản,
    // không xoá khi app vừa khởi động (chuyển từ undefined/null sang user.id).
    if (previousUserIdRef.current !== undefined && previousUserIdRef.current !== user?.id && !user?.id) {
      setPresentedSyncAlertKey(null);
      AsyncStorage.removeItem('@timeseal_subscription_alert_key').catch(() => {});
    }
    previousUserIdRef.current = user?.id;
  }, [user?.id]);

  // Show each verified subscription lifecycle update once per app session/install.
  useEffect(() => {
    if (!subscriptionSync || showSplash || !syncAlertKeyInitializedRef.current) {
      return;
    }

    const alertKey =
      subscriptionSync.notificationKey ||
      `${subscriptionSync.currentPlan}:${subscriptionSync.status}:${subscriptionSync.expirationDateISO || ''}`;
    if (presentedSyncAlertKey === alertKey) {
      return;
    }

    const currentName = getPlanDisplayName(subscriptionSync.currentPlan);
    const expirationText = subscriptionSync.expirationDateISO
      ? new Date(subscriptionSync.expirationDateISO).toLocaleString()
      : t('ngày hết hạn hiện tại');

    if (subscriptionSync.isExpired) {
      setPresentedSyncAlertKey(alertKey);
      AsyncStorage.setItem('@timeseal_subscription_alert_key', alertKey).catch(() => {});
      const prevName = getPlanDisplayName(subscriptionSync.previousPlan);
      PolishedAlert.show(
        t('Gói đã hết hạn'),
        t('Gói {{plan}} của bạn đã hết hạn. Ký ức của bạn vẫn an toàn! Bạn có thể gia hạn bất cứ lúc nào để mở lại quyền xem/tải đầy đủ.', { plan: prevName }),
        [{ text: t('Đã hiểu'), style: 'default' }],
      );
    } else if (
      subscriptionSync.lifecycleEventType === 'CANCELLATION' &&
      subscriptionSync.status === 'cancelled_renewal'
    ) {
      setPresentedSyncAlertKey(alertKey);
      AsyncStorage.setItem('@timeseal_subscription_alert_key', alertKey).catch(() => {});
      PolishedAlert.show(
        t('Đã hủy gia hạn tự động'),
        t('Bạn đã hủy gia hạn tự động. Quyền {{plan}} vẫn còn hiệu lực đến {{expiration}}.', {
          plan: currentName,
          expiration: expirationText,
        }),
        [{ text: t('Đã hiểu'), style: 'default' }],
      );
    } else if (subscriptionSync.status === 'billing_issue') {
      setPresentedSyncAlertKey(alertKey);
      AsyncStorage.setItem('@timeseal_subscription_alert_key', alertKey).catch(() => {});
      PolishedAlert.show(
        t('Cần kiểm tra thanh toán'),
        t('Google Play đang báo vấn đề thanh toán. Quyền {{plan}} vẫn được giữ đến {{expiration}}. Vui lòng kiểm tra phương thức thanh toán trên Google Play.', {
          plan: currentName,
          expiration: expirationText,
        }),
        [{ text: t('Đã hiểu'), style: 'default' }],
      );
    } else if (subscriptionSync.lifecycleEventType === 'RENEWAL') {
      setPresentedSyncAlertKey(alertKey);
      AsyncStorage.setItem('@timeseal_subscription_alert_key', alertKey).catch(() => {});
      PolishedAlert.show(
        t('Gia hạn thành công'),
        t('Gói {{plan}} đã được gia hạn thành công đến {{expiration}}.', {
          plan: currentName,
          expiration: expirationText,
        }),
        [{ text: t('Đã hiểu'), style: 'default' }],
      );
    } else if (subscriptionSync.lifecycleEventType === 'UNCANCELLATION') {
      setPresentedSyncAlertKey(alertKey);
      AsyncStorage.setItem('@timeseal_subscription_alert_key', alertKey).catch(() => {});
      PolishedAlert.show(
        t('Đã kích hoạt lại gia hạn'),
        t('Gói {{plan}} đã được kích hoạt lại gia hạn tự động.', { plan: currentName }),
        [{ text: t('Đã hiểu'), style: 'default' }],
      );
    } else if (subscriptionSync.isDowngraded) {
      setPresentedSyncAlertKey(alertKey);
      AsyncStorage.setItem('@timeseal_subscription_alert_key', alertKey).catch(() => {});
      PolishedAlert.show(
        t('Gói đã thay đổi'),
        t('Tài khoản đã chuyển sang gói {{plan}}. Các giới hạn mới sẽ được áp dụng.', { plan: currentName }),
        [{ text: t('Đã hiểu'), style: 'default' }],
      );
    }
  }, [subscriptionSync, presentedSyncAlertKey, showSplash, t]);

  if (showSplash || !authInitialized) {
    return <SplashScreen onFinished={handleSplashFinished} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NavigationContainer ref={rootNavigationRef} onReady={() => setNavigationReady(true)}>
        {isAuthenticated ? <AppStack /> : <AuthStack />}
      </NavigationContainer>
    </View>
  );
}
