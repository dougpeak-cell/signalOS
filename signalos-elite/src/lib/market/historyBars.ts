import { getFmpBars, historyStartDate } from "@/lib/market/fmpData";

export type HistoryBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export async function getHistoryBars(
  ticker: string,
  range = "6mo",
  options: { throwOnError?: boolean } = {},
): Promise<HistoryBar[]> {
  try {
    if (!ticker.trim()) throw new Error("Ticker is required.");
    const bars = await getFmpBars(ticker, historyStartDate(range), new Date().toISOString().slice(0, 10));
    return bars.map(({ timestamp, ...bar }) => ({ date: new Date(timestamp).toISOString().slice(0, 10), ...bar }));
  } catch (error) {
    if (options.throwOnError) throw error;
    console.error("FMP daily history unavailable:", error instanceof Error ? error.message : "Unknown provider error");
    return [];
  }
}
