export const SIGI_PRICING = {
  smart: {
    name: "Sigi Smart",
    priceMonthly: 9,
    priceId: process.env.NEXT_PUBLIC_STRIPE_SMART_PRICE_ID!,
    tagline: "Understands you",
  },
  pro: {
    name: "Sigi Pro",
    priceMonthly: 24,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!,
    tagline: "Works for you",
  },
} as const;

export type PlanKey = keyof typeof SIGI_PRICING;