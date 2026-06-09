export const BIOMETRIC_LOCK_KEY = '@timeseal_biometric_lock';
export const BIOMETRIC_LOCK_DELAY_ENABLED_KEY = '@timeseal_biometric_grace_enabled';
export const BIOMETRIC_LOCK_DELAY_VALUE_KEY = '@timeseal_biometric_grace_value';

export const DEFAULT_BIOMETRIC_LOCK_DELAY_SECONDS = 60;
export const BIOMETRIC_LOCK_DELAY_OPTIONS_SECONDS = [15, 60, 300, 900] as const;

export const normalizeBiometricLockDelaySeconds = (value: unknown) => {
  const seconds = Number(value);
  return (BIOMETRIC_LOCK_DELAY_OPTIONS_SECONDS as readonly number[]).includes(seconds)
    ? seconds
    : DEFAULT_BIOMETRIC_LOCK_DELAY_SECONDS;
};
