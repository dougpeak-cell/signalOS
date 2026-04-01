import { MarketDataProvider, ProviderDailyBar, ProviderEvent, ProviderFundamentalQuarter, ProviderSymbol } from "./types";

const BASE = "https://financialmodelingprep.com/stable";

async function getJson(path: string) {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error("Missing FMP_API_KEY");
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FMP ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Note: FMP endpoints vary by plan. Treat this as a skeleton you can adapt.
 */
export const fmpProvider: MarketDataProvider = {
  name: "fmp",

  async fetchSymbols(): Promise<ProviderSymbol[]> {
    // Example: stock list (can be large). You may prefer your own curated universe.
    const data = await getJson("/stock-list");
    return (data ?? []).slice(0, 500).map((s: any) => ({
      ticker: s.symbol,
      name: s.name ?? s.symbol,
      exchange: s.exchangeShortName ?? s.exchange,
      currency: s.currency,
      country: s.country,
    }));
  },

  async fetchDailyBars({ tickers, from, to }): Promise<ProviderDailyBar[]> {
    // FMP typically fetches per ticker for historical price full/line
    const out: ProviderDailyBar[] = [];
    for (const t of tickers) {
      const data = await getJson(`/historical-price-eod/full?symbol=${encodeURIComponent(t)}&from=${from}&to=${to}`);
      const hist = data?.historical ?? [];
      for (const r of hist) {
        out.push({
          ticker: t,
          d: r.date,
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
          volume: r.volume,
          vwap: r.vwap ?? null,
        });
      }
    }
    return out;
  },

  async fetchFundamentalsQuarterly({ tickers }): Promise<ProviderFundamentalQuarter[]> {
    const out: ProviderFundamentalQuarter[] = [];
    for (const t of tickers) {
      // Example: income statement quarterly
      const inc = await getJson(`/income-statement?symbol=${encodeURIComponent(t)}&period=quarter&limit=12`);
      const cf = await getJson(`/cash-flow-statement?symbol=${encodeURIComponent(t)}&period=quarter&limit=12`);
      const bs = await getJson(`/balance-sheet-statement?symbol=${encodeURIComponent(t)}&period=quarter&limit=12`);

      const byEnd = new Map<string, any>();
      for (const row of inc ?? []) byEnd.set(row.date, { ...(byEnd.get(row.date) ?? {}), inc: row });
      for (const row of cf ?? []) byEnd.set(row.date, { ...(byEnd.get(row.date) ?? {}), cf: row });
      for (const row of bs ?? []) byEnd.set(row.date, { ...(byEnd.get(row.date) ?? {}), bs: row });

      for (const [period_end, combo] of byEnd.entries()) {
        const i = combo.inc ?? {};
        const c = combo.cf ?? {};
        const b = combo.bs ?? {};
        out.push({
          ticker: t,
          period_end,
          revenue: i.revenue ?? null,
          gross_profit: i.grossProfit ?? null,
          operating_income: i.operatingIncome ?? null,
          net_income: i.netIncome ?? null,
          eps_basic: i.eps ?? null,
          eps_diluted: i.epsdiluted ?? null,
          free_cash_flow: c.freeCashFlow ?? null,
          shares_diluted: i.weightedAverageShsDil ?? null,
          total_debt: b.totalDebt ?? null,
          cash_and_equivalents: b.cashAndCashEquivalents ?? null,
        });
      }
    }
    return out;
  },

  async fetchEvents({ tickers, from, to }): Promise<ProviderEvent[]> {
    // Skeleton: you can wire earnings calendar endpoint later.
    // Return empty for now (safe).
    return [];
  },
};
