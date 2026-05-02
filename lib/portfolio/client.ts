const PORTFOLIO_UPDATED_EVENT = "signalos-portfolio-updated";

type PortfolioUpdateDetail = {
  ticker: string;
  inPortfolio: boolean;
};

type AddTickerResponse = {
  ticker: string;
  added: boolean;
  alreadyInPortfolio: boolean;
};

const portfolioStatusCache = new Map<string, boolean>();

function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

function writePortfolioStatus(ticker: string, inPortfolio: boolean) {
  portfolioStatusCache.set(normalizeTicker(ticker), inPortfolio);
}

function emitPortfolioUpdate(detail: PortfolioUpdateDetail) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent<PortfolioUpdateDetail>(PORTFOLIO_UPDATED_EVENT, { detail }));
}

export function getCachedPortfolioStatus(ticker: string) {
  const normalizedTicker = normalizeTicker(ticker);
  return portfolioStatusCache.has(normalizedTicker)
    ? portfolioStatusCache.get(normalizedTicker) ?? false
    : null;
}

export async function getPortfolioTickerStatus(ticker: string) {
  const normalizedTicker = normalizeTicker(ticker);
  const cached = getCachedPortfolioStatus(normalizedTicker);

  if (cached != null) {
    return cached;
  }

  const response = await fetch(`/api/portfolio/status?ticker=${encodeURIComponent(normalizedTicker)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load portfolio status");
  }

  const data = (await response.json()) as { inPortfolio: boolean };
  writePortfolioStatus(normalizedTicker, Boolean(data.inPortfolio));
  return Boolean(data.inPortfolio);
}

export async function addTickerToPortfolio(ticker: string, averageCost?: number | null) {
  const normalizedTicker = normalizeTicker(ticker);
  const response = await fetch("/api/portfolio/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticker: normalizedTicker,
      averageCost:
        typeof averageCost === "number" && Number.isFinite(averageCost) && averageCost > 0
          ? averageCost
          : null,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to add to portfolio");
  }

  const data = (await response.json()) as AddTickerResponse;

  if (data.added || data.alreadyInPortfolio) {
    writePortfolioStatus(normalizedTicker, true);
    emitPortfolioUpdate({ ticker: normalizedTicker, inPortfolio: true });
  }

  return data;
}

export { PORTFOLIO_UPDATED_EVENT };
export type { PortfolioUpdateDetail };