import { MARKET_TZ } from "@/lib/marketTime";
import { FmpDataError, type FmpRow } from "@/lib/experts/fmpClient";

export type CryptoCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const nyClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: MARKET_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function wallClock(epoch: number): number {
  const parts = Object.fromEntries(nyClock.formatToParts(epoch).map(({ type, value }) => [type, value]));
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
}

export function cryptoCandleTime(value: unknown): number | null {
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour = "0", minute = "0", second = "0"] = match;
  const target = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  const check = new Date(target);
  if (check.getUTCFullYear() !== +year || check.getUTCMonth() !== +month - 1 ||
      check.getUTCDate() !== +day || +hour > 23 || +minute > 59 || +second > 59) return null;
  // FMP's unzoned historical-chart dates are New York wall time, not server-local time.
  let epoch = target;
  for (let attempt = 0; attempt < 3; attempt++) epoch += target - wallClock(epoch);
  return wallClock(epoch) === target ? epoch : null;
}

export function candleEndpoint(multiplier: string, timespan: string): string {
  const endpoint = ({
    "1:minute": "historical-chart/1min",
    "5:minute": "historical-chart/5min",
    "15:minute": "historical-chart/15min",
    "30:minute": "historical-chart/30min",
    "1:hour": "historical-chart/1hour",
    "1:day": "historical-price-eod/full",
    "1:week": "historical-price-eod/full",
  } as Record<string, string>)[`${multiplier}:${timespan}`];
  if (!endpoint) throw new FmpDataError("This crypto candle interval is not supported by FMP.", 400);
  return endpoint;
}

function numeric(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function normalizeCryptoCandles(rows: FmpRow[], weekly: boolean): CryptoCandle[] {
  const unique = new Map<number, CryptoCandle>();
  for (const row of rows) {
    const time = cryptoCandleTime(row.date);
    const open = numeric(row.open), high = numeric(row.high), low = numeric(row.low);
    const close = numeric(row.close), volume = numeric(row.volume);
    if (time == null || open == null || high == null || low == null || close == null ||
        volume == null || low > Math.min(open, close) || high < Math.max(open, close) || low > high) continue;
    unique.set(time, { time, open, high, low, close, volume });
  }
  const candles = [...unique.values()].sort((a, b) => a.time - b.time);
  if (!weekly) return candles;
  const weeks = new Map<string, CryptoCandle>();
  for (const candle of candles) {
    const date = new Date(wallClock(candle.time));
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    const key = date.toISOString().slice(0, 10);
    const week = weeks.get(key);
    if (week) {
      week.high = Math.max(week.high, candle.high);
      week.low = Math.min(week.low, candle.low);
      week.close = candle.close;
      week.volume += candle.volume;
    } else {
      weeks.set(key, { ...candle, time: cryptoCandleTime(key)! });
    }
  }
  return [...weeks.values()];
}
