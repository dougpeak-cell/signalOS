import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import LiveMiniPrice from "@/components/stocks/LiveMiniPrice";
import LiveMiniChange from "@/components/stocks/LiveMiniChange";
import { getQuotePrice } from "@/lib/market/quotes";
import { buildTargetEngine } from "@/lib/engines/targetEngine";

type PageProps = {
  params: Promise<{
    ticker: string;
  }>;
};

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

function money(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "—";
  return `$${Number(v).toFixed(2)}`;
}

function pct(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "—";

  const value = Number(v);

  // handle 0.92 style
  if (value <= 1) {
    return `${Math.round(value * 100)}%`;
  }

  // handle 92 style
  return `${Math.round(value)}%`;
}

function formatUpside(v: number | null) {
  if (v == null || !Number.isFinite(v)) return "—";
  const rounded = Math.round(v * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
}

function tierStyles(tier: string | null | undefined) {
  const t = (tier ?? "").toLowerCase();

  if (t === "elite") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  if (t === "strong") return "border-sky-500/25 bg-sky-500/10 text-sky-300";
  if (t === "risk") return "border-amber-500/25 bg-amber-500/10 text-amber-300";

  return "border-white/10 bg-white/[0.04] text-white/70";
}

async function getSignalByTicker(rawTicker: string): Promise<SignalRow | null> {
  const supabase = await createSupabaseServerClient();
  const ticker = rawTicker.toUpperCase();

  const { data, error } = await supabase
    .from("signals")
    .select(`
      id,
      ticker,
      company_name,
      sector,
      price,
      conviction,
      entry_low,
      entry_high,
      stop_loss,
      target_price,
      thesis,
      catalysts,
      risks,
      tier,
      as_of_date,
      created_at
    `)
    .ilike("ticker", ticker)
    .order("as_of_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Stock detail query failed:", error.message);
    return null;
  }

  return (data as SignalRow | null) ?? null;
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="glow-card-soft rounded-2xl p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</div>
      {subtext ? <div className="mt-1 text-sm text-white/55">{subtext}</div> : null}
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
      ? "border-emerald-500/20 bg-emerald-500/[0.05]"
      : tone === "amber"
        ? "border-amber-500/20 bg-amber-500/[0.05]"
        : "border-white/10 bg-white/[0.03]";

  return (
    <div className={`rounded-[28px] border p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] ${toneClass}`}>
      <div className="text-lg font-semibold tracking-tight text-white">{title}</div>

      {items && items.length > 0 ? (
        <div className="mt-4 space-y-3">
          {items.map((item, idx) => (
            <div
              key={`${title}-${idx}`}
              className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm leading-6 text-white/75"
            >
              {item}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/3 px-4 py-6 text-sm text-white/45">
          {emptyText}
        </div>
      )}
    </div>
  );
}

function buildExecutionModel({
  livePrice,
  tier,
  conviction,
  dbEntryLow,
  dbEntryHigh,
}: {
  livePrice: number | null;
  tier: string | null;
  conviction: number | null;
  dbEntryLow: number | null;
  dbEntryHigh: number | null;
}) {
  if (livePrice == null || !Number.isFinite(livePrice) || livePrice <= 0) {
    return {
      entryLow: dbEntryLow ?? null,
      entryHigh: dbEntryHigh ?? null,
      stop: null,
      pullbackPct: null,
    };
  }

  const normalizedTier = (tier ?? "").toLowerCase();
  const convictionScore = conviction == null ? 75 : conviction <= 1 ? conviction * 100 : conviction;

  const pullbackPct =
    normalizedTier === "elite"
      ? convictionScore >= 90
        ? 0.02
        : 0.025
      : normalizedTier === "strong"
        ? 0.035
        : 0.05;

  const entryHigh = Number((livePrice * (1 - pullbackPct * 0.35)).toFixed(2));
  const entryLow = Number((livePrice * (1 - pullbackPct)).toFixed(2));

  const stopBufferPct =
    normalizedTier === "elite"
      ? 0.035
      : normalizedTier === "strong"
        ? 0.045
        : 0.06;

  const stop = Number((entryLow * (1 - stopBufferPct)).toFixed(2));

  return {
    entryLow,
    entryHigh,
    stop,
    pullbackPct,
  };
}

export default async function StockDetailPage({ params }: PageProps) {
  const { ticker } = await params;
  const row = await getSignalByTicker(ticker);

  if (!row) {
    notFound();
  }

  const currentPrice =
    getQuotePrice(row.ticker) ?? null;

  const normalizedConviction =
    row.conviction != null && row.conviction <= 1
      ? row.conviction * 100
      : row.conviction;

  const executionModel = buildExecutionModel({
    livePrice: currentPrice,
    tier: row.tier,
    conviction: normalizedConviction,
    dbEntryLow: row.entry_low,
    dbEntryHigh: row.entry_high,
  });

  const atrPct =
    row.tier === "Elite"
      ? 0.035
      : row.tier === "Strong"
        ? 0.025
        : 0.018;

  const momentumBias =
    normalizedConviction != null && normalizedConviction >= 85
      ? "bullish"
      : normalizedConviction != null && normalizedConviction <= 50
        ? "bearish"
        : "neutral";

  const targetModel = buildTargetEngine({
    livePrice: currentPrice,
    tier: row.tier,
    conviction: normalizedConviction,
    entryLow: executionModel.entryLow,
    entryHigh: executionModel.entryHigh,
    nearestResistance: null,
    nearestLiquidity: null,
    atrPct,
    momentumBias,
  });

  const entryLow = executionModel.entryLow ?? row.entry_low ?? null;
  const entryHigh = executionModel.entryHigh ?? row.entry_high ?? null;
  const target = targetModel.target ?? row.target_price ?? null;
  const stop = executionModel.stop ?? targetModel.stop ?? row.stop_loss ?? null;
  const upside = targetModel.upsidePct;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-none space-y-6">
        <section className="glow-panel rounded-4xl shadow-[0_0_40px_rgba(16,185,129,0.18)] overflow-hidden p-0">
          <div className="border-b border-white/10 px-6 py-6 md:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Link
                    href="/search"
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs font-medium text-white/70 transition hover:bg-white/8 hover:text-white"
                  >
                    Search
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs font-medium text-white/70 transition hover:bg-white/8 hover:text-white"
                  >
                    Today
                  </Link>
                  <div
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tierStyles(
                      row.tier
                    )}`}
                  >
                    {row.tier ?? "Signal"}
                  </div>
                </div>

                <div className="text-sm text-white/45">{row.company_name ?? "Company"}</div>
                <h1 className="mt-1 text-5xl font-semibold tracking-tight text-white md:text-6xl">
                  {row.ticker}
                </h1>
                <p className="mt-3 text-sm leading-6 text-white/55 md:text-base">
                  {row.sector ?? "Sector"} • As of {row.as_of_date ?? "latest signal"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:min-w-[320px]">
                <div className="glow-card-soft rounded-2xl p-4 text-right">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Price</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    $<LiveMiniPrice ticker={row.ticker} fallbackPrice={null} />
                  </div>
                  <div className="mt-1">
                    <LiveMiniChange ticker={row.ticker} fallbackChangePct={null} />
                  </div>
                </div>
                <div className="glow-card-soft rounded-2xl p-4 text-right">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Target</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{money(target)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-6 py-6 md:grid-cols-2 md:px-8 xl:grid-cols-5">
            <StatCard label="Conviction" value={pct(row.conviction)} subtext="Model-ranked confidence" />
            <StatCard label="Upside" value={formatUpside(upside)} subtext="Target vs current price" />
            <StatCard
              label="Entry range"
              value={`${money(entryLow)} – ${money(entryHigh)}`}
              subtext="Preferred accumulation zone"
            />
            <StatCard label="Stop loss" value={money(stop)} subtext="Risk management level" />
            <StatCard label="Tier" value={row.tier ?? "Signal"} subtext="Current internal rating" />
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.25fr_0.9fr]">
          <div className="space-y-8">
            <div className="glow-card rounded-[28px] p-6">
              <div className="mb-3 text-lg font-semibold tracking-tight text-white">Investment thesis</div>
              <p className="text-sm leading-7 text-white/70 md:text-base">
                {row.thesis?.trim()
                  ? row.thesis
                  : "No thesis has been added yet for this signal. Add a thesis in Supabase to show the core view here."}
              </p>
            </div>

            <ListBlock
              title="Catalysts"
              items={row.catalysts}
              emptyText="No catalysts added yet."
              tone="green"
            />

            <ListBlock
              title="Risk factors"
              items={row.risks}
              emptyText="No explicit risks added yet."
              tone="amber"
            />
          </div>

          <div className="space-y-8">
            <div className="glow-card rounded-[28px] p-5">
              <div className="text-lg font-semibold tracking-tight text-white">Signal summary</div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-white/4 px-4 py-3">
                  <span className="text-sm text-white/45">Ticker</span>
                  <span className="font-semibold text-white">{row.ticker}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/4 px-4 py-3">
                  <span className="text-sm text-white/45">Company</span>
                  <span className="font-semibold text-white">{row.company_name ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/4 px-4 py-3">
                  <span className="text-sm text-white/45">Sector</span>
                  <span className="font-semibold text-white">{row.sector ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/4 px-4 py-3">
                  <span className="text-sm text-white/45">As of date</span>
                  <span className="font-semibold text-white">{row.as_of_date ?? "—"}</span>
                </div>
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
                    {row.tier ? `${row.tier.charAt(0).toUpperCase() + row.tier.slice(1)}-tier` : "Signal"}{" "}
                    {row.sector ? row.sector.toLowerCase() : "company"} leader with strong AI infrastructure demand.
                  </div>

                  <div className="mt-4 text-xs text-white/40">
                    Latest conviction: {pct(row.conviction)}
                  </div>
                </div>
              </div>
            </div>

            <div className="glow-card rounded-[28px] p-5">
              <div className="text-lg font-semibold tracking-tight text-white">Execution view</div>

              <div className="mt-4 space-y-3">
                <div className="glow-card-soft rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Current price</div>
                  <div className="mt-2 text-xl font-semibold text-white">{money(currentPrice)}</div>
                </div>

                <div className="glow-card-soft rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Accumulation range</div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {money(entryLow)} – {money(entryHigh)}
                  </div>
                </div>

                <div className="glow-card-soft rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Target / stop</div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {money(target)} / {money(stop)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}