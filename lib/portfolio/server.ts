import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

export async function isTickerInPortfolio(ticker: string) {
  const normalizedTicker = normalizeTicker(ticker);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("portfolio_holdings")
    .select("id")
    .eq("ticker", normalizedTicker)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

export async function addTickerToPortfolioRecord({
  ticker,
  averageCost,
}: {
  ticker: string;
  averageCost?: number | null;
}) {
  const normalizedTicker = normalizeTicker(ticker);
  const alreadyInPortfolio = await isTickerInPortfolio(normalizedTicker);

  if (alreadyInPortfolio) {
    return {
      ticker: normalizedTicker,
      added: false,
      alreadyInPortfolio: true,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("portfolio_holdings").insert({
    ticker: normalizedTicker,
    shares: 0,
    avg_cost:
      typeof averageCost === "number" && Number.isFinite(averageCost) && averageCost > 0
        ? averageCost
        : null,
    notes: "Quick added from stock workflow",
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    ticker: normalizedTicker,
    added: true,
    alreadyInPortfolio: false,
  };
}