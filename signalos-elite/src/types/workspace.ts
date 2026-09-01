export type WorkspaceDirection =
  | "Rising"
  | "Stable"
  | "Falling"
  | "Improving"
  | "Deteriorating"
  | "Unknown";

export type WorkspacePriceStatus =
  | "live"
  | "delayed"
  | "last-close"
  | "unavailable";

export type WorkspaceStock = {
  symbol: string;
  name: string;
  description: string | null;
  sector: string | null;
  industry: string | null;
  price: number | null;
  changePercent: number | null;
  priceAsOf: string | null;
  priceProvider: string | null;
  priceStatus: WorkspacePriceStatus;

  pulse: number | null;
  rawPulse: number | null;
  pulseLabel: string;
  direction: WorkspaceDirection;
  pulseAsOf: string | null;
  pulseSessionDate: string | null;
  pulseReadingType: "live" | "verified_daily" | null;

  confidence: number | null;
  dna: number | null;
  opportunity: number | null;
  risk: number | null;

  trend: number | null;
  momentum: number | null;
  marketStructure: number | null;
  sectorAlignment: number | null;
  riskControl: number | null;

  supportingEvidence: string[];
  riskEvidence: string[];

  updatedAt: string | null;
};

export type WorkspaceFutureMap = {
  symbol: string;
  primaryScenario: "bull" | "base" | "bear" | null;

  bullProbability: number | null;
  baseProbability: number | null;
  bearProbability: number | null;

  referencePrice: number | null;
  scenarioAsOf: string | null;
  livePrice: number | null;
  livePriceAsOf: string | null;
  livePriceProvider: string | null;
  targetOne: number | null;
  targetTwo: number | null;
  invalidation: number | null;

  entryLow: number | null;
  entryHigh: number | null;

  expectedMove: number | null;
  stopDistance: number | null;
  rewardRisk: string | null;

  scenarioQuality: number | null;
  scenarioLabel: string;
  confidence: number | null;
  expectedValue: number | null;
  grade: string | null;
  riskLabel: string | null;
  scenarioConditions: string[];
  changeConditions: string[];
  riskNotes: string[];
};

export type WorkspaceWatchlistItem = {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  priceAsOf: string | null;
  priceProvider: string | null;
  priceStatus: WorkspacePriceStatus;
  pulse: number | null;
  direction: WorkspaceDirection;
};

export type WorkspaceMarketItem = {
  symbol: string;
  label: string;
  price: number | null;
  changePercent: number | null;
};

export type WorkspacePulseRadarItem = {
  symbol: string;
  value: number;
};

export type WorkspacePulseRadar = {
  highest: WorkspacePulseRadarItem[];
  improved: WorkspacePulseRadarItem[];
  warnings: WorkspacePulseRadarItem[];
  asOf: string | null;
};

export type WorkspacePayload = {
  stock: WorkspaceStock;
  futureMap: WorkspaceFutureMap | null;
  watchlist: WorkspaceWatchlistItem[];
  market: WorkspaceMarketItem[];
  radar: WorkspacePulseRadar;
};