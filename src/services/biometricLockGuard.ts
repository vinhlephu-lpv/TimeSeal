let biometricAutoLockSuppressedUntil = 0;

export const suppressBiometricAutoLock = (durationMs = 5 * 60 * 1000) => {
  biometricAutoLockSuppressedUntil = Math.max(
    biometricAutoLockSuppressedUntil,
    Date.now() + durationMs,
  );
};

export const isBiometricAutoLockSuppressed = () => {
  return Date.now() < biometricAutoLockSuppressedUntil;
};
