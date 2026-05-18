const FMP_API_KEY = process.env.FMP_API_KEY;

const PURCHASE_PAGE_LIMIT = 100;
const MAX_VISIBLE_ROWS = 5;

type FmpInsiderTradeRow = {
  symbol?: string;
  filingDate?: string | null;
  transactionDate?: string | null;
  reportingName?: string | null;
  typeOfOwner?: string | null;
  transactionType?: string | null;
  securitiesTransacted?: number | null;
  price?: number | null;
  securityName?: string | null;
  url?: string | null;
};

type FmpProfileRow = {
  symbol?: string;
  companyName?: string | null;
};

export type InsiderTradeFeedRow = {
  symbol: string;
  companyName: string;
  amountPurchased: number | null;
  sharesPurchased: number | null;
  transactionDate: string | null;
  filingDate: string | null;
  purchaserName: string;
  purchaserTitle: string;
  transactionType: string;
  securityName: string | null;
  filingUrl: string | null;
};

export type InsiderTradesFeed = {
  source: string;
  rows: InsiderTradeFeedRow[];
};

function compareRecentTrades(left: FmpInsiderTradeRow, right: FmpInsiderTradeRow) {
  const tradeDateDelta =
    getDateValue(right.transactionDate ?? right.filingDate) -
    getDateValue(left.transactionDate ?? left.filingDate);
  if (tradeDateDelta !== 0) return tradeDateDelta;

  const filingDateDelta = getDateValue(right.filingDate) - getDateValue(left.filingDate);
  if (filingDateDelta !== 0) return filingDateDelta;

  return (getAmountPurchased(right) ?? -1) - (getAmountPurchased(left) ?? -1);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    throw new Error(`FMP request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function isPurchase(row: FmpInsiderTradeRow) {
  const transactionType = (row.transactionType ?? "").trim().toUpperCase();
  return transactionType.startsWith("P-");
}

function getAmountPurchased(row: FmpInsiderTradeRow) {
  const shares = typeof row.securitiesTransacted === "number" ? row.securitiesTransacted : null;
  const price = typeof row.price === "number" ? row.price : null;

  if (shares == null || price == null || !Number.isFinite(shares) || !Number.isFinite(price)) {
    return null;
  }

  return shares * price;
}

function getDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function normalizeOwnerTitle(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized || "Insider";
}

function normalizePurchaserName(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized || "Name unavailable";
}

async function loadCompanyNames(symbols: string[]) {
  const uniqueSymbols = [...new Set(symbols.filter(Boolean))];

  const profileEntries = await Promise.all(
    uniqueSymbols.map(async (symbol) => {
      try {
        const rows = await fetchJson<FmpProfileRow[]>(
          `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_API_KEY}`
        );
        return [symbol, rows[0]?.companyName?.trim() || symbol] as const;
      } catch {
        return [symbol, symbol] as const;
      }
    })
  );

  return new Map<string, string>(profileEntries);
}

export async function loadFmpInsiderTradesFeed(): Promise<InsiderTradesFeed> {
  if (!FMP_API_KEY) {
    throw new Error("Missing FMP_API_KEY");
  }

  const latestRows = await fetchJson<FmpInsiderTradeRow[]>(
    `https://financialmodelingprep.com/stable/insider-trading/latest?page=0&limit=${PURCHASE_PAGE_LIMIT}&apikey=${FMP_API_KEY}`
  );

  const purchaseRows = latestRows
    .filter((row) => isPurchase(row))
    .filter((row) => typeof row.securitiesTransacted === "number" && row.securitiesTransacted > 0)
    .sort(compareRecentTrades)
    .slice(0, MAX_VISIBLE_ROWS);

  const companyNames = await loadCompanyNames(
    purchaseRows.map((row) => (row.symbol ?? "").trim()).filter(Boolean)
  );

  return {
    source: "fmp_latest_insider_purchases",
    rows: purchaseRows.map((row) => {
      const symbol = (row.symbol ?? "").trim().toUpperCase();
      return {
        symbol,
        companyName: companyNames.get(symbol) ?? symbol,
        amountPurchased: getAmountPurchased(row),
        sharesPurchased: typeof row.securitiesTransacted === "number" ? row.securitiesTransacted : null,
        transactionDate: row.transactionDate ?? null,
        filingDate: row.filingDate ?? null,
        purchaserName: normalizePurchaserName(row.reportingName),
        purchaserTitle: normalizeOwnerTitle(row.typeOfOwner),
        transactionType: (row.transactionType ?? "Purchase").trim() || "Purchase",
        securityName: row.securityName ?? null,
        filingUrl: row.url ?? null,
      };
    }),
  };
}