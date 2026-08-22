export type TalentAccount = {
  id: string;
  user_id: string;
  starting_talents: number;
  cash_talents: number;
  created_at: string;
  updated_at: string;
};

export type TalentPosition = {
  id: string;
  user_id: string;
  account_id: string;
  symbol: string;
  quantity: number;
  average_price: number;
  created_at: string;
  updated_at: string;
};

export type TalentTrade = {
  id: string;
  user_id: string;
  account_id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  execution_price: number;
  talent_amount: number;
  created_at: string;
};

export type TalentPositionView = TalentPosition & {
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
};