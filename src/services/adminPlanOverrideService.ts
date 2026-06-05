import firebase from '@react-native-firebase/app';
import '@react-native-firebase/database';
import { firebaseProject } from '../config/firebase';
import { PLAN_LIMITS, type PlanType } from '../config/plans';

export const ADMIN_PLAN_OVERRIDE_SOURCE = 'admin_rtdb_override';

type AdminPlanOverrideRecord = {
  enabled?: boolean;
  plan?: PlanType;
  lifetime?: boolean;
  reason?: string;
};

export type AdminPlanOverrideResult =
  | {
      status: 'active';
      plan: Exclude<PlanType, 'free'>;
      lifetime: boolean;
    }
  | {
      status: 'inactive';
    }
  | {
      status: 'unavailable';
    };

const ADMIN_PLAN_OVERRIDE_PATH = '/adminPlanOverrides/byEmail';
const READ_TIMEOUT_MS = 4000;

export const getAdminPlanEmailKey = (email?: string | null): string | null => {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return normalized.replace(/[^a-z0-9_-]/g, '_');
};

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Admin plan override timeout')), ms);
    promise
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });

const getOverrideRef = (emailKey: string) =>
  firebase
    .app()
    .database(firebaseProject.realtimeDatabaseUrl)
    .ref(`${ADMIN_PLAN_OVERRIDE_PATH}/${emailKey}`);

export const getAdminPlanOverride = async (
  email?: string | null,
): Promise<AdminPlanOverrideResult> => {
  const emailKey = getAdminPlanEmailKey(email);
  if (!emailKey) {
    return { status: 'inactive' };
  }

  try {
    const snapshot = await withTimeout(getOverrideRef(emailKey).once('value'), READ_TIMEOUT_MS);
    const value = snapshot.val() as AdminPlanOverrideRecord | null;

    if (!value?.enabled || !value.plan || value.plan === 'free' || !PLAN_LIMITS[value.plan]) {
      return { status: 'inactive' };
    }

    return {
      status: 'active',
      plan: value.plan,
      lifetime: value.lifetime !== false,
    };
  } catch {
    return { status: 'unavailable' };
  }
};
