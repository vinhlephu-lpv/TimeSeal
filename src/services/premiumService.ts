import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import type { PlanType } from '../config/plans';
import {
  getPlanPriority,
  mapProductIdToPlan,
  type PaidPlanType,
} from '../config/subscriptionProducts';
import { translate } from '../i18n';
import { ensureRevenueCatUser } from './revenueCatIdentityService';
import { normalizeRevenueCatEntitlement } from './subscriptionService';

type PremiumActionResult = {
  ok: boolean;
  message: string;
  customerInfo?: CustomerInfo;
};

type PremiumChangeType = 'purchase' | 'upgrade' | 'downgrade';

type OfferingSummaryResult = {
  ok: boolean;
  displayPrice: string;
  message?: string;
};

const ensureConfigured = async (userId: string): Promise<PremiumActionResult> => {
  if (!await ensureRevenueCatUser(userId)) {
    return {
      ok: false,
      message: translate('Dịch vụ thanh toán chưa sẵn sàng. Vui lòng thử lại sau.'),
    };
  }

  return { ok: true, message: 'configured' };
};

const findPackageForPlan = (
  packages: PurchasesPackage[],
  planType: PaidPlanType,
): PurchasesPackage | undefined =>
  packages.find(pkg => mapProductIdToPlan(pkg.product.identifier) === planType);

export const getPremiumOfferingSummary = async (
  userId: string,
  planType: PaidPlanType = 'plus',
): Promise<OfferingSummaryResult> => {
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
    const preferred = findPackageForPlan(packages, planType);

    return {
      ok: Boolean(preferred),
      displayPrice: preferred?.product?.priceString || '29.000đ / tháng',
      message: preferred
        ? undefined
        : translate('Gói đã chọn hiện chưa khả dụng. Vui lòng thử lại sau.'),
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

const getChangeType = (
  currentPlan: PlanType,
  nextPlan: PaidPlanType,
): PremiumChangeType => {
  if (currentPlan === 'free') {
    return 'purchase';
  }
  return getPlanPriority(nextPlan) > getPlanPriority(currentPlan)
    ? 'upgrade'
    : 'downgrade';
};

const getSuccessMessage = (
  changeType: PremiumChangeType,
  planType: PaidPlanType,
): string => {
  const plan = getPlanLabel(planType);
  if (changeType === 'downgrade') {
    return translate('Đã đặt lịch chuyển sang gói {{plan}} vào kỳ gia hạn tiếp theo.', { plan });
  }
  if (changeType === 'upgrade') {
    return translate('Nâng cấp lên gói {{plan}} thành công!', { plan });
  }
  return translate('Đăng ký gói {{plan}} thành công!', { plan });
};

export const purchasePremium = async (userId: string, planType: PaidPlanType = 'plus'): Promise<PremiumActionResult> => {
  const configured = await ensureConfigured(userId);
  if (!configured.ok) {
    return configured;
  }

  try {
    const offerings = await Purchases.getOfferings();
    const packages = offerings.current?.availablePackages || [];
    const preferred = findPackageForPlan(packages, planType);

    if (!preferred) {
      return {
        ok: false,
        message: translate('Gói đã chọn hiện chưa khả dụng. Vui lòng thử lại sau.'),
      };
    }

    const customerInfoBeforePurchase = await Purchases.getCustomerInfo().catch(() => null);
    const beforeState = customerInfoBeforePurchase
      ? normalizeRevenueCatEntitlement(customerInfoBeforePurchase, userId)
      : null;
    const oldProductIdentifier = beforeState?.activeProductId;
    if (beforeState?.currentPlan === planType) {
      return {
        ok: false,
        message: translate('Bạn đang sử dụng gói {{plan}}.', { plan: getPlanLabel(planType) }),
      };
    }
    const changeType = getChangeType(beforeState?.currentPlan || 'free', planType);
    const googleProductChangeInfo =
      oldProductIdentifier &&
      beforeState?.currentPlan !== planType &&
      getPlanPriority(beforeState.currentPlan) > 0
        ? {
          oldProductIdentifier,
          prorationMode: changeType === 'downgrade'
            ? Purchases.PRORATION_MODE.DEFERRED
            : Purchases.PRORATION_MODE.IMMEDIATE_WITH_TIME_PRORATION,
        }
        : null;

    const result = await Purchases.purchasePackage(
      preferred,
      null,
      googleProductChangeInfo,
    );
    const purchasedState = normalizeRevenueCatEntitlement(result.customerInfo, userId);
    if (
      changeType !== 'downgrade' &&
      getPlanPriority(purchasedState.currentPlan) < getPlanPriority(planType)
    ) {
      return {
        ok: false,
        message: translate('Giao dịch đã hoàn tất nhưng gói chưa được kích hoạt. Vui lòng thử lại sau.'),
      };
    }

    return {
      ok: true,
      message: getSuccessMessage(changeType, planType),
      customerInfo: result.customerInfo,
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
    const restoredState = normalizeRevenueCatEntitlement(customerInfo, userId);
    if (restoredState.currentPlan === 'free') {
      return {
        ok: false,
        message: translate('Không tìm thấy gói nào để khôi phục.'),
      };
    }

    return {
      ok: true,
      message: translate('Khôi phục gói thành công!'),
      customerInfo,
    };
  } catch {
    return {
      ok: false,
      message: translate('Khôi phục thất bại. Vui lòng thử lại.'),
    };
  }
};
