import firebase from '@react-native-firebase/app';
import '@react-native-firebase/database';
import { FirebaseDatabaseTypes } from '@react-native-firebase/database';
import { Alert, Linking, NativeModules, Platform } from 'react-native';
import { firebaseProject } from '../config/firebase';

export type LocalAppVersion = {
  versionName: string;
  versionCode: number;
  packageName?: string;
};

export type RemoteAppUpdateConfig = {
  enabled?: boolean;
  versionName?: string;
  versionCode?: number | string;
  minSupportedVersionCode?: number | string;
  forceUpdate?: boolean;
  title?: string;
  message?: string;
  updateUrl?: string;
};

export type AppUpdateCheckResult = {
  updateAvailable: boolean;
  localVersion: LocalAppVersion;
  remoteConfig?: RemoteAppUpdateConfig;
  forceUpdate: boolean;
  title: string;
  message: string;
};

type NativeAppVersionModule = {
  getVersion: () => Promise<LocalAppVersion>;
};

const APP_UPDATE_PATH = '/appUpdate';
const DEFAULT_PACKAGE_NAME = 'com.timeseal_aurasoft_systems';

const appVersionModule = NativeModules.AppVersion as NativeAppVersionModule | undefined;

export const parseVersionCode = (
  value: RemoteAppUpdateConfig['versionCode'],
): number => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const compareVersionName = (remoteVersion?: string, localVersion?: string): number => {
  if (!remoteVersion || !localVersion) {
    return 0;
  }

  const remoteParts = remoteVersion.split('.').map(part => Number(part) || 0);
  const localParts = localVersion.split('.').map(part => Number(part) || 0);
  const length = Math.max(remoteParts.length, localParts.length);

  for (let index = 0; index < length; index += 1) {
    const remotePart = remoteParts[index] || 0;
    const localPart = localParts[index] || 0;
    if (remotePart > localPart) {
      return 1;
    }
    if (remotePart < localPart) {
      return -1;
    }
  }

  return 0;
};

const normalizeRemoteConfig = (value: unknown): RemoteAppUpdateConfig | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const rawConfig = value as RemoteAppUpdateConfig & {
    android?: RemoteAppUpdateConfig;
    ios?: RemoteAppUpdateConfig;
  };
  const platformConfig = Platform.OS === 'ios' ? rawConfig.ios : rawConfig.android;
  const config = platformConfig || rawConfig;

  return config.enabled === false ? null : config;
};

export const getLocalAppVersion = async (): Promise<LocalAppVersion> => {
  if (appVersionModule?.getVersion) {
    return appVersionModule.getVersion();
  }

  return {
    versionName: '0.0.0',
    versionCode: 0,
    packageName: DEFAULT_PACKAGE_NAME,
  };
};

export const shouldPromptUpdate = (
  localVersion: LocalAppVersion,
  remoteConfig: RemoteAppUpdateConfig,
): boolean => {
  const remoteVersionCode = parseVersionCode(remoteConfig.versionCode);
  if (remoteVersionCode > 0) {
    return remoteVersionCode > localVersion.versionCode;
  }

  return compareVersionName(remoteConfig.versionName, localVersion.versionName) > 0;
};

const getForceUpdate = (
  localVersion: LocalAppVersion,
  remoteConfig: RemoteAppUpdateConfig,
): boolean =>
  Boolean(remoteConfig.forceUpdate) ||
  localVersion.versionCode < parseVersionCode(remoteConfig.minSupportedVersionCode);

const buildUpdateMessage = (
  localVersion: LocalAppVersion,
  remoteConfig: RemoteAppUpdateConfig,
): string => {
  const remoteVersionCode = parseVersionCode(remoteConfig.versionCode);
  const targetVersionName = remoteConfig.versionName || 'mới nhất';
  const targetVersionCode = remoteVersionCode > 0 ? ` (${remoteVersionCode})` : '';

  return (
    remoteConfig.message ||
    `Bạn đang dùng bản ${localVersion.versionName} (${localVersion.versionCode}). Bản ${targetVersionName}${targetVersionCode} đã có, hãy cập nhật để dùng ổn định hơn.`
  );
};

const getUpdateRef = () =>
  firebase
    .app()
    .database(firebaseProject.realtimeDatabaseUrl)
    .ref(APP_UPDATE_PATH);

export const openUpdateUrl = async (
  remoteConfig: RemoteAppUpdateConfig,
  localVersion: LocalAppVersion,
) => {
  const packageName = localVersion.packageName || DEFAULT_PACKAGE_NAME;
  const urls = [
    remoteConfig.updateUrl,
    Platform.OS === 'android' ? `market://details?id=${packageName}` : undefined,
    Platform.OS === 'android'
      ? `https://play.google.com/store/apps/details?id=${packageName}`
      : undefined,
  ].filter(Boolean) as string[];

  for (const url of urls) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // Try the next URL candidate.
    }
  }

  Alert.alert(
    'Không mở được trang cập nhật',
    'Vui lòng mở Google Play và tìm TimeSeal để cập nhật thủ công.',
  );
};

const showUpdatePrompt = (
  localVersion: LocalAppVersion,
  remoteConfig: RemoteAppUpdateConfig,
) => {
  const forceUpdate = getForceUpdate(localVersion, remoteConfig);
  const message = buildUpdateMessage(localVersion, remoteConfig);

  const buttons = [
    ...(!forceUpdate
      ? [
          {
            text: 'Để sau',
            style: 'cancel' as const,
          },
        ]
      : []),
    {
      text: 'Cập nhật',
      onPress: () => {
        openUpdateUrl(remoteConfig, localVersion).catch(() => {});
      },
    },
  ];

  Alert.alert(remoteConfig.title || 'Có bản cập nhật mới', message, buttons, {
    cancelable: !forceUpdate,
  });
};

export const checkForAppUpdate = async (): Promise<AppUpdateCheckResult> => {
  const localVersion = await getLocalAppVersion();
  const snapshot = await getUpdateRef().once('value');
  const remoteConfig = normalizeRemoteConfig(snapshot.val());

  if (!remoteConfig || !shouldPromptUpdate(localVersion, remoteConfig)) {
    return {
      updateAvailable: false,
      localVersion,
      forceUpdate: false,
      title: '',
      message: '',
    };
  }

  return {
    updateAvailable: true,
    localVersion,
    remoteConfig,
    forceUpdate: getForceUpdate(localVersion, remoteConfig),
    title: remoteConfig.title || 'Có bản cập nhật mới',
    message: buildUpdateMessage(localVersion, remoteConfig),
  };
};

export const watchForAppUpdates = async (): Promise<() => void> => {
  const localVersion = await getLocalAppVersion();
  const updateRef = getUpdateRef();
  let promptedVersionCode = 0;
  let promptVisible = false;

  const handleSnapshot = (snapshot: FirebaseDatabaseTypes.DataSnapshot) => {
    const remoteConfig = normalizeRemoteConfig(snapshot.val());
    if (!remoteConfig || !shouldPromptUpdate(localVersion, remoteConfig)) {
      return;
    }

    const remoteVersionCode = parseVersionCode(remoteConfig.versionCode);
    const promptKey =
      remoteVersionCode > 0
        ? remoteVersionCode
        : compareVersionName(remoteConfig.versionName, localVersion.versionName);

    if (promptVisible || promptedVersionCode === promptKey) {
      return;
    }

    promptedVersionCode = promptKey;
    promptVisible = true;
    showUpdatePrompt(localVersion, remoteConfig);
    setTimeout(() => {
      promptVisible = false;
    }, 1000);
  };

  updateRef.on('value', handleSnapshot, () => {});

  return () => {
    updateRef.off('value', handleSnapshot);
  };
};
