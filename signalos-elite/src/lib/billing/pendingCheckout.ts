export const PENDING_CHECKOUT_PLAN_COOKIE = "signalos-pending-checkout-plan";

export function parsePendingCheckoutCookie(value: string | undefined): "smart" | "pro" | null {
  return value === "smart" || value === "pro" ? value : null;
}