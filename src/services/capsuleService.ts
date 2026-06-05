import { closeDueWaitingCapsulesOnServer, unlockDueCapsulesOnServer } from './backendService';

export const runUnlockSweep = async (_ownerId: string): Promise<void> => {
  await unlockDueCapsulesOnServer();
};

export const runWaitingCloseSweep = async (): Promise<void> => {
  await closeDueWaitingCapsulesOnServer();
};
