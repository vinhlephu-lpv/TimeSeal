import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ExploreScreen } from '../screens/home/ExploreScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import type { BottomTabParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';
import { AppIcon } from '../components/ui/DesignPrimitives';
import { useTranslation } from '../i18n';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export function BottomTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          // Add bottom safe area inset so the tab bar sits above the
          // system navigation bar / taskbar on Android 15+ edge-to-edge.
          paddingBottom: insets.bottom,
          height: 56 + insets.bottom,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('Trang chủ'),
          tabBarIcon: ({ color, size }) => <AppIcon name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarLabel: t('Khám phá'),
          tabBarIcon: ({ color, size }) => <AppIcon name="compass" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('Tài khoản'),
          tabBarIcon: ({ color, size }) => <AppIcon name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
