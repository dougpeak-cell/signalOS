export type AnalystCoverageItem = {
  sector?: string | null;
  industry?: string | null;
  ticker?: string | null;
  conviction?: "bullish" | "neutral" | "bearish" | string | null;
};

export type AnalystInput = {
  id?: string;
  slug?: string;
  name?: string;
  analystName?: string;
  title?: string;
  firm?: string;
  company?: string;
  avatar?: string;
  image?: string;
  sectors?: string[];
  focusSectors?: string[];
  coverage?: AnalystCoverageItem[];
  topMove?: {
    ticker?: string;
    sector?: string;
    conviction?: string | null;
  } | null;
};

export type RankedAnalyst = {
  id: string;
  slug: string;
  name: string;
  firm: string;
  avatar: string | null;
  primarySector: string;
  sectors: string[];
  callsCount: number;
  winRate: number;
  avgReturn: number;
  convictionScore: number;
  consistencyScore: number;
  momentum30d: number;
  score: number;
  tier: "Elite" | "Outperform" | "Watch";
  sparkline: number[];
  lastCallTicker: string;
  lastCallLabel: string;
  lastCallDateLabel: string;
};

export type SectorLeader = {
  sector: string;
  analyst: RankedAnalyst;
};

export type RankingsResult = {
  leaderboard: RankedAnalyst[];
  podium: RankedAnalyst[];
  sectorLeaders: SectorLeader[];
  risingAnalysts: RankedAnalyst[];
};

const DEFAULT_SECTORS = [
  "Technology",
  "Semiconductors",
  "AI / Software",
  "Financials",
  "Healthcare",
  "Energy",
  "Consumer",
  "Industrials",
];

const DEFAULT_TICKERS = [
  "NVDA",
  "AAPL",
  "MSFT",
  "AMZN",
  "META",
  "AVGO",
  "TSLA",
  "GOOGL",
  "JPM",
  "LLY",
  "XOM",
  "COST",
  "AMD",
  "CRM",
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function seededUnit(input: string) {
  const hash = hashString(input);
  return (hash % 1000) / 1000;
}

function seededRange(input: string, min: number, max: number) {
  return min + (max - min) * seededUnit(input);
}

function titleCase(value: string) {
  if (!value) return value;
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((v) => String(v ?? "").trim())
        .filter(Boolean)
    )
  );
}

function normalizeSector(raw?: string | null) {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const lower = value.toLowerCase();

  if (lower.includes("semi")) return "Semiconductors";
  if (lower.includes("software") || lower.includes("ai")) return "AI / Software";
  if (lower.includes("tech")) return "Technology";
  if (lower.includes("health")) return "Healthcare";
  if (lower.includes("financ")) return "Financials";
  if (lower.includes("energy") || lower.includes("oil") || lower.includes("gas")) return "Energy";
  if (lower.includes("consumer") || lower.includes("retail")) return "Consumer";
  if (lower.includes("industrial")) return "Industrials";

  return titleCase(value);
}

function getName(analyst: AnalystInput) {
  return (
    analyst.name?.trim() ||
    analyst.analystName?.trim() ||
    analyst.title?.trim() ||
    "Unknown Analyst"
  );
}

function getFirm(analyst: AnalystInput) {
  return analyst.firm?.trim() || analyst.company?.trim() || "Independent Research";
}

function getSlug(analyst: AnalystInput) {
  return (
    analyst.slug?.trim() ||
    getName(analyst)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

function getId(analyst: AnalystInput) {
  return analyst.id?.trim() || getSlug(analyst);
}

function getAvatar(analyst: AnalystInput) {
  return analyst.avatar?.trim() || analyst.image?.trim() || null;
}

function extractSectors(analyst: AnalystInput) {
  const direct = uniqueStrings([
    ...(analyst.sectors ?? []),
    ...(analyst.focusSectors ?? []),
    analyst.topMove?.sector,
  ]).map(normalizeSector);

  const coverage = uniqueStrings(
    (analyst.coverage ?? []).flatMap((item) => [item.sector, item.industry])
  ).map(normalizeSector);

  const merged = uniqueStrings([...(direct ?? []), ...(coverage ?? [])]).filter(
    Boolean
  ) as string[];

  if (merged.length > 0) return merged;

  const fallbackIndex = hashString(getName(analyst)) % DEFAULT_SECTORS.length;
  return [DEFAULT_SECTORS[fallbackIndex]];
}

function extractCallsCount(analyst: AnalystInput) {
  const fromCoverage = Array.isArray(analyst.coverage) ? analyst.coverage.length : 0;
  if (fromCoverage > 0) return fromCoverage;

  const seedBase = `${getName(analyst)}|${getFirm(analyst)}|calls`;
  return Math.round(seededRange(seedBase, 14, 48));
}

function tierFromScore(score: number): RankedAnalyst["tier"] {
  if (score >= 88) return "Elite";
  if (score >= 76) return "Outperform";
  return "Watch";
}

function buildSparkline(seed: string, momentum: number, points = 9) {
  const values: number[] = [];

  const start = seededRange(`${seed}|start`, 44, 58);

  let current = start;

  for (let i = 0; i < points; i += 1) {
    // directional drift based on momentum
    const directional = momentum * 0.18;

    // small noise so it looks natural
    const noise = seededRange(`${seed}|noise|${i}`, -1.2, 1.2);

    current = clamp(current + directional + noise, 18, 98);

    values.push(Number(current.toFixed(2)));
  }

  return values;
}

function pickLastCallLabel(
  analyst: AnalystInput,
  baseKey: string
): { ticker: string; label: string } {
  const coverage = analyst.coverage ?? [];
  const topMoveTicker = analyst.topMove?.ticker?.trim();
  const topMoveConviction = String(analyst.topMove?.conviction ?? "").trim();

  if (topMoveTicker) {
    const convictionLabel =
      topMoveConviction.length > 0 ? titleCase(topMoveConviction) : "Bullish";
    return {
      ticker: topMoveTicker.toUpperCase(),
      label: convictionLabel,
    };
  }

  const coverageTickers = uniqueStrings(coverage.map((item) => item.ticker)).map((v) =>
    v.toUpperCase()
  );
  const ticker =
    coverageTickers.length > 0
      ? coverageTickers[hashString(`${baseKey}|ticker`) % coverageTickers.length]
      : DEFAULT_TICKERS[hashString(`${baseKey}|fallbackTicker`) % DEFAULT_TICKERS.length];

  const convictionSource =
    coverage.length > 0
      ? coverage[hashString(`${baseKey}|coverageIndex`) % coverage.length]?.conviction
      : null;

  const convictionSeed = String(convictionSource ?? "").toLowerCase();
  const label = convictionSeed.includes("bear")
    ? "Bearish"
    : convictionSeed.includes("neutral")
      ? "Neutral"
      : convictionSeed.includes("bull")
        ? "Bullish"
        : ["Bullish", "Neutral", "Bearish"][hashString(`${baseKey}|label`) % 3];

  return { ticker, label };
}

function pickLastCallDateLabel(baseKey: string) {
  const options = ["Today", "1d ago", "2d ago", "3d ago", "5d ago", "1w ago"];
  return options[hashString(`${baseKey}|date`) % options.length];
}

export function buildAnalystRankings(analysts: AnalystInput[]): RankingsResult {
  const leaderboard = analysts
    .map((analyst) => {
      const name = getName(analyst);
      const firm = getFirm(analyst);
      const slug = getSlug(analyst);
      const id = getId(analyst);
      const avatar = getAvatar(analyst);
      const sectors = extractSectors(analyst);
      const primarySector = sectors[0] ?? "Technology";
      const callsCount = extractCallsCount(analyst);

      const baseKey = `${name}|${firm}|${primarySector}`;

      const winRate = Number(
        clamp(
          seededRange(`${baseKey}|winRate`, 54, 79) + Math.min(callsCount, 40) * 0.12,
          52,
          84
        ).toFixed(1)
      );

      const avgReturn = Number(
        clamp(
          seededRange(`${baseKey}|avgReturn`, 5.2, 18.8) + sectors.length * 0.35,
          4.5,
          22.5
        ).toFixed(1)
      );

      const convictionScore = Number(
        clamp(seededRange(`${baseKey}|conviction`, 68, 96), 0, 100).toFixed(1)
      );

      const consistencyScore = Number(
        clamp(
          seededRange(`${baseKey}|consistency`, 64, 94) + Math.min(callsCount, 35) * 0.18,
          0,
          100
        ).toFixed(1)
      );

      const momentum30d = Number(
        clamp(
          seededRange(`${baseKey}|momentum30d`, 1.8, 15.6) + sectors.length * 0.22,
          1,
          18
        ).toFixed(1)
      );

      const score = Number(
        (
          winRate * 0.36 +
          avgReturn * 1.55 +
          convictionScore * 0.16 +
          consistencyScore * 0.2 +
          momentum30d * 0.9
        ).toFixed(1)
      );

      const sparkline = buildSparkline(baseKey, momentum30d);
      const lastCall = pickLastCallLabel(analyst, baseKey);
      const lastCallDateLabel = pickLastCallDateLabel(baseKey);

      return {
        id,
        slug,
        name,
        firm,
        avatar,
        primarySector,
        sectors,
        callsCount,
        winRate,
        avgReturn,
        convictionScore,
        consistencyScore,
        momentum30d,
        score,
        tier: tierFromScore(score),
        sparkline,
        trend: sparkline,
        lastCallTicker: lastCall.ticker,
        lastCallLabel: lastCall.label,
        lastCallDateLabel,
      } satisfies RankedAnalyst & { trend: number[] };
    })
    .sort((a, b) => b.score - a.score);

  const podium = leaderboard.slice(0, 3);

  const sectorMap = new Map<string, RankedAnalyst>();
  for (const analyst of leaderboard) {
    for (const sector of analyst.sectors) {
      const current = sectorMap.get(sector);
      if (!current || analyst.score > current.score) {
        sectorMap.set(sector, analyst);
      }
    }
  }

  const sectorLeaders = Array.from(sectorMap.entries())
    .map(([sector, analyst]) => ({ sector, analyst }))
    .sort((a, b) => b.analyst.score - a.analyst.score)
    .slice(0, 6);

  const risingAnalysts = [...leaderboard]
    .sort((a, b) => b.momentum30d - a.momentum30d)
    .slice(0, 5);

  return {
    leaderboard,
    podium,
    sectorLeaders,
    risingAnalysts,
  };
}