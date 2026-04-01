import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchRow = {
  ticker: string;
  company_name: string | null;
  conviction: number | null;
};

type SearchResult = {
  ticker: string;
  name: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limitRaw = Number(searchParams.get("limit") ?? 6);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 6;

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("signals")
    .select("ticker, company_name, conviction")
    .or(`ticker.ilike.%${q}%,company_name.ilike.%${q}%`)
    .order("conviction", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Ticker search failed:", error.message);
    return NextResponse.json({ results: [] });
  }

  const results: SearchResult[] = (data ?? []).map((row: SearchRow) => ({
    ticker: row.ticker,
    name: row.company_name,
  }));

  return NextResponse.json({ results });
}
