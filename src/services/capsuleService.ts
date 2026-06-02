import { unlockDueCapsulesOnServer } from './backendService';

export const runUnlockSweep = async (_ownerId: string): Promise<void> => {
  await unlockDueCapsulesOnServer();
};
