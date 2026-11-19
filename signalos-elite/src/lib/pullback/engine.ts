import { computeTechnicalsFromHistory } from "@/lib/market/technicals";
import type { MarketBar } from "@/lib/market/fmpData";

export const TRUSTED_FIRMS = ["Schwab", "Morningstar", "CFRA", "Argus"] as const;
export type Firm = typeof TRUSTED_FIRMS[number];
export type Stage = "analyst" | "price-volume";
export type PullbackConfig = {
  stabilizationSessions: number;
  volumeMultiple: number;
  supportTolerance: number;
  advanceFraction: number;
  ratingMaxDays: number;
  quoteMaxSeconds: number;
  volumeSessions: number;
};
export const DEFAULT_CONFIG: PullbackConfig = {
  stabilizationSessions: 2, volumeMultiple: 1.5, supportTolerance: 0.01,
  advanceFraction: 0.001, ratingMaxDays: 14, quoteMaxSeconds: 120, volumeSessions: 10,
};
export type Split = { date: string; numerator: number; denominator: number };
export type Episode = { id: string; startedAt: string; recoveryPrice: number; basisDate: string };
export type Rating = {
  firm: Firm; originalRating: string; previousRating: string; publishedAt: string;
  dateOnly: boolean; action: string; source: string;
  targetFrom: number | null; targetTo: number | null;
};
export type Quote = { price: number; timestamp: string };
export type PriceEvidence = {
  level: number; price: number; quoteTimestamp: string; volumeMultiple: number;
  cumulativeVolume: number; historicalVolume: number; volumeThrough: string; historicalSessions: number;
};
export type Evaluation = {
  episode: Episode | null; firms: Rating[]; analystAt: string | null;
  supportObservedAt: string | null;
  priceVolume: PriceEvidence | null; reasons: string[]; evaluatedAt: string;
};

const DAY = 86_400_000;
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
});
export function sessionParts(timestamp: number): { date: string; minute: number; weekday: string } {
  const p = Object.fromEntries(formatter.formatToParts(timestamp).map((part) => [part.type, part.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minute: +p.hour * 60 + +p.minute, weekday: p.weekday };
}
export function canonicalFirm(value: unknown): Firm | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ");
  const aliases: Record<string, Firm> = {
    schwab: "Schwab", "charles schwab": "Schwab", "schwab equity ratings": "Schwab",
    morningstar: "Morningstar", "morningstar inc": "Morningstar",
    cfra: "CFRA", "cfra research": "CFRA", argus: "Argus", "argus research": "Argus",
  };
  return aliases[key] ?? null;
}
export function favorable(rating: string): boolean {
  return ["buy", "strong buy", "outperform", "overweight", "accumulate", "4 stars", "5 stars", "a", "b"]
    .includes(rating.trim().toLowerCase());
}
export function splitFactor(splits: Split[], after: string, through: string): number {
  return splits.filter((split) => split.date > after && split.date <= through)
    .reduce((factor, split) => factor * split.numerator / split.denominator, 1);
}
export function adjustRawBar(bar: MarketBar, splits: Split[], through: string): MarketBar {
  const factor = splitFactor(splits, sessionParts(bar.timestamp).date, through);
  return { ...bar, open: bar.open / factor, high: bar.high / factor,
    low: bar.low / factor, close: bar.close / factor, volume: bar.volume * factor };
}

export function findEpisode(symbol: string, daily: MarketBar[], today: string, splits: Split[], previous?: Episode | null): Episode | null {
  const latest = daily.at(-1);
  if (!latest) return null;
  if (previous) {
    const recoveryPrice = previous.recoveryPrice / splitFactor(splits, previous.basisDate, today);
    const recovered = daily.some((bar) => sessionParts(bar.timestamp).date >= previous.basisDate && bar.close >= recoveryPrice);
    if (!recovered && latest.close < recoveryPrice) return { ...previous, recoveryPrice, basisDate: today };
  }
  let active: Episode | null = null;
  for (let index = 19; index < daily.length; index++) {
    const bar = daily[index];
    if (active && bar.close >= active.recoveryPrice) active = null;
    if (!active && computeTechnicalsFromHistory(daily.slice(Math.max(0, index - 59), index + 1)).structure === "pullback") {
      const date = sessionParts(bar.timestamp).date;
      const recoveryPrice = Math.max(...daily.slice(Math.max(0, index - 19), index).map((row) => row.high));
      if (bar.close >= recoveryPrice) continue;
      active = { id: `${symbol}:${date}`, startedAt: new Date(bar.timestamp).toISOString(), recoveryPrice, basisDate: today };
    }
  }
  return active;
}

export function qualifyingRatings(ratings: Rating[], episode: Episode, trusted: readonly Firm[], now: Date, config: PullbackConfig): Rating[] {
  const startDay = sessionParts(Date.parse(episode.startedAt)).date;
  const latest = new Map<Firm, Rating>();
  for (const rating of ratings) {
    const timestamp = Date.parse(rating.publishedAt);
    if (!Number.isFinite(timestamp) || timestamp > now.getTime()) continue;
    const previous = latest.get(rating.firm);
    if (!previous || timestamp > Date.parse(previous.publishedAt)) latest.set(rating.firm, rating);
    else if (timestamp === Date.parse(previous.publishedAt) && (
      rating.originalRating !== previous.originalRating || rating.action !== previous.action ||
      rating.previousRating !== previous.previousRating
    )) latest.set(rating.firm, { ...previous, action: "ambiguous same-day research" });
  }
  return [...latest.values()].filter((rating) => {
    const timestamp = Date.parse(rating.publishedAt);
    const afterStart = rating.dateOnly ? rating.publishedAt.slice(0, 10) > startDay : timestamp > Date.parse(episode.startedAt);
    return trusted.includes(rating.firm) && afterStart && now.getTime() - timestamp <= config.ratingMaxDays * DAY &&
      ["maintain", "maintained", "reiterate", "reiterated", "reaffirm", "reaffirmed"].includes(rating.action.toLowerCase()) &&
      favorable(rating.originalRating) && rating.previousRating.trim().toLowerCase() === rating.originalRating.trim().toLowerCase();
  }).sort((a, b) => a.publishedAt.localeCompare(b.publishedAt) || a.firm.localeCompare(b.firm));
}

function cumulative(bars: MarketBar[], date: string, cutoff: number): number | null {
  const minutes = new Map<number, number>();
  for (const bar of bars) {
    const part = sessionParts(bar.timestamp);
    if (part.date !== date || part.minute < 570 || part.minute >= cutoff) continue;
    if (minutes.has(part.minute) || !Number.isFinite(bar.volume) || bar.volume < 0) return null;
    minutes.set(part.minute, bar.volume);
  }
  // Missing minutes are missing evidence, not zero volume. Early-close sessions are
  // usable only when the comparison cutoff precedes their close.
  if (minutes.size !== cutoff - 570) return null;
  return [...minutes.values()].reduce((sum, volume) => sum + volume, 0);
}

export function evaluatePullback(input: {
  episode: Episode | null; ratings: Rating[]; trusted: readonly Firm[]; daily: MarketBar[];
  intraday: MarketBar[]; quote: Quote | null; now: Date; config?: PullbackConfig;
  previous?: Evaluation | null;
}): Evaluation {
  const { episode, ratings, trusted, daily, intraday, quote, now } = input;
  const config = input.config ?? DEFAULT_CONFIG;
  const result: Evaluation = { episode, firms: [], analystAt: null, supportObservedAt: null, priceVolume: null, reasons: [], evaluatedAt: now.toISOString() };
  if (!episode) { result.reasons.push("No active pullback under the existing 20-session support definition."); return result; }
  result.firms = qualifyingRatings(ratings, episode, trusted, now, config);
  if (result.firms.length < 2) {
    result.reasons.push(`${result.firms.length} of 2 firms: fresh, favorable reaffirmations after this pullback are required.`);
    return result;
  }
  result.analystAt = result.firms[1].publishedAt;
  const supportKey = (firms: Rating[]): string => JSON.stringify(firms.slice(0, 2).map((firm) =>
    [firm.firm, firm.publishedAt, firm.originalRating, firm.action]));
  const previous = input.previous;
  result.supportObservedAt = previous?.episode?.id === episode.id && previous.supportObservedAt &&
    supportKey(previous.firms) === supportKey(result.firms) ? previous.supportObservedAt : now.toISOString();
  const clock = sessionParts(now.getTime());
  const age = quote ? now.getTime() - Date.parse(quote.timestamp) : NaN;
  if (!quote || !Number.isFinite(age) || age < 0 || age > config.quoteMaxSeconds * 1000 ||
      !Number.isFinite(quote.price) || quote.price <= 0 || ["Sat", "Sun"].includes(clock.weekday) ||
      clock.minute <= 570 || clock.minute >= 960 || sessionParts(Date.parse(quote.timestamp)).date !== clock.date) {
    result.reasons.push("Price & Volume suppressed: a fresh regular-session quote is required."); return result;
  }
  // Observation time establishes ordering even when the feed provides only a
  // publication date. A later quote can qualify on the same day, not next close.
  if (Date.parse(quote.timestamp) <= Date.parse(result.supportObservedAt)) {
    result.reasons.push("Price & Volume awaits a quote after analyst support was first verified."); return result;
  }
  const sessions = daily.filter((bar) => sessionParts(bar.timestamp).date < clock.date);
  const stable = sessions.slice(-config.stabilizationSessions);
  if (stable.length !== config.stabilizationSessions || stable.some((bar) => bar.timestamp < Date.parse(episode.startedAt)) ||
      !sessions.length || now.getTime() - sessions.at(-1)!.timestamp > 4 * DAY) {
    result.reasons.push("Price & Volume suppressed: recent stabilization sessions are missing."); return result;
  }
  const level = Math.min(...stable.map((bar) => bar.low));
  const current = intraday.filter((bar) => sessionParts(bar.timestamp).date === clock.date &&
    sessionParts(bar.timestamp).minute >= 570 && sessionParts(bar.timestamp).minute < clock.minute);
  if (!current.length || Math.max(...stable.map((bar) => bar.low)) > level * (1 + config.supportTolerance) ||
      Math.min(...current.map((bar) => bar.low)) < level * (1 - config.supportTolerance) ||
      quote.price < Math.max(sessions.at(-1)!.close, current[0].open) * (1 + config.advanceFraction)) {
    result.reasons.push("Waiting for support to hold and price to advance."); return result;
  }
  const dates = sessions.slice(-config.volumeSessions).map((bar) => sessionParts(bar.timestamp).date);
  const totals = dates.map((date) => cumulative(intraday, date, clock.minute));
  const total = cumulative(intraday, clock.date, clock.minute);
  if (dates.length !== config.volumeSessions || totals.some((value) => value == null) || total == null ||
      now.getTime() - (current.at(-1)!.timestamp + 60_000) > config.quoteMaxSeconds * 1000) {
    result.reasons.push("Price & Volume suppressed: complete same-time-of-day minute volume is missing."); return result;
  }
  const baseline = totals.reduce<number>((sum, value) => sum + value!, 0) / totals.length;
  if (baseline <= 0 || total / baseline < config.volumeMultiple) {
    result.reasons.push("Waiting for stronger same-time-of-day volume."); return result;
  }
  result.priceVolume = { level, price: quote.price, quoteTimestamp: quote.timestamp, volumeMultiple: total / baseline,
    cumulativeVolume: total, historicalVolume: baseline, volumeThrough: new Date(Math.floor(now.getTime() / 60_000) * 60_000).toISOString(),
    historicalSessions: totals.length };
  return result;
}
