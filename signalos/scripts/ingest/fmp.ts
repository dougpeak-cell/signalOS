// scripts/ingest/fmp.ts
// Uses FMP "stable" endpoints (NOT legacy /api/v3)

const BASE = "https://financialmodelingprep.com/stable";

const API_KEY = process.env.FMP_API_KEY;
if (!API_KEY) throw new Error("Missing FMP_API_KEY");

async function fetchJson(pathWithQuery: string) {
  const sep = pathWithQuery.includes("?") ? "&" : "?";
  const url = `${BASE}${pathWithQuery}${sep}apikey=${encodeURIComponent(API_KEY)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`FMP ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

// 1) Universe
export async function fetchStockList() {
  // /stock-list under stable base
  return fetchJson("/stock-list");
}

// 2) Daily EOD prices (full history; you can add &from=YYYY-MM-DD&to=YYYY-MM-DD later)
export async function fetchEodFull(symbol: string) {
  // stable/historical-price-eod/full?symbol=AAPL
  return fetchJson(`/historical-price-eod/full?symbol=${encodeURIComponent(symbol)}`);
}

// 3) Profile (sector/industry/marketCap, etc.)
export async function fetchProfile(symbol: string) {
  // stable/profile?symbol=AAPL
  return fetchJson(`/profile?symbol=${encodeURIComponent(symbol)}`);
}

// 4) Fundamentals (income statement)
export async function fetchIncomeStatement(symbol: string) {
  // stable/income-statement?symbol=AAPL
  return fetchJson(`/income-statement?symbol=${encodeURIComponent(symbol)}`);
}
