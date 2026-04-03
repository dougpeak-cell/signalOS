
export type PortfolioPosition = {
  id: number;
  ticker: string;

  shares: number;
  avg_cost: number;

  notes?: string | null;

  company_name?: string | null;
  sector?: string | null;
  tier?: string | null;

  current_price?: number | null;
  prev_close?: number | null;
  previous_close?: number | null;
  unrealized_pl?: number | null;
  unrealized_pl_pct?: number | null;

  target_price?: number | null;
  upside_to_target_pct?: number | null;
  market_value?: number | null;
  stop_loss?: number | null;
  conviction?: number | null;
};

export type TickerOption = {
  symbol: string;
  name?: string;
};
