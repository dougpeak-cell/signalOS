function getStripePriceEnv(primaryName: string, fallbackName: string): string {
  return process.env[primaryName]?.trim() || process.env[fallbackName]?.trim() || "";
}

export const SIGI_PRICING = {
  smart: {
    name: "Sigi Smart",
    priceMonthly: 9,
    priceId: getStripePriceEnv("STRIPE_SMART_PRICE_ID", "NEXT_PUBLIC_STRIPE_SMART_PRICE_ID"),
    priceAnnual: 79,
    priceIdAnnual: getStripePriceEnv("STRIPE_SMART_PRICE_ID_ANNUAL", "NEXT_PUBLIC_STRIPE_SMART_PRICE_ID_ANNUAL"),
    tagline: "Understands you",
  },
  pro: {
    name: "Sigi Pro",
    priceMonthly: 24,
    priceId: getStripePriceEnv("STRIPE_PRO_PRICE_ID", "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID"),
    priceAnnual: 199,
    priceIdAnnual: getStripePriceEnv("STRIPE_PRO_PRICE_ID_ANNUAL", "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL"),
    tagline: "Works for you",
  },
} as const;

export type PlanKey = keyof typeof SIGI_PRICING;

export type BillingInterval = "monthly" | "annual";

export function isBillingInterval(value: string | null | undefined): value is BillingInterval {
  return value === "monthly" || value === "annual";
}

export function getSigiPriceAmount(tier: PlanKey, interval: BillingInterval): number {
  return interval === "annual" ? SIGI_PRICING[tier].priceAnnual : SIGI_PRICING[tier].priceMonthly;
}

/** Percent saved paying annually vs. 12x the monthly price, rounded to the nearest whole percent. */
export function getSigiAnnualSavingsPercent(tier: PlanKey): number {
  const monthlyCost = SIGI_PRICING[tier].priceMonthly * 12;
  const annualCost = SIGI_PRICING[tier].priceAnnual;
  if (monthlyCost <= 0) return 0;
  return Math.round(((monthlyCost - annualCost) / monthlyCost) * 100);
}