import { fetchFreeTickerPulses } from "./fetchFreeTickerPulses";
import type { TickerNewsPulse } from "./tickerNewsPulse";

export async function fetchBenzingaTickerPulses(
  tickers: string[],
  options?: {
    maxAgeHours?: number;
  }
): Promise<Record<string, TickerNewsPulse>> {
  return fetchFreeTickerPulses(tickers, options);
}