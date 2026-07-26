import { createSupabaseServerClient } from "../supabase/server";

export type SignalRow = {
  ticker: string;
  name: string | null;
  d: string; // date
  conviction: number | null;
  tier: string | null;
  thesis_short: string | null;
};

export type SignalDetailRow = {
  id?: number;
  ticker: string;
  company_name: string | null;
  sector: string | null;
  price: number | null;
  conviction: number | null;
  entry_low: number | null;
  entry_high: number | null;
  stop_loss: number | null;
  target_price: number | null;
  thesis: string | null;
  catalysts: string[] | null;
  risks: string[] | null;
  tier: string | null;
  as_of_date: string | null;
  momentum_3m?: number | null;
  created_at?: string | null;
};

const SIGNAL_DETAIL_COLUMNS = `
  id,
  ticker,
  company_name,
  sector,
  price,
  conviction,
  entry_low,
  entry_high,
  stop_loss,
  target_price,
  thesis,
  catalysts,
  risks,
  tier,
  as_of_date,
  created_at
`;

function normalizeTicker(ticker: string) {
  const raw = String(ticker ?? "").trim().toUpperCase();
  return raw === "APPL" ? "AAPL" : raw;
}

function buildFallbackSignalDetailRow(
  ticker: string,
  companyName: string | null = null
): SignalDetailRow {
  return {
    ticker,
    company_name: companyName,
    sector: null,
    price: null,
    conviction: null,
    entry_low: null,
    entry_high: null,
    stop_loss: null,
    target_price: null,
    thesis: null,
    catalysts: [],
    risks: [],
    tier: null,
    as_of_date: null,
    created_at: null,
  };
}

export async function fetchLatestSignals(): Promise<{ asOf: string | null; rows: SignalRow[] }> {
  const supabase = await createSupabaseServerClient();

  const { data: maxRow, error: maxErr } = await supabase
    .from("signals_daily")
    .select("d")
    .order("d", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxErr) throw maxErr;

  const asOf = maxRow?.d ?? null;
  if (!asOf) return { asOf: null, rows: [] };

  const { data, error } = await supabase
    .from("signals_daily")
    .select(
      `
      d,
      conviction,
      tier,
      thesis_short,
      symbol:symbols!signals_daily_symbol_id_fkey(
        ticker,
        name
      )
    `
    )
    .eq("d", asOf);

  if (error) throw error;

  const rows: SignalRow[] = (data ?? []).map((r: any) => ({
    ticker: r.symbol?.ticker ?? "—",
    name: r.symbol?.name ?? null,
    d: r.d,
    conviction: r.conviction ?? null,
    tier: r.tier ?? null,
    thesis_short: r.thesis_short ?? null,
  }));

  return { asOf, rows };
}

export async function fetchLatestSignalRows(limit = 24): Promise<SignalDetailRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data: latestDaily, error: dailyError } = await supabase
    .from("signals_daily")
    .select(
      `
      d,
      conviction,
      tier,
      thesis_short,
      ret_3m,
      symbol:symbols!signals_daily_symbol_id_fkey(
        ticker,
        name
      )
    `
    )
    .order("d", { ascending: false })
    .order("conviction", { ascending: false })
    .limit(limit);

  const dailyRows = (latestDaily ?? []).filter((row: any) => row.symbol?.ticker);
  const latestDate = dailyRows[0]?.d ?? null;
  const currentDailyRows = latestDate
    ? dailyRows.filter((row: any) => row.d === latestDate)
    : [];
  const dailyTickers = currentDailyRows.map((row: any) => normalizeTicker(row.symbol.ticker));

  const legacyQuery = supabase
    .from("signals")
    .select(SIGNAL_DETAIL_COLUMNS)
    .order("as_of_date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("conviction", { ascending: false });
  const { data, error } = dailyTickers.length
    ? await legacyQuery.in("ticker", dailyTickers)
    : await legacyQuery.limit(limit);

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Signals query failed:", message);
  }

  if (dailyError || !currentDailyRows.length) {
    if (dailyError) {
      console.warn("Daily signals query failed:", dailyError.message);
    }
    return (data ?? []) as SignalDetailRow[];
  }

  const legacyByTicker = new Map<string, SignalDetailRow>();
  for (const row of (data ?? []) as SignalDetailRow[]) {
    const ticker = normalizeTicker(row.ticker);
    if (!legacyByTicker.has(ticker)) legacyByTicker.set(ticker, row);
  }

  return currentDailyRows.map((row: any) => {
    const ticker = normalizeTicker(row.symbol.ticker);
    const legacy = legacyByTicker.get(ticker);

    return {
      ...buildFallbackSignalDetailRow(ticker, row.symbol.name ?? null),
      ...legacy,
      ticker,
      company_name: legacy?.company_name ?? row.symbol.name ?? null,
      conviction: row.conviction ?? null,
      thesis: row.thesis_short ?? legacy?.thesis ?? null,
      tier: row.tier ?? null,
      as_of_date: row.d,
      momentum_3m: row.ret_3m ?? null,
    };
  });
}

export async function fetchSignalByTicker(ticker: string): Promise<SignalDetailRow | null> {
  const supabase = await createSupabaseServerClient();
  const normalized = normalizeTicker(ticker);

  if (!normalized) return null;

  const { data, error } = await supabase
    .from("signals")
    .select(SIGNAL_DETAIL_COLUMNS)
    .eq("ticker", normalized)
    .order("as_of_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    return data as SignalDetailRow;
  }

  if (error) {
    console.error("Signal lookup failed:", error.message);
  }

  const { data: symbolRow, error: symbolError } = await supabase
    .from("symbols")
    .select("ticker, name")
    .eq("ticker", normalized)
    .maybeSingle();

  if (symbolError) {
    console.error("Symbol fallback lookup failed:", symbolError.message);
    return null;
  }

  if (symbolRow?.ticker) {
    return buildFallbackSignalDetailRow(
      normalizeTicker(symbolRow.ticker),
      symbolRow.name ?? null
    );
  }

  return null;
}

export async function fetchSignalsForTickers(
  tickers: string[]
): Promise<SignalDetailRow[]> {
  const supabase = await createSupabaseServerClient();
  const normalized = Array.from(
    new Set(tickers.map((ticker) => normalizeTicker(ticker)).filter(Boolean))
  );

  if (!normalized.length) return [];

  const { data, error } = await supabase
    .from("signals")
    .select(SIGNAL_DETAIL_COLUMNS)
    .in("ticker", normalized)
    .order("as_of_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Signals lookup failed:", message);
    return [];
  }

  const rows = (data ?? []) as SignalDetailRow[];
  const seen = new Set(rows.map((row) => normalizeTicker(row.ticker)));
  const missing = normalized.filter((ticker) => !seen.has(ticker));

  if (!missing.length) return rows;

  const { data: symbolRows, error: symbolError } = await supabase
    .from("symbols")
    .select("ticker, name")
    .in("ticker", missing);

  if (symbolError) {
    console.error("Symbol fallback batch lookup failed:", symbolError.message);
    return rows;
  }

  const fallbackRows: SignalDetailRow[] = (symbolRows ?? []).map((row: any) =>
    buildFallbackSignalDetailRow(normalizeTicker(row.ticker), row.name ?? null)
  );

  return [...rows, ...fallbackRows];
}
