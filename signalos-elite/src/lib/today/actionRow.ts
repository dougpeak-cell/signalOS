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

function normalizeSector(value?: string | null) {
  return String(value ?? "").trim();
}

function normalizeConviction(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null;
  return value <= 1 ? value * 100 : value;
}

function inferUniverseTone(changePct?: number | null) {
  const value = Number(changePct ?? 0);

  if (!Number.isFinite(value)) return "neutral" as const;
  if (value > 0) return "bullish" as const;
  if (value < 0) return "bearish" as const;
  return "neutral" as const;
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
  const neutralSummary = neutralCount > 0 ? ` with ${neutralCount} neutral setup${neutralCount === 1 ? "" : "s"} parked on the side` : "";
  const participationSummary = `${activeSignals} active setup${activeSignals === 1 ? "" : "s"} out of ${total}`;

  if (total === 0) {
    return "No confirmed setup edge is currently detected from the active scan.";
  }

  if (spread >= 4) {
    return `Bullish setups lead ${bullishCount}-${bearishCount} in the ${phaseLabel}. Breadth is ${breadthState} with ${participationSummary}${neutralSummary}.`;
  }

  if (spread >= 1) {
    return `Bullish setups are leading ${bullishCount}-${bearishCount} in the ${phaseLabel}. Breadth is still ${breadthState} with ${participationSummary}${neutralSummary}.`;
  }

  if (spread <= -4) {
    return `Bearish setups lead ${bearishCount}-${bullishCount} in the ${phaseLabel}. Breadth is turning ${breadthState} with ${participationSummary}${neutralSummary}.`;
  }

  if (spread <= -1) {
    return `Bearish setups are leading ${bearishCount}-${bullishCount} in the ${phaseLabel}, suggesting a more ${breadthState} tape with ${participationSummary}${neutralSummary}.`;
  }

  if (activeSignals >= 8) {
    return `Bullish and bearish setups are balanced at ${bullishCount}-${bearishCount} in the ${phaseLabel}. Breadth is ${breadthState} with ${participationSummary}${neutralSummary}, creating more crosscurrents than follow-through.`;
  }

  return `Bullish and bearish setups are balanced at ${bullishCount}-${bearishCount} in the ${phaseLabel}. Breadth is still ${breadthState} with ${participationSummary}${neutralSummary}.`;
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
  accelerationLabel: string,
  leader: SectorSummary | null,
  laggard: SectorSummary | null
) {
  const spread = bullish - bearish;
  const phaseLabel = formatPhaseLabel();
  const signalState =
    total >= 12 ? "elevated" : total >= 6 ? "constructive" : "selective";
  const leaderText = leader?.sector ? `${leader.sector} leadership` : "current leadership";
  const laggardText = laggard?.sector ? `${laggard.sector} weakness` : "relative weakness";

  if (spread >= 3) {
    return `Lean into ${leaderText} during the ${phaseLabel} while keeping risk tight against ${laggardText}. Participation is ${accelerationLabel}, so the long side can still work if follow-through stays ${signalState}.`;
  }

  if (spread <= -3) {
    return `Favor defense into the ${phaseLabel} and respect ${laggardText} pressure, while treating ${leaderText} as the main test of any bounce. Participation is ${accelerationLabel}, so downside moves can still extend while the tape stays ${signalState}.`;
  }

  return `Stay selective in the ${phaseLabel}: work confirmed names tied to ${leaderText}, avoid forcing size into ${laggardText}, and wait for cleaner separation before pressing harder. Participation is ${accelerationLabel} with the overall setup count still ${signalState}.`;
}

export function buildTodayActionRowMetrics(
  rows: SignalRows,
  setupUniverse: SetupUniverseRows
): TodayActionRowMetrics {
  const countableRows =
    rows.length > 0
      ? rows.map((row) => ({
          tone: signalToneFromRow(row, row.price),
        }))
      : setupUniverse.map((item) => ({
          tone: inferUniverseTone(item.changePct),
        }));

  const counts = countableRows.reduce(
    (accumulator, row) => {
      const tone = row.tone;

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
      acceleration.label,
      leader,
      laggard
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