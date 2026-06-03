import { createNavigationContainerRef } from '@react-navigation/native';
import type { AppStackParamList } from '../types/navigation';

export const rootNavigationRef = createNavigationContainerRef<AppStackParamList>();

export type PushCapsuleScreen = 'CapsuleLocked' | 'CapsuleWaiting' | 'OpenCapsule' | 'CapsuleDetail';

export const navigateFromPush = (capsuleId: string, screen?: PushCapsuleScreen): void => {
  if (!rootNavigationRef.isReady() || !capsuleId) {
    return;
  }

  rootNavigationRef.navigate(screen || 'CapsuleDetail', { capsuleId });
};
