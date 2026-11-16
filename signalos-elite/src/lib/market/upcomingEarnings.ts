import { fetchFmpRows } from "@/lib/experts/fmpClient";
import { MARKET_TZ } from "@/lib/marketTime";

export type UpcomingEarningsReport = {
  symbol: string;
  date: string;
};

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function getUpcomingEarnings(
  ticker: string,
  now: Date = new Date()
): Promise<UpcomingEarningsReport | null> {
  const symbol = ticker.trim().toUpperCase();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: MARKET_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const rows = await fetchFmpRows("earnings", { symbol, limit: "100" }, 3600);
  const dates = rows
    .filter((row) =>
      typeof row.symbol === "string" &&
      row.symbol.trim().toUpperCase() === symbol &&
      row.epsActual == null &&
      row.revenueActual == null
    )
    .map((row) => row.date)
    .filter((date): date is string => isCalendarDate(date) && date >= today)
    .sort();
  return dates[0] ? { symbol, date: dates[0] } : null;
}
