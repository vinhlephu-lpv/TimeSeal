import Purchases from 'react-native-purchases';
import { getRevenueCatApiKey, REVENUECAT_ENTITLEMENT_ID } from '../config/revenuecat';
import type { PlanType } from '../config/plans';
import { translate } from '../i18n';

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
let configuredUserId: string | null = null;

const hasPremiumEntitlement = (entitlements: ActiveEntitlements): boolean => {
  return Boolean(entitlements[REVENUECAT_ENTITLEMENT_ID]);
};

const ensureConfigured = async (userId: string): Promise<PremiumActionResult> => {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    return {
      ok: false,
      message: translate('Dịch vụ thanh toán chưa sẵn sàng. Vui lòng thử lại sau.'),
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
      message: translate('Không kết nối được dịch vụ thanh toán. Vui lòng thử lại.'),
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
      message: translate('Không lấy được thông tin gói. Vui lòng thử lại sau.'),
    };
  }
};

const getPlanLabel = (planType: PlanType): string => {
  if (planType === 'pro_max') {
    return 'PRO MAX';
  }
  return planType === 'pro' ? 'PRO' : 'PLUS';
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
        message: translate('Gói đã chọn hiện chưa khả dụng. Vui lòng thử lại sau.'),
      };
    }

    const result = await Purchases.purchasePackage(preferred);
    const isPremium = hasPremiumEntitlement(result.customerInfo.entitlements.active);
    if (!isPremium) {
      return {
        ok: false,
        message: translate('Giao dịch đã hoàn tất nhưng gói chưa được kích hoạt. Vui lòng thử lại sau.'),
      };
    }

    return {
      ok: true,
      message: translate('Nâng cấp gói {{plan}} thành công!', { plan: getPlanLabel(planType) }),
    };
  } catch (error) {
    const typedError = error as { userCancelled?: boolean };
    if (typedError?.userCancelled) {
      return {
        ok: false,
        message: translate('Bạn đã hủy giao dịch.'),
      };
    }

    return {
      ok: false,
      message: translate('Không hoàn tất được giao dịch. Vui lòng thử lại.'),
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
    if (!isPremium) {
      return {
        ok: false,
        message: translate('Không tìm thấy gói nào để khôi phục.'),
      };
    }

    return {
      ok: true,
      message: translate('Khôi phục gói thành công!'),
    };
  } catch {
    return {
      ok: false,
      message: translate('Khôi phục thất bại. Vui lòng thử lại.'),
    };
  }
};
