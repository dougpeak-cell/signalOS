export type FeaturedPulseDataState =
  | "live"
  | "completed-session"
  | "market-closed"
  | "delayed";

export type FeaturedPulseMeta = {
  dataState: FeaturedPulseDataState;
  generatedAt: string;
  marketDataAsOf: string | null;
  amsaCalculatedAt: string | null;
  persistedSnapshotAt: string | null;
  candidateUniverseCount: number;
  rankedUniverseCount: number;
  qualifiedCandidateCount: number;
  rankedCandidateSymbols: string[];
  newCalculationOccurred: boolean;
  singleCandidateUniverse: boolean;
};

export function isUsMarketOpen(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = values.weekday;

  if (weekday === "Sat" || weekday === "Sun") return false;

  const minutes = Number(values.hour) * 60 + Number(values.minute);
  return minutes >= 8 * 60 + 30 && minutes < 15 * 60;
}

export function getLatestEligibleMarketSessionDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const minutes = Number(values.hour) * 60 + Number(values.minute);
  const beforeCurrentSession =
    values.weekday === "Sat" ||
    values.weekday === "Sun" ||
    minutes < 8 * 60 + 30;
  const date = new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
  ));

  if (beforeCurrentSession) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  return date.toISOString().slice(0, 10);
}

type FeaturedPulseMetaInput = Omit<
  FeaturedPulseMeta,
  "dataState" | "singleCandidateUniverse"
> & {
  marketDataSource?: "intraday" | "completed-session" | "fallback" | null;
  marketOpen?: boolean | null;
};

const INTRADAY_DELAYED_AFTER_MS = 20 * 60 * 1000;
const COMPLETED_SESSION_DELAYED_AFTER_MS = 96 * 60 * 60 * 1000;

export function getFeaturedPulseDataState({
  marketDataAsOf,
  marketDataSource,
  marketOpen,
}: Pick<
  FeaturedPulseMetaInput,
  "marketDataAsOf" | "marketDataSource" | "marketOpen"
>): FeaturedPulseDataState {
  const marketDataTimestamp = marketDataAsOf
    ? Date.parse(marketDataAsOf)
    : Number.NaN;
  const freshnessThreshold =
    marketDataSource === "intraday"
      ? INTRADAY_DELAYED_AFTER_MS
      : COMPLETED_SESSION_DELAYED_AFTER_MS;
  const isDelayed =
    !Number.isFinite(marketDataTimestamp) ||
    Date.now() - marketDataTimestamp > freshnessThreshold;

  if (isDelayed || marketDataSource === "fallback") return "delayed";
  if (marketOpen === false) return "market-closed";
  if (marketDataSource === "intraday") return "live";
  return "completed-session";
}

export function buildFeaturedPulseMeta(
  input: FeaturedPulseMetaInput,
): FeaturedPulseMeta {
  return {
    dataState: getFeaturedPulseDataState(input),
    generatedAt: input.generatedAt,
    marketDataAsOf: input.marketDataAsOf,
    amsaCalculatedAt: input.amsaCalculatedAt,
    persistedSnapshotAt: input.persistedSnapshotAt,
    candidateUniverseCount: input.candidateUniverseCount,
    rankedUniverseCount: input.rankedUniverseCount,
    qualifiedCandidateCount: input.qualifiedCandidateCount,
    rankedCandidateSymbols: input.rankedCandidateSymbols,
    newCalculationOccurred: input.newCalculationOccurred,
    singleCandidateUniverse: input.qualifiedCandidateCount === 1,
  };
}

export function getFeaturedPulseFingerprint(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function getFeaturedPulseRefreshMessage(
  previousFingerprint: string | null,
  nextFingerprint: string,
): string | null {
  if (!previousFingerprint) return null;

  return previousFingerprint === nextFingerprint
    ? "Checked just now · No verified Pulse change"
    : "Verified Pulse updated";
}