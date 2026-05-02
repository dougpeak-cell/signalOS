type Inputs = {
  pe: number | null;
  peg: number | null;
  marketCap: number | null;
  revenue: number | null;
  netIncome: number | null;
  cash: number | null;
  debt: number | null;
  dividendYield: number | null;
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

// --------------------
// Individual scorers
// --------------------

function scoreValuation(pe: number | null, peg: number | null) {
  let score = 50;

  if (pe != null) {
    if (pe < 15) score += 20;
    else if (pe < 25) score += 10;
    else if (pe > 50) score -= 20;
  }

  if (peg != null) {
    if (peg < 1) score += 20;
    else if (peg > 2) score -= 15;
  }

  return clamp(score);
}

function scoreGrowth(revenue: number | null, netIncome: number | null) {
  if (!revenue || !netIncome) return 50;

  const score =
    revenue > 0 && netIncome > 0
      ? 80
      : revenue > 0
        ? 60
        : 30;

  return clamp(score);
}

function scoreBalanceSheet(cash: number | null, debt: number | null) {
  if (cash == null || debt == null) return 50;

  if (cash > debt * 1.5) return 85;
  if (cash > debt) return 70;
  if (debt > cash * 2) return 30;

  return 55;
}

function scoreProfitability(netIncome: number | null) {
  if (netIncome == null) return 50;
  return netIncome > 0 ? 75 : 25;
}

function scoreIncome(dividendYield: number | null) {
  if (dividendYield == null) return 40;

  if (dividendYield > 3) return 80;
  if (dividendYield > 1) return 60;

  return 40;
}

// --------------------
// Final composite
// --------------------

export function computeFundamentalScore(input: Inputs) {
  const valuation = scoreValuation(input.pe, input.peg);
  const growth = scoreGrowth(input.revenue, input.netIncome);
  const balance = scoreBalanceSheet(input.cash, input.debt);
  const profitability = scoreProfitability(input.netIncome);
  const income = scoreIncome(input.dividendYield);

  const composite =
    valuation * 0.25 +
    growth * 0.25 +
    balance * 0.2 +
    profitability * 0.15 +
    income * 0.15;

  return {
    composite: Math.round(composite),
    breakdown: {
      valuation,
      growth,
      balance,
      profitability,
      income,
    },
  };
}
