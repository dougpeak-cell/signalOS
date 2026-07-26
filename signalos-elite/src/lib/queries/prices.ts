import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CompletedPriceStats = {
  ticker: string;
  date: string;
  close: number;
  changePercent: number | null;
  volume: number;
  avgVolume: number | null;
  rvol: number | null;
};

function normalizeTicker(value: string): string {
  return String(value ?? "").trim().toUpperCase();
}

function finiteNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function fetchCompletedPriceStats(
  tickers: string[]
): Promise<Record<string, CompletedPriceStats>> {
  const supabase = await createSupabaseServerClient();
  const normalized = Array.from(new Set(tickers.map(normalizeTicker).filter(Boolean)));
  if (!normalized.length) return {};

  const { data: symbols, error: symbolError } = await supabase
    .from("symbols")
    .select("id,ticker")
    .in("ticker", normalized);

  if (symbolError) {
    console.warn("Price symbol lookup failed:", symbolError.message);
    return {};
  }

  const entries = await Promise.all(
    (symbols ?? []).map(async (symbol: any) => {
      const { data, error } = await supabase
        .from("prices_daily")
        .select("d,close,volume")
        .eq("symbol_id", symbol.id)
        .order("d", { ascending: false })
        .limit(21);

      if (error || !data?.length) return null;

      const latestClose = finiteNumber(data[0].close);
      const latestVolume = finiteNumber(data[0].volume);
      if (latestClose == null || latestClose <= 0 || latestVolume == null) return null;

      const previousClose = finiteNumber(data[1]?.close);
      const priorVolumes = data
        .slice(1)
        .map((row: any) => finiteNumber(row.volume))
        .filter((value): value is number => value != null && value >= 0);
      const avgVolume = priorVolumes.length
        ? priorVolumes.reduce((sum, value) => sum + value, 0) / priorVolumes.length
        : null;
      const ticker = normalizeTicker(symbol.ticker);

      return [
        ticker,
        {
          ticker,
          date: String(data[0].d),
          close: latestClose,
          changePercent:
            previousClose != null && previousClose > 0
              ? ((latestClose - previousClose) / previousClose) * 100
              : null,
          volume: latestVolume,
          avgVolume,
          rvol: avgVolume != null && avgVolume > 0 ? latestVolume / avgVolume : null,
        },
      ] as const;
    })
  );

  return Object.fromEntries(entries.filter((entry) => entry != null));
}