const PURCHASE_PAGE_LIMIT = 100;
const PURCHASE_PAGES = 3;
const MAX_VISIBLE_ROWS = 20;

const GENERIC_SECTOR_TOKENS = new Set(["and", "consumer", "services", "sector", "cap"]);

const SECTOR_ALIASES: Record<string, string[]> = {
  technology: ["technology", "tech", "semis", "semiconductors", "software", "cloud", "internet"],
  healthcare: ["healthcare", "health care", "biotech", "pharma", "pharmaceuticals", "medical devices"],
  "financial services": ["financial services", "financials", "banks", "banking", "insurance", "brokerage", "asset management"],
  industrials: ["industrials", "industrial", "special situations", "aerospace", "transportation", "defense", "machinery"],
  "consumer cyclical": ["consumer cyclical", "consumer discretionary", "retail", "autos", "travel", "leisure"],
  "consumer defensive": ["consumer defensive", "consumer staples", "staples", "food", "beverage", "household products"],
  energy: ["energy", "oil", "gas", "oil and gas", "oil & gas", "exploration", "midstream"],
  "communication services": ["communication services", "communications", "media", "telecom", "telecommunications", "streaming", "advertising"],
  utilities: ["utilities"],
  "real estate": ["real estate", "realty", "reit", "reits", "property"],
  "basic materials": ["basic materials", "materials", "chemicals", "metals", "mining", "steel"],
};

type FmpInsiderTradeRow = {
  symbol?: string;
  filingDate?: string | null;
  transactionDate?: string | null;
  reportingName?: string | null;
  typeOfOwner?: string | null;
  transactionType?: string | null;
  securitiesTransacted?: number | string | null;
  price?: number | string | null;
  securityName?: string | null;
  url?: string | null;
  securitiesOwned?: number | string | null;
  acquisitionOrDisposition?: string | null;
  directOrIndirect?: string | null;
  formType?: string | null;
};

type FmpProfileRow = {
  symbol?: string;
  companyName?: string | null;
  sector?: string | null;
};

export type InsiderTradeFeedRow = {
  symbol: string;
  companyName: string;
  sector: string | null;
  amountPurchased: number | null;
  sharesPurchased: number | null;
  transactionDate: string | null;
  filingDate: string | null;
  purchaserName: string;
  purchaserTitle: string;
  transactionType: string;
  securityName: string | null;
  filingUrl: string | null;
  pricePerShare: number | null;
  sharesOwnedAfter: number | null;
  ownershipType: string | null;
  formType: string | null;
};

export type InsiderTradesFeed = {
  source: string;
  rows: InsiderTradeFeedRow[];
  updatedAt: string;
  scannedFilings: number;
  matchedPurchases: number;
  warnings: string[];
};

export class InsiderDataError extends Error {
  constructor(message: string, public readonly status: number = 502) {
    super(message);
    this.name = "InsiderDataError";
  }
}

function normalizeSector(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function tokenizeSector(value: string) {
  return normalizeSector(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function expandSectorTerms(value: string) {
  const normalized = normalizeSector(value);
  const expanded = new Set<string>([normalized]);

  for (const [canonical, aliases] of Object.entries(SECTOR_ALIASES)) {
    const allTerms = [canonical, ...aliases].map(normalizeSector);
    const matchesAlias = allTerms.includes(normalized);

    if (!matchesAlias) continue;

    expanded.add(canonical);
    for (const alias of aliases) {
      expanded.add(normalizeSector(alias));
    }
  }

  return [...expanded];
}

function matchesRequestedSector(requestedSector: string, rowSector: string | null | undefined) {
  if (!requestedSector || requestedSector === "All") return true;
  if (!rowSector) return false;

  const requestedTerms = expandSectorTerms(requestedSector);
  const requestedTokens = new Set(
    requestedTerms.flatMap(tokenizeSector).filter((token) => !GENERIC_SECTOR_TOKENS.has(token))
  );
  const rowTerms = expandSectorTerms(rowSector);
  const rowTokens = new Set(
    rowTerms.flatMap(tokenizeSector).filter((token) => !GENERIC_SECTOR_TOKENS.has(token))
  );

  for (const requestedTerm of requestedTerms) {
    for (const rowTerm of rowTerms) {
      if (requestedTerm === rowTerm) {
        return true;
      }
    }
  }

  return [...requestedTokens].some((token) => rowTokens.has(token));
}

function compareRecentTrades(left: FmpInsiderTradeRow, right: FmpInsiderTradeRow) {
  const tradeDateDelta =
    getDateValue(right.transactionDate ?? right.filingDate) -
    getDateValue(left.transactionDate ?? left.filingDate);
  if (tradeDateDelta !== 0) return tradeDateDelta;

  const filingDateDelta = getDateValue(right.filingDate) - getDateValue(left.filingDate);
  if (filingDateDelta !== 0) return filingDateDelta;

  return (getAmountPurchased(right) ?? -1) - (getAmountPurchased(left) ?? -1);
}

async function fetchRows<T extends object>(path: string, params: Record<string, string>): Promise<T[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) throw new InsiderDataError("FMP_API_KEY is not configured on the server.", 503);
  const url = new URL(`https://financialmodelingprep.com/stable/${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("apikey", apiKey);

  let response: Response;
  try {
    response = await fetch(url, { next: { revalidate: 900 }, signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new InsiderDataError("FMP insider data could not be reached. Please retry.");
  }
  if ([401, 403].includes(response.status)) {
    throw new InsiderDataError("FMP rejected access to insider data. Check the server API key and endpoint permissions.", 503);
  }
  if (response.status === 402) {
    throw new InsiderDataError("Your FMP subscription does not include this insider-data endpoint. Enable insider trading access, then retry.", 503);
  }
  if (!response.ok) {
    throw new InsiderDataError(`FMP insider data request failed (HTTP ${response.status}). Please retry.`);
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new InsiderDataError("FMP returned unreadable insider data.");
  }
  if (!Array.isArray(payload) || payload.some((row) => !row || typeof row !== "object" || Array.isArray(row))) {
    throw new InsiderDataError("FMP returned an unexpected insider data format.");
  }
  return payload as T[];
}

function isPurchase(row: FmpInsiderTradeRow) {
  const transactionType = (row.transactionType ?? "").trim().toUpperCase();
  return (transactionType === "P" || transactionType.startsWith("P-")) &&
    (row.acquisitionOrDisposition == null || row.acquisitionOrDisposition.trim().toUpperCase() !== "D");
}

function nonNegativeNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function getAmountPurchased(row: FmpInsiderTradeRow): number | null {
  const shares = nonNegativeNumber(row.securitiesTransacted);
  const price = nonNegativeNumber(row.price);
  if (!shares || !price) return null;
  const amount = shares * price;
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : null;
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

function secFilingUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["www.sec.gov", "sec.gov"].includes(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

async function loadCompanyProfiles(symbols: string[], warnings: string[]) {
  const uniqueSymbols = [...new Set(symbols.filter(Boolean))];
  const profiles = new Map<string, { companyName: string; sector: string | null }>();
  for (let index = 0; index < uniqueSymbols.length; index += 6) {
    await Promise.all(uniqueSymbols.slice(index, index + 6).map(async (symbol) => {
      try {
        const rows = await fetchRows<FmpProfileRow>("profile", { symbol });
        const profile = rows.find((row) => row.symbol === symbol);
        if (!profile) {
          warnings.push(`${symbol}: company profile unavailable; company name and sector may be missing.`);
        }
        profiles.set(symbol, {
          companyName: profile?.companyName?.trim() || symbol,
          sector: profile?.sector?.trim() || null,
        });
      } catch (error) {
        const message = error instanceof InsiderDataError ? error.message : "Unexpected profile error.";
        console.warn(`FMP insider profile unavailable for ${symbol}: ${message}`);
        warnings.push(`${symbol}: company profile unavailable; company name and sector may be missing.`);
        profiles.set(symbol, { companyName: symbol, sector: null });
      }
    }));
  }
  return profiles;
}

export async function loadFmpInsiderTradesFeed(requestedSector?: string | null): Promise<InsiderTradesFeed> {
  const latestRows: FmpInsiderTradeRow[] = [];
  for (let page = 0; page < PURCHASE_PAGES; page++) {
    const rows = await fetchRows<FmpInsiderTradeRow>("insider-trading/latest", {
      page: String(page), limit: String(PURCHASE_PAGE_LIMIT),
    });
    latestRows.push(...rows);
    if (rows.length < PURCHASE_PAGE_LIMIT) break;
  }
  const seen = new Set<string>();
  const recentPurchaseRows = latestRows
    .filter((row) => isPurchase(row))
    .filter((row) => (nonNegativeNumber(row.securitiesTransacted) ?? 0) > 0)
    .filter((row) => {
      const symbol = row.symbol?.trim().toUpperCase();
      if (!symbol || !/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(symbol)) return false;
      row.symbol = symbol;
      const key = JSON.stringify([
        symbol, row.reportingName, row.transactionDate, row.filingDate,
        row.transactionType, row.securitiesTransacted, row.price, row.securitiesOwned,
        row.securityName, row.directOrIndirect, row.url,
      ]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(compareRecentTrades);

  const warnings: string[] = [];
  const companyProfiles = await loadCompanyProfiles(
    recentPurchaseRows.map((row) => row.symbol ?? ""),
    warnings
  );

  const filteredRows = recentPurchaseRows
    .map((row) => {
      const symbol = (row.symbol ?? "").trim().toUpperCase();
      const profile = companyProfiles.get(symbol);

      return {
        symbol,
        companyName: profile?.companyName ?? symbol,
        sector: profile?.sector ?? null,
        amountPurchased: getAmountPurchased(row),
        sharesPurchased: nonNegativeNumber(row.securitiesTransacted),
        transactionDate: row.transactionDate ?? null,
        filingDate: row.filingDate ?? null,
        purchaserName: normalizePurchaserName(row.reportingName),
        purchaserTitle: normalizeOwnerTitle(row.typeOfOwner),
        transactionType: (row.transactionType ?? "Purchase").trim() || "Purchase",
        securityName: row.securityName ?? null,
        filingUrl: secFilingUrl(row.url),
        pricePerShare: (nonNegativeNumber(row.price) ?? 0) > 0 ? nonNegativeNumber(row.price) : null,
        sharesOwnedAfter: nonNegativeNumber(row.securitiesOwned),
        ownershipType: row.directOrIndirect === "D" ? "Direct" : row.directOrIndirect === "I" ? "Indirect" : null,
        formType: row.formType?.trim() || null,
      } satisfies InsiderTradeFeedRow;
    })
    .filter((row) => matchesRequestedSector(requestedSector ?? "All", row.sector));

  return {
    source:
      requestedSector && requestedSector !== "All"
        ? "fmp_recent_insider_purchases_by_sector"
        : "fmp_recent_insider_purchases",
    rows: filteredRows.slice(0, MAX_VISIBLE_ROWS),
    updatedAt: new Date().toISOString(),
    scannedFilings: latestRows.length,
    matchedPurchases: filteredRows.length,
    warnings: warnings.sort(),
  };
}