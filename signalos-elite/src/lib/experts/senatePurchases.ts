import type { FmpRow } from "@/lib/experts/fmpClient";
import { isDate } from "@/lib/experts/hedgeFundInvestments";

export const SENATE_PERIODS = [
  { value: "today", label: "Today", days: 1 },
  { value: "week", label: "Past 7 days", days: 7 },
  { value: "month", label: "Past 30 days", days: 30 },
  { value: "quarter", label: "Past 90 days", days: 90 },
  { value: "year", label: "Past year", days: 365 },
] as const;
export type SenatePeriod = typeof SENATE_PERIODS[number]["value"];
export type SenateDateBasis = "disclosure" | "purchase";
export type SenatePurchase = {
  symbol: string;
  company: string;
  senator: string;
  state: string | null;
  owner: string;
  amountRange: string;
  purchaseDate: string | null;
  disclosureDate: string | null;
  filingUrl: string | null;
};
export type SenatePurchasesFeed = {
  rows: SenatePurchase[];
  period: SenatePeriod;
  basis: SenateDateBasis;
  startDate: string;
  endDate: string;
  retrievedAt: string;
  scannedRows: number;
  matchedRows: number;
  oldestDisclosure: string | null;
  scanLimitReached: boolean;
  warnings: string[];
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function senateWindow(period: SenatePeriod, now: Date): { startDate: string; endDate: string } {
  const endDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const start = new Date(`${endDate}T00:00:00Z`);
  const days = SENATE_PERIODS.find((item) => item.value === period)!.days;
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { startDate: start.toISOString().slice(0, 10), endDate };
}

function filingUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "efdsearch.senate.gov" ? url.href : null;
  } catch {
    return null;
  }
}

export function normalizeSenatePurchase(row: FmpRow): SenatePurchase | null {
  const symbol = text(row.symbol)?.toUpperCase();
  // A ticker can refer to bonds or options too: require an explicit stock classification.
  if (text(row.assetType)?.toLowerCase() !== "stock" ||
      text(row.type)?.toLowerCase() !== "purchase" ||
      !symbol || !/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol)) return null;
  return {
    symbol,
    company: text(row.assetDescription) ?? symbol,
    senator: [text(row.firstName), text(row.lastName)].filter(Boolean).join(" ") || text(row.office) || "Name unavailable",
    state: text(row.district),
    owner: text(row.owner) ?? "Not disclosed",
    amountRange: text(row.amount) ?? "Not disclosed",
    purchaseDate: isDate(row.transactionDate) ? row.transactionDate : null,
    disclosureDate: isDate(row.disclosureDate) ? row.disclosureDate : null,
    filingUrl: filingUrl(row.link),
  };
}

export function selectSenatePurchases(
  raw: FmpRow[],
  period: SenatePeriod,
  basis: SenateDateBasis,
  exhausted: boolean,
  now: Date
): SenatePurchasesFeed {
  const window = senateWindow(period, now);
  const warnings: string[] = [];
  const seen = new Set<string>();
  const purchases = raw.flatMap((row) => {
    const purchase = normalizeSenatePurchase(row);
    if (!purchase) return [];
    const key = JSON.stringify(row);
    if (seen.has(key)) return [];
    seen.add(key);
    return [purchase];
  });
  const invalidDateCount = purchases.filter((row) =>
    (basis === "disclosure" ? row.disclosureDate : row.purchaseDate) == null).length;
  if (invalidDateCount) warnings.push(`${invalidDateCount} purchase rows had no valid selected date and were excluded.`);
  const matched = purchases.filter((row) => {
    const date = basis === "disclosure" ? row.disclosureDate : row.purchaseDate;
    return date != null && date >= window.startDate && date <= window.endDate;
  }).sort((a, b) => {
    const dateA = basis === "disclosure" ? a.disclosureDate : a.purchaseDate;
    const dateB = basis === "disclosure" ? b.disclosureDate : b.purchaseDate;
    return dateB!.localeCompare(dateA!) || a.senator.localeCompare(b.senator);
  });
  if (!exhausted) warnings.push("The 1,000-row scan limit was reached. Results are a filing sample, not a complete list for the selected period.");
  if (matched.length > 50) warnings.push(`Showing the newest 50 of ${matched.length} matching purchases found in the scanned sample.`);
  return {
    ...window, period, basis,
    rows: matched.slice(0, 50),
    retrievedAt: now.toISOString(), scannedRows: raw.length, matchedRows: matched.length,
    oldestDisclosure: raw.map((row) => row.disclosureDate).filter(isDate).sort()[0] ?? null,
    scanLimitReached: !exhausted, warnings,
  };
}
