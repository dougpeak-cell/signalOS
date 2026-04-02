import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import PageHeaderBlock from "@/components/shell/PageHeaderBlock";
import { getQuotePrice } from "@/lib/market/quotes";

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
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
  tier: string | null;
  as_of_date: string | null;
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
  return `${Math.round(Number(v) * 100)}%`;
}

function upsidePct(price: number | null | undefined, target: number | null | undefined) {
  if (price == null || target == null) return null;
  if (!Number.isFinite(Number(price)) || !Number.isFinite(Number(target)) || Number(price) <= 0) return null;
  return ((Number(target) - Number(price)) / Number(price)) * 100;
}

function formatUpside(v: number | null) {
  if (v == null || !Number.isFinite(v)) return "—";
  const rounded = Math.round(v * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
}

function tierStyles(tier: string | null | undefined) {
  const t = (tier ?? "").toLowerCase();

  if (t === "elite") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (t === "strong") return "border-sky-200 bg-sky-50 text-sky-700";
  if (t === "risk") return "border-amber-200 bg-amber-50 text-amber-700";

  return "border-neutral-200 bg-neutral-50 text-neutral-700";
}

async function searchSignals(query: string): Promise<SignalRow[]> {
  const supabase = await createSupabaseServerClient();

  let builder = supabase
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
      tier,
      as_of_date
    `)
    .order("conviction", { ascending: false })
    .limit(24);

  const q = query.trim();

  if (q) {
    builder = builder.or(
      [
        `ticker.ilike.%${q}%`,
        `company_name.ilike.%${q}%`,
        `sector.ilike.%${q}%`,
      ].join(",")
    );
  }

  const { data, error } = await builder;

  if (error) {
    console.error("Search signals query failed:", error.message);
    return [];
  }

  return (data ?? []) as SignalRow[];
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = (await searchParams) ?? {};
  const q = (params.q ?? "").trim();
  const rows = await searchSignals(q);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <div className="mx-auto max-w-7xl px-6 py-8 md:px-8 lg:px-10">
        <section className="overflow-hidden rounded-4xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-6 py-7 md:px-8">
            <PageHeaderBlock
              eyebrow={<span className="text-neutral-600">Search</span>}
              title="Search tickers and ideas"
              description="Find names by ticker, company, or sector across your SignalOS coverage universe."
              className="rounded-[28px] border-neutral-200 bg-neutral-50 shadow-none"
              titleClassName="text-neutral-950 md:text-4xl"
              descriptionClassName="max-w-3xl text-sm leading-6 text-neutral-600 md:text-base"
              actions={
                <>
                  <Link
                    href="/"
                    className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
                  >
                    Today
                  </Link>
                  <Link
                    href="/screener"
                    className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
                  >
                    Screener
                  </Link>
                  <Link
                    href="/portfolio"
                    className="inline-flex items-center rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    Portfolio
                  </Link>
                </>
              }
            />
          </div>

          <div className="px-6 py-6 md:px-8">
            <form action="/search" className="flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search ticker, company, or sector..."
                className="h-12 flex-1 rounded-2xl border border-neutral-300 bg-white px-4 text-sm outline-none transition focus:border-neutral-950"
              />
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-neutral-950 px-5 text-sm font-medium text-white transition hover:opacity-90"
              >
                Search
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {["NVDA", "MSFT", "AMZN", "Semiconductors", "Software"].map((tag) => (
                <Link
                  key={tag}
                  href={`/search?q=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {q ? `Results for "${q}"` : "Coverage universe"}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {rows.length} {rows.length === 1 ? "result" : "results"}
              </p>
            </div>
          </div>

          {rows.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => {
                const currentPrice = getQuotePrice(row.ticker);
                const upside = upsidePct(currentPrice, row.target_price);

                return (
                  <Link
                    key={`${row.ticker}-${row.as_of_date ?? "na"}`}
                    href={`/stocks/${row.ticker}`}
                    className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm text-neutral-500">{row.company_name ?? "Company"}</div>
                        <div className="mt-1 text-3xl font-semibold tracking-tight">{row.ticker}</div>
                      </div>

                      <div
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tierStyles(
                          row.tier
                        )}`}
                      >
                        {row.tier ?? "Signal"}
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-neutral-500">
                      {row.sector ?? "Sector"}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-neutral-50 p-3">
                        <div className="text-xs uppercase tracking-wide text-neutral-500">Price</div>
                        <div className="mt-1 text-lg font-semibold">{money(currentPrice)}</div>
                      </div>
                      <div className="rounded-2xl bg-neutral-50 p-3">
                        <div className="text-xs uppercase tracking-wide text-neutral-500">Conviction</div>
                        <div className="mt-1 text-lg font-semibold">{pct(row.conviction)}</div>
                      </div>
                      <div className="rounded-2xl bg-neutral-50 p-3">
                        <div className="text-xs uppercase tracking-wide text-neutral-500">Target</div>
                        <div className="mt-1 text-lg font-semibold">{money(row.target_price)}</div>
                      </div>
                      <div className="rounded-2xl bg-neutral-50 p-3">
                        <div className="text-xs uppercase tracking-wide text-neutral-500">Upside</div>
                        <div className="mt-1 text-lg font-semibold">{formatUpside(upside)}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <div className="text-neutral-500">
                        Entry {money(row.entry_low)} – {money(row.entry_high)}
                      </div>
                      <div className="font-medium text-neutral-900">Open </div>
                    </div>

                    {row.thesis ? (
                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-neutral-600">
                        {row.thesis}
                      </p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-neutral-300 bg-white px-6 py-14 text-center shadow-sm">
              <div className="text-xl font-semibold text-neutral-900">
                {q ? "No matches found" : "No signals yet"}
              </div>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
                {q
                  ? "Try a ticker, company name, or broader sector term."
                  : "Once your signals table fills up, search results will appear here."}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
