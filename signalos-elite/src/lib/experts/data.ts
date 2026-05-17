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

export type SeededExpertTickerSnapshot = {
  ticker: string;
  company: string;
  conviction: number;
  priceTarget: number | null;
  upsidePct: number | null;
  note: string | null;
  sourceName: string | null;
  sourceFirm: string | null;
  actionTone: ExpertActionTone;
  position: ExpertPosition;
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
      firm: "SigiOS",
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
        sourceFirm: "SigiOS",
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
        sourceFirm: "SigiOS",
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
        sourceFirm: "SigiOS",
      },
    ],
    updatedAt: NOW_ISO,
  },

  msft: {
    analyst: {
      slug: "msft",
      name: "Cloud Growth Desk",
      firm: "SigiOS Composite",
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
        sourceFirm: "SigiOS Composite",
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
        sourceFirm: "SigiOS Composite",
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
        sourceFirm: "SigiOS Composite",
      },
    ],
    updatedAt: NOW_ISO,
  },

  meta: {
    analyst: {
      slug: "meta",
      name: "Internet Growth Desk",
      firm: "SigiOS Composite",
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
        sourceFirm: "SigiOS Composite",
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
        sourceFirm: "SigiOS Composite",
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
        sourceFirm: "SigiOS Composite",
      },
    ],
    updatedAt: NOW_ISO,
  },

  aapl: {
    analyst: {
      slug: "aapl",
      name: "Mega Cap Quality Desk",
      firm: "SigiOS Composite",
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
        sourceFirm: "SigiOS Composite",
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
        sourceFirm: "SigiOS",
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
        sourceFirm: "SigiOS",
      },
    ],
    updatedAt: NOW_ISO,
  },

  "insider-monitor": {
    analyst: {
      slug: "insider-monitor",
      name: "Insider Monitor",
      firm: "SigiOS",
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
        sourceFirm: "SigiOS",
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
        sourceFirm: "SigiOS",
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
        sourceFirm: "SigiOS",
      },
    ],
    updatedAt: NOW_ISO,
  },

  "energy-strategy": {
    analyst: {
      slug: "energy-strategy",
      name: "Avery Stone",
      firm: "SigiOS Energy Strategy",
      rank: 15,
      stars: 5,
      successRate: 63,
      averageReturn: 8.1,
      sectors: ["Energy", "Oil & Gas"],
      regions: ["US"],
    },
    coverage: [
      {
        ticker: "FANG",
        company: "Diamondback Energy",
        position: "Buy",
        currentPrice: 214.2,
        priceTarget: 246,
        upsidePct: withUpside(214.2, 246),
        actionDate: "2026-03-06",
        actionLabel: "Fresh upgrade",
        actionTone: "fresh",
        note:
          "Upstream free-cash-flow durability and disciplined capital returns keep conviction elevated versus large-cap peers.",
        rationale:
          "Analyst preference remains centered on efficient Permian operators with cleaner return profiles.",
        spark: [64, 68, 72, 76, 81, 84, 88],
        sourceType: "analyst",
        sourceName: "Avery Stone",
        sourceFirm: "SigiOS Energy Strategy",
      },
      {
        ticker: "XOM",
        company: "Exxon Mobil",
        position: "Buy",
        currentPrice: 121.6,
        priceTarget: 134,
        upsidePct: withUpside(121.6, 134),
        actionDate: "2026-03-05",
        actionLabel: "Today",
        actionTone: "today",
        note:
          "Integrated scale and downstream resilience continue to support defensive leadership inside the group.",
        rationale:
          "Balance-sheet strength and capital discipline keep downside risk more manageable.",
        spark: [59, 62, 65, 67, 70, 73, 77],
        sourceType: "analyst",
        sourceName: "Avery Stone",
        sourceFirm: "SigiOS Energy Strategy",
      },
      {
        ticker: "CVX",
        company: "Chevron",
        position: "Hold",
        currentPrice: 166.4,
        priceTarget: 174,
        upsidePct: withUpside(166.4, 174),
        actionDate: "2026-03-04",
        actionLabel: "Recent",
        actionTone: "recent",
        note:
          "Constructive major-cap setup, though upside trails the best upstream names.",
        rationale:
          "Quality remains high but the near-term torque is less forceful than top picks.",
        spark: [54, 56, 58, 59, 61, 63, 65],
        sourceType: "analyst",
        sourceName: "Avery Stone",
        sourceFirm: "SigiOS Energy Strategy",
      },
    ],
    updatedAt: NOW_ISO,
  },

  "financials-bank-desk": {
    analyst: {
      slug: "financials-bank-desk",
      name: "Daniel Cross",
      firm: "SigiOS Bank Strategy",
      rank: 17,
      stars: 5,
      successRate: 61,
      averageReturn: 6.9,
      sectors: ["Financial Services", "Banking"],
      regions: ["US"],
    },
    coverage: [
      {
        ticker: "JPM",
        company: "JPMorgan Chase",
        position: "Buy",
        currentPrice: 244.8,
        priceTarget: 272,
        upsidePct: withUpside(244.8, 272),
        actionDate: "2026-03-06",
        actionLabel: "Fresh upgrade",
        actionTone: "fresh",
        note:
          "Best-in-class deposit franchise and fee durability continue to support premium leadership inside large-cap banks.",
        rationale:
          "Operating leverage and capital strength remain the cleanest among money-center peers.",
        spark: [61, 65, 69, 72, 76, 80, 83],
        sourceType: "analyst",
        sourceName: "Daniel Cross",
        sourceFirm: "SigiOS Bank Strategy",
      },
      {
        ticker: "GS",
        company: "Goldman Sachs",
        position: "Buy",
        currentPrice: 518.6,
        priceTarget: 560,
        upsidePct: withUpside(518.6, 560),
        actionDate: "2026-03-05",
        actionLabel: "Today",
        actionTone: "today",
        note:
          "Capital-markets recovery and steady execution support improving analyst conviction.",
        rationale:
          "Advisory and trading leverage provide stronger upside than most diversified financial peers.",
        spark: [57, 60, 63, 67, 70, 73, 76],
        sourceType: "analyst",
        sourceName: "Daniel Cross",
        sourceFirm: "SigiOS Bank Strategy",
      },
      {
        ticker: "BAC",
        company: "Bank of America",
        position: "Hold",
        currentPrice: 46.3,
        priceTarget: 49,
        upsidePct: withUpside(46.3, 49),
        actionDate: "2026-03-03",
        actionLabel: "Recent",
        actionTone: "recent",
        note:
          "Still constructive, though upside is more rate-sensitive than the best-in-class bank setups.",
        rationale:
          "Net interest income stabilization helps, but torque remains more modest.",
        spark: [49, 51, 53, 54, 56, 58, 60],
        sourceType: "analyst",
        sourceName: "Daniel Cross",
        sourceFirm: "SigiOS Bank Strategy",
      },
    ],
    updatedAt: NOW_ISO,
  },

  "consumer-discretionary": {
    analyst: {
      slug: "consumer-discretionary",
      name: "Maya Torres",
      firm: "SigiOS Consumer Leadership",
      rank: 19,
      stars: 4,
      successRate: 60,
      averageReturn: 7.1,
      sectors: ["Consumer Cyclical", "Retail"],
      regions: ["US"],
    },
    coverage: [
      {
        ticker: "AMZN",
        company: "Amazon",
        position: "Buy",
        currentPrice: 209.77,
        priceTarget: 228,
        upsidePct: withUpside(209.77, 228),
        actionDate: "2026-03-06",
        actionLabel: "Fresh upgrade",
        actionTone: "fresh",
        note:
          "Retail margin durability and advertising momentum continue to support the best asymmetry in large-cap discretionary.",
        rationale:
          "Execution remains ahead of peers while consumer demand trends stay resilient.",
        spark: [60, 64, 68, 71, 75, 78, 82],
        sourceType: "analyst",
        sourceName: "Maya Torres",
        sourceFirm: "SigiOS Consumer Leadership",
      },
      {
        ticker: "BKNG",
        company: "Booking Holdings",
        position: "Buy",
        currentPrice: 3892,
        priceTarget: 4180,
        upsidePct: withUpside(3892, 4180),
        actionDate: "2026-03-05",
        actionLabel: "Today",
        actionTone: "today",
        note:
          "Travel demand remains durable with pricing still supporting strong free-cash-flow conversion.",
        rationale:
          "Asset-light travel leaders continue to screen well on quality and earnings durability.",
        spark: [56, 59, 62, 66, 69, 72, 75],
        sourceType: "analyst",
        sourceName: "Maya Torres",
        sourceFirm: "SigiOS Consumer Leadership",
      },
      {
        ticker: "TSLA",
        company: "Tesla",
        position: "Hold",
        currentPrice: 182.4,
        priceTarget: 190,
        upsidePct: withUpside(182.4, 190),
        actionDate: "2026-03-03",
        actionLabel: "Recent",
        actionTone: "recent",
        note:
          "Volatility remains elevated, which lowers conviction versus cleaner discretionary leaders.",
        rationale:
          "The setup still carries event risk that can overwhelm the base case quickly.",
        spark: [47, 49, 52, 55, 57, 60, 63],
        sourceType: "analyst",
        sourceName: "Maya Torres",
        sourceFirm: "SigiOS Consumer Leadership",
      },
    ],
    updatedAt: NOW_ISO,
  },

  "consumer-staples": {
    analyst: {
      slug: "consumer-staples",
      name: "Elena Park",
      firm: "SigiOS Staples Research",
      rank: 22,
      stars: 4,
      successRate: 58,
      averageReturn: 4.6,
      sectors: ["Consumer Defensive", "Consumer Staples"],
      regions: ["US"],
    },
    coverage: [
      {
        ticker: "COST",
        company: "Costco",
        position: "Buy",
        currentPrice: 742.1,
        priceTarget: 792,
        upsidePct: withUpside(742.1, 792),
        actionDate: "2026-03-06",
        actionLabel: "Fresh upgrade",
        actionTone: "fresh",
        note:
          "Best-in-class traffic resilience and membership economics keep the setup ahead of other defensive retailers.",
        rationale:
          "Execution consistency and pricing power support premium defensive leadership.",
        spark: [55, 58, 61, 65, 69, 72, 76],
        sourceType: "analyst",
        sourceName: "Elena Park",
        sourceFirm: "SigiOS Staples Research",
      },
      {
        ticker: "PG",
        company: "Procter & Gamble",
        position: "Buy",
        currentPrice: 171.8,
        priceTarget: 182,
        upsidePct: withUpside(171.8, 182),
        actionDate: "2026-03-05",
        actionLabel: "Today",
        actionTone: "today",
        note:
          "Defensive quality sponsorship remains solid as earnings visibility stays above average.",
        rationale:
          "Household products remain a preferred pocket when rotation turns more defensive.",
        spark: [52, 54, 56, 58, 61, 64, 67],
        sourceType: "analyst",
        sourceName: "Elena Park",
        sourceFirm: "SigiOS Staples Research",
      },
      {
        ticker: "KO",
        company: "Coca-Cola",
        position: "Hold",
        currentPrice: 67.5,
        priceTarget: 71,
        upsidePct: withUpside(67.5, 71),
        actionDate: "2026-03-03",
        actionLabel: "Recent",
        actionTone: "recent",
        note:
          "Income-oriented support remains firm, though upside is less dynamic than top staples leaders.",
        rationale:
          "Quality is intact, but the forward asymmetry is more limited.",
        spark: [48, 49, 51, 53, 55, 57, 59],
        sourceType: "analyst",
        sourceName: "Elena Park",
        sourceFirm: "SigiOS Staples Research",
      },
    ],
    updatedAt: NOW_ISO,
  },

  "healthcare-core": {
    analyst: {
      slug: "healthcare-core",
      name: "Priya Shah",
      firm: "SigiOS Healthcare Research",
      rank: 14,
      stars: 5,
      successRate: 65,
      averageReturn: 7.8,
      sectors: ["Healthcare", "Medical Devices"],
      regions: ["US"],
    },
    coverage: [
      {
        ticker: "LLY",
        company: "Eli Lilly",
        position: "Buy",
        currentPrice: 812.4,
        priceTarget: 892,
        upsidePct: withUpside(812.4, 892),
        actionDate: "2026-03-06",
        actionLabel: "Fresh upgrade",
        actionTone: "fresh",
        note:
          "Obesity-drug leadership and durable estimate support continue to separate Lilly from the rest of large-cap healthcare.",
        rationale:
          "Product momentum and execution remain elite versus peers.",
        spark: [63, 67, 71, 76, 80, 84, 87],
        sourceType: "analyst",
        sourceName: "Priya Shah",
        sourceFirm: "SigiOS Healthcare Research",
      },
      {
        ticker: "ISRG",
        company: "Intuitive Surgical",
        position: "Buy",
        currentPrice: 431.2,
        priceTarget: 468,
        upsidePct: withUpside(431.2, 468),
        actionDate: "2026-03-05",
        actionLabel: "Today",
        actionTone: "today",
        note:
          "Procedure durability and premium device exposure continue to support high-quality healthcare leadership.",
        rationale:
          "Capital equipment demand remains resilient and high margin.",
        spark: [58, 61, 65, 69, 72, 75, 79],
        sourceType: "analyst",
        sourceName: "Priya Shah",
        sourceFirm: "SigiOS Healthcare Research",
      },
      {
        ticker: "UNH",
        company: "UnitedHealth Group",
        position: "Hold",
        currentPrice: 538.6,
        priceTarget: 560,
        upsidePct: withUpside(538.6, 560),
        actionDate: "2026-03-03",
        actionLabel: "Recent",
        actionTone: "recent",
        note:
          "Defensive healthcare exposure remains useful, though the upside profile is less dynamic than top growth names.",
        rationale:
          "Quality is high, but the setup has lower torque.",
        spark: [50, 52, 54, 56, 58, 60, 62],
        sourceType: "analyst",
        sourceName: "Priya Shah",
        sourceFirm: "SigiOS Healthcare Research",
      },
    ],
    updatedAt: NOW_ISO,
  },

  "communication-services": {
    analyst: {
      slug: "communication-services",
      name: "Jordan Lee",
      firm: "SigiOS Media Strategy",
      rank: 16,
      stars: 5,
      successRate: 62,
      averageReturn: 6.8,
      sectors: ["Communication Services", "Media"],
      regions: ["US"],
    },
    coverage: [
      {
        ticker: "META",
        company: "Meta Platforms",
        position: "Buy",
        currentPrice: 512.4,
        priceTarget: 555,
        upsidePct: withUpside(512.4, 555),
        actionDate: "2026-03-06",
        actionLabel: "Fresh upgrade",
        actionTone: "fresh",
        note:
          "Ad demand and margin discipline keep Meta at the top of the communication-services stack.",
        rationale:
          "Scale economics and AI monetization remain strong.",
        spark: [61, 65, 69, 73, 77, 80, 84],
        sourceType: "analyst",
        sourceName: "Jordan Lee",
        sourceFirm: "SigiOS Media Strategy",
      },
      {
        ticker: "NFLX",
        company: "Netflix",
        position: "Buy",
        currentPrice: 694.2,
        priceTarget: 742,
        upsidePct: withUpside(694.2, 742),
        actionDate: "2026-03-05",
        actionLabel: "Today",
        actionTone: "today",
        note:
          "Ad-tier momentum and content leverage are supporting a cleaner streaming setup.",
        rationale:
          "Engagement and monetization remain supportive.",
        spark: [56, 59, 63, 66, 70, 73, 76],
        sourceType: "analyst",
        sourceName: "Jordan Lee",
        sourceFirm: "SigiOS Media Strategy",
      },
      {
        ticker: "TMUS",
        company: "T-Mobile US",
        position: "Hold",
        currentPrice: 182.7,
        priceTarget: 190,
        upsidePct: withUpside(182.7, 190),
        actionDate: "2026-03-03",
        actionLabel: "Recent",
        actionTone: "recent",
        note:
          "Wireless remains stable but less explosive than top ad and streaming names.",
        rationale:
          "Quality is strong, upside is steadier.",
        spark: [49, 51, 53, 55, 57, 59, 61],
        sourceType: "analyst",
        sourceName: "Jordan Lee",
        sourceFirm: "SigiOS Media Strategy",
      },
    ],
    updatedAt: NOW_ISO,
  },

  "utilities-core": {
    analyst: {
      slug: "utilities-core",
      name: "Marcus Vale",
      firm: "SigiOS Utility Desk",
      rank: 26,
      stars: 4,
      successRate: 56,
      averageReturn: 4.1,
      sectors: ["Utilities"],
      regions: ["US"],
    },
    coverage: [
      {
        ticker: "NEE",
        company: "NextEra Energy",
        position: "Buy",
        currentPrice: 78.4,
        priceTarget: 84,
        upsidePct: withUpside(78.4, 84),
        actionDate: "2026-03-06",
        actionLabel: "Fresh upgrade",
        actionTone: "fresh",
        note:
          "Regulated stability plus renewable optionality keep NextEra at the top of the defensive utility group.",
        rationale:
          "Rate-base visibility remains superior to peers.",
        spark: [53, 55, 58, 61, 64, 67, 70],
        sourceType: "analyst",
        sourceName: "Marcus Vale",
        sourceFirm: "SigiOS Utility Desk",
      },
      {
        ticker: "SO",
        company: "Southern Company",
        position: "Hold",
        currentPrice: 83.6,
        priceTarget: 87,
        upsidePct: withUpside(83.6, 87),
        actionDate: "2026-03-05",
        actionLabel: "Today",
        actionTone: "today",
        note:
          "Income support remains sturdy, though upside is more limited than the group leader.",
        rationale:
          "Defensive utility demand is intact, but growth is slower.",
        spark: [48, 50, 52, 54, 56, 58, 60],
        sourceType: "analyst",
        sourceName: "Marcus Vale",
        sourceFirm: "SigiOS Utility Desk",
      },
      {
        ticker: "DUK",
        company: "Duke Energy",
        position: "Hold",
        currentPrice: 113.4,
        priceTarget: 118,
        upsidePct: withUpside(113.4, 118),
        actionDate: "2026-03-03",
        actionLabel: "Recent",
        actionTone: "recent",
        note:
          "Stable rate-base exposure, but the risk/reward remains more income-driven than alpha-driven.",
        rationale:
          "Useful defensively, less catalytic.",
        spark: [47, 48, 50, 52, 54, 56, 58],
        sourceType: "analyst",
        sourceName: "Marcus Vale",
        sourceFirm: "SigiOS Utility Desk",
      },
    ],
    updatedAt: NOW_ISO,
  },

  "real-estate": {
    analyst: {
      slug: "real-estate",
      name: "Olivia Hart",
      firm: "SigiOS Property Research",
      rank: 23,
      stars: 4,
      successRate: 57,
      averageReturn: 5.2,
      sectors: ["Real Estate", "REITs"],
      regions: ["US"],
    },
    coverage: [
      {
        ticker: "PLD",
        company: "Prologis",
        position: "Buy",
        currentPrice: 132.8,
        priceTarget: 144,
        upsidePct: withUpside(132.8, 144),
        actionDate: "2026-03-06",
        actionLabel: "Fresh upgrade",
        actionTone: "fresh",
        note:
          "Logistics real estate still screens as the cleanest secular REIT pocket.",
        rationale:
          "Warehouse demand and premium assets support stronger visibility.",
        spark: [54, 57, 60, 63, 67, 70, 73],
        sourceType: "analyst",
        sourceName: "Olivia Hart",
        sourceFirm: "SigiOS Property Research",
      },
      {
        ticker: "EQIX",
        company: "Equinix",
        position: "Buy",
        currentPrice: 881.3,
        priceTarget: 938,
        upsidePct: withUpside(881.3, 938),
        actionDate: "2026-03-05",
        actionLabel: "Today",
        actionTone: "today",
        note:
          "Digital infrastructure remains one of the best real-estate quality franchises.",
        rationale:
          "Data-center demand keeps the setup resilient.",
        spark: [56, 59, 62, 66, 69, 73, 76],
        sourceType: "analyst",
        sourceName: "Olivia Hart",
        sourceFirm: "SigiOS Property Research",
      },
      {
        ticker: "O",
        company: "Realty Income",
        position: "Hold",
        currentPrice: 59.2,
        priceTarget: 62,
        upsidePct: withUpside(59.2, 62),
        actionDate: "2026-03-03",
        actionLabel: "Recent",
        actionTone: "recent",
        note:
          "Income visibility is solid, though upside is more modest than industrial and digital REIT leaders.",
        rationale:
          "Reliable but lower torque.",
        spark: [47, 49, 50, 52, 54, 56, 58],
        sourceType: "analyst",
        sourceName: "Olivia Hart",
        sourceFirm: "SigiOS Property Research",
      },
    ],
    updatedAt: NOW_ISO,
  },

  "basic-materials": {
    analyst: {
      slug: "basic-materials",
      name: "Victor Chen",
      firm: "SigiOS Materials Strategy",
      rank: 21,
      stars: 4,
      successRate: 59,
      averageReturn: 6.1,
      sectors: ["Basic Materials", "Chemicals"],
      regions: ["US"],
    },
    coverage: [
      {
        ticker: "LIN",
        company: "Linde",
        position: "Buy",
        currentPrice: 472.9,
        priceTarget: 508,
        upsidePct: withUpside(472.9, 508),
        actionDate: "2026-03-06",
        actionLabel: "Fresh upgrade",
        actionTone: "fresh",
        note:
          "Industrial gas leadership continues to outperform the broader materials group on quality and consistency.",
        rationale:
          "Defensive quality plus pricing power remain attractive.",
        spark: [55, 58, 62, 65, 69, 72, 75],
        sourceType: "analyst",
        sourceName: "Victor Chen",
        sourceFirm: "SigiOS Materials Strategy",
      },
      {
        ticker: "SHW",
        company: "Sherwin-Williams",
        position: "Buy",
        currentPrice: 338.1,
        priceTarget: 362,
        upsidePct: withUpside(338.1, 362),
        actionDate: "2026-03-05",
        actionLabel: "Today",
        actionTone: "today",
        note:
          "Premium coatings exposure remains one of the cleaner materials setups.",
        rationale:
          "Margins and execution remain ahead of the pack.",
        spark: [53, 56, 59, 63, 66, 69, 72],
        sourceType: "analyst",
        sourceName: "Victor Chen",
        sourceFirm: "SigiOS Materials Strategy",
      },
      {
        ticker: "FCX",
        company: "Freeport-McMoRan",
        position: "Hold",
        currentPrice: 51.7,
        priceTarget: 55,
        upsidePct: withUpside(51.7, 55),
        actionDate: "2026-03-03",
        actionLabel: "Recent",
        actionTone: "recent",
        note:
          "Copper leverage is constructive, though commodity volatility lowers conviction versus higher-quality materials names.",
        rationale:
          "More cyclical, less steady than the top materials leaders.",
        spark: [49, 50, 52, 55, 57, 60, 63],
        sourceType: "analyst",
        sourceName: "Victor Chen",
        sourceFirm: "SigiOS Materials Strategy",
      },
    ],
    updatedAt: NOW_ISO,
  },

  "street-composite": {
    analyst: {
      slug: "street-composite",
      name: "Street Composite",
      firm: "SigiOS",
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
        sourceFirm: "SigiOS",
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
        sourceFirm: "SigiOS",
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
        sourceFirm: "SigiOS",
      },
    ],
    updatedAt: NOW_ISO,
  },
};

export function getSeededExpertProfile(slug: string) {
  return SEEDED_EXPERT_PROFILES[slug.toLowerCase()] ?? null;
}

function expertPositionToBaseConviction(position: ExpertPosition) {
  if (position === "Buy") return 78;
  if (position === "Hold") return 60;
  return 38;
}

function actionToneAdjustment(tone: ExpertActionTone) {
  if (tone === "fresh") return 6;
  if (tone === "today") return 4;
  if (tone === "recent") return 2;
  return 0;
}

function buildSeededExpertConviction(
  row: CoverageRow,
  analyst: ExpertAnalystProfile
) {
  const base = expertPositionToBaseConviction(row.position);
  const freshness = actionToneAdjustment(row.actionTone);
  const successRateBoost = Math.max(
    -4,
    Math.min(6, Math.round(((analyst.successRate ?? 55) - 55) / 3))
  );

  return Math.max(0, Math.min(100, base + freshness + successRateBoost));
}

function compareCoveragePriority(a: CoverageRow, b: CoverageRow) {
  const positionRank = (position: ExpertPosition) => {
    if (position === "Buy") return 3;
    if (position === "Hold") return 2;
    return 1;
  };

  const toneRank = (tone: ExpertActionTone) => {
    if (tone === "fresh") return 4;
    if (tone === "today") return 3;
    if (tone === "recent") return 2;
    return 1;
  };

  const positionDiff = positionRank(b.position) - positionRank(a.position);
  if (positionDiff !== 0) return positionDiff;

  const toneDiff = toneRank(b.actionTone) - toneRank(a.actionTone);
  if (toneDiff !== 0) return toneDiff;

  return (b.upsidePct ?? -999) - (a.upsidePct ?? -999);
}

export function getSeededExpertTickerSnapshots(): Record<
  string,
  SeededExpertTickerSnapshot
> {
  const snapshots = new Map<string, SeededExpertTickerSnapshot>();

  for (const profile of Object.values(SEEDED_EXPERT_PROFILES)) {
    for (const row of profile.coverage) {
      const ticker = row.ticker.trim().toUpperCase();
      if (!ticker) continue;

      const candidate: SeededExpertTickerSnapshot = {
        ticker,
        company: row.company,
        conviction: buildSeededExpertConviction(row, profile.analyst),
        priceTarget: row.priceTarget,
        upsidePct: row.upsidePct,
        note: row.note ?? row.rationale ?? null,
        sourceName: row.sourceName ?? profile.analyst.name,
        sourceFirm: row.sourceFirm ?? profile.analyst.firm,
        actionTone: row.actionTone,
        position: row.position,
      };
      const candidateCoverage: CoverageRow = {
        ticker: candidate.ticker,
        company: candidate.company,
        position: candidate.position,
        priceTarget: candidate.priceTarget,
        currentPrice: null,
        upsidePct: candidate.upsidePct,
        actionDate: null,
        actionLabel: "",
        actionTone: candidate.actionTone,
        spark: [],
        sourceType: "analyst",
        sourceName: candidate.sourceName ?? undefined,
        sourceFirm: candidate.sourceFirm ?? undefined,
      };

      const existing = snapshots.get(ticker);

      if (!existing) {
        snapshots.set(ticker, candidate);
        continue;
      }

      const existingCoverage: CoverageRow = {
        ticker: existing.ticker,
        company: existing.company,
        position: existing.position,
        priceTarget: existing.priceTarget,
        currentPrice: null,
        upsidePct: existing.upsidePct,
        actionDate: null,
        actionLabel: "",
        actionTone: existing.actionTone,
        spark: [],
        sourceType: "analyst",
        sourceName: existing.sourceName ?? undefined,
        sourceFirm: existing.sourceFirm ?? undefined,
      };

      if (compareCoveragePriority(candidateCoverage, existingCoverage) < 0) {
        continue;
      }

      snapshots.set(ticker, candidate);
    }
  }

  return Object.fromEntries(snapshots.entries());
}
