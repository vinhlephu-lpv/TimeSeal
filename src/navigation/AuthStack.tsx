import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../types/navigation';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { useAuthStore } from '../store/authStore';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  const hasOnboarded = useAuthStore(state => state.hasOnboarded);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={hasOnboarded ? 'Login' : 'Onboarding'}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
