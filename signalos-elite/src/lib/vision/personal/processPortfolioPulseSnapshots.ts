import {
  calculateStockPulse,
  recordPulseSnapshot,
  stockPulseToSnapshot,
  type HistoricalBar,
} from "@/lib/amsa";
import { getHistoryBars, type HistoryBar } from "@/lib/market/historyBars";
import {
  isSupportedPortfolioSymbol,
  normalizePortfolioSymbol,
} from "./portfolioPulseSnapshots";

export type PortfolioPulseProcessingReason =
  | "saved"
  | "duplicate"
  | "unsupported_symbol"
  | "history_api_failure"
  | "insufficient_history"
  | "snapshot_write_failure";

export type PortfolioPulseProcessingOutcome = {
  symbol: string;
  processed: boolean;
  saved: boolean;
  reason: PortfolioPulseProcessingReason;
  detail?: string;
};

type ProcessorDependencies = {
  loadHistory: (symbol: string) => Promise<HistoryBar[]>;
  writeSnapshot: typeof recordPulseSnapshot;
};

const defaultDependencies: ProcessorDependencies = {
  loadHistory: (symbol) => getHistoryBars(symbol, "1y", { throwOnError: true }),
  writeSnapshot: recordPulseSnapshot,
};

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

async function processSymbol(
  symbol: string,
  dependencies: ProcessorDependencies,
): Promise<PortfolioPulseProcessingOutcome> {
  if (!isSupportedPortfolioSymbol(symbol)) {
    return { symbol, processed: false, saved: false, reason: "unsupported_symbol" };
  }

  let bars: HistoryBar[];
  try {
    bars = await dependencies.loadHistory(symbol);
  } catch (error) {
    return {
      symbol,
      processed: false,
      saved: false,
      reason: "history_api_failure",
      detail: error instanceof Error ? error.message : "Unknown history API failure.",
    };
  }

  const pulse = calculateStockPulse(toHistoricalBars(bars), {
    symbol,
    context: { sectorScore: null, marketScore: null },
  });

  if (pulse.score === null || pulse.status === "insufficient-data") {
    return {
      symbol,
      processed: false,
      saved: false,
      reason: "insufficient_history",
      detail: `${pulse.barCount} valid daily bars; no calculable Pulse.`,
    };
  }

  try {
    const result = await dependencies.writeSnapshot(
      stockPulseToSnapshot(pulse, {
        frequency: "daily",
        sourceUpdatedAt: bars.at(-1)?.date ?? null,
        metadata: { source: "portfolio-pulse" },
      }),
    );

    return {
      symbol,
      processed: true,
      saved: result.saved,
      reason: result.skipped ? "duplicate" : "saved",
    };
  } catch (error) {
    return {
      symbol,
      processed: true,
      saved: false,
      reason: "snapshot_write_failure",
      detail: error instanceof Error ? error.message : "Unknown snapshot write failure.",
    };
  }
}

export async function processPortfolioPulseSnapshots(
  symbols: string[],
  dependencies: ProcessorDependencies = defaultDependencies,
): Promise<PortfolioPulseProcessingOutcome[]> {
  const normalizedSymbols = Array.from(
    new Set(symbols.map(normalizePortfolioSymbol).filter(Boolean)),
  );
  const outcomes = await Promise.all(
    normalizedSymbols.map((symbol) => processSymbol(symbol, dependencies)),
  );

  for (const outcome of outcomes) {
    const log = outcome.saved || outcome.reason === "duplicate"
      ? console.info
      : console.warn;
    log("[portfolio-pulse] symbol processing outcome", outcome);
  }

  return outcomes;
}