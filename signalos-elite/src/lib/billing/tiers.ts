import type Stripe from "stripe";
import { SIGI_PRICING, type BillingInterval } from "@/lib/billing/pricing";
import { normalizeSigiTier, type SigiTier as AppSigiTier } from "@/lib/sigi/gates";

export type SigiTier = AppSigiTier;

export type PaidSigiTier = Exclude<SigiTier, "free">;

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
]);

export function coercePaidSigiTier(value: string | null | undefined): PaidSigiTier | null {
  const tier = normalizeSigiTier(value);
  if (tier === "smart" || tier === "pro") return tier;
  return null;
}

export function getStripePriceIdForTier(tier: PaidSigiTier, interval: BillingInterval = "monthly"): string {
  const plan = SIGI_PRICING[tier];
  const priceId = interval === "annual" ? plan.priceIdAnnual : plan.priceId;

  if (!priceId?.trim()) {
    throw new Error(
      tier === "pro"
        ? interval === "annual"
          ? "STRIPE_PRO_PRICE_ID_ANNUAL or NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL is not configured."
          : "STRIPE_PRO_PRICE_ID or NEXT_PUBLIC_STRIPE_PRO_PRICE_ID is not configured."
        : interval === "annual"
          ? "STRIPE_SMART_PRICE_ID_ANNUAL or NEXT_PUBLIC_STRIPE_SMART_PRICE_ID_ANNUAL is not configured."
          : "STRIPE_SMART_PRICE_ID or NEXT_PUBLIC_STRIPE_SMART_PRICE_ID is not configured."
    );
  }

  return priceId.trim();
}

export function priceIdToTier(priceId: string | null | undefined): SigiTier {
  if (!priceId) return "free";

  if (priceId === SIGI_PRICING.pro.priceId || priceId === SIGI_PRICING.pro.priceIdAnnual) return "pro";
  if (priceId === SIGI_PRICING.smart.priceId || priceId === SIGI_PRICING.smart.priceIdAnnual) return "smart";
  return "free";
}

export function getBillingIntervalFromPriceId(priceId: string | null | undefined): BillingInterval {
  if (!priceId) return "monthly";

  if (priceId === SIGI_PRICING.smart.priceIdAnnual || priceId === SIGI_PRICING.pro.priceIdAnnual) {
    return "annual";
  }

  return "monthly";
}

export function getTierFromStripePriceId(priceId: string | null | undefined): SigiTier {
  return priceIdToTier(priceId);
}

export function isStripeSubscriptionActive(status: Stripe.Subscription.Status | null | undefined): boolean {
  return status ? ACTIVE_SUBSCRIPTION_STATUSES.has(status) : false;
}

export function getTierFromStripeSubscription(subscription: Stripe.Subscription | null | undefined): SigiTier {
  if (!subscription || !isStripeSubscriptionActive(subscription.status)) {
    return "free";
  }

  let resolvedTier: SigiTier = "free";

  for (const item of subscription.items.data) {
    const nextTier = priceIdToTier(item.price?.id);
    if (nextTier === "pro") return "pro";
    if (nextTier === "smart") resolvedTier = "smart";
  }

  return resolvedTier;
}

export function getHighestTierFromStripeSubscriptions(
  subscriptions: Stripe.Subscription[]
): Stripe.Subscription | null {
  let bestMatch: Stripe.Subscription | null = null;
  let bestRank = -1;

  for (const subscription of subscriptions) {
    const tier = getTierFromStripeSubscription(subscription);
    const rank = tier === "pro" ? 2 : tier === "smart" ? 1 : 0;

    if (rank > bestRank) {
      bestMatch = subscription;
      bestRank = rank;
    }
  }

  return bestMatch;
}