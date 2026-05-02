import { NextRequest, NextResponse } from "next/server";

type SearchResult = {
  ticker: string;
  company: string;
  sector?: string;
};

const SEARCH_ALIASES: Record<string, string[]> = {
  EXXON: ["XOM"],
  EXXONMOBIL: ["XOM"],
  XON: ["XOM"],
};

function normalizeQuery(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeResults(results: any[]): SearchResult[] {
  return results
    .map((item) => ({
      ticker:
        typeof item.ticker === "string"
          ? item.ticker
          : typeof item.symbol === "string"
            ? item.symbol
            : "",
      company:
        typeof item.name === "string"
          ? item.name
          : typeof item.company === "string"
            ? item.company
            : "",
      sector:
        typeof item.sic_description === "string"
          ? item.sic_description
          : typeof item.sector === "string"
            ? item.sector
            : undefined,
    }))
    .filter((item) => item.ticker && item.company);
}

async function fetchTickerSearch(url: string): Promise<any[]> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!res.ok) return [];

  const data = await res.json();
  return Array.isArray(data?.results) ? data.results : [];
}

async function fetchTickerReference(ticker: string, apiKey: string): Promise<any | null> {
  const url = `https://api.massive.com/v3/reference/tickers/${encodeURIComponent(ticker)}?apiKey=${apiKey}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data?.results ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("query") ?? "").trim();

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const apiKey =
      process.env.MASSIVE_API_KEY ??
      process.env.NEXT_PUBLIC_MASSIVE_API_KEY ??
      "";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing Massive API key in environment." },
        { status: 500 }
      );
    }

    const q = encodeURIComponent(query);
    const rawResults = await fetchTickerSearch(
      `https://api.massive.com/v3/reference/tickers?search=${q}&active=true&limit=10&apiKey=${apiKey}`
    );

    const aliasTickers = SEARCH_ALIASES[normalizeQuery(query)] ?? [];
    const aliasResults = await Promise.all(
      aliasTickers
        .filter(
          (ticker) =>
            !rawResults.some(
              (item) =>
                (typeof item?.ticker === "string" ? item.ticker : item?.symbol) === ticker
            )
        )
        .map((ticker) => fetchTickerReference(ticker, apiKey))
    );

    return NextResponse.json({
      results: normalizeResults([
        ...aliasResults.filter(Boolean),
        ...rawResults,
      ]),
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}