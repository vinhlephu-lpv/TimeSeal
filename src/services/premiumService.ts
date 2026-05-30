import Purchases from 'react-native-purchases';
import firestore from '@react-native-firebase/firestore';
import { getRevenueCatApiKey, REVENUECAT_ENTITLEMENT_ID } from '../config/revenuecat';
import type { PlanType } from '../config/plans';

type PremiumActionResult = {
  ok: boolean;
  message: string;
};

type OfferingSummaryResult = {
  ok: boolean;
  displayPrice: string;
  message?: string;
};

type ActiveEntitlements = Record<string, unknown>;
type PaidPlanType = Exclude<PlanType, 'free'>;
type CustomerInfoWithProducts = {
  activeSubscriptions?: string[];
  allPurchasedProductIdentifiers?: string[];
};

let configuredUserId: string | null = null;

const hasPremiumEntitlement = (entitlements: ActiveEntitlements): boolean => {
  return Boolean(entitlements[REVENUECAT_ENTITLEMENT_ID]);
};

const syncPremiumToFirestore = async (userId: string, isPremium: boolean, plan: PlanType = 'plus'): Promise<void> => {
  await firestore().collection('users').doc(userId).set(
    {
      isPremium,
      plan,
      premiumUpdatedAtISO: new Date().toISOString(),
    },
    { merge: true },
  );
};

const ensureConfigured = async (userId: string): Promise<PremiumActionResult> => {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    return {
      ok: false,
      message: 'Chưa cấu hình RevenueCat API key trong src/config/revenuecat.ts.',
    };
  }

  try {
    if (!configuredUserId) {
      Purchases.configure({ apiKey, appUserID: userId });
      configuredUserId = userId;
      return { ok: true, message: 'configured' };
    }

    if (configuredUserId !== userId) {
      await Purchases.logIn(userId);
      configuredUserId = userId;
    }

    return { ok: true, message: 'configured' };
  } catch {
    return {
      ok: false,
      message: 'Không kết nối được dịch vụ thanh toán. Vui lòng thử lại.',
    };
  }
};

export const getPremiumOfferingSummary = async (userId: string): Promise<OfferingSummaryResult> => {
  const configured = await ensureConfigured(userId);
  if (!configured.ok) {
    return {
      ok: false,
      displayPrice: '29.000đ / tháng',
      message: configured.message,
    };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const packages = offerings.current?.availablePackages || [];
    const preferred =
      packages.find(pkg => pkg.identifier === '$rc_monthly' || pkg.identifier === 'monthly') ||
      packages[0];

    return {
      ok: true,
      displayPrice: preferred?.product?.priceString || '29.000đ / tháng',
    };
  } catch {
    return {
      ok: false,
      displayPrice: '29.000đ / tháng',
      message: 'Không lấy được thông tin gói Premium từ RevenueCat.',
    };
  }
};

const getPlanLabel = (planType: PlanType): string => {
  if (planType === 'pro_max') {
    return 'PRO MAX';
  }
  return planType === 'pro' ? 'PRO' : 'PLUS';
};

const inferPaidPlanFromCustomerInfo = (customerInfo: CustomerInfoWithProducts): PaidPlanType => {
  const productIds = [
    ...(customerInfo.activeSubscriptions || []),
    ...(customerInfo.allPurchasedProductIdentifiers || []),
  ].join(' ').toLowerCase();

  if (productIds.includes('pro_max') || productIds.includes('pro-max') || productIds.includes('promax')) {
    return 'pro_max';
  }
  if (productIds.includes('pro')) {
    return 'pro';
  }
  return 'plus';
};

export const purchasePremium = async (userId: string, planType: PaidPlanType = 'plus'): Promise<PremiumActionResult> => {
  const configured = await ensureConfigured(userId);
  if (!configured.ok) {
    return configured;
  }

  try {
    const offerings = await Purchases.getOfferings();
    const packages = offerings.current?.availablePackages || [];
    const preferred =
      packages.find(pkg => pkg.identifier.includes(planType) || pkg.identifier === '$rc_monthly' || pkg.identifier === 'monthly') ||
      packages[0];

    if (!preferred) {
      return {
        ok: false,
        message: 'Chưa có package Premium trong RevenueCat offering hiện tại.',
      };
    }

    const result = await Purchases.purchasePackage(preferred);
    const isPremium = hasPremiumEntitlement(result.customerInfo.entitlements.active);
    await syncPremiumToFirestore(userId, isPremium, planType);

    if (!isPremium) {
      return {
        ok: false,
        message: 'Giao dịch thành công nhưng entitlement premium chưa kích hoạt.',
      };
    }

    return {
      ok: true,
      message: `Nâng cấp gói ${getPlanLabel(planType)} thành công!`,
    };
  } catch (error) {
    const typedError = error as { userCancelled?: boolean };
    if (typedError?.userCancelled) {
      return {
        ok: false,
        message: 'Bạn đã huỷ giao dịch.',
      };
    }

    return {
      ok: false,
      message: 'Không hoàn tất được giao dịch. Vui lòng thử lại.',
    };
  }
};

export const restorePremium = async (userId: string): Promise<PremiumActionResult> => {
  const configured = await ensureConfigured(userId);
  if (!configured.ok) {
    return configured;
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = hasPremiumEntitlement(customerInfo.entitlements.active);
    const restoredPlan = isPremium ? inferPaidPlanFromCustomerInfo(customerInfo) : 'free';
    await syncPremiumToFirestore(userId, isPremium, restoredPlan);

    if (!isPremium) {
      return {
        ok: false,
        message: 'Không tìm thấy gói Premium nào để khôi phục.',
      };
    }

    return {
      ok: true,
      message: 'Khôi phục gói Premium thành công!',
    };
  } catch {
    return {
      ok: false,
      message: 'Khôi phục thất bại. Vui lòng thử lại.',
    };
  }
};
