const FMP_API_KEY = process.env.FMP_API_KEY;

const PURCHASE_PAGE_LIMIT = 100;
const MAX_VISIBLE_ROWS = 5;

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
  securitiesTransacted?: number | null;
  price?: number | null;
  securityName?: string | null;
  url?: string | null;
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
};

export type InsiderTradesFeed = {
  source: string;
  rows: InsiderTradeFeedRow[];
};

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
    const matchesAlias = allTerms.some(
      (term) => term === normalized || term.includes(normalized) || normalized.includes(term)
    );

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
      if (
        requestedTerm === rowTerm ||
        requestedTerm.includes(rowTerm) ||
        rowTerm.includes(requestedTerm)
      ) {
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

async function loadCompanyProfiles(symbols: string[]) {
  const uniqueSymbols = [...new Set(symbols.filter(Boolean))];

  const profileEntries = await Promise.all(
    uniqueSymbols.map(async (symbol) => {
      try {
        const rows = await fetchJson<FmpProfileRow[]>(
          `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_API_KEY}`
        );
        return [
          symbol,
          {
            companyName: rows[0]?.companyName?.trim() || symbol,
            sector: rows[0]?.sector?.trim() || null,
          },
        ] as const;
      } catch {
        return [symbol, { companyName: symbol, sector: null }] as const;
      }
    })
  );

  return new Map<string, { companyName: string; sector: string | null }>(profileEntries);
}

export async function loadFmpInsiderTradesFeed(requestedSector?: string | null): Promise<InsiderTradesFeed> {
  if (!FMP_API_KEY) {
    throw new Error("Missing FMP_API_KEY");
  }

  const latestRows = await fetchJson<FmpInsiderTradeRow[]>(
    `https://financialmodelingprep.com/stable/insider-trading/latest?page=0&limit=${PURCHASE_PAGE_LIMIT}&apikey=${FMP_API_KEY}`
  );

  const recentPurchaseRows = latestRows
    .filter((row) => isPurchase(row))
    .filter((row) => typeof row.securitiesTransacted === "number" && row.securitiesTransacted > 0)
    .sort(compareRecentTrades);

  const companyProfiles = await loadCompanyProfiles(
    recentPurchaseRows.map((row) => (row.symbol ?? "").trim()).filter(Boolean)
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
        sharesPurchased: typeof row.securitiesTransacted === "number" ? row.securitiesTransacted : null,
        transactionDate: row.transactionDate ?? null,
        filingDate: row.filingDate ?? null,
        purchaserName: normalizePurchaserName(row.reportingName),
        purchaserTitle: normalizeOwnerTitle(row.typeOfOwner),
        transactionType: (row.transactionType ?? "Purchase").trim() || "Purchase",
        securityName: row.securityName ?? null,
        filingUrl: row.url ?? null,
      } satisfies InsiderTradeFeedRow;
    })
    .filter((row) => matchesRequestedSector(requestedSector ?? "All", row.sector))
    .slice(0, MAX_VISIBLE_ROWS);

  return {
    source:
      requestedSector && requestedSector !== "All"
        ? "fmp_recent_insider_purchases_by_sector"
        : "fmp_recent_insider_purchases",
    rows: filteredRows,
  };
}