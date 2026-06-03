import { createNavigationContainerRef } from '@react-navigation/native';
import type { AppStackParamList } from '../types/navigation';

export const rootNavigationRef = createNavigationContainerRef<AppStackParamList>();

export const navigateFromPush = (capsuleId: string, screen?: 'CapsuleLocked' | 'CapsuleWaiting'): void => {
  if (!rootNavigationRef.isReady() || !capsuleId) {
    return;
  }

  rootNavigationRef.navigate(screen || 'CapsuleDetail', { capsuleId });
};
