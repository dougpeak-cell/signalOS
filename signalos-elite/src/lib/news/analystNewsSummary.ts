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
  kind: "analyst" | "news" | "unavailable";
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
  const tickerItems = sortTickerNews(
    filterFreshTickerNewsItems(items, maxAgeHours).filter((item) =>
      isTickerMatched(item, normalizedTicker)
    ),
    normalizedTicker
  );
  const analystLead = tickerItems.find(
    (item) => buildNewsCatalystLabel(item) === "Analyst"
  );
  const lead = analystLead ?? tickerItems[0] ?? null;
  const kind = analystLead ? "analyst" : "news";

  if (!lead) {
    return {
      state: "unavailable",
      kind: "unavailable",
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
    kind === "analyst"
      ? state === "supportive"
        ? "Supportive analyst update"
        : state === "cautious"
          ? "Cautious analyst update"
          : "Analyst update"
      : state === "supportive"
        ? "Supportive stock news"
        : state === "cautious"
          ? "Cautious stock news"
          : "Stock news context";
  const summary =
    kind === "analyst"
      ? state === "supportive"
        ? "This coverage is supportive, but the chart still needs to confirm follow-through."
        : state === "cautious"
          ? "This coverage is cautious, so watch whether price action confirms added pressure."
          : "This update is neutral on its own; use the current price response to judge its impact."
      : state === "supportive"
        ? "This fresh company coverage supports the upside case, but price and volume still need to confirm."
        : state === "cautious"
          ? "This fresh company coverage adds downside risk; watch price action for confirmation."
          : "This fresh company coverage is contextual, so let price and volume decide its impact.";

  return {
    state,
    kind,
    label,
    summary,
    headline: lead.headline,
    source: lead.source ?? null,
    ageLabel: formatNewsAgeLabel(lead.publishedAt, now),
    href: lead.url ?? null,
  };
}