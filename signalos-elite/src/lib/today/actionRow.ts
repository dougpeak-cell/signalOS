import { getMarketSetupUniverse } from "@/lib/market/movers";
import { fetchLatestSignalRows } from "@/lib/queries/signals";
import { signalToneFromRow } from "@/lib/signalUtils";
import { getCurrentMarketPhase } from "@/lib/today/marketPhase";

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

function normalizeConviction(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null;
  return value <= 1 ? value * 100 : value;
}

function formatPhaseLabel() {
  const phase = getCurrentMarketPhase();

  if (phase === "premarket") return "premarket";
  if (phase === "open") return "opening tape";
  if (phase === "midday") return "midday tape";
  if (phase === "close") return "closing tape";
  return "after-hours tape";
}

function describeBreadthState(spread: number, activeSignals: number, totalSignals: number) {
  const participation = totalSignals > 0 ? activeSignals / totalSignals : 0;

  if (spread >= 4 && participation >= 0.55) return "expanding";
  if (spread >= 2) return "improving";
  if (spread <= -4 && participation >= 0.55) return "deteriorating";
  if (spread <= -2) return "defensive";
  if (activeSignals >= 8 && Math.abs(spread) <= 1) return "two-way";
  return "selective";
}

function describeSignalAcceleration(rows: SignalRows, activeSignals: number) {
  const convictions = rows
    .map((row) => normalizeConviction(row.conviction))
    .filter((value): value is number => value != null);

  if (activeSignals === 0 || convictions.length === 0) {
    return {
      averageConviction: null,
      label: "muted",
    };
  }

  const averageConviction =
    convictions.reduce((sum, value) => sum + value, 0) / convictions.length;

  if (averageConviction >= 78 && activeSignals >= 8) {
    return { averageConviction, label: "accelerating" };
  }

  if (averageConviction >= 68 && activeSignals >= 5) {
    return { averageConviction, label: "building" };
  }

  if (averageConviction <= 45 || activeSignals <= 2) {
    return { averageConviction, label: "fragile" };
  }

  return { averageConviction, label: "steady" };
}

function describeRotationState(leader: SectorSummary | null, laggard: SectorSummary | null) {
  if (!leader || !laggard) return "mixed";

  const spread = leader.averageChange - laggard.averageChange;

  if (spread >= 2.5) return "decisive";
  if (spread >= 1.25) return "clear";
  if (spread <= 0.4) return "compressed";
  return "mixed";
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
  const neutralCount = Number(neutral ?? 0);
  const total = bullishCount + bearishCount + neutralCount;
  const activeSignals = bullishCount + bearishCount;
  const spread = bullishCount - bearishCount;
  const breadthState = describeBreadthState(spread, activeSignals, total);
  const phaseLabel = formatPhaseLabel();

  if (total === 0) {
    return "No confirmed setup edge is currently detected from the active scan.";
  }

  if (spread >= 4) {
    return `Bullish setups lead ${bullishCount}-${bearishCount} in the ${phaseLabel}, with breadth ${breadthState} beyond the first tier.`;
  }

  if (spread >= 1) {
    return `Bullish setups are leading ${bullishCount}-${bearishCount}, but breadth is still ${breadthState}.`;
  }

  if (spread <= -4) {
    return `Bearish setups lead ${bearishCount}-${bullishCount} in the ${phaseLabel}, and breadth is turning ${breadthState}.`;
  }

  if (spread <= -1) {
    return `Bearish setups are leading ${bearishCount}-${bullishCount}, suggesting a more ${breadthState} tape.`;
  }

  if (activeSignals >= 8) {
    return `Bullish and bearish setups are balanced at ${bullishCount}-${bearishCount}, creating a ${breadthState} tape with more crosscurrents than follow-through.`;
  }

  return `Bullish and bearish setups are balanced at ${bullishCount}-${bearishCount}, with breadth still ${breadthState}.`;
}

function buildLeadershipText(leader: SectorSummary | null, laggard: SectorSummary | null) {
  const rotationState = describeRotationState(leader, laggard);

  if (leader?.sector && laggard?.sector && leader.sector !== laggard.sector) {
    if (rotationState === "decisive" || rotationState === "clear") {
      return `${leader.sector} is setting the pace while ${laggard.sector} remains softer, keeping sector rotation ${rotationState} across the setup board.`;
    }

    if (rotationState === "compressed") {
      return `${leader.sector} is only narrowly ahead of ${laggard.sector}, so sector rotation is compressed rather than dominant.`;
    }

    return `${leader.sector} leads while ${laggard.sector} remains softer across the current setup universe.`;
  }

  if (leader?.sector) {
    return `${leader.sector} is providing the clearest leadership, while the rest of the board is more mixed.`;
  }

  return "Leadership is still rotating, so no single sector is clearly dominating the setup board yet.";
}

function buildActionableText(
  bullish: number,
  bearish: number,
  total: number,
  accelerationLabel: string
) {
  const spread = bullish - bearish;
  const phaseLabel = formatPhaseLabel();
  const signalState =
    total >= 12 ? "elevated" : total >= 6 ? "constructive" : "selective";

  if (spread >= 3) {
    return `${formatCount(bullish, "bullish setup")} are active against ${formatCount(bearish, "bearish setup")} in the ${phaseLabel}, and signal participation is ${accelerationLabel} with total count still ${signalState}.`;
  }

  if (spread <= -3) {
    return `${formatCount(bearish, "bearish setup")} are active against ${formatCount(bullish, "bullish setup")} in the ${phaseLabel}, and signal participation is ${accelerationLabel} while total count stays ${signalState}.`;
  }

  return `${formatCount(bullish, "bullish setup")} are active, ${formatCount(
    bearish,
    "bearish setup"
  )} ${bearish === 1 ? "is" : "are"} actionable, and signal participation looks ${accelerationLabel} with total count still ${signalState}.`;
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
  const activeSignals = counts.bullish + counts.bearish;
  const acceleration = describeSignalAcceleration(rows, activeSignals);
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
    actionableText: buildActionableText(
      counts.bullish,
      counts.bearish,
      total,
      acceleration.label
    ),
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