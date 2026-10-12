import type {
  BatchStatus,
  CampaignStatus,
  RefundStatus,
  Role,
} from "./constants";
import type { Policy } from "./policy/schema";

export interface SessionRow {
  id: string;
  buyer_id: string;
  merchant_id: string;
  role: Role;
  product_price_cents: number;
  stock: number;
  campaign_status: CampaignStatus;
  proposed_price_cents: number | null;
  refund_budget_cents: number | null;
  recommended_price_cents: number | null;
  analyzed_prompt: string | null;
  policy_text: string | null;
  policy_json: string | null;
  batch_id: string | null;
  is_preview: number;
  buyer_notified: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  session_id: string;
  order_number: string;
  buyer_name: string;
  is_demo_buyer: number;
  product_sku: string;
  product_name: string;
  purchase_price_cents: number;
  price_adjustment_cents: number;
  effective_price_cents: number;
  payment_provider: string;
  payment_status: string;
  order_status: string;
  protection_status: string;
  purchased_at: string;
  protection_expires_at: string;
  paypal_capture_id: string | null;
  paypal_refund_id: string | null;
  refund_status: RefundStatus;
  refund_error: string | null;
  eligibility_json: string | null;
  coupon_code: string | null;
  item_condition: "new" | "open_box";
  buyer_note: string | null;
  created_at: string;
}

export interface BatchRow {
  id: string;
  status: BatchStatus;
  capture_ids_json: string;
  reserved_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignIntent {
  proposedPriceCents: number;
  refundBudgetCents: number | null;
  rawPrompt: string;
  source: "openai" | "deepseek" | "deterministic";
}

export interface ExcludedOrder {
  orderNumber: string;
  /** Plain-language reasons, each tied to a policy rule when one applies. */
  reasons: string[];
}

export interface ExposureAnalysis {
  proposedPriceCents: number;
  refundBudgetCents: number | null;
  eligibleCount: number;
  excludedOrders: ExcludedOrder[];
  refundPerOrderCents: number;
  totalExposureCents: number;
  exceedsBudget: boolean;
  overByCents: number;
  recommendedPriceCents: number | null;
  recommendedExposureCents: number | null;
  reason: string;
}

export interface EligibilityCheck {
  eligible: boolean;
  checks: Array<{
    label: string;
    passed: boolean;
    /** Policy rule behind this check, when it came from the merchant's policy. */
    ruleId?: string;
    /** The merchant's own words that justify the rule. */
    cite?: string;
  }>;
}

export interface DemoState {
  session: {
    id: string;
    buyerId: string;
    merchantId: string;
    role: Role;
    productPriceCents: number;
    stock: number;
    campaignStatus: CampaignStatus;
    proposedPriceCents: number | null;
    refundBudgetCents: number | null;
    recommendedPriceCents: number | null;
    analyzedPrompt: string | null;
    policyText: string | null;
    batchId: string | null;
    isPreview: boolean;
    buyerNotified: boolean;
    expiresAt: string;
    remainingMs: number;
    expired: boolean;
    hasLivePaypalRefunds: boolean;
    readyBatchCount: number;
    batchConsumed: boolean;
  };
  product: {
    name: string;
    sku: string;
    priceCents: number;
    stock: number;
    protectedPurchaseCount: number;
    salesCount: number;
  };
  orders: OrderView[];
  metrics: {
    protectedRevenueCents: number;
    protectedPurchases: number;
    currentRefundExposureCents: number;
    totalRefundedCents: number;
    completedRefunds: number;
    failedRefunds: number;
  };
  analysis: ExposureAnalysis | null;
  policy: Policy;
}

export interface OrderView {
  couponCode: string | null;
  itemCondition: "new" | "open_box";
  buyerNote: string | null;
  id: string;
  orderNumber: string;
  buyerName: string;
  isDemoBuyer: boolean;
  productSku: string;
  productName: string;
  purchasePriceCents: number;
  priceAdjustmentCents: number;
  effectivePriceCents: number;
  paymentProvider: string;
  paymentStatus: string;
  orderStatus: string;
  protectionStatus: string;
  purchasedAt: string;
  protectionExpiresAt: string;
  paypalCaptureId: string | null;
  paypalRefundId: string | null;
  refundStatus: RefundStatus;
  refundError: string | null;
  eligibility: EligibilityCheck | null;
}
