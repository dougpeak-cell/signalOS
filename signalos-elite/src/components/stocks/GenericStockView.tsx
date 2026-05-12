import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SelectedSignalProvider } from "@/components/chart/SelectedSignalContext";
import FundamentalIntelligenceCard from "@/components/stocks/FundamentalIntelligenceCard";
import StockFundamentalsGrid from "@/components/stocks/StockFundamentalsGrid";
import StockDetailLivePanels from "@/components/stocks/StockDetailLivePanels";
import { ClientProvider } from "@/components/ClientProvider";
import { computeFundamentalScore } from "@/lib/analysis/fundamentalScore";
import { computePegFromGrowth } from "@/lib/analysis/computePeg";
import { getFinnhubFundamentals } from "@/lib/fundamentals/finnhubFundamentals";
import { getHistoryBars } from "@/lib/market/historyBars";
import { getMassiveFundamentals } from "@/lib/market/massiveFundamentals";
import { fetchServerQuoteState } from "@/lib/market/serverQuote";
import { computeTechnicalsFromHistory } from "@/lib/market/technicals";
import { getFinnhubCompanyProfile } from "@/lib/stocks/finnhubCompanyProfile";

type SignalRow = {
  id?: number;
  ticker: string;
  company_name: string | null;
  sector: string | null;
  price: number | null;
  conviction: number | null;
  entry_low: number | null;
  entry_high: number | null;
  stop_loss: number | null;
  target_price: number | null;
  thesis: string | null;
  catalysts: string[] | null;
  risks: string[] | null;
  tier: string | null;
  as_of_date: string | null;
  created_at?: string | null;
  peRatio?: number | null;
  pe?: number | null;
  pegRatio?: number | null;
  peg?: number | null;
  marketCap?: number | null;
  cash?: number | null;
  totalCash?: number | null;
  debt?: number | null;
  totalDebt?: number | null;
  dividendYield?: number | null;
  dividend?: number | null;
  volume?: number | null;
  avgVolume?: number | null;
  averageVolume?: number | null;
  revenue?: number | null;
  netIncome?: number | null;
  sma20?: number | null;
  sma50?: number | null;
  atrPct?: number | null;
  rsi14?: number | null;
  structure?: "breakout" | "above_support" | "pullback" | "below_support" | "range";
};

type GenericStockViewProps = {
  ticker: string;
  context?: GenericStockViewContext;
};

type CompanyProfile = {
  name: string | null;
  sector: string | null;
  exchange: string | null;
  country: string | null;
  currency: string | null;
  ipo: string | null;
  marketCap: number | null;
  logo: string | null;
  weburl: string | null;
};

export type GenericStockViewContext = {
  badge: string;
  backHref: string;
  backLabel: string;
  subtitle?: string;
};

async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}

function pct(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "—";

  const value = Number(v);

  if (value <= 1) {
    return `${Math.round(value * 100)}%`;
  }

  return `${Math.round(value)}%`;
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatRatio(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(2);
}

function formatValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPeLike(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "N/M";
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function formatLargeNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US");
}

function formatCurrencyCompact(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function computePercentChange(price: number | null, prevClose: number | null) {
  if (
    price == null ||
    prevClose == null ||
    !Number.isFinite(price) ||
    !Number.isFinite(prevClose) ||
    prevClose <= 0
  ) {
    return null;
  }

  return ((price - prevClose) / prevClose) * 100;
}

function pickNumber(row: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "number" && Number.isFinite(value)) return value;

    if (typeof value === "string") {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }

  return null;
}

function normalizeStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  const next = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );

  return next.length ? next : null;
}

function normalizeSignalRow(data: Record<string, unknown>): SignalRow {
  return {
    ...data,
    id: typeof data.id === "number" ? data.id : undefined,
    ticker: String(data.ticker ?? ""),
    company_name: typeof data.company_name === "string" ? data.company_name : null,
    sector: typeof data.sector === "string" ? data.sector : null,
    price: pickNumber(data, ["price"]),
    conviction: pickNumber(data, ["conviction"]),
    entry_low: pickNumber(data, ["entry_low"]),
    entry_high: pickNumber(data, ["entry_high"]),
    stop_loss: pickNumber(data, ["stop_loss"]),
    target_price: pickNumber(data, ["target_price"]),
    thesis: typeof data.thesis === "string" ? data.thesis : null,
    catalysts: normalizeStringArray(data.catalysts),
    risks: normalizeStringArray(data.risks),
    tier: typeof data.tier === "string" ? data.tier : null,
    as_of_date: typeof data.as_of_date === "string" ? data.as_of_date : null,
    created_at: typeof data.created_at === "string" ? data.created_at : null,
    peRatio: pickNumber(data, ["peRatio", "pe_ratio"]),
    pe: pickNumber(data, ["pe", "price_earnings", "pe_ratio"]),
    pegRatio: pickNumber(data, ["pegRatio", "peg_ratio"]),
    peg: pickNumber(data, ["peg", "peg_ratio"]),
    marketCap: pickNumber(data, ["marketCap", "market_cap"]),
    cash: pickNumber(data, ["cash"]),
    totalCash: pickNumber(data, ["totalCash", "total_cash"]),
    debt: pickNumber(data, ["debt"]),
    totalDebt: pickNumber(data, ["totalDebt", "total_debt"]),
    dividendYield: pickNumber(data, ["dividendYield", "dividend_yield"]),
    dividend: pickNumber(data, ["dividend"]),
    volume: pickNumber(data, ["volume"]),
    avgVolume: pickNumber(data, ["avgVolume", "avg_volume"]),
    averageVolume: pickNumber(data, ["averageVolume", "average_volume"]),
    revenue: pickNumber(data, ["revenue", "revenues", "total_revenue"]),
    netIncome: pickNumber(data, ["netIncome", "net_income", "net_income_loss"]),
    sma20: pickNumber(data, ["sma20", "sma_20"]),
    sma50: pickNumber(data, ["sma50", "sma_50"]),
    atrPct: pickNumber(data, ["atrPct", "atr_pct", "atr_percent"]),
    rsi14: pickNumber(data, ["rsi14", "rsi_14"]),
    structure:
      data.structure === "breakout" ||
      data.structure === "above_support" ||
      data.structure === "pullback" ||
      data.structure === "below_support" ||
      data.structure === "range"
        ? data.structure
        : undefined,
  };
}

async function getSignalByTicker(rawTicker: string): Promise<SignalRow | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const ticker = rawTicker.toUpperCase();

    const { data, error } = await supabase
      .from("signals")
      .select("*")
      .ilike("ticker", ticker)
      .order("as_of_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("Stock detail signal lookup unavailable:", error.message);
      return null;
    }

    if (!data) return null;
    return normalizeSignalRow(data as Record<string, unknown>);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Stock detail signal lookup failed:", message);
    return null;
  }
}

async function getPriceHistory(ticker: string) {
  return getHistoryBars(ticker, "6mo");
}

async function getCompanyProfile(ticker: string): Promise<CompanyProfile | null> {
  return getFinnhubCompanyProfile(ticker);
}

function buildSignalContext({
  price,
  changePercent,
  volume,
  avgVolume,
  high,
  low,
}: {
  price: number | null;
  changePercent: number | null;
  volume: number | null;
  avgVolume: number | null;
  high: number | null;
  low: number | null;
}) {
  const catalysts: string[] = [];
  const risks: string[] = [];

  if (volume && avgVolume && volume > avgVolume * 1.5) {
    catalysts.push("Unusual volume activity detected");
  }

  if (changePercent != null && changePercent > 2) {
    catalysts.push("Strong upside momentum");
  } else if (changePercent != null && changePercent < -2) {
    risks.push("Heavy downside pressure");
  }

  if (price && high && price > high * 0.98) {
    catalysts.push("Testing recent highs (potential breakout)");
  }

  if (price && low && price < low * 1.02) {
    risks.push("Near recent lows (breakdown risk)");
  }

  if (changePercent != null && changePercent < -3) {
    risks.push("Weak structure — trend under pressure");
  }

  return { catalysts, risks };
}

function buildInvestmentThesis({
  ticker,
  company,
  price,
  changePercent,
  volume,
  avgVolume,
  pe,
  marketCap,
  sector,
}: {
  ticker: string;
  company: string | null;
  price: number | null;
  changePercent: number | null;
  volume: number | null;
  avgVolume: number | null;
  pe: number | null;
  marketCap: number | null;
  sector: string | null;
}) {
  const move =
    typeof changePercent === "number"
      ? changePercent >= 0
        ? `up ${changePercent.toFixed(2)}%`
        : `down ${Math.abs(changePercent).toFixed(2)}%`
      : "moving without a clear percentage read";

  const volumeRead =
    volume && avgVolume && volume > avgVolume * 1.5
      ? "Volume is running above normal, which makes the move more meaningful."
      : volume && avgVolume && volume < avgVolume * 0.7
        ? "Volume is below normal, so conviction behind the move is lighter."
        : "Volume is near normal, so price action should be confirmed by follow-through.";

  const valuationRead =
    pe && pe > 80
      ? "Valuation is elevated, so the stock needs strong growth expectations to justify the premium."
      : pe && pe > 0 && pe < 25
        ? "Valuation is more reasonable relative to many growth names."
        : "Valuation data is limited, so price action and fundamentals should be weighed carefully.";

  return `${company || ticker} is currently ${move}. ${volumeRead} ${valuationRead} The key read is whether buyers can defend support and push back toward recent highs.`;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/4 px-3 py-2.5 md:px-4 md:py-3">
      <span className="text-[13px] text-white/45 md:text-sm">{label}</span>
      <span className="text-right text-[13px] font-semibold text-white md:text-sm">{value}</span>
    </div>
  );
}

function ListBlock({
  title,
  items,
  emptyText,
  tone = "neutral",
}: {
  title: string;
  items: string[] | null | undefined;
  emptyText: string;
  tone?: "neutral" | "green" | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-500/20 bg-emerald-500/5"
      : tone === "amber"
        ? "border-amber-500/20 bg-amber-500/5"
        : "border-white/10 bg-white/3";

  const listTextClass =
    tone === "green"
      ? "text-emerald-200"
      : tone === "amber"
        ? "text-red-200"
        : "text-white/75";

  return (
    <div
      className={`rounded-3xl border p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] ${toneClass}`}
    >
      <div className="text-lg font-semibold tracking-tight text-white">{title}</div>

      {items && items.length > 0 ? (
        <ul className={`mt-4 space-y-2 text-sm ${listTextClass}`}>
          {items.map((item, idx) => (
            <li key={`${title}-${idx}`}>• {item}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 text-sm text-white/40">
          {emptyText}
        </div>
      )}
    </div>
  );
}

export default async function GenericStockView({
  ticker,
  context,
}: GenericStockViewProps) {
  const dbRow = await getSignalByTicker(ticker);
  const liveTicker = ticker.toUpperCase();

  const row =
    dbRow ??
    ({
      ticker: liveTicker,
      company_name: null,
      sector: null,
      price: null,
      conviction: 60,
      entry_low: null,
      entry_high: null,
      stop_loss: null,
      target_price: null,
      thesis: null,
      catalysts: null,
      risks: null,
      tier: "Signal",
      as_of_date: null,
      created_at: null,
      peRatio: null,
      pe: null,
      pegRatio: null,
      peg: null,
      marketCap: null,
      cash: null,
      totalCash: null,
      debt: null,
      totalDebt: null,
      dividendYield: null,
      dividend: null,
      volume: null,
      avgVolume: null,
      averageVolume: null,
      sma20: null,
      sma50: null,
      atrPct: null,
      rsi14: null,
      structure: "range",
    } satisfies SignalRow);

  const priceHistory = await getPriceHistory(row.ticker);
  const computedTechnicals = computeTechnicalsFromHistory(priceHistory);
  const technicals = {
    ...computedTechnicals,
    sma20: row.sma20 ?? computedTechnicals.sma20,
    sma50: row.sma50 ?? computedTechnicals.sma50,
    atrPct: row.atrPct ?? computedTechnicals.atrPct,
    rsi14: row.rsi14 ?? computedTechnicals.rsi14,
    structure: row.structure ?? computedTechnicals.structure,
  };
  const quoteState = await fetchServerQuoteState(row.ticker);
  const massiveFundamentals = await getMassiveFundamentals(row.ticker);
  const finnhubFundamentals = await getFinnhubFundamentals(row.ticker);
  const companyProfile = await getCompanyProfile(row.ticker);

  const fundamentals = {
    pe: row.peRatio ?? row.pe ?? finnhubFundamentals?.pe ?? massiveFundamentals.pe ?? null,
    peg:
      row.pegRatio ?? row.peg ?? finnhubFundamentals?.peg ?? massiveFundamentals.peg ?? null,
    marketCap:
      row.marketCap ?? finnhubFundamentals?.marketCap ?? massiveFundamentals.marketCap ?? null,
    volume: row.volume ?? massiveFundamentals.volume ?? null,
    avgVolume: row.avgVolume ?? row.averageVolume ?? massiveFundamentals.avgVolume ?? null,
    revenue:
      row.revenue ??
      (typeof massiveFundamentals?.revenue === "number" ? massiveFundamentals.revenue : null),
    netIncome:
      row.netIncome ??
      (typeof massiveFundamentals?.netIncome === "number"
        ? massiveFundamentals.netIncome
        : null),
    cash:
      row.cash ??
      row.totalCash ??
      (typeof massiveFundamentals?.cash === "number" ? massiveFundamentals.cash : null),
    debt:
      row.debt ??
      row.totalDebt ??
      (typeof massiveFundamentals?.debt === "number" ? massiveFundamentals.debt : null),
    dividendYield:
      row.dividendYield ??
      row.dividend ??
      finnhubFundamentals?.dividendYield ??
      massiveFundamentals.dividendYield ??
      null,
  };

  const computedPeg = computePegFromGrowth({
    pe: fundamentals.pe,
    currentRevenue: fundamentals.revenue,
    previousRevenue: massiveFundamentals.previousRevenue ?? null,
    twoYearsAgoRevenue: massiveFundamentals.twoYearsAgoRevenue ?? null,
  });

  const fundamentalsWithPeg = {
    ...fundamentals,
    peg: fundamentals.peg ?? computedPeg,
  };

  const displayFundamentals = {
    pe: fundamentalsWithPeg.pe,
    marketCap: fundamentalsWithPeg.marketCap,
    grossMargin: finnhubFundamentals?.grossMargin ?? null,
    operatingMargin: finnhubFundamentals?.operatingMargin ?? null,
    netMargin: finnhubFundamentals?.netMargin ?? null,
    roe: finnhubFundamentals?.roe ?? null,
    currentRatio: finnhubFundamentals?.currentRatio ?? null,
    beta: finnhubFundamentals?.beta ?? null,
    week52High: finnhubFundamentals?.week52High ?? null,
    week52Low: finnhubFundamentals?.week52Low ?? null,
  };

  const initialAnalysisPrice =
    (quoteState.source === "api" ? quoteState.price : null) ??
    row.price ??
    technicals.lastClose ??
    quoteState.price ??
    null;

  const initialAnalysisChangePct =
    quoteState.source === "api"
      ? computePercentChange(quoteState.price, quoteState.prevClose)
      : null;

  const signal = buildSignalContext({
    price: initialAnalysisPrice,
    changePercent: initialAnalysisChangePct,
    volume: fundamentalsWithPeg.volume,
    avgVolume: fundamentalsWithPeg.avgVolume,
    high: displayFundamentals.week52High,
    low: displayFundamentals.week52Low,
  });

  const catalystItems = row.catalysts?.length ? row.catalysts : signal.catalysts;
  const riskItems = row.risks?.length ? row.risks : signal.risks;

  const investmentThesis = buildInvestmentThesis({
    ticker: liveTicker,
    company: companyProfile?.name ?? row.company_name ?? null,
    price: initialAnalysisPrice,
    changePercent: initialAnalysisChangePct,
    volume: fundamentalsWithPeg.volume,
    avgVolume: fundamentalsWithPeg.avgVolume,
    pe: fundamentalsWithPeg.pe,
    marketCap: fundamentalsWithPeg.marketCap,
    sector: companyProfile?.sector ?? row.sector ?? null,
  });

  const fundamentalScore = computeFundamentalScore({
    pe: fundamentalsWithPeg.pe,
    peg: fundamentalsWithPeg.peg,
    marketCap: fundamentalsWithPeg.marketCap,
    revenue: fundamentalsWithPeg.revenue,
    netIncome: fundamentalsWithPeg.netIncome,
    cash: fundamentalsWithPeg.cash,
    debt: fundamentalsWithPeg.debt,
    dividendYield: fundamentalsWithPeg.dividendYield,
  });

  const hasLiveData =
    initialAnalysisPrice != null || row.target_price != null || quoteState.price != null;
  const isUnavailableTicker = !dbRow && !hasLiveData;
  const fallbackThesis = isUnavailableTicker
    ? `${liveTicker} is not in SignalOS coverage or live quote data yet. Try a valid ticker, open Sigi analysis, or add it to your watchlist.`
    : investmentThesis;
  const investmentThesisText = row.thesis?.trim()
    ? row.thesis
    : fallbackThesis;

  return (
    <SelectedSignalProvider>
      <div className="min-h-screen bg-black text-white">
        <ClientProvider tickers={[liveTicker]} sparklineTickers={[liveTicker]} />
        <div className="mx-auto w-full max-w-none space-y-6">
        {context ? (
          <section className="px-4 pt-4 sm:px-6 xl:px-0">
            <div className="flex flex-col gap-3 rounded-3xl border border-cyan-400/18 bg-cyan-400/6 px-4 py-3 shadow-[0_0_0_1px_rgba(34,211,238,0.04)] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  {context.badge}
                </span>
                <div className="text-sm text-white/62">
                  {context.subtitle?.trim().length
                    ? context.subtitle
                    : `Contextual stock handoff for ${liveTicker}`}
                </div>
              </div>

              <Link
                href={context.backHref}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/78 transition hover:border-cyan-400/25 hover:bg-cyan-400/10 hover:text-cyan-100"
              >
                ← {context.backLabel}
              </Link>
            </div>
          </section>
        ) : null}

        <StockDetailLivePanels
          row={row}
          companyProfile={companyProfile}
          technicals={technicals}
          initialPrice={initialAnalysisPrice}
          initialChangePct={initialAnalysisChangePct}
          fundamentalCompositeScore={fundamentalScore.composite}
          hasLiveData={hasLiveData}
          fallbackMessage={isUnavailableTicker ? fallbackThesis : null}
        />

        <section className="grid gap-8 xl:grid-cols-[1.25fr_0.9fr]">
          <div className="space-y-8">
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/4.5 p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                Sigi Investment Thesis
              </div>
              <p className="text-lg leading-8 text-white/80">{investmentThesis}</p>
            </div>

            <ListBlock
              title="Catalysts"
              items={catalystItems}
              emptyText="No strong catalysts detected."
              tone="green"
            />

            <ListBlock
              title="Risk factors"
              items={riskItems}
              emptyText="No immediate risk signals."
              tone="amber"
            />

            <section className="rounded-3xl border border-white/10 bg-white/4 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="mb-4">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
                  Core Fundamentals
                </div>
                <p className="mt-1 text-sm text-white/45">
                  Key valuation, liquidity, and operating metrics traders check first.
                </p>
              </div>

              <StockFundamentalsGrid
                ticker={liveTicker}
                stockName={companyProfile?.name ?? row.company_name}
                metrics={[
                  {
                    label: "P/E",
                    term: "P/E Ratio",
                    value:
                      typeof displayFundamentals.pe === "number" && displayFundamentals.pe > 0
                        ? formatRatio(displayFundamentals.pe)
                        : "—",
                    rawValue: displayFundamentals.pe,
                  },
                  {
                    label: "Market Cap",
                    term: "Market Cap",
                    value: formatCurrencyCompact(displayFundamentals.marketCap),
                    rawValue: displayFundamentals.marketCap,
                  },
                  {
                    label: "Gross Margin",
                    term: "Gross Margin",
                    value: formatPercent(displayFundamentals.grossMargin),
                    rawValue: displayFundamentals.grossMargin,
                  },
                  {
                    label: "Operating Margin",
                    term: "Operating Margin",
                    value: formatPercent(displayFundamentals.operatingMargin),
                    rawValue: displayFundamentals.operatingMargin,
                  },
                  {
                    label: "Net Margin",
                    term: "Net Income",
                    value: formatPercent(displayFundamentals.netMargin),
                    rawValue: displayFundamentals.netMargin,
                  },
                  {
                    label: "ROE",
                    term: "ROE",
                    value: formatPercent(displayFundamentals.roe),
                    rawValue: displayFundamentals.roe,
                  },
                  {
                    label: "Current Ratio",
                    term: "Current Ratio",
                    value: formatRatio(displayFundamentals.currentRatio),
                    rawValue: displayFundamentals.currentRatio,
                  },
                  {
                    label: "Beta",
                    term: "Beta",
                    value: formatRatio(displayFundamentals.beta),
                    rawValue: displayFundamentals.beta,
                  },
                  {
                    label: "52W High",
                    term: "52 Week High",
                    value: formatMoney(displayFundamentals.week52High),
                    rawValue: displayFundamentals.week52High,
                  },
                  {
                    label: "52W Low",
                    term: "52 Week Low",
                    value: formatMoney(displayFundamentals.week52Low),
                    rawValue: displayFundamentals.week52Low,
                  },
                ]}
              />
            </section>
          </div>

          <div className="space-y-8">
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
              <h2 className="text-xl font-semibold text-white">Signal summary</h2>

              <div className="mt-5 space-y-3">
                <SummaryRow label="Ticker" value={row.ticker} />
                <SummaryRow label="Company" value={companyProfile?.name ?? row.company_name ?? "—"} />
                <SummaryRow label="Sector" value={companyProfile?.sector ?? row.sector ?? "—"} />
                <SummaryRow label="Exchange" value={companyProfile?.exchange ?? "—"} />
                <SummaryRow label="Country" value={companyProfile?.country ?? "—"} />
                <SummaryRow label="IPO" value={companyProfile?.ipo ?? "—"} />
              </div>

              <div className="mt-5 grid gap-3">
                <Link
                  href="/screener"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/8 hover:text-white"
                >
                  Back to search
                </Link>

                <div className="glow-card rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    SignalOS
                  </div>

                  <div className="mt-3 text-sm text-white/70">
                    {row.tier
                      ? `${row.tier.charAt(0).toUpperCase() + row.tier.slice(1)}-tier`
                      : "Signal"}{" "}
                    {row.sector ? row.sector.toLowerCase() : "company"} leader with
                    strong AI infrastructure demand.
                  </div>

                  <div className="mt-4 text-xs text-white/40">
                    Latest conviction: {pct(row.conviction)}
                  </div>
                </div>
              </div>
            </div>

            <FundamentalIntelligenceCard
              pe={
                typeof fundamentalsWithPeg.pe === "number" && fundamentalsWithPeg.pe > 0
                  ? fundamentalsWithPeg.pe
                  : null
              }
              peg={fundamentalsWithPeg.peg}
              marketCap={fundamentalsWithPeg.marketCap}
              cash={fundamentalsWithPeg.cash}
              debt={fundamentalsWithPeg.debt}
              dividendYield={fundamentalsWithPeg.dividendYield}
              volume={fundamentalsWithPeg.volume}
              avgVolume={fundamentalsWithPeg.avgVolume}
            />
          </div>
        </section>
        </div>
      </div>
    </SelectedSignalProvider>
  );
}