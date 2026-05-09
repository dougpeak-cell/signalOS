import { NextResponse } from "next/server";
import {
  resolveStockTickerAlias,
  shouldSuppressSearchTicker,
} from "@/lib/stocks/symbolAliases";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchRow = {
  ticker: string;
  company_name: string | null;
  conviction: number | null;
};

type SymbolRow = {
  ticker: string;
  name: string | null;
};

type SearchResult = {
  ticker: string;
  name: string | null;
};

type MassiveTickerDetail = {
  results?: {
    ticker?: string;
    name?: string | null;
  } | null;
};

function normalizeTicker(ticker: string) {
  return resolveStockTickerAlias(ticker);
}

function buildSearchScore(result: SearchResult, rawQuery: string, hasSignalCoverage: boolean) {
  const query = rawQuery.trim().toLowerCase();
  const ticker = result.ticker.toLowerCase();
  const name = (result.name ?? "").toLowerCase();

  let score = hasSignalCoverage ? 100 : 0;

  if (ticker === query) score += 60;
  else if (ticker.startsWith(query)) score += 40;
  else if (ticker.includes(query)) score += 20;

  if (name === query) score += 50;
  else if (name.startsWith(query)) score += 30;
  else if (name.includes(query)) score += 15;

  return score;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limitRaw = Number(searchParams.get("limit") ?? 6);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 6;

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createSupabaseServerClient();
  const normalizedTickerQuery = normalizeTicker(q);
  const massiveApiKey =
    process.env.MASSIVE_API_KEY ?? process.env.NEXT_PUBLIC_MASSIVE_API_KEY ?? "";

  const signalLimit = Math.min(limit * 2, 40);
  const symbolLimit = Math.min(limit * 4, 100);

  const { data: signalData, error: signalError } = await supabase
    .from("signals")
    .select("ticker, company_name, conviction")
    .or(`ticker.ilike.%${q}%,company_name.ilike.%${q}%`)
    .order("conviction", { ascending: false })
    .limit(signalLimit);

  if (signalError) {
    console.error("Ticker search signal query failed:", signalError.message);
  }

  const { data: symbolData, error: symbolError } = await supabase
    .from("symbols")
    .select("ticker, name")
    .or(`ticker.ilike.%${q}%,name.ilike.%${q}%`)
    .limit(symbolLimit);

  if (symbolError) {
    console.error("Ticker search symbol fallback failed:", symbolError.message);
  }

  if (signalError && symbolError) {
    return NextResponse.json({ results: [] });
  }

  const merged = new Map<string, { result: SearchResult; hasSignalCoverage: boolean }>();

  const exactLookupTicker = resolveStockTickerAlias(normalizedTickerQuery);

  if (/^[A-Z.\-]{1,5}$/.test(normalizedTickerQuery) && massiveApiKey) {
    try {
      const exactResponse = await fetch(
        `https://api.massive.com/v3/reference/tickers/${encodeURIComponent(
          exactLookupTicker
        )}?apiKey=${massiveApiKey}`,
        {
          cache: "no-store",
          headers: {
            accept: "application/json",
          },
        }
      );

      if (exactResponse.ok) {
        const exactJson = (await exactResponse.json()) as MassiveTickerDetail;
        const exactRow = exactJson.results;
        const exactTicker = normalizeTicker(String(exactRow?.ticker ?? ""));

        if (exactTicker) {
          merged.set(exactTicker, {
            result: {
              ticker: exactTicker,
              name: typeof exactRow?.name === "string" ? exactRow.name : null,
            },
            hasSignalCoverage: false,
          });
        }
      }
    } catch (exactTickerError) {
      console.error("Ticker search exact fallback failed:", exactTickerError);
    }
  }

  for (const row of (signalData ?? []) as SearchRow[]) {
    const ticker = normalizeTicker(row.ticker);
    if (!ticker) continue;

    merged.set(ticker, {
      result: {
        ticker,
        name: row.company_name,
      },
      hasSignalCoverage: true,
    });
  }

  for (const row of (symbolData ?? []) as SymbolRow[]) {
    const ticker = normalizeTicker(row.ticker);
    if (!ticker || merged.has(ticker)) continue;

    merged.set(ticker, {
      result: {
        ticker,
        name: row.name,
      },
      hasSignalCoverage: false,
    });
  }

  const results = Array.from(merged.values())
    .filter(
      (entry) =>
        !shouldSuppressSearchTicker(q, entry.result.ticker, entry.result.name)
    )
    .sort((a, b) => {
      const scoreDiff =
        buildSearchScore(b.result, q, b.hasSignalCoverage) -
        buildSearchScore(a.result, q, a.hasSignalCoverage);

      if (scoreDiff !== 0) return scoreDiff;

      return a.result.ticker.localeCompare(b.result.ticker);
    })
    .slice(0, limit)
    .map((entry) => entry.result);

  return NextResponse.json({ results });
}
