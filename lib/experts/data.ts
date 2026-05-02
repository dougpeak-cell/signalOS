export type ExpertActionTone = "fresh" | "today" | "recent" | "stale";
export type ExpertPosition = "Buy" | "Hold" | "Sell";
export type ExpertSourceType = "analyst" | "insider" | "fund";

export type CoverageRow = {
  ticker: string;
  company: string;
  position: ExpertPosition;
  priceTarget: number | null;
  currentPrice: number | null;
  upsidePct: number | null;
  actionDate: string | null;
  actionLabel: string;
  actionTone: ExpertActionTone;
  note?: string;
  rationale?: string;
  spark: number[];
  sourceType: ExpertSourceType;
  sourceName?: string;
  sourceFirm?: string;
};

export type ExpertAnalystProfile = {
  slug: string;
  name: string;
  firm: string;
  rank?: number | null;
  stars?: number | null;
  successRate?: number | null;
  averageReturn?: number | null;
  sectors?: string[];
  regions?: string[];
};

export type ExpertProfileResponse = {
  analyst: ExpertAnalystProfile;
  coverage: CoverageRow[];
  updatedAt: string;
};

function withUpside(
  currentPrice: number | null,
  priceTarget: number | null
): number | null {
  if (
    currentPrice == null ||
    priceTarget == null ||
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(priceTarget) ||
    currentPrice <= 0
  ) {
    return null;
  }

  return Number((((priceTarget - currentPrice) / currentPrice) * 100).toFixed(1));
}

const NOW_ISO = new Date().toISOString();

export const SEEDED_EXPERT_PROFILES: Record<string, ExpertProfileResponse> = {
  nvda: {
    analyst: {
      slug: "nvda",
      name: "Street Composite",
      firm: "SignalOS",
      rank: 7,
      stars: 5,
      successRate: 68,
      averageReturn: 7.4,
      sectors: ["Semis", "AI Infrastructure"],
      regions: ["US"],
    },
    coverage: [
      {
        ticker: "NVDA",
        company: "NVIDIA",
        position: "Buy",
        currentPrice: 177.39,
        priceTarget: 208.17,
        upsidePct: withUpside(177.39, 208.17),
        actionDate: "2026-03-06",
        actionLabel: "Fresh upgrade",
        actionTone: "fresh",
        note:
          "AI infrastructure demand remains the strongest large-cap growth theme, with multiple expert signals confirming continued earnings upside.",
        rationale:
          "Estimate revisions remain constructive and large-cap AI leadership continues to improve confidence.",
        spark: [71, 74, 78, 83, 86, 88, 90],
        sourceType: "analyst",
        sourceName: "Street Composite",
        sourceFirm: "SignalOS",
      },
      {
        ticker: "AMD",
        company: "Advanced Micro Devices",
        position: "Buy",
        currentPrice: 166.8,
        priceTarget: 190,
        upsidePct: withUpside(166.8, 190),
        actionDate: "2026-03-05",
        actionLabel: "Today",
        actionTone: "today",
        note:
          "AI server momentum and improving product mix continue to support upside into the next cycle.",
        rationale:
          "Improved estimate support and competitive positioning versus peers.",
        spark: [60, 64, 67, 70, 72, 74, 77],
        sourceType: "analyst",
        sourceName: "Street Composite",
        sourceFirm: "SignalOS",
      },
      {
        ticker: "TSM",
        company: "Taiwan Semiconductor",
        position: "Buy",
        currentPrice: 182.25,
        priceTarget: 205,
        upsidePct: withUpside(182.25, 205),
        actionDate: "2026-03-04",
        actionLabel: "Recent",
        actionTone: "recent",
        note:
          "Manufacturing leadership and AI-related demand continue to support conviction.",
        rationale:
          "Supplier strength and high-performance compute exposure remain favorable.",
        spark: [62, 65, 66, 68, 72, 75, 78],
        sourceType: "fund",
        sourceName: "Conviction Basket",
        sourceFirm: "SignalOS",
      },
    ],
    updatedAt: NOW_ISO,
  },

  msft: {
    analyst: {
      slug: "msft",
      name: "Cloud Growth Desk",
      firm: "SignalOS Composite",
      rank: 12,
      stars: 5,
      successRate: 64,
      averageReturn: 5.8,
      sectors: ["Software", "Cloud"],
      regions: ["US"],
    },
    coverage: [
      {
        ticker: "MSFT",
        company: "Microsoft",
        position: "Buy",
        currentPrice: 425.12,
        priceTarget: 450,
        upsidePct: withUpside(425.12, 450),
        actionDate: "2026-03-06",
        actionLabel: "Fresh upgrade",
        actionTone: "fresh",
        note:
          "Azure and enterprise AI commentary remain supportive, while ownership trends suggest continued long-duration institutional conviction.",
        rationale:
          "Cloud durability and enterprise monetization continue to improve the quality of the setup.",
        spark: [68, 71, 74, 76, 79, 82, 84],
        sourceType: "fund",
        sourceName: "Ownership Tracker",
        sourceFirm: "SignalOS Composite",
      },
      {
        ticker: "CRM",
        company: "Salesforce",
        position: "Hold",
        currentPrice: 318.4,
        priceTarget: 330,
        upsidePct: withUpside(318.4, 330),
        actionDate: "2026-03-05",
        actionLabel: "Today",
        actionTone: "today",
        note:
          "Execution remains steady, though the setup is less explosive than the strongest software names.",
        rationale:
          "Solid enterprise demand but more muted upside versus top-ranked peers.",
        spark: [54, 56, 58, 57, 59, 60, 61],
        sourceType: "analyst",
        sourceName: "Cloud Growth Desk",
        sourceFirm: "SignalOS Composite",
      },
      {
        ticker: "NOW",
        company: "ServiceNow",
        position: "Buy",
        currentPrice: 812.5,
        priceTarget: 875,
        upsidePct: withUpside(812.5, 875),
        actionDate: "2026-03-04",
        actionLabel: "Recent",
        actionTone: "recent",
        note:
          "Workflow monetization and enterprise resilience continue to support expert conviction.",
        rationale:
          "High-quality software sponsorship remains intact.",
        spark: [66, 67, 69, 71, 74, 77, 80],
        sourceType: "analyst",
        sourceName: "Cloud Growth Desk",
        sourceFirm: "SignalOS Composite",
      },
    ],
    updatedAt: NOW_ISO,
  },

  meta: {
    analyst: {
      slug: "meta",
      name: "Internet Growth Desk",
      firm: "SignalOS Composite",
      rank: 18,
      stars: 4,
      successRate: 66,
      averageReturn: 6.2,
      sectors: ["Internet", "Digital Ads"],
      regions: ["US"],
    },
    coverage: [
      {
        ticker: "META",
        company: "Meta Platforms",
        position: "Buy",
        currentPrice: 512.4,
        priceTarget: 560,
        upsidePct: withUpside(512.4, 560),
        actionDate: "2026-03-06",
        actionLabel: "Fresh upgrade",
        actionTone: "fresh",
        note:
          "Expert commentary continues to favor operating leverage, while estimate support remains constructive into the next earnings window.",
        rationale:
          "Ad strength and margin discipline continue to drive improving conviction.",
        spark: [63, 67, 70, 73, 76, 80, 83],
        sourceType: "analyst",
        sourceName: "Internet Growth Desk",
        sourceFirm: "SignalOS Composite",
      },
      {
        ticker: "AMZN",
        company: "Amazon",
        position: "Buy",
        currentPrice: 209.77,
        priceTarget: 225,
        upsidePct: withUpside(209.77, 225),
        actionDate: "2026-03-06",
        actionLabel: "Today",
        actionTone: "today",
        note:
          "Retail margin stability and cloud reacceleration continue to support the improved stance.",
        rationale:
          "Earnings durability and margin follow-through remain key positives.",
        spark: [58, 60, 63, 66, 68, 72, 75],
        sourceType: "analyst",
        sourceName: "Large Cap Internet Desk",
        sourceFirm: "SignalOS Composite",
      },
      {
        ticker: "GOOGL",
        company: "Alphabet",
        position: "Hold",
        currentPrice: 173.2,
        priceTarget: 182,
        upsidePct: withUpside(173.2, 182),
        actionDate: "2026-03-03",
        actionLabel: "Recent",
        actionTone: "recent",
        note:
          "Still constructive, though the near-term setup is less forceful than the strongest ad-platform peers.",
        rationale:
          "Durable quality sponsorship but less urgency than top-ranked names.",
        spark: [52, 54, 55, 56, 58, 60, 61],
        sourceType: "analyst",
        sourceName: "Internet Growth Desk",
        sourceFirm: "SignalOS Composite",
      },
    ],
    updatedAt: NOW_ISO,
  },

  aapl: {
    analyst: {
      slug: "aapl",
      name: "Mega Cap Quality Desk",
      firm: "SignalOS Composite",
      rank: 24,
      stars: 4,
      successRate: 57,
      averageReturn: 3.1,
      sectors: ["Mega Cap Tech", "Consumer Tech"],
      regions: ["US"],
    },
    coverage: [
      {
        ticker: "AAPL",
        company: "Apple",
        position: "Hold",
        currentPrice: 214.65,
        priceTarget: 221,
        upsidePct: withUpside(214.65, 221),
        actionDate: "2026-03-05",
        actionLabel: "Today",
        actionTone: "today",
        note:
          "Not the highest momentum setup, but still supported by quality-focused analysts and long-horizon institutional positioning.",
        rationale:
          "Durable sponsorship remains, though upside is more measured versus higher-beta peers.",
        spark: [50, 52, 54, 55, 56, 57, 58],
        sourceType: "analyst",
        sourceName: "Mega Cap Quality Desk",
        sourceFirm: "SignalOS Composite",
      },
      {
        ticker: "COST",
        company: "Costco",
        position: "Buy",
        currentPrice: 742.1,
        priceTarget: 790,
        upsidePct: withUpside(742.1, 790),
        actionDate: "2026-03-04",
        actionLabel: "Recent",
        actionTone: "recent",
        note:
          "Defensive quality compounder with durable membership-driven momentum.",
        rationale:
          "Strong quality sponsorship and consistent execution.",
        spark: [57, 59, 61, 62, 64, 66, 69],
        sourceType: "fund",
        sourceName: "Quality Basket",
        sourceFirm: "SignalOS",
      },
      {
        ticker: "PG",
        company: "Procter & Gamble",
        position: "Hold",
        currentPrice: 171.8,
        priceTarget: 176,
        upsidePct: withUpside(171.8, 176),
        actionDate: "2026-03-02",
        actionLabel: "Recent",
        actionTone: "recent",
        note:
          "Defensive support remains solid, but the upside profile is more limited.",
        rationale:
          "Reliable quality sponsorship, lower forward torque.",
        spark: [49, 50, 50, 52, 53, 54, 55],
        sourceType: "fund",
        sourceName: "Quality Basket",
        sourceFirm: "SignalOS",
      },
    ],
    updatedAt: NOW_ISO,
  },

  "insider-monitor": {
    analyst: {
      slug: "insider-monitor",
      name: "Insider Monitor",
      firm: "SignalOS",
      rank: 31,
      stars: 4,
      successRate: 59,
      averageReturn: 6.7,
      sectors: ["Industrials", "Special Situations"],
      regions: ["US"],
    },
    coverage: [
      {
        ticker: "UNP",
        company: "Union Pacific",
        position: "Buy",
        currentPrice: 248.3,
        priceTarget: 272,
        upsidePct: withUpside(248.3, 272),
        actionDate: "2026-03-06",
        actionLabel: "Insider buy",
        actionTone: "fresh",
        note:
          "Recent insider activity improved the stock’s conviction score versus other industrial peers.",
        rationale:
          "Clustered insider activity can improve conviction when paired with stable business quality.",
        spark: [55, 58, 63, 67, 71, 74, 78],
        sourceType: "insider",
        sourceName: "Insider Monitor",
        sourceFirm: "SignalOS",
      },
      {
        ticker: "DE",
        company: "Deere & Company",
        position: "Hold",
        currentPrice: 421.5,
        priceTarget: 440,
        upsidePct: withUpside(421.5, 440),
        actionDate: "2026-03-05",
        actionLabel: "Today",
        actionTone: "today",
        note:
          "Insider support is constructive, though the setup is not the strongest in the group.",
        rationale:
          "Constructive insider signal with more moderate forward asymmetry.",
        spark: [52, 55, 57, 60, 62, 64, 66],
        sourceType: "insider",
        sourceName: "Insider Monitor",
        sourceFirm: "SignalOS",
      },
      {
        ticker: "CAT",
        company: "Caterpillar",
        position: "Hold",
        currentPrice: 358.9,
        priceTarget: 370,
        upsidePct: withUpside(358.9, 370),
        actionDate: "2026-03-03",
        actionLabel: "Recent",
        actionTone: "recent",
        note:
          "Insider flow is stable, but the risk/reward profile is less compelling than top-ranked industrial setups.",
        rationale:
          "Steady industrial sponsorship without standout upside.",
        spark: [50, 51, 53, 54, 56, 57, 58],
        sourceType: "insider",
        sourceName: "Insider Monitor",
        sourceFirm: "SignalOS",
      },
    ],
    updatedAt: NOW_ISO,
  },

  "street-composite": {
    analyst: {
      slug: "street-composite",
      name: "Street Composite",
      firm: "SignalOS",
      rank: 9,
      stars: 5,
      successRate: 67,
      averageReturn: 8.6,
      sectors: ["Semis", "Software", "Internet"],
      regions: ["US"],
    },
    coverage: [
      {
        ticker: "NVDA",
        company: "NVIDIA",
        position: "Buy",
        currentPrice: 177.39,
        priceTarget: 208.17,
        upsidePct: withUpside(177.39, 208.17),
        actionDate: "2026-03-06",
        actionLabel: "Fresh upgrade",
        actionTone: "fresh",
        note:
          "Bullish reinforcement after higher AI infrastructure estimates.",
        rationale:
          "Multiple analysts lifted assumptions tied to AI deployment and GPU demand resilience.",
        spark: [70, 73, 77, 82, 86, 89, 92],
        sourceType: "analyst",
        sourceName: "Street Composite",
        sourceFirm: "SignalOS",
      },
      {
        ticker: "MSFT",
        company: "Microsoft",
        position: "Buy",
        currentPrice: 425.12,
        priceTarget: 450,
        upsidePct: withUpside(425.12, 450),
        actionDate: "2026-03-06",
        actionLabel: "Conviction add",
        actionTone: "today",
        note:
          "Institutional conviction remains firm into the next cloud cycle.",
        rationale:
          "Positioning signals remain favorable as enterprise commentary stays constructive.",
        spark: [66, 69, 72, 75, 78, 81, 84],
        sourceType: "fund",
        sourceName: "Street Composite",
        sourceFirm: "SignalOS",
      },
      {
        ticker: "AMZN",
        company: "Amazon",
        position: "Buy",
        currentPrice: 209.77,
        priceTarget: 225,
        upsidePct: withUpside(209.77, 225),
        actionDate: "2026-03-06",
        actionLabel: "Bullish revision",
        actionTone: "today",
        note:
          "Expert tone improves on margin durability.",
        rationale:
          "Retail margin stability and cloud reacceleration are driving the improved stance.",
        spark: [58, 61, 64, 67, 70, 73, 76],
        sourceType: "analyst",
        sourceName: "Street Composite",
        sourceFirm: "SignalOS",
      },
    ],
    updatedAt: NOW_ISO,
  },
};

export function getSeededExpertProfile(slug: string) {
  return SEEDED_EXPERT_PROFILES[slug.toLowerCase()] ?? null;
}
