import type { NavigatorScreenParams } from '@react-navigation/native';
import type { LocalMediaAsset } from '../store/capsuleStore';
import type { CapsuleTheme } from './models';

export type CapsuleDraftRouteParams = {
  title: string;
  openDateISO: string;
  theme: CapsuleTheme;
  message: string;
  mediaAssets: LocalMediaAsset[];
  memberEmails: string[];
};

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Explore: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<BottomTabParamList>;
  Notifications: undefined;
  CreateStep1: undefined;
  CreateStep2: {
    title: string;
    openDateISO: string;
    theme: CapsuleTheme;
  };
  CreateStep3: {
    title: string;
    openDateISO: string;
    theme: CapsuleTheme;
    message: string;
    mediaAssets: LocalMediaAsset[];
  };
  CreatePreview: CapsuleDraftRouteParams;
  CapsuleLocked: {
    capsuleId: string;
  };
  OpenCapsule: {
    capsuleId: string;
  };
  CapsuleDetail: {
    capsuleId: string;
  };
  InviteCode: undefined;
  InviteAccept: {
    inviteCode: string;
  };
  Settings: undefined;
  StorageManagement: undefined;
  HighSecurity: undefined;
};
