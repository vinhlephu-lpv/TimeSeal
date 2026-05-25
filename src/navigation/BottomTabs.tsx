import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ExploreScreen } from '../screens/home/ExploreScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import type { BottomTabParamList } from '../types/navigation';
import { colors } from '../theme/colors';
import { AppIcon } from '../components/ui/DesignPrimitives';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ color, size }) => <AppIcon name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarLabel: 'Khám phá',
          tabBarIcon: ({ color, size }) => <AppIcon name="compass" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Tài khoản',
          tabBarIcon: ({ color, size }) => <AppIcon name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
