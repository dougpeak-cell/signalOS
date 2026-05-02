import type { MarketDataProvider, ProviderDailyBar, ProviderSymbol, ProviderFundamentalQuarter, ProviderEvent } from "./types";

function parseCSV(symbol: string, text: string) {
  // Stooq CSV columns: Date,Open,High,Low,Close,Volume
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
  const out: ProviderDailyBar[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",");
    if (row.length < 6) continue;
    const [d, o, h, l, c, v] = row;
    if (!d || d === "Date") continue;
    if (v && String(v).includes(".")) {
      console.log("Decimal volume seen", symbol, d, v);
    }
    const volNum = v ? Number(v) : NaN;
    const volume = Number.isFinite(volNum) ? Math.trunc(volNum) : null;

    out.push({
      ticker: "",
      d,
      open: o ? Number(o) : null,
      high: h ? Number(h) : null,
      low: l ? Number(l) : null,
      close: c ? Number(c) : null,
      volume,
      vwap: null,
    });
  }
  return out;
}

async function fetchStooqDaily(symbol: string) {
  // Stooq uses lowercase + ".us" for US stocks (aapl.us)
  const s = `${symbol.toLowerCase()}.us`;
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(s)}&i=d`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Stooq ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return parseCSV(symbol, text);
}

export const stooqProvider: MarketDataProvider = {
  name: "stooq",

  async fetchSymbols(): Promise<ProviderSymbol[]> {
    // We won't use this; universe-driven. Return empty.
    return [];
  },

  async fetchDailyBars({ tickers, from, to }) {
    const all: any[] = [];

    for (const t of tickers) {
      const bars = await fetchStooqDaily(t);

      // ✅ ensure mapping works
      for (const b of bars) b.ticker = t.trim().toUpperCase();

      const filtered = bars.filter((b) => b.d >= from && b.d <= to);
      all.push(...filtered);
    }

    return all;
  },

  async fetchFundamentalsQuarterly(_args): Promise<ProviderFundamentalQuarter[]> {
    return [];
  },

  async fetchEvents(): Promise<ProviderEvent[]> {
    return [];
  },
};
