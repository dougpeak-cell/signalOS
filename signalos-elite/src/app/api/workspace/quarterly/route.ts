import { NextRequest, NextResponse } from "next/server";
import { getMassiveFundamentals } from "@/lib/market/massiveFundamentals";
import { getSigiPlanSummaryForCurrentUser } from "@/lib/sigi/settings";
import { resolveStockTickerAlias } from "@/lib/stocks/symbolAliases";

type QuarterlyStatement = {
  date?: unknown;
  revenue?: unknown;
  netIncome?: unknown;
  eps?: unknown;
  epsdiluted?: unknown;
};

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function percentageChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

function buildDrivers(input: {
  revenueChange: number | null;
  earningsChange: number | null;
  cash: number | null;
  debt: number | null;
  peg: number | null;
}) {
  const upside: string[] = [];
  const risks: string[] = [];

  if (input.revenueChange != null && input.revenueChange > 0) {
    upside.push(`Revenue grew ${input.revenueChange.toFixed(1)}% versus the prior quarter.`);
  } else if (input.revenueChange != null) {
    risks.push(`Revenue changed ${input.revenueChange.toFixed(1)}% versus the prior quarter.`);
  }
  if (input.earningsChange != null && input.earningsChange > 0) {
    upside.push(`Net income improved ${input.earningsChange.toFixed(1)}% quarter over quarter.`);
  } else if (input.earningsChange != null) {
    risks.push(`Net income changed ${input.earningsChange.toFixed(1)}% quarter over quarter.`);
  }
  if (input.cash != null && input.debt != null && input.cash > input.debt) {
    upside.push("Cash exceeds reported debt, supporting financial flexibility.");
  } else if (input.cash != null && input.debt != null && input.debt > input.cash * 1.5) {
    risks.push("Debt materially exceeds cash and can amplify a weak quarter.");
  }
  if (input.peg != null && input.peg > 2) {
    risks.push("Growth-adjusted valuation is elevated, increasing execution sensitivity.");
  } else if (input.peg != null && input.peg < 1) {
    upside.push("Growth-adjusted valuation is comparatively supportive.");
  }

  return { upside, risks };
}

export async function GET(request: NextRequest) {
  const plan = await getSigiPlanSummaryForCurrentUser();
  if (!plan.hasProFeatures) {
    return NextResponse.json({ error: "Sigi Financial Analysis is available with Sigi Pro." }, { status: 403 });
  }

  const ticker = resolveStockTickerAlias(request.nextUrl.searchParams.get("ticker") || "");
  if (!ticker) return NextResponse.json({ error: "A stock symbol is required." }, { status: 400 });

  const apiKey = process.env.FMP_API_KEY?.trim();
  const statementsRaw = apiKey
    ? await fetchJson(`https://financialmodelingprep.com/stable/income-statement?symbol=${encodeURIComponent(ticker)}&period=quarter&limit=2&apikey=${apiKey}`)
    : null;
  const statements = Array.isArray(statementsRaw) ? statementsRaw as QuarterlyStatement[] : [];
  const latest = statements[0] ?? null;
  const previous = statements[1] ?? null;
  const revenue = numberOrNull(latest?.revenue);
  const priorRevenue = numberOrNull(previous?.revenue);
  const netIncome = numberOrNull(latest?.netIncome);
  const priorNetIncome = numberOrNull(previous?.netIncome);
  const fundamentals = await getMassiveFundamentals(ticker);
  const revenueChange = percentageChange(revenue, priorRevenue);
  const earningsChange = percentageChange(netIncome, priorNetIncome);
  const drivers = buildDrivers({
    revenueChange,
    earningsChange,
    cash: fundamentals.cash,
    debt: fundamentals.debt,
    peg: fundamentals.peg,
  });

  return NextResponse.json({
    ticker,
    asOf: new Date().toISOString(),
    latestReport: latest ? {
      periodEnd: text(latest.date),
      revenue,
      revenueChange,
      netIncome,
      earningsChange,
      eps: numberOrNull(latest.epsdiluted) ?? numberOrNull(latest.eps),
    } : null,
    upcomingQuarter: {
      status: apiKey ? "Earnings calendar data is not yet connected to estimate consensus." : "Earnings calendar unavailable until FMP is configured.",
      epsEstimate: null,
      revenueEstimate: null,
    },
    fundamentals: {
      pe: fundamentals.pe,
      peg: fundamentals.peg,
      cash: fundamentals.cash,
      debt: fundamentals.debt,
    },
    drivers,
    analysis: {
      summary: drivers.upside.length > drivers.risks.length
        ? "Sigi sees more fundamental support than pressure in the latest available data. Confirm the next report before treating the trend as durable."
        : drivers.risks.length > drivers.upside.length
          ? "Sigi sees material execution sensitivity in the latest available fundamentals. The next report needs to resolve those pressures."
          : "Sigi sees a balanced financial setup. The next quarterly report is the clearest catalyst for a momentum reset.",
      upsideConditions: drivers.upside.length ? drivers.upside : ["A revenue or margin upside surprise would improve the financial momentum read."],
      invalidation: drivers.risks.length ? drivers.risks : ["A miss on revenue, margins, or guidance would weaken the current financial read."],
    },
    options: {
      status: "Options-chain data is not connected.",
      detail: "Calls, puts, implied move, and unusual activity will appear here when a licensed options feed is enabled.",
    },
  });
}