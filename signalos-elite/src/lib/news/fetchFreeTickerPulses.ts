import { fetchFreeNewsForWatchlist } from "@/lib/news/fetchFreeNews";
import { toSignalNewsItems } from "@/lib/news/freeNewsSignalItems";
import {
  buildTickerNewsPulse,
  isFreshNewsItem,
  DEFAULT_TICKER_PULSE_MAX_AGE_HOURS,
  type TickerNewsPulse,
} from "@/lib/news/tickerNewsPulse";

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

export async function fetchFreeTickerPulses(
  tickers: string[],
  options?: {
    maxAgeHours?: number;
  }
): Promise<Record<string, TickerNewsPulse>> {
  const normalizedTickers = Array.from(new Set(tickers.map(normalizeTicker).filter(Boolean)));
  const shouldDebug = process.env.NODE_ENV !== "production";
  const maxAgeHours = options?.maxAgeHours ?? DEFAULT_TICKER_PULSE_MAX_AGE_HOURS;

  if (!normalizedTickers.length) return {};

  if (shouldDebug) {
    console.log("[free-pulse] requested", normalizedTickers);
    console.log("[free-pulse] maxAgeHours", maxAgeHours);
  }

  const newsItems = await fetchFreeNewsForWatchlist(normalizedTickers, {
    limit: Math.min(Math.max(normalizedTickers.length * 6, 20), 100),
    lookbackHours: maxAgeHours,
  });
  const signalItems = toSignalNewsItems(newsItems);

  if (shouldDebug) {
    console.log("[free-pulse] normalizedItems", signalItems.length);
  }

  return Object.fromEntries(
    normalizedTickers
      .map((ticker) => {
        const matchedItems = signalItems
          .filter((item) => item.primaryTicker === ticker || item.tickers.includes(ticker))
          .sort(
            (a, b) =>
              new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          );
        const freshMatchCount = matchedItems.filter((item) =>
          isFreshNewsItem(item, maxAgeHours)
        ).length;

        if (shouldDebug && matchedItems.length === 0) {
          console.log("[free-pulse] no ticker matches", ticker);
        }

        if (shouldDebug && matchedItems.length > 0 && freshMatchCount === 0) {
          console.log("[free-pulse] no fresh matches", ticker);
        }

        const pulse = buildTickerNewsPulse(matchedItems, ticker, { maxAgeHours });

        if (shouldDebug && pulse == null) {
          console.log("[free-pulse] no pulse", ticker);
        }

        return pulse ? ([ticker, pulse] as const) : null;
      })
      .filter((entry): entry is readonly [string, TickerNewsPulse] => entry != null)
  );
}