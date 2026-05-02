import { NextRequest, NextResponse } from "next/server";

type FundamentalsPayload = {
  ticker: string;
  name: string | null;
  marketCap: number | null;
  volume: number | null;
  avgVolume: number | null;
  pe: number | null;
  peg: number | null;
  revenue: number | null;
  previousRevenue: number | null;
  twoYearsAgoRevenue: number | null;
  netIncome: number | null;
  cash: number | null;
  debt: number | null;
  dividendYield: number | null;
  source: "massive";
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function safeJson(url: string) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!res.ok) return null;

  try {
    return await res.json();
  } catch {
    return null;
  }
}

function firstResult<T = Record<string, unknown>>(data: unknown): T | null {
  if (!data) return null;

  if (Array.isArray(data)) {
    return (data[0] as T) ?? null;
  }

  if (typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  if (Array.isArray(obj.results)) {
    return (obj.results[0] as T) ?? null;
  }

  if (obj.results && typeof obj.results === "object") {
    return obj.results as T;
  }

  return data as T;
}

function allResults<T = Record<string, unknown>>(data: unknown): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];

  if (typeof data !== "object") return [];

  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.results)) return obj.results as T[];

  return [];
}

function getFieldValue(
  source: Record<string, unknown> | null,
  paths: string[]
): number | null {
  if (!source) return null;

  for (const path of paths) {
    const parts = path.split(".");
    let current: unknown = source;

    for (const part of parts) {
      if (!current || typeof current !== "object") {
        current = null;
        break;
      }

      current = (current as Record<string, unknown>)[part];
    }

    const parsed = toNumber(current);
    if (parsed != null) return parsed;
  }

  return null;
}

function extractRevenueFromStatement(source: Record<string, unknown> | null) {
  return getFieldValue(source, [
    "revenue",
    "revenues",
    "total_revenue",
    "sales",
  ]);
}

function round(value: number | null, digits = 4) {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function computeTrailingAnnualDividends(
  dividendRows: Record<string, unknown>[]
): number | null {
  if (!dividendRows.length) return null;

  const withDates = dividendRows
    .map((row) => {
      const exDate =
        typeof row.ex_dividend_date === "string"
          ? row.ex_dividend_date
          : typeof row.exDate === "string"
            ? row.exDate
            : typeof row["ex_dividend_date"] === "string"
              ? (row["ex_dividend_date"] as string)
              : null;

      const cashAmount =
        toNumber(row.cash_amount) ??
        toNumber(row.cashAmount) ??
        toNumber(row.amount) ??
        toNumber(row.dividend) ??
        null;

      if (!exDate || cashAmount == null) return null;

      return {
        exDate,
        cashAmount,
      };
    })
    .filter(
      (item): item is { exDate: string; cashAmount: number } => item !== null
    )
    .sort((a, b) => b.exDate.localeCompare(a.exDate));

  if (!withDates.length) return null;

  const latest = withDates[0].exDate;
  const latestDate = new Date(latest);

  if (Number.isNaN(latestDate.getTime())) return null;

  const trailingCutoff = new Date(latestDate);
  trailingCutoff.setFullYear(trailingCutoff.getFullYear() - 1);

  const sum = withDates
    .filter((item) => {
      const d = new Date(item.exDate);
      return !Number.isNaN(d.getTime()) && d >= trailingCutoff && d <= latestDate;
    })
    .reduce((acc, item) => acc + item.cashAmount, 0);

  return sum > 0 ? sum : null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawTicker = searchParams.get("ticker") ?? "";
    const ticker = rawTicker.trim().toUpperCase();
    const debug = searchParams.get("debug") === "1";

    if (!ticker) {
      return NextResponse.json(
        { error: "Missing ticker query param." },
        { status: 400 }
      );
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

    const symbol = encodeURIComponent(ticker);

    const overviewUrl =
      `https://api.massive.com/v3/reference/tickers/${symbol}?apiKey=${apiKey}`;

    const snapshotUrl =
      `https://api.massive.com/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apiKey=${apiKey}`;

    const ratiosUrl =
      `https://api.massive.com/stocks/financials/v1/ratios?ticker=${symbol}&limit=1&sort=period_end.desc&apiKey=${apiKey}`;

    const balanceSheetsUrl =
      `https://api.massive.com/stocks/financials/v1/balance-sheets?ticker=${symbol}&timeframe=annual&limit=1&sort=period_end.desc&apiKey=${apiKey}`;

    const incomeStatementsUrl =
      `https://api.massive.com/stocks/financials/v1/income-statements?ticker=${symbol}&timeframe=annual&limit=3&sort=period_end.desc&apiKey=${apiKey}`;

    const dividendsUrl =
      `https://api.massive.com/stocks/corporate-actions/v1/dividends?ticker=${symbol}&limit=8&sort=ex_dividend_date.desc&apiKey=${apiKey}`;

    const legacyFinancialsUrl =
      `https://api.massive.com/stocks/fundamentals/financials?ticker=${symbol}&limit=1&apiKey=${apiKey}`;

    const [
      overviewData,
      snapshotData,
      ratiosData,
      balanceSheetData,
      incomeStatementData,
      dividendsData,
      legacyFinancialsData,
    ] = await Promise.all([
      safeJson(overviewUrl),
      safeJson(snapshotUrl),
      safeJson(ratiosUrl),
      safeJson(balanceSheetsUrl),
      safeJson(incomeStatementsUrl),
      safeJson(dividendsUrl),
      safeJson(legacyFinancialsUrl),
    ]);

    const overview = firstResult<Record<string, unknown>>(overviewData);
    const snapshot = firstResult<Record<string, unknown>>(snapshotData);
    const ratios = firstResult<Record<string, unknown>>(ratiosData);
    const balanceSheet = firstResult<Record<string, unknown>>(balanceSheetData);
    const incomeStatement = firstResult<Record<string, unknown>>(incomeStatementData);
    const incomeStatements = allResults<Record<string, unknown>>(incomeStatementData);
    const legacyFinancials = firstResult<Record<string, unknown>>(legacyFinancialsData);
    const dividendRows = allResults<Record<string, unknown>>(dividendsData);

    const eps =
      getFieldValue(incomeStatement, [
        "basic_earnings_per_share",
        "diluted_earnings_per_share",
      ]) ??
      getFieldValue(legacyFinancials, [
        "basic_earnings_per_share",
        "diluted_earnings_per_share",
        "eps",
      ]) ??
      null;

    const price =
      getFieldValue(snapshot, ["ticker.day.c", "day.c"]) ??
      getFieldValue(snapshot, ["ticker.prevDay.c", "prevDay.c"]) ??
      null;

    const pe =
      eps != null && price != null && eps > 0
        ? round(price / eps, 4)
        : null;

    const currentDebt =
      getFieldValue(balanceSheet, [
        "debt_current",
        "current_debt",
        "debtCurrent",
      ]) ??
      getFieldValue(legacyFinancials, [
        "debt_current",
        "current_debt",
        "debtCurrent",
      ]) ??
      0;

    const longTermDebt =
      getFieldValue(balanceSheet, [
        "long_term_debt",
        "total_long_term_debt",
        "longTermDebt",
        "long_term_debt_and_capital_lease_obligations",
        "longTermDebtAndCapitalLeaseObligations",
      ]) ??
      getFieldValue(legacyFinancials, [
        "long_term_debt",
        "total_long_term_debt",
        "longTermDebt",
        "long_term_debt_and_capital_lease_obligations",
        "longTermDebtAndCapitalLeaseObligations",
      ]) ??
      0;

    const totalDebtDirect =
      getFieldValue(balanceSheet, [
        "total_debt",
        "totalDebt",
      ]) ??
      getFieldValue(legacyFinancials, [
        "total_debt",
        "totalDebt",
      ]) ??
      null;

    const computedDebt =
      totalDebtDirect ??
      (currentDebt > 0 || longTermDebt > 0 ? currentDebt + longTermDebt : null);

    const annualDividend =
      computeTrailingAnnualDividends(dividendRows);

    const computedDividendYield =
      annualDividend != null && price != null && price > 0
        ? round((annualDividend / price) * 100, 4)
        : null;

    const currentRevenue =
      incomeStatements.length > 0
        ? extractRevenueFromStatement(incomeStatements[0])
        : extractRevenueFromStatement(incomeStatement);

    const previousRevenue =
      incomeStatements.length > 1
        ? extractRevenueFromStatement(incomeStatements[1])
        : null;

    const twoYearsAgoRevenue =
      incomeStatements.length > 2
        ? extractRevenueFromStatement(incomeStatements[2])
        : null;

    const payload: FundamentalsPayload = {
      ticker,

      name:
        (overview?.name as string | undefined) ??
        null,

      marketCap:
        getFieldValue(overview, ["market_cap"]) ??
        getFieldValue(snapshot, ["ticker.market_cap", "market_cap"]) ??
        null,

      volume:
        getFieldValue(snapshot, ["ticker.day.v", "day.v"]) ??
        null,

      avgVolume:
        getFieldValue(snapshot, ["ticker.prevDay.v", "prevDay.v"]) ??
        null,

      pe,

      peg:
        getFieldValue(ratios, [
          "peg_ratio",
          "price_earnings_growth_ratio",
          "priceToEarningsGrowthRatio",
          "metrics.peg",
        ]) ??
        getFieldValue(legacyFinancials, [
          "peg_ratio",
          "price_earnings_growth_ratio",
          "peg",
        ]) ??
        null,

      revenue:
        getFieldValue(incomeStatement, [
          "revenue",
          "revenues",
          "total_revenue",
          "sales",
        ]) ??
        getFieldValue(legacyFinancials, [
          "revenue",
          "revenues",
          "sales",
          "total_revenue",
        ]) ??
        null,

      previousRevenue: previousRevenue ?? null,

      twoYearsAgoRevenue: twoYearsAgoRevenue ?? null,

      netIncome:
        getFieldValue(incomeStatement, [
          "income_loss_attributable_to_common_shareholders",
          "net_income_loss",
          "net_income",
          "netIncome",
          "income_loss",
          "profit_loss",
          "profit",
          "loss",
        ]) ??
        getFieldValue(legacyFinancials, [
          "income_loss_attributable_to_common_shareholders",
          "net_income_loss",
          "net_income",
          "netIncome",
          "income_loss",
          "profit_loss",
        ]) ??
        null,

      cash:
        getFieldValue(balanceSheet, [
          "cash_and_equivalents",
          "cash_and_cash_equivalents",
          "cash",
          "cashAndCashEquivalents",
        ]) ??
        getFieldValue(legacyFinancials, [
          "cash_and_equivalents",
          "cash_and_cash_equivalents",
          "cash",
          "cashAndCashEquivalents",
        ]) ??
        null,

      debt: computedDebt,

      dividendYield:
        getFieldValue(ratios, [
          "dividend_yield",
          "dividendYield",
        ]) ??
        getFieldValue(legacyFinancials, [
          "dividend_yield",
          "dividendYield",
        ]) ??
        getFieldValue(overview, [
          "last_dividend_yield",
          "dividend_yield",
        ]) ??
        computedDividendYield ??
        null,

      source: "massive",
    };

    if (debug) {
      return NextResponse.json({
        payload,
        debug: {
          overview,
          snapshot,
          ratios,
          balanceSheet,
          incomeStatement,
          dividendsData,
          legacyFinancials,
          computed: {
            eps,
            price,
            annualDividend,
            computedDividendYield,
            currentDebt,
            longTermDebt,
            totalDebtDirect,
            computedDebt,
          },
        },
      });
    }

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown fundamentals route error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}