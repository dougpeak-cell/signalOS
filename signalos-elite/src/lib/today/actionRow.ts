import { getMarketSetupUniverse } from "@/lib/market/movers";
import { fetchLatestSignalRows } from "@/lib/queries/signals";
import { signalToneFromRow } from "@/lib/signalUtils";

type SignalRows = Awaited<ReturnType<typeof fetchLatestSignalRows>>;
type SetupUniverseRows = Awaited<ReturnType<typeof getMarketSetupUniverse>>;

type SectorSummary = {
  sector: string;
  averageChange: number;
};

export type TodayActionRowMetrics = {
  breadthText: string;
  leadershipText: string;
  actionableText: string;
  bullishSignals: number;
  bearishSignals: number;
  totalSignals: number;
  leaders: string[];
  laggards: string[];
  sourceRows: {
    signalRows: number;
    setupUniverseRows: number;
  };
};

function formatCount(value: number, label: string) {
  return `${value} ${label}${value === 1 ? "" : "s"}`;
}

function normalizeSector(value?: string | null) {
  return String(value ?? "").trim();
}

function summarizeSectors(
  rows: Array<{ sector?: string | null; changePct?: number | null }>
): { leader: SectorSummary | null; laggard: SectorSummary | null } {
  const buckets = new Map<string, { total: number; count: number }>();

  for (const row of rows) {
    const sector = normalizeSector(row.sector);
    const changePct = row.changePct ?? null;

    if (!sector || changePct == null || !Number.isFinite(changePct)) continue;

    const current = buckets.get(sector) ?? { total: 0, count: 0 };
    current.total += changePct;
    current.count += 1;
    buckets.set(sector, current);
  }

  const ranked = [...buckets.entries()]
    .map(([sector, stats]) => ({
      sector,
      averageChange: stats.count > 0 ? stats.total / stats.count : 0,
    }))
    .sort((left, right) => right.averageChange - left.averageChange);

  return {
    leader: ranked[0] ?? null,
    laggard: ranked.length > 1 ? ranked[ranked.length - 1] : null,
  };
}

function buildBreadthText(bullish: number, bearish: number, neutral: number) {
  const bullishCount = Number(bullish ?? 0);
  const bearishCount = Number(bearish ?? 0);
  const total = bullishCount + bearishCount + Number(neutral ?? 0);

  if (total === 0) {
    return "No confirmed setup edge is currently detected from the active scan.";
  }

  if (bullishCount > bearishCount) {
    return `Bullish setups are leading ${bullishCount}-${bearishCount}, but breadth is still selective.`;
  }

  if (bearishCount > bullishCount) {
    return `Bearish setups are leading ${bearishCount}-${bullishCount}, suggesting caution.`;
  }

  return `Bullish and bearish setups are balanced at ${bullishCount}-${bearishCount}.`;
}

function buildLeadershipText(leader: SectorSummary | null, laggard: SectorSummary | null) {
  if (leader?.sector && laggard?.sector && leader.sector !== laggard.sector) {
    return `${leader.sector} leads while ${laggard.sector} remains softer across the current setup universe.`;
  }

  if (leader?.sector) {
    return `${leader.sector} is providing the clearest leadership, while the rest of the board is more mixed.`;
  }

  return "Leadership is still rotating, so no single sector is clearly dominating the setup board yet.";
}

function buildActionableText(bullish: number, bearish: number, total: number) {
  const signalState =
    total >= 12 ? "elevated" : total >= 6 ? "constructive" : "selective";

  return `${formatCount(bullish, "bullish setup")} are active, ${formatCount(
    bearish,
    "bearish setup"
  )} ${bearish === 1 ? "is" : "are"} actionable, and total signal count remains ${signalState}.`;
}

export function buildTodayActionRowMetrics(
  rows: SignalRows,
  setupUniverse: SetupUniverseRows
): TodayActionRowMetrics {
  const counts = rows.reduce(
    (accumulator, row) => {
      const tone = signalToneFromRow(row, row.price);

      if (tone === "bullish") accumulator.bullish += 1;
      else if (tone === "bearish") accumulator.bearish += 1;
      else accumulator.neutral += 1;

      return accumulator;
    },
    { bullish: 0, bearish: 0, neutral: 0 }
  );

  const { leader, laggard } = summarizeSectors(setupUniverse);
  const total = counts.bullish + counts.bearish + counts.neutral;
  const bullishSignals = Number(counts.bullish ?? 0);
  const bearishSignals = Number(counts.bearish ?? 0);
  const totalSignals = Number(total ?? 0);
  const leaders = leader?.sector ? [leader.sector] : [];
  const laggards = laggard?.sector ? [laggard.sector] : [];
  const sourceRows = {
    signalRows: rows.length,
    setupUniverseRows: setupUniverse.length,
  };

  return {
    breadthText: buildBreadthText(counts.bullish, counts.bearish, counts.neutral),
    leadershipText: buildLeadershipText(leader, laggard),
    actionableText: buildActionableText(counts.bullish, counts.bearish, total),
    bullishSignals,
    bearishSignals,
    totalSignals,
    leaders,
    laggards,
    sourceRows,
  };
}

export async function getTodayActionRowMetrics(): Promise<TodayActionRowMetrics> {
  const [rows, setupUniverse] = await Promise.all([
    fetchLatestSignalRows(40),
    getMarketSetupUniverse(12),
  ]);
  const metrics = buildTodayActionRowMetrics(rows, setupUniverse);

  console.log("What Matters data", {
    bullishSignals: metrics.bullishSignals,
    bearishSignals: metrics.bearishSignals,
    totalSignals: metrics.totalSignals,
    leaders: metrics.leaders,
    laggards: metrics.laggards,
    sourceRows: metrics.sourceRows,
  });

  return metrics;
}