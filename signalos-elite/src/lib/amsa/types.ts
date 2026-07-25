/* =========================================================
   SIGI AMSA(TM)
   Adaptive Market State Algorithm

   Shared engine types.
========================================================= */

export type AMSAStatus =
  | "ready"
  | "partial"
  | "insufficient-data"
  | "invalid-data";

export type AMSADirection =
  | "strongly-rising"
  | "rising"
  | "stable"
  | "falling"
  | "strongly-falling"
  | "unavailable";

export type AMSAState =
  | "Elite"
  | "Strong"
  | "Constructive"
  | "Balanced"
  | "Weak"
  | "Critical"
  | "Unavailable";

export type HistoricalBar = {
  /**
   * Unix timestamp, JavaScript timestamp, or ISO date string.
   */
  time: string | number;

  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type AMSAMetricValue = string | number | boolean | null;

export type AMSAMetrics = Record<string, AMSAMetricValue>;

export type AMSAComponentName =
  | "movingAverage"
  | "trend"
  | "volume"
  | "range"
  | "risk"
  | "industry"
  | "alignment"
  | "portfolio"
  | "sector"
  | "market";

export type AMSAComponentResult = {
  component: AMSAComponentName;
  label: string;

  /**
   * Higher scores always represent a healthier market state.
   */
  score: number | null;

  status: AMSAStatus;
  direction: AMSADirection;
  confidence: number;

  reasons: string[];
  warnings: string[];
  metrics: AMSAMetrics;
};

export type AMSAContextComponentInput = {
  score?: number | null;
  confidence?: number | null;
  label?: string | null;
  reasons?: string[];
  warnings?: string[];
  metrics?: AMSAMetrics;
};

export type AMSAContextInput = {
  /**
   * Optional external Sector Pulse from 0-100.
   */
  sectorScore?: number | null;

  /**
   * Optional external Market Pulse from 0-100.
   */
  marketScore?: number | null;

  industryScore?: number | null;
  alignmentScore?: number | null;
  portfolioScore?: number | null;

  sectorConfidence?: number | null;
  marketConfidence?: number | null;
  industryConfidence?: number | null;
  alignmentConfidence?: number | null;
  portfolioConfidence?: number | null;

  sectorName?: string | null;
  industryName?: string | null;
  portfolioName?: string | null;

  market?: AMSAContextComponentInput;
  sector?: AMSAContextComponentInput;
  industry?: AMSAContextComponentInput;
  alignment?: AMSAContextComponentInput;
  portfolio?: AMSAContextComponentInput;
};

export type AMSAEngineOptions = {
  symbol?: string;
  context?: AMSAContextInput;

  /**
   * Override default component weights.
   * Values do not need to total 1.
   */
  weights?: Partial<Record<AMSAComponentName, number>>;
};

export type AMSAWeightBreakdown = {
  component: AMSAComponentName;
  requestedWeight: number;
  effectiveWeight: number;
  score: number;
  contribution: number;
};

export type AMSAStockPulse = {
  symbol: string | null;

  score: number | null;
  state: AMSAState;
  direction: AMSADirection;
  confidence: number;
  status: AMSAStatus;

  currentPrice: number | null;
  barCount: number;

  components: AMSAComponentResult[];
  weights: AMSAWeightBreakdown[];

  reasons: string[];
  warnings: string[];

  /**
   * Conditions that would weaken the current reading.
   */
  invalidationConditions: string[];

  updatedAt?: string | null;
  calculatedAt: string;
  recordedAt?: string | null;
};

/* =========================================================
   PHASE 2 — CONTEXT INTELLIGENCE TYPES
========================================================= */

export type AMSAMarketRegime =
  | "Strong Risk-On"
  | "Risk-On"
  | "Balanced"
  | "Risk-Off"
  | "Strong Risk-Off"
  | "Unavailable";

export type AMSALeadershipState =
  | "Leading"
  | "Improving"
  | "Neutral"
  | "Weakening"
  | "Lagging"
  | "Unavailable";

export type AMSAAlignmentState =
  | "Strongly Aligned"
  | "Aligned"
  | "Mixed"
  | "Conflicted"
  | "Strongly Conflicted"
  | "Unavailable";

export type AMSAMarketIndexInput = {
  symbol: string;
  name?: string;
  bars: HistoricalBar[];
  weight?: number;
};

export type AMSABreadthInput = {
  advancingIssues?: number | null;
  decliningIssues?: number | null;

  advancingVolume?: number | null;
  decliningVolume?: number | null;

  newHighs?: number | null;
  newLows?: number | null;

  percentAbove20Day?: number | null;
  percentAbove50Day?: number | null;
  percentAbove200Day?: number | null;

  upFourPercent?: number | null;
  downFourPercent?: number | null;
};

export type AMSAVolatilityInput = {
  vixValue?: number | null;
  vixPreviousClose?: number | null;
  vix20DayAverage?: number | null;

  marketAtrPercent?: number | null;
  averageGapPercent?: number | null;
};

export type AMSAMacroInput = {
  tenYearYield?: number | null;
  tenYearYieldChange?: number | null;

  dollarIndexChange?: number | null;
  oilChange?: number | null;

  creditSpreadScore?: number | null;
  economicRiskScore?: number | null;
};

export type AMSAMarketPulseInput = {
  indices: AMSAMarketIndexInput[];

  breadth?: AMSABreadthInput | null;
  volatility?: AMSAVolatilityInput | null;
  macro?: AMSAMacroInput | null;

  previousPulse?: number | null;
};

export type AMSABreadthResult = {
  score: number | null;
  confidence: number;
  direction: AMSADirection;
  status: AMSAStatus;

  advanceDeclineRatio: number | null;
  upDownVolumeRatio: number | null;
  highLowRatio: number | null;

  reasons: string[];
  warnings: string[];
  metrics: AMSAMetrics;
};

export type AMSAMarketPulse = {
  score: number | null;
  previousScore: number | null;
  change: number | null;

  state: AMSAState;
  regime: AMSAMarketRegime;
  direction: AMSADirection;
  confidence: number;
  status: AMSAStatus;

  indexScore: number | null;
  breadthScore: number | null;
  volatilityScore: number | null;
  macroScore: number | null;

  components: AMSAComponentResult[];
  reasons: string[];
  warnings: string[];

  calculatedAt: string;
};

export type AMSASectorInput = {
  sector: string;
  symbol: string;

  bars: HistoricalBar[];

  benchmarkBars?: HistoricalBar[];
  marketPulse?: number | null;

  previousPulse?: number | null;
  previousRank?: number | null;
};

export type AMSASectorPulse = {
  sector: string;
  symbol: string;

  score: number | null;
  previousScore: number | null;
  change: number | null;

  state: AMSAState;
  direction: AMSADirection;
  leadership: AMSALeadershipState;
  confidence: number;
  status: AMSAStatus;

  relativeStrengthScore: number | null;
  stockPulseScore: number | null;
  marketAlignmentScore: number | null;

  rank: number | null;
  previousRank: number | null;
  rankChange: number | null;

  components: AMSAComponentResult[];
  reasons: string[];
  warnings: string[];

  calculatedAt: string;
};

export type AMSAIndustryInput = {
  industry: string;
  sector: string;

  constituentPulses: {
    symbol: string;
    pulse: number | null;
    weight?: number;
    changePercent?: number | null;
  }[];

  sectorPulse?: number | null;
  marketPulse?: number | null;

  previousPulse?: number | null;
};

export type AMSAIndustryPulse = {
  industry: string;
  sector: string;

  score: number | null;
  previousScore: number | null;
  change: number | null;

  state: AMSAState;
  direction: AMSADirection;
  leadership: AMSALeadershipState;
  confidence: number;
  status: AMSAStatus;

  participationScore: number | null;
  constituentScore: number | null;
  environmentScore: number | null;

  reasons: string[];
  warnings: string[];

  calculatedAt: string;
};

export type AMSAAlignmentInput = {
  stockPulse?: number | null;
  industryPulse?: number | null;
  sectorPulse?: number | null;
  marketPulse?: number | null;

  stockDirection?: AMSADirection | null;
  industryDirection?: AMSADirection | null;
  sectorDirection?: AMSADirection | null;
  marketDirection?: AMSADirection | null;
};

export type AMSAAlignmentResult = {
  score: number | null;
  state: AMSAAlignmentState;
  confidence: number;
  status: AMSAStatus;

  agreementScore: number | null;
  dispersionScore: number | null;
  directionAgreementScore: number | null;

  hierarchy: {
    market: number | null;
    sector: number | null;
    industry: number | null;
    stock: number | null;
  };

  reasons: string[];
  conflicts: string[];
};

export type AMSAPortfolioHoldingInput = {
  symbol: string;

  marketValue: number;
  quantity?: number | null;
  currentPrice?: number | null;

  stockPulse?: number | null;
  sectorPulse?: number | null;
  industryPulse?: number | null;
  marketPulse?: number | null;

  sector?: string | null;
  industry?: string | null;

  dayChangePercent?: number | null;
  riskScore?: number | null;
};

export type AMSASectorExposure = {
  sector: string;
  marketValue: number;
  weight: number;
  pulse: number | null;
  holdingCount: number;
};

export type AMSAPortfolioPulse = {
  score: number | null;
  state: AMSAState;
  direction: AMSADirection;
  confidence: number;
  status: AMSAStatus;

  totalMarketValue: number;
  dayChangePercent: number | null;

  weightedStockPulse: number | null;
  weightedAlignmentScore: number | null;
  diversificationScore: number | null;
  concentrationScore: number | null;
  riskControlScore: number | null;

  largestSector: string | null;
  largestSectorWeight: number | null;

  classifiedValuePercent: number;
  alignedHoldings: number;
  totalHoldings: number;

  sectorExposure: AMSASectorExposure[];

  holdings: {
    symbol: string;
    weight: number;
    pulse: number | null;
    alignment: number | null;
    sector: string | null;
  }[];

  reasons: string[];
  conflicts: string[];
  warnings: string[];

  calculatedAt: string;
};

/* =========================================================
   PHASE 3 — PULSE EVOLUTION TYPES
========================================================= */

export type AMSAPulseEntityType =
  | "market"
  | "sector"
  | "industry"
  | "stock"
  | "portfolio"
  | "crypto";

export type AMSASnapshotFrequency =
  | "intraday"
  | "daily"
  | "manual";

export type AMSAPulseVelocity =
  | "Rapidly Accelerating"
  | "Accelerating"
  | "Improving"
  | "Stable"
  | "Weakening"
  | "Deteriorating"
  | "Rapidly Deteriorating"
  | "Unavailable";

export type AMSAPulseTrend =
  | "Strong Uptrend"
  | "Uptrend"
  | "Sideways"
  | "Downtrend"
  | "Strong Downtrend"
  | "Unavailable";

export type AMSAChangeImportance =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type AMSAPulseSnapshotComponent = {
  key: string;
  label: string;
  score: number | null;
  confidence?: number | null;
  direction?: AMSADirection | null;
};

export type AMSAPulseSnapshot = {
  id?: string;

  entityType: AMSAPulseEntityType;
  entityKey: string;
  entityName?: string | null;

  score: number | null;
  confidence: number | null;

  state?: string | null;
  direction?: AMSADirection | string | null;
  status?: AMSAStatus | string | null;

  components: AMSAPulseSnapshotComponent[];
  reasons: string[];
  warnings: string[];
  metadata: Record<string, unknown>;

  sourceUpdatedAt?: string | null;
  calculatedAt: string;
  recordedAt?: string | null;

  frequency: AMSASnapshotFrequency;
};

export type AMSAComponentChange = {
  key: string;
  label: string;

  currentScore: number | null;
  previousScore: number | null;

  change: number | null;

  importance: AMSAChangeImportance;
  direction: "improved" | "weakened" | "stable" | "unavailable";

  message: string;
};

export type AMSAPulseChangeEvent = {
  id: string;

  entityType: AMSAPulseEntityType;
  entityKey: string;
  entityName?: string | null;

  category:
    | "pulse"
    | "confidence"
    | "component"
    | "state"
    | "direction"
    | "risk"
    | "data";

  importance: AMSAChangeImportance;

  title: string;
  message: string;

  currentValue?: number | string | null;
  previousValue?: number | string | null;
  change?: number | null;

  componentKey?: string | null;

  detectedAt: string;
};

export type AMSAPulseEvolutionPoint = {
  date: string;
  score: number | null;
  confidence: number | null;
  state?: string | null;
  direction?: string | null;
};

export type AMSAPulseEvolution = {
  entityType: AMSAPulseEntityType;
  entityKey: string;
  entityName?: string | null;

  currentScore: number | null;
  previousScore: number | null;

  change: number | null;
  changePercent: number | null;

  velocity: AMSAPulseVelocity;
  trend: AMSAPulseTrend;

  acceleration: number | null;
  averageChange: number | null;

  highScore: number | null;
  lowScore: number | null;
  averageScore: number | null;

  positivePeriods: number;
  negativePeriods: number;
  stablePeriods: number;

  confidence: number;

  componentChanges: AMSAComponentChange[];
  events: AMSAPulseChangeEvent[];

  history: AMSAPulseEvolutionPoint[];

  currentSnapshot: AMSAPulseSnapshot | null;
  previousSnapshot: AMSAPulseSnapshot | null;

  status: AMSAStatus;
  calculatedAt: string;
};

export type AMSAPulseMover = {
  entityType: AMSAPulseEntityType;
  entityKey: string;
  entityName?: string | null;

  score: number | null;
  previousScore: number | null;
  change: number | null;

  velocity: AMSAPulseVelocity;
  state?: string | null;
  direction?: string | null;

  confidence: number | null;

  primaryReason?: string | null;
  updatedAt: string;
};

export type AMSAEvolutionEntityType = AMSAPulseEntityType;

export type AMSAPulseSnapshotMetadata = Record<string, unknown>;

export type AMSAPulseSnapshotWrite = Omit<
  AMSAPulseSnapshot,
  "score" | "confidence" | "components" | "reasons" | "warnings" | "metadata" | "frequency"
> & {
  score?: number | null;
  confidence?: number | null;
  components?: AMSAPulseSnapshotComponent[];
  reasons?: string[];
  warnings?: string[];
  metadata?: AMSAPulseSnapshotMetadata;
  frequency?: AMSASnapshotFrequency;
};

/* =========================================================
   PHASE 4A - FUTUREMAP(TM) TYPES
========================================================= */

export type AMSAFutureScenarioType =
  | "bull"
  | "base"
  | "bear";

export type AMSAFutureMapBias =
  | "Strong Bullish"
  | "Bullish"
  | "Balanced"
  | "Bearish"
  | "Strong Bearish"
  | "Unavailable";

export type AMSAFutureMapGrade =
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C+"
  | "C"
  | "D"
  | "Unavailable";

export type AMSAFutureMapHorizon =
  | "intraday"
  | "swing"
  | "position";

export type AMSAFutureMapRiskLevel =
  | "Low"
  | "Moderate"
  | "Elevated"
  | "High"
  | "Extreme"
  | "Unavailable";

export type AMSAFutureEvidenceCategory =
  | "stock"
  | "trend"
  | "volume"
  | "range"
  | "risk"
  | "evolution"
  | "market"
  | "sector"
  | "industry"
  | "alignment"
  | "volatility"
  | "breadth"
  | "macro"
  | "catalyst";

export type AMSAFutureEvidence = {
  id: string;

  category: AMSAFutureEvidenceCategory;

  label: string;
  message: string;

  score: number | null;

  /**
   * Positive values support the Bull scenario.
   * Negative values support the Bear scenario.
   */
  impact: number;

  /**
   * Reliability of this evidence item from 0-100.
   */
  confidence: number;

  scenario:
    | AMSAFutureScenarioType
    | "neutral";

  importance:
    | "low"
    | "medium"
    | "high"
    | "critical";

  source?: string | null;
};

export type AMSAFutureCatalystInput = {
  id?: string;
  label: string;
  description?: string | null;

  impact:
    | "bullish"
    | "bearish"
    | "neutral";

  confidence?: number | null;

  /**
   * Optional normalized strength from 0-100.
   */
  strength?: number | null;

  date?: string | null;
  source?: string | null;
};

/* =========================================================
   PHASE 4B — EXPECTED MOVE, LEVELS & RISK/REWARD TYPES
========================================================= */

export type AMSAPriceLevelType =
  | "support"
  | "resistance"
  | "invalidation"
  | "target"
  | "range-low"
  | "range-high"
  | "moving-average"
  | "recent-high"
  | "recent-low"
  | "atr"
  | "fallback";

export type AMSAPriceLevelStrength =
  | "weak"
  | "moderate"
  | "strong"
  | "major";

export type AMSAPriceLevel = {
  type: AMSAPriceLevelType;

  label: string;

  price: number;

  distancePercent: number | null;

  strength: AMSAPriceLevelStrength;

  confidence: number;

  source:
    | "explicit"
    | "moving-average"
    | "recent-range"
    | "atr"
    | "calculated"
    | "fallback";

  description: string;
};

export type AMSAExpectedMoveMethod =
  | "atr"
  | "historical-volatility"
  | "blended"
  | "fallback";

export type AMSAExpectedMoveResult = {
  method: AMSAExpectedMoveMethod;

  horizon: AMSAFutureMapHorizon;

  horizonTradingDays: number;

  oneAtrPercent: number | null;

  expectedMovePercent: number;
  expectedMovePrice: number | null;

  normalRangeLow: number | null;
  normalRangeHigh: number | null;

  extendedRangeLow: number | null;
  extendedRangeHigh: number | null;

  bullMovePercent: number;
  baseMoveLowPercent: number;
  baseMoveHighPercent: number;
  bearMovePercent: number;

  volatilityMultiplier: number;
  trendMultiplier: number;
  confidenceMultiplier: number;
  horizonMultiplier: number;

  confidence: number;

  reasons: string[];
  warnings: string[];
};

export type AMSARiskRewardResult = {
  direction: "long" | "short";

  entryPrice: number | null;
  targetPrice: number | null;
  invalidationPrice: number | null;

  rewardPerShare: number | null;
  riskPerShare: number | null;

  rewardPercent: number | null;
  riskPercent: number | null;

  rewardToRisk: number | null;

  breakEvenProbability: number | null;

  scenarioProbability: number;

  probabilityAdjustedReward: number | null;
  probabilityAdjustedRisk: number | null;

  expectedValuePerShare: number | null;
  expectedValuePercent: number | null;

  quality:
    | "Exceptional"
    | "Strong"
    | "Acceptable"
    | "Marginal"
    | "Poor"
    | "Unavailable";

  warnings: string[];
};

export type AMSAScenarioQuality = {
  score: number;

  label:
    | "Elite"
    | "Strong"
    | "Constructive"
    | "Mixed"
    | "Weak"
    | "Unavailable";

  probabilityScore: number;
  confidenceScore: number;
  rewardRiskScore: number;
  alignmentScore: number;
  riskControlScore: number;

  reasons: string[];
  warnings: string[];
};

export type AMSATradePlanDirection =
  | "long"
  | "short"
  | "neutral";

export type AMSATradePlan = {
  symbol: string;

  direction: AMSATradePlanDirection;

  scenario: AMSAFutureScenarioType;

  currentPrice: number | null;

  entryZoneLow: number | null;
  entryZoneHigh: number | null;

  targetOne: number | null;
  targetTwo: number | null;

  invalidationPrice: number | null;
  stopDistancePercent: number | null;

  expectedMovePercent: number | null;

  rewardToRisk: number | null;
  expectedValuePercent: number | null;

  probability: number;
  confidence: number;

  qualityScore: number | null;
  qualityLabel: string;

  riskLevel: AMSAFutureMapRiskLevel;

  conditions: string[];
  warnings: string[];

  positionRiskNotice: string;
};

export type AMSAFutureMapTechnicalInput = {
  atr?: number | null;
  atrPercent?: number | null;

  historicalVolatilityPercent?: number | null;
  impliedVolatilityPercent?: number | null;

  averageDailyRangePercent?: number | null;
  averageGapPercent?: number | null;

  recentHigh?: number | null;
  recentLow?: number | null;

  previousHigh?: number | null;
  previousLow?: number | null;
  previousClose?: number | null;

  movingAverage5?: number | null;
  movingAverage10?: number | null;
  movingAverage20?: number | null;
  movingAverage30?: number | null;
  movingAverage50?: number | null;
  movingAverage100?: number | null;
  movingAverage200?: number | null;

  support?: number | null;
  secondarySupport?: number | null;

  resistance?: number | null;
  secondaryResistance?: number | null;

  anchoredVwap?: number | null;
  sessionVwap?: number | null;
};

export type AMSAFutureMapInput = {
  symbol: string;

  currentPrice?: number | null;

  horizon?: AMSAFutureMapHorizon;

  stockPulse?: number | null;
  stockConfidence?: number | null;
  stockDirection?: AMSADirection | null;

  marketPulse?: number | null;
  marketConfidence?: number | null;
  marketDirection?: AMSADirection | null;

  sectorPulse?: number | null;
  sectorConfidence?: number | null;
  sectorDirection?: AMSADirection | null;

  industryPulse?: number | null;
  industryConfidence?: number | null;
  industryDirection?: AMSADirection | null;

  alignmentScore?: number | null;
  alignmentConfidence?: number | null;

  evolution?: {
    currentScore?: number | null;
    previousScore?: number | null;

    change?: number | null;
    averageChange?: number | null;
    acceleration?: number | null;

    confidence?: number | null;

    velocity?: AMSAPulseVelocity | null;
    trend?: AMSAPulseTrend | null;
  } | null;

  components?: {
    trend?: number | null;
    movingAverage?: number | null;
    volume?: number | null;
    range?: number | null;

    /**
     * Higher means better-controlled risk.
     */
    riskControl?: number | null;

    volatilityControl?: number | null;
    breadth?: number | null;
    macro?: number | null;
  } | null;

  technicals?: AMSAFutureMapTechnicalInput | null;

  catalysts?: AMSAFutureCatalystInput[];

  calculatedAt?: string;
};

export type AMSAFutureScenario = {
  type: AMSAFutureScenarioType;

  label: string;

  probability: number;
  rawProbability: number;

  confidence: number;

  summary: string;

  requirements: string[];
  supportingEvidence: AMSAFutureEvidence[];
  conflictingEvidence: AMSAFutureEvidence[];

  targetPrice: number | null;
  targetChangePercent: number | null;

  expectedLow: number | null;
  expectedHigh: number | null;

  invalidationPrice: number | null;

  timeHorizon: string;

  expectedMove: AMSAExpectedMoveResult | null;

  targetLevels: AMSAPriceLevel[];
  invalidationLevel: AMSAPriceLevel | null;

  riskReward: AMSARiskRewardResult | null;

  quality: AMSAScenarioQuality | null;
};

export type AMSAFutureProbabilityBreakdown = {
  bullRaw: number;
  baseRaw: number;
  bearRaw: number;

  bullNormalized: number;
  baseNormalized: number;
  bearNormalized: number;

  directionalScore: number;
  uncertaintyScore: number;
  conflictScore: number;
};

export type AMSAFutureMap = {
  symbol: string;

  horizon: AMSAFutureMapHorizon;

  currentPrice: number | null;

  bias: AMSAFutureMapBias;
  grade: AMSAFutureMapGrade;
  riskLevel: AMSAFutureMapRiskLevel;

  confidence: number;

  primaryScenario: AMSAFutureScenarioType;

  bullProbability: number;
  baseProbability: number;
  bearProbability: number;

  expectedMove: AMSAExpectedMoveResult | null;

  supportLevels: AMSAPriceLevel[];
  resistanceLevels: AMSAPriceLevel[];

  bull: AMSAFutureScenario;
  base: AMSAFutureScenario;
  bear: AMSAFutureScenario;

  tradePlan: AMSATradePlan | null;

  evidence: AMSAFutureEvidence[];

  supportingFactors: string[];
  riskFactors: string[];
  missingInputs: string[];

  probabilityBreakdown: AMSAFutureProbabilityBreakdown;

  calculatedAt: string;

  /**
   * Clear language for product and compliance UI.
   */
  methodologyNotice: string;
};

/* =========================================================
   PHASE 4C — LIVE FUTUREMAP TYPES
========================================================= */

export type AMSALiveQuote = {
  symbol: string;

  price: number | null;
  previousClose: number | null;

  change: number | null;
  changePercent: number | null;

  open: number | null;
  high: number | null;
  low: number | null;

  volume: number | null;

  bid?: number | null;
  ask?: number | null;

  marketStatus?: string | null;

  timestamp: string | null;

  source: string;
};

export type AMSASymbolClassification = {
  symbol: string;

  companyName: string | null;

  sector: string | null;
  industry: string | null;

  sectorEtf: string | null;

  classificationConfidence: number;

  source:
    | "profile-api"
    | "static-map"
    | "manual"
    | "unavailable";
};

export type AMSALiveFutureMapDiagnostics = {
  symbol: string;

  quoteLoaded: boolean;
  historyLoaded: boolean;

  stockPulseCalculated: boolean;
  marketPulseCalculated: boolean;
  sectorPulseCalculated: boolean;
  industryPulseCalculated: boolean;

  alignmentCalculated: boolean;
  evolutionLoaded: boolean;
  futureMapCalculated: boolean;

  historyBars: number;

  quoteSource: string | null;
  classificationSource: string | null;

  missingData: string[];
  warnings: string[];

  timings: Record<string, number>;

  generatedAt: string;
};

export type AMSALiveFutureMapResult = {
  success: boolean;

  symbol: string;
  horizon: AMSAFutureMapHorizon;

  quote: AMSALiveQuote | null;

  classification: AMSASymbolClassification;

  stock: AMSAStockPulse | null;
  market: AMSAMarketPulse | null;
  sector: AMSASectorPulse | null;
  industry: AMSAIndustryPulse | null;

  alignment: AMSAAlignmentResult | null;
  evolution: AMSAPulseEvolution | null;

  futureMap: AMSAFutureMap | null;

  diagnostics: AMSALiveFutureMapDiagnostics;

  calculatedAt: string;
};
