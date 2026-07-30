import { calculateStockPulse } from "./engine";
import type {
  AMSADirection,
  AMSAState,
  AMSAStockPulse,
  HistoricalBar,
} from "./types";
import { getHistoryBars, type HistoryBar } from "../market/historyBars";

export type CurrentStockPulse = {
  symbol: string;
  rawPulse: number;
  displayPulse: number;
  label: AMSAState;
  direction: AMSADirection;
  confidence: number;
  asOf: string;
  sessionDate: string;
  readingType: "live" | "verified_daily";
};

export type ResolvedCurrentStockPulse = {
  current: CurrentStockPulse;
  pulse: AMSAStockPulse;
};

type CurrentStockPulseOptions = {
  bars?: HistoricalBar[];
  loadHistory?: (symbol: string) => Promise<HistoryBar[]>;
  now?: Date;
};

function normalizeSymbol(value: string): string {
  const symbol = value.trim().toUpperCase();
  if (!/^[A-Z0-9.^-]{1,12}$/.test(symbol)) {
    throw new Error("Invalid stock symbol.");
  }
  return symbol;
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

function getSessionDate(value: string | number): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    throw new Error("Current AMSA Pulse has no valid market session date.");
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(timestamp);
}

function getSessionClose(sessionDate: string): string {
  const noonUtc = new Date(`${sessionDate}T12:00:00.000Z`);
  const timeZoneName = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  }).formatToParts(noonUtc).find((part) => part.type === "timeZoneName")?.value;
  const offsetHours = Number(timeZoneName?.replace("GMT", ""));
  const closeUtcHour = Number.isFinite(offsetHours) ? 16 - offsetHours : 21;
  return `${sessionDate}T${String(closeUtcHour).padStart(2, "0")}:00:00.000Z`;
}

function getLatestCompletedSessionCutoff(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
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

  if (values.weekday === "Sat" || values.weekday === "Sun" || minutes < 16 * 60) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  return date.toISOString().slice(0, 10);
}

export async function resolveCurrentStockPulse(
  symbol: string,
  options: CurrentStockPulseOptions = {},
): Promise<ResolvedCurrentStockPulse> {
  const normalizedSymbol = normalizeSymbol(symbol);
  const loadedBars = options.bars ?? toHistoricalBars(
    await (options.loadHistory ?? ((ticker) =>
      getHistoryBars(ticker, "1y", { throwOnError: true })))(normalizedSymbol),
  );
  const completedSessionCutoff = getLatestCompletedSessionCutoff(
    options.now ?? new Date(),
  );
  const bars = loadedBars.filter(
    (bar) => getSessionDate(bar.time) <= completedSessionCutoff,
  );

  if (!bars.length) {
    throw new Error(`Unable to load current AMSA Pulse for ${normalizedSymbol}.`);
  }

  const pulse = calculateStockPulse(bars, {
    symbol: normalizedSymbol,
    context: { sectorScore: null, marketScore: null },
  });
  const rawPulse = Number(pulse.score);

  if (!Number.isFinite(rawPulse)) {
    throw new Error(`Invalid AMSA Pulse returned for ${normalizedSymbol}.`);
  }

  const sessionDate = getSessionDate(bars.at(-1)!.time);

  return {
    current: {
      symbol: normalizedSymbol,
      rawPulse,
      displayPulse: Math.round(rawPulse),
      label: pulse.state,
      direction: pulse.direction,
      confidence: pulse.confidence,
      asOf: getSessionClose(sessionDate),
      sessionDate,
      readingType: "verified_daily",
    },
    pulse,
  };
}

export async function getCurrentStockPulse(
  symbol: string,
  options: CurrentStockPulseOptions = {},
): Promise<CurrentStockPulse> {
  return (await resolveCurrentStockPulse(symbol, options)).current;
}