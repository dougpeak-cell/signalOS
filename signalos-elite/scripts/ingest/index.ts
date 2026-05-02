import { stooqProvider } from "./providers/stooq";
// scripts/ingest/index.ts
import { supabaseAdmin } from "./_supabase";
import { finnhubProvider } from "./providers/finnhub";
import type { MarketDataProvider, ProviderDailyBar } from "./providers/types";

function todayISODate() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function daysAgoISODate(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function envBool(name: string, def = false) {
  const v = (process.env[name] ?? "").trim().toLowerCase();
  if (!v) return def;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function envStr(name: string, def: string) {
  return (process.env[name] ?? def).trim();
}

function envTickers(): string[] {
  const raw = envStr("UNIVERSE_TICKERS", "AAPL,MSFT,NVDA,TSLA");
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

async function getProvider(): Promise<MarketDataProvider> {
  // Finnhub only for now
  const p = (process.env.PRICES_PROVIDER ?? "stooq").toLowerCase();
  if (p === "stooq") return stooqProvider;
  if (p === "finnhub") return finnhubProvider; // if you later upgrade candles
  return stooqProvider;
}

async function ensureUniverseSymbols(tickers: string[]) {
  const rows = tickers.map((t) => ({
    ticker: t,
    name: t,
    exchange: null,      // keep if your schema has it
    is_active: true,
  }));

  // ✅ match the UNIQUE(ticker) constraint you added
  const { error } = await supabaseAdmin
    .from("symbols")
    .upsert(rows as any, { onConflict: "ticker" });

  if (error) throw error;
}

async function loadSymbolIdMap(tickers: string[]) {
  const wanted = tickers.map((t) => t.trim().toUpperCase());

  const { data, error } = await supabaseAdmin
    .from("symbols")
    .select("id,ticker");

  if (error) throw error;

  const m = new Map<string, number>();
  for (const r of data ?? []) {
    const t = String((r as any).ticker ?? "").trim().toUpperCase();
    const id = Number((r as any).id);
    if (t && Number.isFinite(id)) m.set(t, id);
  }

  const have = wanted.filter((t) => m.has(t));
  const missing = wanted.filter((t) => !m.has(t));

  console.log(`Symbol map loaded: ${have.length}/${wanted.length}`);
  if (missing.length) console.log("Missing tickers in symbols table:", missing.join(", "));

  return m;
}

async function upsertPricesDaily(symbolIdByTicker: Map<string, number>, bars: ProviderDailyBar[]) {

  console.log("Example bar tickers:", bars.slice(0, 5).map((b) => b.ticker));
  if (!bars.length) return 0;


  const rows = bars
    .map((b) => {
      const sid = symbolIdByTicker.get(String(b.ticker).toUpperCase());
      if (!sid) return null;
      return {
        symbol_id: sid,
        d: b.d,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
        vwap: b.vwap,
        provider: "finnhub",
      };
    })
    .filter(Boolean) as any[];

  console.log("Rows prepared for upsert:", rows.length);
  if (!rows.length) return 0;

  const { error } = await supabaseAdmin
    .from("prices_daily")
    .upsert(rows as any, { onConflict: "symbol_id,d" });

  if (error) throw error;
  return rows.length;
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const provider = await getProvider();

  const tickers = envTickers();

  // dates
  const to = envStr("TO_DATE", todayISODate());
  const from = envStr("FROM_DATE", daysAgoISODate(365));

  // knobs
  const throttleMs = Number(envStr("THROTTLE_MS", "350")); // keeps you safe on Finnhub
  const batchSize = Number(envStr("BATCH_SIZE", "5"));

  console.log(`Provider: ${provider.name}`);
  console.log(`Universe: ${tickers.join(", ")}`);
  console.log(`Range: ${from} → ${to}`);

  // Ensure symbols exist
  // await ensureUniverseSymbols(tickers);
  const symbolIdByTicker = await loadSymbolIdMap(tickers);

  let inserted = 0;

  // Finnhub candle endpoint is per symbol; we still chunk to control rate + memory

  for (const group of chunk(tickers, batchSize)) {
    // optional: small pause between groups
    if (throttleMs > 0) await sleep(throttleMs);

    console.log("Fetching", group.join(", "));
    const bars = await provider.fetchDailyBars({ tickers: group, from, to });
    console.log("Fetched bars:", bars.length);
    const n = await upsertPricesDaily(symbolIdByTicker, bars);
    inserted += n;

    console.log(`Inserted ${n} price rows for ${group.join(", ")}`);
  }

  console.log(`Done. Total inserted/upserted rows: ${inserted}`);
}

main().catch((err) => {
  console.error("❌ Ingestion failed:", err?.message ?? err);
  process.exit(1);
});
