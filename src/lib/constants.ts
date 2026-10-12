export const SESSION_DURATION_MS = 30 * 60 * 1000;
export const SESSION_COOKIE = "payzap_session";
export const PAYPAL_WATCH_COOKIE = "payzap_watch";
export const PROTECTION_WINDOW_DAYS = 7;

export const STORE_NAME = "Aster";
export const PRODUCT_NAME = "Aster Nova Pro";
export const PRODUCT_TAGLINE = "Closed-back reference headphone";
export const PRODUCT_SKU = "ASTER-NOVA-PRO";
export const ORIGINAL_PRICE_CENTS = 100_000;
export const INITIAL_STOCK = 42;
export const PROTECTED_ORDER_COUNT = 10;

export const DEFAULT_PROMO_PROMPT =
  "Launch a weekend campaign at $800, but keep total price-protection refunds under $1,500.";

/** The campaign box only accepts a short price-and-budget sentence. */
export const CAMPAIGN_PROMPT_MAX_CHARS = 280;

/** The policy box takes a short paragraph of the merchant's own guarantee terms. */
export const POLICY_TEXT_MAX_CHARS = 1_200;
export const POLICY_TEXT_MIN_CHARS = 20;

export const EXAMPLE_POLICY_CLEAR =
  "Price protection lasts 7 days after purchase, or 14 days for open-box items. Orders paid with an employee coupon don't qualify.";

export const EXAMPLE_POLICY_VAGUE =
  "We protect recent purchases against price drops. Open-box items are covered too. Orders bought with a coupon don't qualify.";

/**
 * Seeded order traits. Index 0 is the demo buyer and stays plain, so the
 * buyer story is the same under any policy. Everything else exists so a
 * written policy visibly changes who gets refunded.
 */
export const ORDER_TRAITS: Array<{
  couponCode?: string;
  itemCondition?: "new" | "open_box";
  buyerNote?: string;
  daysAgo: number;
}> = [
  { daysAgo: 1 },
  { daysAgo: 2 },
  { daysAgo: 3, couponCode: "TEAM20" },
  { daysAgo: 4 },
  { daysAgo: 5, itemCondition: "open_box" },
  { daysAgo: 6 },
  { daysAgo: 1 },
  { daysAgo: 2, couponCode: "TEAM20" },
  { daysAgo: 3, buyerNote: "Gift: my sister paid and shipped it to me." },
  { daysAgo: 4, itemCondition: "open_box" },
];

export const BUYER_FIRST_NAMES = [
  "Jordan",
  "Casey",
  "Riley",
  "Avery",
  "Quinn",
  "Morgan",
  "Reese",
  "Harper",
  "Drew",
  "Skyler",
] as const;

export type CampaignStatus =
  | "idle"
  | "analyzed"
  | "accepted"
  | "approved"
  | "refunding"
  | "completed"
  | "partial_failure";

export type RefundStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "skipped";

export type BatchStatus = "Ready" | "Reserved" | "Consumed" | "Invalid";

export type Role = "buyer" | "merchant";
