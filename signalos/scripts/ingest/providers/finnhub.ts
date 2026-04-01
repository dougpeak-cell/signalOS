import type {
  MarketDataProvider,
  ProviderDailyBar,
  ProviderEvent,
  ProviderFundamentalQuarter,
  ProviderSymbol,
} from "./types";

const BASE = "https://finnhub.io/api/v1";

function token() {
  const t = process.env.FINNHUB_API_KEY;
  if (!t) throw new Error("Missing FINNHUB_API_KEY");
  return t;
}

async function getJson(path: string, qs: Record<string, string | number | undefined>) {
  const u = new URL(`${BASE}${path}`);
  u.searchParams.set("token", token());
  for (const [k, v] of Object.entries(qs)) {
    if (v === undefined) continue;
    u.searchParams.set(k, String(v));
  }
  console.log("Finnhub GET", u.toString().replace(/token=[^&]+/, "token=***"));
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error(`Finnhub ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Finnhub /stock/candle uses UNIX seconds and returns:
 * { c:[], o:[], h:[], l:[], v:[], t:[], s:"ok"|"no_data" }
 */
function toBars(symbol: string, payload: any): ProviderDailyBar[] {
  if (!payload || payload.s !== "ok") return [];
  const out: ProviderDailyBar[] = [];
  const t = payload.t ?? [];
  for (let i = 0; i < t.length; i++) {
    const d = new Date(Number(t[i]) * 1000);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const iso = `${yyyy}-${mm}-${dd}`;
    out.push({
      ticker: symbol,
      d: iso,
      open: payload.o?.[i] ?? null,
      high: payload.h?.[i] ?? null,
      low: payload.l?.[i] ?? null,
      close: payload.c?.[i] ?? null,
      volume: payload.v?.[i] ?? null,
      vwap: null,
    });
  }
  return out;
}

export const finnhubProvider: MarketDataProvider = {
  name: "finnhub",

  // Optional: you can seed by exchange (US = "US") or skip and rely on UNIVERSE_TICKERS
  async fetchSymbols(): Promise<ProviderSymbol[]> {
    // Docs: /stock/symbol?exchange=US
    const data = await getJson("/stock/symbol", { exchange: "US" });
    return (data ?? []).map((s: any) => ({
      ticker: s.symbol,
      name: s.description ?? s.symbol,
      exchange: s.exchange ?? "US",
      currency: s.currency ?? "USD",
      country: s.country ?? "US",
      // sector/industry not included here; can enrich later via company profile endpoint if needed
    }));
  },

  async fetchDailyBars({ tickers, from, to }): Promise<ProviderDailyBar[]> {
    // Docs: /stock/candle
    const fromSec = Math.floor(new Date(from + "T00:00:00Z").getTime() / 1000);
    const toSec = Math.floor(new Date(to + "T00:00:00Z").getTime() / 1000);

    const all: ProviderDailyBar[] = [];
    for (const sym of tickers) {
      const payload = await getJson("/stock/candle", {
        symbol: sym,
        resolution: "D",
        from: fromSec,
        to: toSec,
      });
      all.push(...toBars(sym, payload));
    }
    return all;
  },

  async fetchFundamentalsQuarterly({ tickers }): Promise<ProviderFundamentalQuarter[]> {
    // Use Financials as Reported (reported statements)
    // Note: This endpoint returns reported filings; mapping can be expanded.
    const out: ProviderFundamentalQuarter[] = [];

    for (const sym of tickers) {
      const payload = await getJson("/stock/financials-reported", {
        symbol: sym,
        freq: "quarterly",
      });

      const data = payload?.data ?? [];
      for (const item of data) {
        const period_end = item?.report?.period ?? item?.report?.endDate ?? null;
        if (!period_end) continue;

        // The "report" object contains standardized fields in nested statements.
        // We'll store only a few common ones if present; extend later.
        const is = item?.report?.ic ?? item?.report?.incomeStatement ?? {};
        const cf = item?.report?.cf ?? item?.report?.cashFlowStatement ?? {};
        const bs = item?.report?.bs ?? item?.report?.balanceSheet ?? {};

        out.push({
          ticker: sym,
          period_end: String(period_end).slice(0, 10),
          revenue: is?.revenue ?? null,
          gross_profit: is?.grossProfit ?? null,
          operating_income: is?.operatingIncome ?? null,
          net_income: is?.netIncome ?? null,
          eps_basic: is?.epsBasic ?? null,
          eps_diluted: is?.epsDiluted ?? null,
          free_cash_flow: cf?.freeCashFlow ?? null,
          shares_diluted: is?.weightedAverageShsDil ?? null,
          total_debt: bs?.totalDebt ?? null,
          cash_and_equivalents: bs?.cashAndCashEquivalents ?? null,
        });
      }
    }

    return out;
  },

  async fetchEvents(): Promise<ProviderEvent[]> {
    // Optional for now (earnings calendar endpoint exists, we can add later)
    return [];
  },
};
