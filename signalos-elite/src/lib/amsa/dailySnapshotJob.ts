import { calculateStockPulse } from "./engine";
import { recordPulseSnapshot } from "./evolution/recordPulse";
import { stockPulseToSnapshot } from "./evolution/snapshot";
import { SupabaseAMSAPulseRepository } from "./evolution/supabaseRepository";
import type { AMSAPulseSnapshot, HistoricalBar } from "./types";
import { getHistoryBars, type HistoryBar } from "../market/historyBars";

const DEFAULT_BACKFILL_SESSIONS = 30;
const DEFAULT_CONCURRENCY = 5;

export type DailySnapshotOutcome = {
  symbol: string;
  sessionDate: string;
  saved: boolean;
  reason: "saved" | "already_exists" | "insufficient_history" | "failed";
  error?: string;
};

type DailySnapshotJobDependencies = {
  now: Date;
  loadHistory: (symbol: string) => Promise<HistoryBar[]>;
  loadExistingSnapshots: (symbol: string) => Promise<AMSAPulseSnapshot[]>;
  writeSnapshot: (snapshot: AMSAPulseSnapshot) => Promise<unknown>;
  buildSnapshot: (
    symbol: string,
    bars: HistoryBar[],
    sessionDate: string,
  ) => AMSAPulseSnapshot | null;
};

type DailySnapshotJobOptions = {
  backfillSessions?: number;
  concurrency?: number;
  dependencies?: Partial<DailySnapshotJobDependencies>;
};

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}

function toHistoricalBars(bars: HistoryBar[]): HistoricalBar[] {
  return bars.map((bar) => ({
    time: bar.date,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  }));
}

function buildDailySnapshot(
  symbol: string,
  bars: HistoryBar[],
  sessionDate: string,
): AMSAPulseSnapshot | null {
  const pulse = calculateStockPulse(toHistoricalBars(bars), {
    symbol,
    context: { sectorScore: null, marketScore: null },
  });

  if (pulse.score === null || pulse.status === "insufficient-data") return null;

  const snapshot = stockPulseToSnapshot(pulse, {
    frequency: "daily",
    sourceUpdatedAt: `${sessionDate}T00:00:00.000Z`,
    metadata: {
      source: "daily-snapshot-cron",
      sessionDate,
      verified: true,
    },
  });

  snapshot.calculatedAt = `${sessionDate}T21:00:00.000Z`;
  return snapshot;
}

function getLatestCompletedSessionCutoff(now: Date): string {
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
  const date = new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
  ));
  const minutes = Number(values.hour) * 60 + Number(values.minute);

  if (values.weekday === "Sat" || values.weekday === "Sun" || minutes < 15 * 60) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  return date.toISOString().slice(0, 10);
}

function getSnapshotSessionDate(snapshot: AMSAPulseSnapshot): string | null {
  const metadataDate = snapshot.metadata.sessionDate;
  if (typeof metadataDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(metadataDate)) {
    return metadataDate;
  }

  return snapshot.sourceUpdatedAt?.slice(0, 10) ?? snapshot.calculatedAt.slice(0, 10);
}

async function processSymbol(
  symbol: string,
  dependencies: DailySnapshotJobDependencies,
  backfillSessions: number,
): Promise<DailySnapshotOutcome[]> {
  try {
    const [history, existingSnapshots] = await Promise.all([
      dependencies.loadHistory(symbol),
      dependencies.loadExistingSnapshots(symbol),
    ]);
    const cutoff = getLatestCompletedSessionCutoff(dependencies.now);
    const eligibleBars = history
      .filter((bar) => /^\d{4}-\d{2}-\d{2}$/.test(bar.date) && bar.date <= cutoff)
      .sort((left, right) => left.date.localeCompare(right.date));
    const targetBars = eligibleBars.slice(-Math.max(1, backfillSessions));
    const existingDates = new Set(
      existingSnapshots
        .filter((snapshot) => snapshot.frequency === "daily")
        .map(getSnapshotSessionDate)
        .filter((date): date is string => Boolean(date)),
    );
    const outcomes: DailySnapshotOutcome[] = [];

    for (const targetBar of targetBars) {
      const sessionDate = targetBar.date;
      if (existingDates.has(sessionDate)) {
        outcomes.push({ symbol, sessionDate, saved: false, reason: "already_exists" });
        continue;
      }

      const sessionBars = eligibleBars.filter((bar) => bar.date <= sessionDate);
      const snapshot = dependencies.buildSnapshot(symbol, sessionBars, sessionDate);
      if (!snapshot) {
        outcomes.push({ symbol, sessionDate, saved: false, reason: "insufficient_history" });
        continue;
      }

      try {
        await dependencies.writeSnapshot(snapshot);
        existingDates.add(sessionDate);
        outcomes.push({ symbol, sessionDate, saved: true, reason: "saved" });
        console.info("Daily AMSA snapshot saved", { symbol, sessionDate });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown snapshot failure.";
        outcomes.push({ symbol, sessionDate, saved: false, reason: "failed", error: message });
        console.error("Daily AMSA snapshot failed", { symbol, sessionDate, error: message });
      }
    }

    return outcomes;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown daily processing failure.";
    console.error("Daily AMSA symbol processing failed", { symbol, error: message });
    return [{ symbol, sessionDate: "unknown", saved: false, reason: "failed", error: message }];
  }
}

export async function processDailyPulseSnapshots(
  symbols: string[],
  options: DailySnapshotJobOptions = {},
): Promise<DailySnapshotOutcome[]> {
  let repository: SupabaseAMSAPulseRepository | null = null;
  const getRepository = (): SupabaseAMSAPulseRepository => {
    repository ??= new SupabaseAMSAPulseRepository();
    return repository;
  };
  const dependencies: DailySnapshotJobDependencies = {
    now: options.dependencies?.now ?? new Date(),
    loadHistory:
      options.dependencies?.loadHistory ??
      ((symbol) => getHistoryBars(symbol, "1y", { throwOnError: true })),
    loadExistingSnapshots:
      options.dependencies?.loadExistingSnapshots ??
      ((symbol) => getRepository().getSnapshots({
        entityType: "stock",
        entityKey: symbol,
        frequency: "daily",
        limit: 365,
      })),
    writeSnapshot: options.dependencies?.writeSnapshot ?? recordPulseSnapshot,
    buildSnapshot: options.dependencies?.buildSnapshot ?? buildDailySnapshot,
  };
  const normalizedSymbols = Array.from(
    new Set(symbols.map(normalizeSymbol).filter(Boolean)),
  );
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
  const outcomes: DailySnapshotOutcome[] = [];

  for (let index = 0; index < normalizedSymbols.length; index += concurrency) {
    const batch = normalizedSymbols.slice(index, index + concurrency);
    const batchOutcomes = await Promise.all(
      batch.map((symbol) => processSymbol(
        symbol,
        dependencies,
        options.backfillSessions ?? DEFAULT_BACKFILL_SESSIONS,
      )),
    );
    outcomes.push(...batchOutcomes.flat());
  }

  return outcomes;
}