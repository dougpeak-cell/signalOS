function getStripePriceEnv(primaryName: string, fallbackName: string): string {
  return process.env[primaryName]?.trim() || process.env[fallbackName]?.trim() || "";
}

export const SIGI_PRICING = {
  smart: {
    name: "Sigi Smart",
    priceMonthly: 9,
    priceId: getStripePriceEnv("STRIPE_SMART_PRICE_ID", "NEXT_PUBLIC_STRIPE_SMART_PRICE_ID"),
    tagline: "Understands you",
  },
  pro: {
    name: "Sigi Pro",
    priceMonthly: 24,
    priceId: getStripePriceEnv("STRIPE_PRO_PRICE_ID", "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID"),
    tagline: "Works for you",
  },
} as const;

export type PlanKey = keyof typeof SIGI_PRICING;