import { buildLiveChartUrl } from "@/lib/sigi/tickerActions";

export function buildStockLiveUrl(ticker: string) {
  return buildLiveChartUrl(ticker);
}