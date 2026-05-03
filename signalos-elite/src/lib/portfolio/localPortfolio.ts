const PORTFOLIO_STORAGE_KEY = "signalos.portfolio.holdings.v1";
const PORTFOLIO_TICKERS_KEY = "signalos.portfolio.tickers.v1";
const PORTFOLIO_STORAGE_INITIALIZED_KEY =
  "signalos.portfolio.holdings.initialized.v1";

export type LocalPortfolioHolding = {
  ticker: string;
  name: string;
  direction: "Long" | "Short";
  status: string;
  tag: string;
  thesis: string;
  shares: number;
  entryPrice: number;
  currentPrice: number;
  targetPrice: number | null;
  stopPrice: number | null;
  conviction: number;
};

type AddPendingPortfolioHoldingInput = {
  ticker: string;
  name?: string | null;
  livePrice?: number | null;
  targetPrice?: number | null;
  stopPrice?: number | null;
  conviction?: number | null;
  thesis?: string | null;
};

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z.\-]/g, "");
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function roundPrice(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return 0;
  return Number(value.toFixed(2));
}

export function readPortfolioHoldings(): LocalPortfolioHolding[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    const normalized = parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;

        const ticker = normalizeTicker(String((item as { ticker?: unknown }).ticker ?? ""));
        if (!ticker) return null;

        return {
          ticker,
          name:
            typeof (item as { name?: unknown }).name === "string"
              ? (item as { name: string }).name
              : ticker,
          direction:
            (item as { direction?: unknown }).direction === "Short" ? "Short" : "Long",
          status:
            typeof (item as { status?: unknown }).status === "string"
              ? (item as { status: string }).status
              : "pending",
          tag:
            typeof (item as { tag?: unknown }).tag === "string"
              ? (item as { tag: string }).tag
              : "Workspace",
          thesis:
            typeof (item as { thesis?: unknown }).thesis === "string"
              ? (item as { thesis: string }).thesis
              : "",
          shares: toFiniteNumber((item as { shares?: unknown }).shares) ?? 0,
          entryPrice: toFiniteNumber((item as { entryPrice?: unknown }).entryPrice) ?? 0,
          currentPrice:
            toFiniteNumber((item as { currentPrice?: unknown }).currentPrice) ?? 0,
          targetPrice:
            toFiniteNumber((item as { targetPrice?: unknown }).targetPrice) ?? null,
          stopPrice:
            toFiniteNumber((item as { stopPrice?: unknown }).stopPrice) ?? null,
          conviction: Math.max(
            0,
            Math.min(100, toFiniteNumber((item as { conviction?: unknown }).conviction) ?? 60)
          ),
        };
      })
      .filter((item): item is LocalPortfolioHolding => item != null);

    return normalized;
  } catch {
    return [];
  }
}

export function readPortfolioTickers(): string[] {
  return readPortfolioHoldings().map((holding) => holding.ticker);
}

export function hasInitializedPortfolioHoldings(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PORTFOLIO_STORAGE_INITIALIZED_KEY) === "1";
}

function writePortfolioHoldings(
  holdings: LocalPortfolioHolding[],
  options?: { dispatchEvent?: boolean }
) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(PORTFOLIO_STORAGE_INITIALIZED_KEY, "1");

  if (holdings.length === 0) {
    window.localStorage.removeItem(PORTFOLIO_STORAGE_KEY);
    window.localStorage.removeItem(PORTFOLIO_TICKERS_KEY);
  } else {
    window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(holdings));
    window.localStorage.setItem(
      PORTFOLIO_TICKERS_KEY,
      JSON.stringify(holdings.map((holding) => holding.ticker))
    );
  }

  if (options?.dispatchEvent !== false) {
    window.dispatchEvent(new Event("signalos:portfolio-updated"));
  }
}

export function replacePortfolioHoldings(
  holdings: LocalPortfolioHolding[],
  options?: { dispatchEvent?: boolean }
) {
  writePortfolioHoldings(holdings, options);
}

export function clearPortfolioHoldings(options?: { dispatchEvent?: boolean }) {
  writePortfolioHoldings([], options);
}

export function addPendingPortfolioHolding(
  input: AddPendingPortfolioHoldingInput
): { added: boolean; tickers: string[] } {
  const ticker = normalizeTicker(input.ticker);
  if (!ticker) {
    return { added: false, tickers: readPortfolioTickers() };
  }

  const current = readPortfolioHoldings();
  if (current.some((holding) => holding.ticker === ticker)) {
    return { added: false, tickers: current.map((holding) => holding.ticker) };
  }

  const nextHolding: LocalPortfolioHolding = {
    ticker,
    name: input.name?.trim() || ticker,
    direction: "Long",
    status: "pending",
    tag: "Workspace",
    thesis: input.thesis?.trim() || "Added from SigiOS Workspace.",
    shares: 0,
    entryPrice: 0,
    currentPrice: roundPrice(input.livePrice),
    targetPrice:
      input.targetPrice != null && Number.isFinite(input.targetPrice)
        ? Number(input.targetPrice.toFixed(2))
        : null,
    stopPrice:
      input.stopPrice != null && Number.isFinite(input.stopPrice)
        ? Number(input.stopPrice.toFixed(2))
        : null,
    conviction: Math.max(0, Math.min(100, Math.round(input.conviction ?? 60))),
  };

  const next = [nextHolding, ...current];
  writePortfolioHoldings(next);

  return { added: true, tickers: next.map((holding) => holding.ticker) };
}