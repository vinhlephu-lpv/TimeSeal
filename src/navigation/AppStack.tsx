import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';
import { BottomTabs } from './BottomTabs';
import { CreateStep1Screen } from '../screens/capsule/CreateStep1Screen';
import { CreateStep2Screen } from '../screens/capsule/CreateStep2Screen';
import { CreateStep3Screen } from '../screens/capsule/CreateStep3Screen';
import { CreatePreviewScreen } from '../screens/capsule/CreatePreviewScreen';
import { CapsuleLockedScreen } from '../screens/capsule/CapsuleLockedScreen';
import { OpenCapsuleScreen } from '../screens/capsule/OpenCapsuleScreen';
import { CapsuleDetailScreen } from '../screens/capsule/CapsuleDetailScreen';
import { InviteCodeScreen } from '../screens/capsule/InviteCodeScreen';
import { InviteAcceptScreen } from '../screens/capsule/InviteAcceptScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
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
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Thông báo' }} />
      <Stack.Screen name="CreateStep1" component={CreateStep1Screen} options={{ title: 'Tạo capsule' }} />
      <Stack.Screen name="CreateStep2" component={CreateStep2Screen} options={{ title: 'Nội dung capsule' }} />
      <Stack.Screen name="CreateStep3" component={CreateStep3Screen} options={{ title: 'Thêm thành viên' }} />
      <Stack.Screen name="CreatePreview" component={CreatePreviewScreen} options={{ title: 'Xem trước' }} />
      <Stack.Screen name="CapsuleLocked" component={CapsuleLockedScreen} options={{ title: 'Capsule khóa', headerTintColor: '#FFFFFF' }} />
      <Stack.Screen name="OpenCapsule" component={OpenCapsuleScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CapsuleDetail" component={CapsuleDetailScreen} options={{ title: 'Chi tiết capsule' }} />
      <Stack.Screen name="InviteCode" component={InviteCodeScreen} options={{ title: 'Nhập mã mời' }} />
      <Stack.Screen name="InviteAccept" component={InviteAcceptScreen} options={{ title: 'Lời mời' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Cài đặt' }} />
    </Stack.Navigator>
  );
}
