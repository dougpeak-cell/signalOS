import { isMajorIndexMember } from "@/lib/market/indexMembership";

export type SetupBias = "bullish" | "bearish" | "neutral";

export type SetupBucket = "top" | "emerging" | "watch";

export type SetupDiscoveryCandidate = {
  ticker: string;
  name?: string | null;
  sector?: string | null;
  session?: string | null;
  price?: number | null;
  changePercent?: number | null;
  volume?: number | null;
  avgVolume?: number | null;
  rvol?: number | null;
  marketCap?: number | null;
  signal?: string | null;
  conviction?: number | null;
  score?: number | null;
  technicalScore?: number | null;
  hasNews?: boolean;
  hasEarnings?: boolean;
  hasAnalystAction?: boolean;
  hasSectorTailwind?: boolean;
  setupLabel?: string | null;
  reason?: string | null;
  summary?: string | null;
  majorIndexMember?: boolean;
  isSP500?: boolean;
  isNasdaq100?: boolean;
  isDow30?: boolean;
  isRussell2000?: boolean;
  hasValidQuote?: boolean;
  hasRecentHistory?: boolean;
  spreadTooWide?: boolean;
  volumeLooksBroken?: boolean;
  newsIsStale?: boolean;
  isEtf?: boolean;
  isWarrant?: boolean;
  isPreferred?: boolean;
  isRights?: boolean;
  isUnit?: boolean;
  floatShares?: number | null;
};

export type RankedSetupItem = {
  bucket: SetupBucket;
  ticker: string;
  name: string;
  sector: string | null;
  price: number | null;
  changePercent: number | null;
  volume: number | null;
  avgVolume: number | null;
  rvol: number | null;
  marketCap: number | null;
  bias: SetupBias;
  setupBiasLabel: string;
  setupLabel: string | null;
  whyThisSetup: string;
  shortReasonTag: string;
  catalystLabel: string;
  structureLabel: string;
  score: number;
  momentumScore: number;
  liquidityScore: number;
  rvolScore: number;
  catalystScore: number;
  technicalScore: number;
  trendAlignmentScore: number;
  qualityScore: number;
  floatExpansionScore: number;
  hasMajorNews: boolean;
  hasEarnings: boolean;
  hasAnalystAction: boolean;
  hasSectorTailwind: boolean;
  isMajorIndexMember: boolean;
};

type DiscoveryBuckets = {
  top: RankedSetupItem[];
  emerging: RankedSetupItem[];
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeName(value?: string | null): string {
  return String(value ?? "").trim();
}

function normalizeSignalBias(signal?: string | null): SetupBias {
  const normalized = String(signal ?? "").trim().toLowerCase();
  if (normalized.includes("bull")) return "bullish";
  if (normalized.includes("bear")) return "bearish";
  return "neutral";
}

function inferMomentumBias(changePercent?: number | null): SetupBias {
  const move = toNumber(changePercent) ?? 0;
  if (move > 0) return "bullish";
  if (move < 0) return "bearish";
  return "neutral";
}

function containsKeyword(value: string, keywords: string[]): boolean {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function detectEtf(name: string, ticker: string): boolean {
  return containsKeyword(name, [
    " etf",
    " etn",
    " fund",
    " trust",
    " index fund",
    " index trust",
    "exchange traded",
    "ishares",
    "spdr",
    "proshares",
    "direxion",
    "vanguard",
    "invesco",
    "schwab",
    "ark ",
  ]) || ticker.includes("-") || ticker.startsWith("^");
}

function detectWarrant(name: string, ticker: string): boolean {
  return containsKeyword(name, [" warrant", " warrants"]) || /W$|WS$|WT$/.test(ticker);
}

function detectPreferred(name: string, ticker: string): boolean {
  return containsKeyword(name, [" preferred", " preference", " depositary share"]) || /PR[A-Z]?$/.test(ticker);
}

function detectRights(name: string, ticker: string): boolean {
  return containsKeyword(name, [" rights", " rights offering", " subscription rights"]) || /RT$|RGT$/.test(ticker);
}

function detectUnit(name: string, ticker: string): boolean {
  return containsKeyword(name, [" unit", " units"]) || /U$/.test(ticker);
}

function resolveHasValidQuote(row: SetupDiscoveryCandidate): boolean {
  if (typeof row.hasValidQuote === "boolean") return row.hasValidQuote;

  const price = toNumber(row.price);
  return price != null && price > 0;
}

function resolveHasRecentHistory(row: SetupDiscoveryCandidate): boolean {
  if (typeof row.hasRecentHistory === "boolean") return row.hasRecentHistory;

  const changePercent = toNumber(row.changePercent);
  return changePercent != null || resolveHasValidQuote(row);
}

function resolveFlags(row: SetupDiscoveryCandidate) {
  const ticker = normalizeTicker(row.ticker);
  const name = normalizeName(row.name);

  return {
    isEtf: typeof row.isEtf === "boolean" ? row.isEtf : detectEtf(name, ticker),
    isWarrant:
      typeof row.isWarrant === "boolean" ? row.isWarrant : detectWarrant(name, ticker),
    isPreferred:
      typeof row.isPreferred === "boolean" ? row.isPreferred : detectPreferred(name, ticker),
    isRights:
      typeof row.isRights === "boolean" ? row.isRights : detectRights(name, ticker),
    isUnit: typeof row.isUnit === "boolean" ? row.isUnit : detectUnit(name, ticker),
  };
}

export function passesTopSetupFilters(row: SetupDiscoveryCandidate): boolean {
  const flags = resolveFlags(row);

  return (
    isMajorIndexMember(row) &&
    (toNumber(row.price) ?? 0) >= 5 &&
    (toNumber(row.volume) ?? 0) >= 1_000_000 &&
    (toNumber(row.avgVolume) ?? 0) >= 500_000 &&
    (toNumber(row.marketCap) ?? 0) >= 300_000_000 &&
    resolveHasValidQuote(row) &&
    resolveHasRecentHistory(row) &&
    !flags.isEtf &&
    !flags.isWarrant &&
    !flags.isPreferred &&
    !flags.isRights &&
    !flags.isUnit
  );
}

function passesTopFallbackFilters(row: SetupDiscoveryCandidate): boolean {
  const flags = resolveFlags(row);

  return (
    isMajorIndexMember(row) &&
    (toNumber(row.price) ?? 0) >= 2 &&
    (toNumber(row.marketCap) ?? 0) >= 300_000_000 &&
    resolveHasValidQuote(row) &&
    resolveHasRecentHistory(row) &&
    !flags.isEtf &&
    !flags.isWarrant &&
    !flags.isPreferred &&
    !flags.isRights &&
    !flags.isUnit
  );
}

export function passesEmergingFilters(row: SetupDiscoveryCandidate): boolean {
  const flags = resolveFlags(row);

  return (
    !isMajorIndexMember(row) &&
    (toNumber(row.price) ?? 0) >= 1 &&
    (toNumber(row.volume) ?? 0) >= 250_000 &&
    (toNumber(row.avgVolume) ?? 0) >= 100_000 &&
    resolveHasValidQuote(row) &&
    resolveHasRecentHistory(row) &&
    !flags.isEtf &&
    !flags.isWarrant &&
    !flags.isPreferred &&
    !flags.isRights &&
    !flags.isUnit
  );
}

function scoreMomentum(changePercent?: number | null): number {
  const absMove = Math.abs(toNumber(changePercent) ?? 0);
  if (absMove >= 8) return 100;
  if (absMove >= 5) return 85;
  if (absMove >= 3) return 70;
  if (absMove >= 1.5) return 55;
  return 35;
}

function scoreLiquidity(volume?: number | null): number {
  const value = toNumber(volume) ?? 0;
  if (value >= 20_000_000) return 100;
  if (value >= 10_000_000) return 85;
  if (value >= 5_000_000) return 70;
  if (value >= 2_000_000) return 55;
  return 35;
}

function scoreRvol(rvol?: number | null): number {
  const value = toNumber(rvol) ?? 0;
  if (value >= 5) return 100;
  if (value >= 3) return 80;
  if (value >= 2) return 65;
  if (value >= 1.5) return 50;
  return 30;
}

function scoreCatalyst(row: SetupDiscoveryCandidate): number {
  const hasMajorNews = Boolean(row.hasNews);
  const hasEarnings = Boolean(row.hasEarnings);
  const hasAnalystAction = Boolean(row.hasAnalystAction);
  const hasSectorTailwind = Boolean(row.hasSectorTailwind);

  if (hasMajorNews) return 100;
  if (hasEarnings) return 90;
  if (hasAnalystAction) return 75;
  if (hasSectorTailwind) return 60;
  return 35;
}

function scoreTechnical(row: SetupDiscoveryCandidate): number {
  const value = toNumber(row.technicalScore) ?? toNumber(row.score) ?? toNumber(row.conviction) ?? 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreTrendAlignment(row: SetupDiscoveryCandidate): number {
  const trendBias = normalizeSignalBias(row.signal);
  const momentumBias = inferMomentumBias(row.changePercent);

  if (trendBias === "bullish" && momentumBias === "bullish") return 100;
  if (trendBias === "bearish" && momentumBias === "bearish") return 100;
  if (momentumBias !== "neutral") return 65;
  return 35;
}

function scoreQuality(marketCap?: number | null): number {
  const value = toNumber(marketCap) ?? 0;
  if (value >= 50_000_000_000) return 100;
  if (value >= 10_000_000_000) return 80;
  if (value >= 2_000_000_000) return 60;
  return 40;
}

function scoreFloatExpansion(row: SetupDiscoveryCandidate): number {
  const floatShares = toNumber(row.floatShares);
  const volume = toNumber(row.volume) ?? 0;
  const rvol = toNumber(row.rvol) ?? 0;
  const highVolume = volume >= 2_000_000;

  if (floatShares == null) return 40;
  if (floatShares <= 50_000_000 && highVolume) return 100;
  if (floatShares <= 150_000_000 && rvol >= 2) return 75;
  return 40;
}

function applyBasePenalties(row: SetupDiscoveryCandidate, score: number): number {
  const flags = resolveFlags(row);
  let next = score;

  if ((toNumber(row.price) ?? 0) <= 0) next -= 100;
  if (!resolveHasValidQuote(row)) next -= 100;
  if (!resolveHasRecentHistory(row)) next -= 60;
  if (flags.isEtf || flags.isWarrant || flags.isRights || flags.isUnit || flags.isPreferred) next -= 100;
  if (row.spreadTooWide) next -= 25;
  if (row.volumeLooksBroken) next -= 25;
  if (row.newsIsStale) next -= 10;

  return next;
}

function applyTopPenalties(row: SetupDiscoveryCandidate, score: number): number {
  let next = applyBasePenalties(row, score);
  const absMove = Math.abs(toNumber(row.changePercent) ?? 0);
  const majorCatalyst = Boolean(row.hasNews || row.hasEarnings || row.hasAnalystAction);

  if ((toNumber(row.price) ?? 0) < 5) next -= 100;
  if ((toNumber(row.marketCap) ?? 0) < 300_000_000) next -= 30;
  if (absMove > 35 && !majorCatalyst) next -= 20;

  return next;
}

function applyEmergingPenalties(row: SetupDiscoveryCandidate, score: number): number {
  let next = applyBasePenalties(row, score);

  if ((toNumber(row.price) ?? 0) < 1) next -= 100;
  if ((toNumber(row.volume) ?? 0) < 250_000) next -= 40;
  if ((toNumber(row.rvol) ?? 0) < 1.2) next -= 20;

  return next;
}

function applyWatchPenalties(row: SetupDiscoveryCandidate, score: number): number {
  let next = applyBasePenalties(row, score);
  const absMove = Math.abs(toNumber(row.changePercent) ?? 0);
  const rvol = toNumber(row.rvol) ?? 0;
  const hasCatalyst = Boolean(
    row.hasNews || row.hasEarnings || row.hasAnalystAction || row.hasSectorTailwind
  );

  if ((toNumber(row.price) ?? 0) < 2) next -= 35;
  if ((toNumber(row.volume) ?? 0) < 300_000) next -= 30;
  if (rvol < 1.05 && !hasCatalyst) next -= 20;

  if (absMove >= 60) next -= hasCatalyst ? 55 : 80;
  else if (absMove >= 35) next -= hasCatalyst ? 35 : 55;
  else if (absMove >= 20) next -= hasCatalyst ? 18 : 30;
  else if (absMove >= 12) next -= 10;

  return next;
}

function scoreTopSetup(row: SetupDiscoveryCandidate) {
  const momentumScore = scoreMomentum(row.changePercent);
  const liquidityScore = scoreLiquidity(row.volume);
  const rvolScore = scoreRvol(row.rvol);
  const catalystScore = scoreCatalyst(row);
  const technicalScore = scoreTechnical(row);
  const trendAlignmentScore = scoreTrendAlignment(row);
  const qualityScore = scoreQuality(row.marketCap);

  const rawScore =
    momentumScore * 0.24 +
    liquidityScore * 0.18 +
    rvolScore * 0.16 +
    catalystScore * 0.14 +
    technicalScore * 0.14 +
    trendAlignmentScore * 0.1 +
    qualityScore * 0.04;

  return {
    score: applyTopPenalties(row, rawScore),
    momentumScore,
    liquidityScore,
    rvolScore,
    catalystScore,
    technicalScore,
    trendAlignmentScore,
    qualityScore,
    floatExpansionScore: 0,
  };
}

function scoreEmergingSetup(row: SetupDiscoveryCandidate) {
  const momentumScore = scoreMomentum(row.changePercent);
  const liquidityScore = scoreLiquidity(row.volume);
  const rvolScore = scoreRvol(row.rvol);
  const catalystScore = scoreCatalyst(row);
  const technicalScore = scoreTechnical(row);
  const floatExpansionScore = scoreFloatExpansion(row);
  const hasFloatData = toNumber(row.floatShares) != null;

  const rawScore = hasFloatData
    ? rvolScore * 0.28 +
      momentumScore * 0.24 +
      catalystScore * 0.18 +
      technicalScore * 0.14 +
      liquidityScore * 0.1 +
      floatExpansionScore * 0.06
    : rvolScore * 0.31 +
      momentumScore * 0.27 +
      catalystScore * 0.18 +
      technicalScore * 0.14 +
      liquidityScore * 0.1;

  return {
    score: applyEmergingPenalties(row, rawScore),
    momentumScore,
    liquidityScore,
    rvolScore,
    catalystScore,
    technicalScore,
    trendAlignmentScore: scoreTrendAlignment(row),
    qualityScore: scoreQuality(row.marketCap),
    floatExpansionScore,
  };
}

function scoreWatchSetup(row: SetupDiscoveryCandidate) {
  const momentumScore = scoreMomentum(row.changePercent);
  const liquidityScore = scoreLiquidity(row.volume);
  const rvolScore = scoreRvol(row.rvol);
  const catalystScore = scoreCatalyst(row);
  const technicalScore = scoreTechnical(row);
  const trendAlignmentScore = scoreTrendAlignment(row);
  const qualityScore = scoreQuality(row.marketCap);

  const rawScore =
    technicalScore * 0.28 +
    catalystScore * 0.22 +
    trendAlignmentScore * 0.18 +
    rvolScore * 0.14 +
    liquidityScore * 0.1 +
    momentumScore * 0.04 +
    qualityScore * 0.04;

  return {
    score: applyWatchPenalties(row, rawScore),
    momentumScore,
    liquidityScore,
    rvolScore,
    catalystScore,
    technicalScore,
    trendAlignmentScore,
    qualityScore,
    floatExpansionScore: scoreFloatExpansion(row),
  };
}

function buildCatalystLabel(row: SetupDiscoveryCandidate): string {
  if (row.hasNews) return "News catalyst";
  if (row.hasEarnings) return "Earnings catalyst";
  if (row.hasAnalystAction) return "Analyst action";
  if (row.hasSectorTailwind) return `${row.sector ?? "Sector"} tailwind`;
  return "Flow setup";
}

function buildStructureLabel(row: SetupDiscoveryCandidate, bias: SetupBias): string {
  const setupLabel = String(row.setupLabel ?? "").trim();
  if (setupLabel) return setupLabel;
  if (bias === "bullish") return "Breakout structure";
  if (bias === "bearish") return "Reversal watch";
  return "Developing structure";
}

function buildWhyThisSetupLine(row: SetupDiscoveryCandidate, bias: SetupBias): string {
  const parts: string[] = [];
  const rvol = toNumber(row.rvol);
  const changePercent = toNumber(row.changePercent);
  const catalystLabel = buildCatalystLabel(row);
  const structureLabel = buildStructureLabel(row, bias);

  if (rvol != null && rvol > 0) {
    parts.push(`RVOL ${rvol.toFixed(1)}x`);
  }

  if (changePercent != null) {
    parts.push(`${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}% move`);
  }

  if (row.hasNews || row.hasEarnings || row.hasAnalystAction || row.hasSectorTailwind) {
    parts.push(catalystLabel);
  } else {
    parts.push(structureLabel);
  }

  return parts.join(" • ");
}

function buildTopReasonTag(row: SetupDiscoveryCandidate): string {
  const rvol = toNumber(row.rvol) ?? 0;
  const changePercent = Math.abs(toNumber(row.changePercent) ?? 0);

  if (row.hasEarnings) return "Earnings Catalyst";
  if (row.hasNews && changePercent >= 2) return "News + Momentum";
  if (rvol >= 2 && changePercent >= 2) return "Flow + Momentum";
  if (rvol >= 2) return "Heavy Relative Volume";
  if (changePercent >= 2) return "Momentum Move";
  return "Clean Structure";
}

function buildEmergingReasonTag(row: SetupDiscoveryCandidate, bias: SetupBias): string {
  const changePercent = toNumber(row.changePercent) ?? 0;
  const rvol = toNumber(row.rvol) ?? 0;
  const structureLabel = buildStructureLabel(row, bias).toLowerCase();

  if (row.hasEarnings) return "Earnings move";
  if (rvol >= 3 && Math.abs(changePercent) >= 3) return "Small-cap momentum";
  if (structureLabel.includes("breakout")) return "Breakout attempt";
  if (bias === "bearish") return "Reversal watch";
  return "Flow setup";
}

function buildWatchReasonTag(row: SetupDiscoveryCandidate, bias: SetupBias): string {
  const changePercent = Math.abs(toNumber(row.changePercent) ?? 0);
  const rvol = toNumber(row.rvol) ?? 0;

  if (row.hasEarnings) return "Post-earnings watch";
  if (row.hasNews || row.hasAnalystAction) return "Catalyst watch";
  if (rvol >= 2 && changePercent < 12) return "Volume watch";
  if (bias === "bearish") return "Controlled pullback";
  return "Structure watch";
}

function toRankedItem(
  row: SetupDiscoveryCandidate,
  bucket: SetupBucket,
  scoreCard:
    | ReturnType<typeof scoreTopSetup>
    | ReturnType<typeof scoreEmergingSetup>
    | ReturnType<typeof scoreWatchSetup>
): RankedSetupItem {
  const bias = normalizeSignalBias(row.signal);
  const setupBiasLabel =
    bias === "bullish" ? "Bullish" : bias === "bearish" ? "Bearish" : "Neutral";

  return {
    bucket,
    ticker: normalizeTicker(row.ticker),
    name: normalizeName(row.name) || normalizeTicker(row.ticker),
    sector: row.sector ?? null,
    price: toNumber(row.price),
    changePercent: toNumber(row.changePercent),
    volume: toNumber(row.volume),
    avgVolume: toNumber(row.avgVolume),
    rvol: toNumber(row.rvol),
    marketCap: toNumber(row.marketCap),
    bias,
    setupBiasLabel,
    setupLabel: row.setupLabel ?? null,
    whyThisSetup: buildWhyThisSetupLine(row, bias),
    shortReasonTag:
      bucket === "top"
        ? buildTopReasonTag(row)
        : bucket === "emerging"
          ? buildEmergingReasonTag(row, bias)
          : buildWatchReasonTag(row, bias),
    catalystLabel: buildCatalystLabel(row),
    structureLabel: buildStructureLabel(row, bias),
    score: Number(scoreCard.score.toFixed(2)),
    momentumScore: scoreCard.momentumScore,
    liquidityScore: scoreCard.liquidityScore,
    rvolScore: scoreCard.rvolScore,
    catalystScore: scoreCard.catalystScore,
    technicalScore: scoreCard.technicalScore,
    trendAlignmentScore: scoreCard.trendAlignmentScore,
    qualityScore: scoreCard.qualityScore,
    floatExpansionScore: scoreCard.floatExpansionScore,
    hasMajorNews: Boolean(row.hasNews),
    hasEarnings: Boolean(row.hasEarnings),
    hasAnalystAction: Boolean(row.hasAnalystAction),
    hasSectorTailwind: Boolean(row.hasSectorTailwind),
    isMajorIndexMember: isMajorIndexMember(row),
  };
}

function dedupeRankedItems(items: RankedSetupItem[]): RankedSetupItem[] {
  const seen = new Set<string>();
  const deduped: RankedSetupItem[] = [];

  for (const item of items) {
    if (seen.has(item.ticker)) continue;
    seen.add(item.ticker);
    deduped.push(item);
  }

  return deduped;
}

export function discoverSetupBuckets(
  candidates: SetupDiscoveryCandidate[]
): DiscoveryBuckets {
  const topCandidates = candidates.filter(passesTopSetupFilters);
  const top =
    topCandidates.length > 0
      ? rankSetupCandidates(topCandidates, "top")
      : rankSetupCandidates(candidates.filter(passesTopFallbackFilters), "top");

  const emerging = rankSetupCandidates(
    candidates.filter(passesEmergingFilters),
    "emerging"
  );

  return {
    top,
    emerging,
  };
}

export function rankSetupCandidates(
  candidates: SetupDiscoveryCandidate[],
  bucket: SetupBucket
): RankedSetupItem[] {
  return dedupeRankedItems(
    candidates
      .map((candidate) =>
        bucket === "top"
          ? toRankedItem(candidate, "top", scoreTopSetup(candidate))
          : bucket === "emerging"
            ? toRankedItem(candidate, "emerging", scoreEmergingSetup(candidate))
            : toRankedItem(candidate, "watch", scoreWatchSetup(candidate))
      )
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
  );
}