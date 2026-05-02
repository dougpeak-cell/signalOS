// scripts/signals/buildConviction.ts
import { supabaseAdmin } from "../ingest/_supabase";

type PriceRow = {
  symbol_id: number;
  d: string; // YYYY-MM-DD
  close: number | null;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function pctChange(a: number, b: number) {
  // a = end, b = start
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return a / b - 1;
}

function stdev(xs: number[]) {
  if (xs.length < 2) return null;
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  const v = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

function maxDrawdown(closes: number[]) {
  // closes in chronological order
  let peak = -Infinity;
  let mdd = 0;
  for (const c of closes) {
    peak = Math.max(peak, c);
    const dd = peak > 0 ? c / peak - 1 : 0;
    mdd = Math.min(mdd, dd);
  }
  return mdd; // negative number
}

function scoreConviction(ret3m: number | null, vol30: number | null, dd6m: number | null, upPct20: number | null) {
  // Simple, interpretable scoring:
  // - reward 3M momentum
  // - penalize volatility
  // - penalize drawdown
  // - reward trend quality

  const r = ret3m ?? 0;
  const v = vol30 ?? 0.25;
  const dd = dd6m ?? -0.15;
  const up = upPct20 ?? 0.5;

  // normalize roughly into 0..1 bands
  const mom = clamp((r + 0.20) / 0.50, 0, 1);        // -20%..+30%
  const vol = 1 - clamp((v - 0.15) / 0.35, 0, 1);    // 15%..50% annualized
  const draw = 1 - clamp((Math.abs(dd) - 0.05) / 0.35, 0, 1); // 5%..40%
  const trend = clamp((up - 0.45) / 0.20, 0, 1);     // 45%..65%

  const raw = 0.45 * mom + 0.20 * vol + 0.20 * draw + 0.15 * trend;
  return Math.round(clamp(raw, 0, 1) * 100);
}

function tierFromScore(score: number) {
  if (score >= 70) return "Strong";
  if (score >= 55) return "Neutral";
  return "Risk";
}

async function main() {
  // Use latest date in prices_daily
  const { data: maxD, error: maxErr } = await supabaseAdmin
    .from("prices_daily")
    .select("d")
    .order("d", { ascending: false })
    .limit(1);

  if (maxErr) throw maxErr;
  const asOf = maxD?.[0]?.d;
  if (!asOf) throw new Error("No prices_daily data found.");

  console.log("Building signals as of:", asOf);


    const { data: symbols, error: symErr } = await supabaseAdmin
      .from("symbols")
      .select("id,ticker")
      .in("ticker", ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL"]);

    if (symErr) throw symErr;

    const bySymbol = new Map<number, PriceRow[]>();

    for (const sym of symbols ?? []) {
      const sid = Number(sym.id);

      const { data: rows, error } = await supabaseAdmin
        .from("prices_daily")
        .select("symbol_id,d,close")
        .eq("symbol_id", sid)
        .order("d", { ascending: true });

      if (error) throw error;

      bySymbol.set(
        sid,
        (rows ?? []).map((r: any) => ({
          symbol_id: Number(r.symbol_id),
          d: String(r.d),
          close: r.close == null ? null : Number(r.close),
        }))
      );
    }

  const out: any[] = [];

  for (const [sid, series] of bySymbol.entries()) {

    const s = series.filter((x) => x.close != null) as {
      symbol_id: number;
      d: string;
      close: number;
    }[];

    if (sid === 1 || sid === 2 || sid === 3 || sid === 4 || sid === 5 || sid === 6 || sid === 7) {
      // ignore
    }


    // ✅ you have 544 rows each, but keep a safe floor
    if (s.length < 40) continue;

    const latest = s[s.length - 1];
    const asOfSym = latest.d;

    // helper: close N trading days back
    const closeAt = (nBack: number) => {
      const idx = s.length - 1 - nBack;
      return idx >= 0 ? s[idx].close : null;
    };

    const c0 = latest.close;
    const c20 = closeAt(20);
    const c63 = closeAt(63);
    const c126 = closeAt(126);

    const ret_1m = c20 != null ? pctChange(c0, c20) : null;
    const ret_3m = c63 != null ? pctChange(c0, c63) : null;
    const ret_6m = c126 != null ? pctChange(c0, c126) : null;

    // 30D vol from daily log returns
    const last31 = s.slice(Math.max(0, s.length - 31));
    const rets: number[] = [];
    for (let i = 1; i < last31.length; i++) {
      const a = last31[i].close;
      const b = last31[i - 1].close;
      if (b > 0) rets.push(Math.log(a / b));
    }
    const sd = stdev(rets);
    const vol_30d = sd == null ? null : sd * Math.sqrt(252);

    // 6M drawdown (negative number)
    const last6m = s.slice(Math.max(0, s.length - 126));
    const closes6m = last6m.map((x) => x.close);
    const dd_6m = closes6m.length ? maxDrawdown(closes6m) : null;

    // % up days last 20 sessions
    const last21 = s.slice(Math.max(0, s.length - 21));
    let upDays = 0;
    let total = 0;
    for (let i = 1; i < last21.length; i++) {
      total++;
      if (last21[i].close > last21[i - 1].close) upDays++;
    }
    const up_pct_20d = total ? upDays / total : null;

    const conviction = scoreConviction(ret_3m, vol_30d, dd_6m, up_pct_20d);
    const tier = tierFromScore(conviction);

    out.push({
      symbol_id: sid,
      d: asOfSym,

      ret_1m,
      ret_3m,
      ret_6m,
      vol_30d,
      dd_6m,
      up_pct_20d,

      conviction,
      tier,
      updated_at: new Date().toISOString(),
    });
  }

  console.log("Upserting signals rows:", out.length);

  const { error: upErr } = await supabaseAdmin
    .from("signals_daily")
    .upsert(out as any, { onConflict: "symbol_id,d" });

  if (upErr) throw upErr;

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
