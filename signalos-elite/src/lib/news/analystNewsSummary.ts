import {
  buildNewsCatalystLabel,
  formatNewsAgeLabel,
} from "./normalizeBenzingaNews";
import {
  filterFreshTickerNewsItems,
  sortTickerNews,
} from "./tickerNewsPulse";
import type { SignalNewsItem } from "./scoreNewsHeaderItems";

export type AnalystNewsSummary = {
  state: "supportive" | "cautious" | "neutral" | "unavailable";
  label: string;
  summary: string;
  headline: string | null;
  source: string | null;
  ageLabel: string | null;
  href: string | null;
};

function getState(sentiment: SignalNewsItem["sentiment"]): AnalystNewsSummary["state"] {
  if (sentiment === "positive") return "supportive";
  if (sentiment === "negative") return "cautious";
  return "neutral";
}

function isTickerMatched(item: SignalNewsItem, ticker: string): boolean {
  return (
    item.primaryTicker?.trim().toUpperCase() === ticker ||
    item.tickers.some((itemTicker) => itemTicker.trim().toUpperCase() === ticker)
  );
}

export function buildAnalystNewsSummary(
  items: SignalNewsItem[],
  ticker: string,
  now: Date = new Date(),
  maxAgeHours = 24
): AnalystNewsSummary {
  const normalizedTicker = ticker.trim().toUpperCase();
  const analystItems = sortTickerNews(
    filterFreshTickerNewsItems(items, maxAgeHours).filter((item) =>
      isTickerMatched(item, normalizedTicker) && buildNewsCatalystLabel(item) === "Analyst"
    ),
    normalizedTicker
  );
  const lead = analystItems[0] ?? null;

  if (!lead) {
    return {
      state: "unavailable",
      label: "No fresh analyst update",
      summary: `No current analyst, upgrade, downgrade, or price-target headline is tied to ${normalizedTicker}. Keep the chart and verified catalysts in focus.`,
      headline: null,
      source: null,
      ageLabel: null,
      href: null,
    };
  }

  const state = getState(lead.sentiment);
  const label =
    state === "supportive"
      ? "Supportive analyst update"
      : state === "cautious"
        ? "Cautious analyst update"
        : "Analyst update";
  const summary =
    state === "supportive"
      ? "This coverage is supportive, but the chart still needs to confirm follow-through."
      : state === "cautious"
        ? "This coverage is cautious, so watch whether price action confirms added pressure."
        : "This update is neutral on its own; use the current price response to judge its impact.";

  return {
    state,
    label,
    summary,
    headline: lead.headline,
    source: lead.source ?? null,
    ageLabel: formatNewsAgeLabel(lead.publishedAt, now),
    href: lead.url ?? null,
  };
}