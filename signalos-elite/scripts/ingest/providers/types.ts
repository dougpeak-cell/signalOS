export type ProviderSymbol = {
  ticker: string;
  name: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  country?: string;
  currency?: string;
};

export type ProviderDailyBar = {
  ticker: string;
  d: string; // YYYY-MM-DD
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
  vwap?: number | null;
};

export type ProviderFundamentalQuarter = {
  ticker: string;
  period_end: string; // YYYY-MM-DD
  fiscal_year?: number | null;
  fiscal_quarter?: number | null;
  revenue?: number | null;
  gross_profit?: number | null;
  operating_income?: number | null;
  net_income?: number | null;
  eps_basic?: number | null;
  eps_diluted?: number | null;
  free_cash_flow?: number | null;
  shares_diluted?: number | null;
  total_debt?: number | null;
  cash_and_equivalents?: number | null;
};

export type ProviderEvent = {
  ticker: string;
  event_type: string; // earnings/dividend/etc
  event_date?: string | null; // YYYY-MM-DD
  event_time?: string | null; // ISO
  title?: string | null;
  payload?: any;
};

export interface MarketDataProvider {
  name: string;
  fetchSymbols(): Promise<ProviderSymbol[]>;
  fetchDailyBars(opts: { tickers: string[]; from: string; to: string }): Promise<ProviderDailyBar[]>;
  fetchFundamentalsQuarterly(opts: { tickers: string[] }): Promise<ProviderFundamentalQuarter[]>;
  fetchEvents(opts: { tickers: string[]; from: string; to: string }): Promise<ProviderEvent[]>;
}
