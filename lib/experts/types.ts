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

export type UpstreamExpertCoverageItem = {
  ticker?: string | null;
  company?: string | null;
  rating?: string | null;
  priceTarget?: number | string | null;
  currentPrice?: number | string | null;
  actionDate?: string | null;
  note?: string | null;
  rationale?: string | null;
  spark?: number[] | null;
  sourceType?: string | null;
  sourceName?: string | null;
  sourceFirm?: string | null;
};

export type UpstreamExpertProfileResponse = {
  analyst?: {
    slug?: string | null;
    name?: string | null;
    firm?: string | null;
    rank?: number | null;
    stars?: number | null;
    successRate?: number | null;
    averageReturn?: number | null;
    sectors?: string[] | null;
    regions?: string[] | null;
  } | null;
  coverage?: UpstreamExpertCoverageItem[] | null;
  updatedAt?: string | null;
};
