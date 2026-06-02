import Purchases, { type CustomerInfo, type CustomerInfoUpdateListener } from 'react-native-purchases';
import { getRevenueCatApiKey } from '../config/revenuecat';

let identifiedUserId: string | null = null;

/**
 * RevenueCat is always identified with the authenticated Firebase UID.
 * Do not call Purchases.logOut(): this app only supports authenticated purchases,
 * and RevenueCat logOut() creates an anonymous customer.
 */
export const ensureRevenueCatUser = async (userId: string): Promise<boolean> => {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey || !userId) {
    return false;
  }

  try {
    const isConfigured = await Purchases.isConfigured();
    if (!isConfigured) {
      Purchases.configure({ apiKey, appUserID: userId });
      identifiedUserId = userId;
      return true;
    }

    if (identifiedUserId !== userId) {
      await Purchases.logIn(userId);
      identifiedUserId = userId;
    }

    return true;
  } catch {
    return false;
  }
};

export const detachRevenueCatUser = (): void => {
  identifiedUserId = null;
};

export const addRevenueCatCustomerInfoListener = (
  userId: string,
  onCustomerInfo: (customerInfo: CustomerInfo) => void,
): (() => void) => {
  let isActive = true;
  const listener: CustomerInfoUpdateListener = customerInfo => {
    if (isActive && identifiedUserId === userId) {
      onCustomerInfo(customerInfo);
    }
  };

  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    isActive = false;
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
};
