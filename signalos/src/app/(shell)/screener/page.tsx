import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import LiveMiniPrice from "@/components/stocks/LiveMiniPrice";
import LiveMiniChange from "@/components/stocks/LiveMiniChange";
import { getQuotePrice } from "@/lib/market/quotes";
import { convictionToPct, signalToneFromTargets } from "@/lib/signalUtils";

export const revalidate = 0;

type ScreenerPageProps = {
  searchParams?: Promise<{
    q?: string;
    tier?: string;
    sector?: string;
    sort?: string;
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
};

type SortKey = "conviction" | "upside" | "price" | "ticker";

function signalLabelFromBias(
  bias: "bullish" | "neutral" | "bearish" | null | undefined
): "Bullish" | "Neutral" | "Bearish" {
  if (bias === "bullish") return "Bullish";
  if (bias === "bearish") return "Bearish";
  return "Neutral";
}

function ConvictionBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value ?? 0));

  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 w-24 overflow-hidden rounded-full border border-white/10 bg-white/5">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            clamped >= 90
              ? "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.55)]"
              : clamped >= 80
              ? "bg-emerald-400/90 shadow-[0_0_10px_rgba(52,211,153,0.35)]"
              : "bg-emerald-400/75"
          }`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="min-w-10 text-right text-sm font-semibold text-white">
        {clamped}%
      </div>
    </div>
  );
}

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

function upsidePct(
  price: number | null | undefined,
  target: number | null | undefined
) {
  if (price == null || target == null) return null;
  const p = Number(price);
  const t = Number(target);
  if (!Number.isFinite(p) || !Number.isFinite(t) || p <= 0) return null;
  return ((t - p) / p) * 100;
}

function formatUpside(v: number | null) {
  if (v == null || !Number.isFinite(v)) return "—";
  const rounded = Math.round(v * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
}

function tierPillStyles(tier: string | null | undefined) {
  const t = (tier ?? "").toLowerCase();

  if (t === "elite") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  }
  if (t === "strong") {
    return "border-cyan-500/25 bg-cyan-500/10 text-cyan-300";
  }
  if (t === "risk") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }

  return "border-white/10 bg-white/5 text-white/75";
}

function cleanSort(value: string | undefined): SortKey {
  if (value === "upside" || value === "price" || value === "ticker") return value;
  return "conviction";
}

function canonicalPrice(row: SignalRow) {
  return getQuotePrice(row.ticker) ?? row.price ?? 0;
}

async function getAllSignals(): Promise<SignalRow[]> {
  const supabase = await createSupabaseServerClient();

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
      as_of_date
    `)
    .limit(200);

  if (error) {
    console.error("Screener query failed:", error.message);
    return [];
  }

  return (data ?? []) as SignalRow[];
}

function uniqueSectors(rows: SignalRow[]) {
  return Array.from(
    new Set(rows.map((r) => (r.sector ?? "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
}

function sortRows(rows: SignalRow[], sort: SortKey) {
  const copy = [...rows];

  if (sort === "ticker") {
    return copy.sort((a, b) => a.ticker.localeCompare(b.ticker));
  }

  if (sort === "price") {
    return copy.sort(
      (a, b) => Number(canonicalPrice(b) ?? -1) - Number(canonicalPrice(a) ?? -1)
    );
  }

  if (sort === "upside") {
    return copy.sort((a, b) => {
      const aUp = upsidePct(canonicalPrice(a), a.target_price);
      const bUp = upsidePct(canonicalPrice(b), b.target_price);
      return Number(bUp ?? -999) - Number(aUp ?? -999);
    });
  }

  return copy.sort(
    (a, b) => Number(b.conviction ?? -1) - Number(a.conviction ?? -1)
  );
}

function MetricCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="rounded-3xl border border-cyan-500/18 bg-cyan-500/4 px-4 py-5 shadow-[0_0_18px_rgba(0,255,200,0.07)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
        {label}
      </div>
      <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
        {value}
      </div>
      <div className="mt-2 text-sm text-white/55">{sublabel}</div>
    </div>
  );
}

export default async function ScreenerPage({
  searchParams,
}: ScreenerPageProps) {
  const params = (await searchParams) ?? {};
  const q = (params.q ?? "").trim();
  const tier = (params.tier ?? "").trim().toLowerCase();
  const sector = (params.sector ?? "").trim();
  const sort = cleanSort(params.sort);

  const rawRows = await getAllSignals();
  const sectors = uniqueSectors(rawRows);

  const filtered = rawRows.filter((row) => {
    const qLower = q.toLowerCase();

    const matchesQ =
      !q ||
      row.ticker.toLowerCase().includes(qLower) ||
      row.company_name?.toLowerCase().includes(qLower) ||
      row.sector?.toLowerCase().includes(qLower) ||
      row.thesis?.toLowerCase().includes(qLower);

    const matchesTier = !tier || (row.tier ?? "").toLowerCase() === tier;
    const matchesSector = !sector || (row.sector ?? "") === sector;

    return matchesQ && matchesTier && matchesSector;
  });

  const rows = sortRows(filtered, sort);
  const allStocks = rows.map((row, index) => {
    const conviction = convictionToPct(row.conviction) ?? 0;

    const livePrice = getQuotePrice(row.ticker);
    const fallbackPrice = row.price ?? null;

    const price =
      livePrice ??
      fallbackPrice ??
      0;

    const bias = signalToneFromTargets(fallbackPrice, row.target_price);
    const signal = signalLabelFromBias(bias);

    return {
      id: `${row.ticker}-${index}`,
      ticker: row.ticker,
      company: row.company_name ?? row.ticker,
      sector: row.sector ?? "Market",
      conviction,
      price: fallbackPrice,
      target: row.target_price,
      signal,
      thesis: row.thesis?.trim() || "No thesis available yet.",
      tier: row.tier,
      entryLow: row.entry_low,
      entryHigh: row.entry_high,
      stopLoss: row.stop_loss,
    };
  });

  const eliteCount = filtered.filter(
    (r) => (r.tier ?? "").toLowerCase() === "elite"
  ).length;
  const strongCount = filtered.filter(
    (r) => (r.tier ?? "").toLowerCase() === "strong"
  ).length;
  const riskCount = filtered.filter(
    (r) => (r.tier ?? "").toLowerCase() === "risk"
  ).length;

  const avgConviction =
    filtered.length > 0
      ? Math.round(
          (filtered.reduce((sum, r) => sum + Number(r.conviction ?? 0), 0) /
            filtered.length) *
            100
        )
      : 0;

  const topUpside =
    filtered.length > 0
      ? filtered
          .map((r) => upsidePct(canonicalPrice(r), r.target_price))
          .filter((v): v is number => v != null && Number.isFinite(v))
          .sort((a, b) => b - a)[0] ?? null
      : null;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,rgba(0,255,200,0.12),transparent_28%),linear-gradient(180deg,rgba(6,10,22,0.96),rgba(3,6,18,0.98))] shadow-[0_0_0_1px_rgba(0,255,200,0.04),0_0_32px_rgba(0,255,200,0.08)]">
        <div className="space-y-8 px-6 py-7 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300/80">
                SignalOS Screener
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Equity screener
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/60 sm:text-base">
                Filter the live signal universe by tier, sector, conviction
                profile, and upside potential.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/today"
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-5 py-2.5 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400/50 hover:bg-cyan-500/15"
              >
                Today
              </Link>
              <Link
                href="/search"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/8"
              >
                Search
              </Link>
              <Link
                href="/portfolio"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/8"
              >
                Portfolio
              </Link>
            </div>
          </div>

          <div className="h-px w-full bg-linear-to-r from-cyan-400/0 via-cyan-300/60 to-cyan-400/0" />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Results"
              value={String(allStocks.length)}
              sublabel="Matching signals"
            />
            <MetricCard
              label="Elite"
              value={String(eliteCount)}
              sublabel="Highest-rated names"
            />
            <MetricCard
              label="Strong"
              value={String(strongCount)}
              sublabel="Core opportunity set"
            />
            <MetricCard
              label="Risk"
              value={String(riskCount)}
              sublabel="Caution names"
            />
            <MetricCard
              label="Top upside"
              value={formatUpside(topUpside)}
              sublabel={`Avg conviction ${avgConviction}%`}
            />
          </div>

          <form
            action="/screener"
            className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.6fr)_220px_220px_220px_110px]"
          >
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search ticker, company, sector, or thesis..."
              className="rounded-2xl border border-cyan-500/20 bg-cyan-500/4 px-4 py-3 text-sm font-medium text-white placeholder:text-white/35 outline-none shadow-[0_0_18px_rgba(0,255,200,0.08)] transition focus:border-cyan-400/40"
            />

            <select
              name="tier"
              defaultValue={tier}
              className="rounded-2xl border border-cyan-500/20 bg-cyan-500/4 px-4 py-3 text-sm font-semibold text-white outline-none shadow-[0_0_14px_rgba(0,255,200,0.06)]"
            >
              <option value="" className="bg-neutral-950">
                All tiers
              </option>
              <option value="elite" className="bg-neutral-950">
                Elite
              </option>
              <option value="strong" className="bg-neutral-950">
                Strong
              </option>
              <option value="risk" className="bg-neutral-950">
                Risk
              </option>
            </select>

            <select
              name="sector"
              defaultValue={sector}
              className="rounded-2xl border border-cyan-500/20 bg-cyan-500/4 px-4 py-3 text-sm font-semibold text-white outline-none shadow-[0_0_14px_rgba(0,255,200,0.06)]"
            >
              <option value="" className="bg-neutral-950">
                All sectors
              </option>
              {sectors.map((item) => (
                <option key={item} value={item} className="bg-neutral-950">
                  {item}
                </option>
              ))}
            </select>

            <select
              name="sort"
              defaultValue={sort}
              className="rounded-2xl border border-cyan-500/20 bg-cyan-500/4 px-4 py-3 text-sm font-semibold text-white outline-none shadow-[0_0_14px_rgba(0,255,200,0.06)]"
            >
              <option value="conviction" className="bg-neutral-950">
                Sort: Conviction
              </option>
              <option value="upside" className="bg-neutral-950">
                Sort: Upside
              </option>
              <option value="price" className="bg-neutral-950">
                Sort: Price
              </option>
              <option value="ticker" className="bg-neutral-950">
                Sort: Ticker
              </option>
            </select>

            <button
              type="submit"
              className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90"
            >
              Apply
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/screener"
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                !tier && !sector
                  ? "border border-cyan-500/35 bg-cyan-500/10 text-cyan-300"
                  : "border border-white/10 bg-white/4 text-white/75 transition hover:border-white/20 hover:bg-white/6"
              }`}
            >
              Reset
            </Link>

            {["Elite", "Strong", "Risk", "Semiconductors", "Software"].map(
              (tag) => {
                const href = ["Elite", "Strong", "Risk"].includes(tag)
                  ? `/screener?tier=${tag.toLowerCase()}`
                  : `/screener?sector=${encodeURIComponent(tag)}`;

                const active =
                  (["Elite", "Strong", "Risk"].includes(tag) &&
                    tier === tag.toLowerCase()) ||
                  (!["Elite", "Strong", "Risk"].includes(tag) &&
                    sector === tag);

                return (
                  <Link
                    key={tag}
                    href={href}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      active
                        ? "border border-cyan-500/35 bg-cyan-500/10 text-cyan-300"
                        : "border border-white/10 bg-white/4 text-white/75 transition hover:border-white/20 hover:bg-white/6"
                    }`}
                  >
                    {tag}
                  </Link>
                );
              }
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Screened ideas
          </h2>
          <p className="mt-2 text-sm text-white/55">
            Refined list of names matching your current filter set.
          </p>
        </div>

        {allStocks.length ? (
          <div className="overflow-hidden rounded-[28px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(10,16,33,0.95),rgba(7,11,22,0.98))] shadow-[0_0_0_1px_rgba(0,255,200,0.03),0_0_20px_rgba(0,255,200,0.05)]">
            <div className="hidden grid-cols-[1.05fr_1.45fr_0.9fr_0.8fr_1fr_0.8fr_0.55fr] gap-4 border-b border-white/10 bg-white/3 px-6 py-4 lg:grid">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Ticker
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Company / Thesis
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Sector
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Price
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Conviction
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Upside
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Open
              </div>
            </div>

            <div className="divide-y divide-white/10">
              {allStocks.map((stock) => {
                const upside = upsidePct(stock.price, stock.target);

                return (
                  <Link
                    key={stock.id}
                    href={`/stocks/${stock.ticker.toLowerCase()}`}
                    className="block px-6 py-5 transition hover:bg-cyan-500/4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1.05fr_1.45fr_0.9fr_0.8fr_1fr_0.8fr_0.55fr] lg:items-center">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-semibold tracking-tight text-white">
                            {stock.ticker}
                          </div>
                          <div
                            className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${tierPillStyles(
                              stock.tier
                            )}`}
                          >
                            {stock.tier ?? "Signal"}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-white/60 lg:hidden">
                          {stock.company}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-white">
                          {stock.company}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/60">
                          {stock.thesis}
                        </p>
                      </div>

                      <div className="text-sm text-white/60">
                        {stock.sector ?? "—"}
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-wide text-white/40 lg:hidden">
                          Price
                        </div>
                        <div className="font-semibold text-white">
                          $<LiveMiniPrice ticker={stock.ticker} fallbackPrice={stock.price ?? null} />
                        </div>
                        <div className="mt-1">
                          <LiveMiniChange ticker={stock.ticker} fallbackChangePct={null} />
                        </div>
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-wide text-white/40 lg:hidden">
                          Conviction
                        </div>
                        <ConvictionBar
                          value={Math.round(stock.conviction)}
                        />
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-wide text-white/40 lg:hidden">
                          Upside
                        </div>
                        <div className="font-semibold text-white">
                          {formatUpside(upside)}
                        </div>
                      </div>

                      <div className="text-sm font-medium text-cyan-300">
                        Open →
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3 lg:hidden">
                      <div className="rounded-2xl border border-white/10 bg-white/3 p-3">
                        <div className="text-xs uppercase tracking-wide text-white/35">
                          Entry
                        </div>
                        <div className="mt-1 font-semibold text-white">
                          {money(stock.entryLow)} – {money(stock.entryHigh)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/3 p-3">
                        <div className="text-xs uppercase tracking-wide text-white/35">
                          Target
                        </div>
                        <div className="mt-1 font-semibold text-white">
                          {money(stock.target)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/3 p-3">
                        <div className="text-xs uppercase tracking-wide text-white/35">
                          Stop
                        </div>
                        <div className="mt-1 font-semibold text-white">
                          {money(stock.stopLoss)}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-white/15 bg-white/3 px-6 py-14 text-center">
            <div className="text-xl font-semibold text-white">
              No ideas match this screen
            </div>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">
              Broaden your filters, remove a sector restriction, or search a
              wider theme.
            </p>

            <div className="mt-6">
              <Link
                href="/screener"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              >
                Reset screener
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}