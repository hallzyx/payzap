export const SESSION_DURATION_MS = 30 * 60 * 1000;
export const SESSION_COOKIE = "payzap_session";
export const PROTECTION_WINDOW_DAYS = 7;

export const STORE_NAME = "Aster";
export const PRODUCT_NAME = "Aster Nova Pro";
export const PRODUCT_SKU = "ASTER-NOVA-PRO";
export const ORIGINAL_PRICE_CENTS = 100_000;
export const INITIAL_STOCK = 42;
export const PROTECTED_ORDER_COUNT = 10;

export const DEFAULT_PROMO_PROMPT =
  "Launch a weekend campaign at $800, but keep total price-protection refunds under $1,500.";

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
