import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';
import { BottomTabs } from './BottomTabs';
import { CreateStep1Screen } from '../screens/capsule/CreateStep1Screen';
import { CreateStep2Screen } from '../screens/capsule/CreateStep2Screen';
import { CreateStep3Screen } from '../screens/capsule/CreateStep3Screen';
import { CreatePreviewScreen } from '../screens/capsule/CreatePreviewScreen';
import { CreateWaitingSetupScreen } from '../screens/capsule/CreateWaitingSetupScreen';
import { CapsuleLockedScreen } from '../screens/capsule/CapsuleLockedScreen';
import { CapsuleWaitingScreen } from '../screens/capsule/CapsuleWaitingScreen';
import { CapsuleContributionScreen } from '../screens/capsule/CapsuleContributionScreen';
import { OpenCapsuleScreen } from '../screens/capsule/OpenCapsuleScreen';
import { CapsuleDetailScreen } from '../screens/capsule/CapsuleDetailScreen';
import { InviteCodeScreen } from '../screens/capsule/InviteCodeScreen';
import { InviteAcceptScreen } from '../screens/capsule/InviteAcceptScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { StorageManagementScreen } from '../screens/profile/StorageManagementScreen';
import { HighSecurityScreen } from '../screens/profile/HighSecurityScreen';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from '../i18n';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
      }}>
      <Stack.Screen name="Tabs" component={BottomTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: t('Thông báo') }} />
      <Stack.Screen name="CreateStep1" component={CreateStep1Screen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateStep2" component={CreateStep2Screen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateStep3" component={CreateStep3Screen} options={{ headerShown: false }} />
      <Stack.Screen name="CreatePreview" component={CreatePreviewScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateWaitingSetup" component={CreateWaitingSetupScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CapsuleLocked" component={CapsuleLockedScreen} options={{ title: t('Hộp ký ức đã khóa'), headerTintColor: '#FFFFFF' }} />
      <Stack.Screen name="CapsuleWaiting" component={CapsuleWaitingScreen} options={{ title: t('Capsule đang chờ') }} />
      <Stack.Screen name="CapsuleContribution" component={CapsuleContributionScreen} options={{ title: t('Đóng góp') }} />
      <Stack.Screen name="OpenCapsule" component={OpenCapsuleScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CapsuleDetail" component={CapsuleDetailScreen} options={{ title: t('Chi tiết hộp ký ức'), headerTintColor: '#FFFFFF' }} />
      <Stack.Screen name="InviteCode" component={InviteCodeScreen} options={{ title: t('Nhập mã mời') }} />
      <Stack.Screen name="InviteAccept" component={InviteAcceptScreen} options={{ title: t('Lời mời') }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('Cài đặt') }} />
      <Stack.Screen name="StorageManagement" component={StorageManagementScreen} options={{ title: t('Quản lý dung lượng') }} />
      <Stack.Screen name="HighSecurity" component={HighSecurityScreen} options={{ title: t('Bảo mật cao') }} />
    </Stack.Navigator>
  );
}
