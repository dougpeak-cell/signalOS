import { SIGI_PRICING } from "@/lib/billing/pricing";
import { gate, type SigiTier } from "@/lib/sigi/gates";

export type SigiFeatureKey =
  | "basicRail"
  | "limitedFollowUps"
  | "shortMemory"
  | "personalizedSuggestions"
  | "strongerReasoning"
  | "longerConversations"
  | "smarterRailPrompts"
  | "researchMode"
  | "proactivePrompts"
  | "automationActions"
  | "premiumRailPresence";

export type SigiTierCard = {
  tier: SigiTier;
  name: string;
  tagline: string;
  eyebrow: string;
  emotionalTakeaway: string;
  cta: string;
  badge?: string;
  bullets: string[];
};

export const SIGI_TIER_ORDER: SigiTier[] = ["free", "smart", "pro"];

export const SIGI_TIER_CARDS: SigiTierCard[] = [
  {
    tier: "free",
    name: "Sigi",
    tagline: "Helpful assistant",
    eyebrow: "Helpful",
    emotionalTakeaway: "Nice, this is useful.",
    cta: "Continue with Free",
    bullets: [
      "Basic rail and standard answers",
      "Limited follow-ups and short memory window",
      "Useful day-to-day market guidance",
    ],
  },
  {
    tier: "smart",
    name: SIGI_PRICING.smart.name,
    tagline: SIGI_PRICING.smart.tagline,
    eyebrow: SIGI_PRICING.smart.tagline,
    emotionalTakeaway: "This actually gets me.",
    badge: "Most Popular",
    cta: "Become a Smart user",
    bullets: [
      "Better memory for more personalized help",
      "Smarter suggestions and stronger reasoning",
      "Longer, clearer conversations and rail prompts",
    ],
  },
  {
    tier: "pro",
    name: SIGI_PRICING.pro.name,
    tagline: SIGI_PRICING.pro.tagline,
    eyebrow: SIGI_PRICING.pro.tagline,
    emotionalTakeaway: "I rely on this.",
    badge: "Elite",
    cta: "Become a Pro user",
    bullets: [
      "Pro Research Mode for deeper analysis",
      "Proactive prompts before you ask",
      "Automation actions, premium rail presence, and everyday Crypto access",
    ],
  },
];

const FEATURE_MIN_TIER: Record<SigiFeatureKey, SigiTier> = {
  basicRail: "free",
  limitedFollowUps: "free",
  shortMemory: "free",
  personalizedSuggestions: "smart",
  strongerReasoning: "smart",
  longerConversations: "smart",
  smarterRailPrompts: "smart",
  researchMode: "pro",
  proactivePrompts: "pro",
  automationActions: "pro",
  premiumRailPresence: "pro",
};

export function compareSigiTiers(left: SigiTier, right: SigiTier): number {
  return SIGI_TIER_ORDER.indexOf(left) - SIGI_TIER_ORDER.indexOf(right);
}

export function hasSigiFeature(tier: SigiTier, feature: SigiFeatureKey): boolean {
  if (feature === "shortMemory") return gate("memory", tier);
  if (feature === "personalizedSuggestions") return gate("personalization", tier);
  if (feature === "researchMode") return gate("research", tier);
  if (feature === "proactivePrompts") return gate("proactive", tier);
  if (feature === "automationActions") return gate("automation", tier);

  return compareSigiTiers(tier, FEATURE_MIN_TIER[feature]) >= 0;
}

export function getNextSigiTier(tier: SigiTier): SigiTier | null {
  if (tier === "free") return "smart";
  if (tier === "smart") return "pro";
  return null;
}

export function getSigiTierCard(tier: SigiTier): SigiTierCard {
  return SIGI_TIER_CARDS.find((card) => card.tier === tier) ?? SIGI_TIER_CARDS[0];
}

export function getSigiComparisonRows() {
  return [
    {
      label: "Memory",
      free: "Short window",
      smart: "Better memory",
      pro: "Strong context memory",
    },
    {
      label: "Personalization",
      free: "Basic guidance",
      smart: "Personalized suggestions",
      pro: "Deep personalized operator flow",
    },
    {
      label: "Research",
      free: "Standard answers",
      smart: "Stronger reasoning",
      pro: "Pro Research Mode",
    },
    {
      label: "Proactive / Actions",
      free: "Reactive only",
      smart: "Smarter prompts",
      pro: "Live nudges and action tools",
    },
  ];
}

export function getRailUpgradeCopy(tier: SigiTier) {
  if (tier === "free") {
    return {
      targetTier: "smart" as SigiTier,
      headline: "Sigi can do more",
      body: "Unlock memory, smarter suggestions, and deeper help with Sigi Smart.",
      cta: "Become a Smart user",
      accent: "smart" as const,
    };
  }

  if (tier === "smart") {
    return {
      targetTier: "pro" as SigiTier,
      headline: "Go Pro with Sigi",
      body: "Unlock Research Mode, proactive ideas, action tools, and full everyday Crypto access with Sigi Pro.",
      cta: "Become a Pro user",
      accent: "pro" as const,
    };
  }

  return {
    targetTier: "pro" as SigiTier,
    headline: "Sigi Pro is live",
    body: "Your rail is the operator layer now. Research, proactive prompts, and premium actions live here.",
    cta: "View plans",
    accent: "pro" as const,
  };
}

export function inferSigiTierFromLegacyPaidAccess(paidAccessEnabled: boolean): SigiTier {
  return paidAccessEnabled ? "smart" : "free";
}