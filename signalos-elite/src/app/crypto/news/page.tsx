import Link from "next/link";

import NewsAutoRefresh from "@/components/news/NewsAutoRefresh";
import NewsImage from "@/components/news/NewsImage";
import NewsSourceMark from "@/components/news/NewsSourceMark";
import { fetchTopFreeCryptoNews } from "@/lib/news";

type CryptoNewsCategory = "all" | "majors" | "meme" | "defi" | "rwa";

const CRYPTO_NEWS_TICKERS = [
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "DOGE",
  "AVAX",
  "LINK",
  "UNI",
  "AAVE",
  "ONDO",
  "PEPE",
  "SHIB",
];

const MAJOR_SYMBOLS = new Set(["BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK"]);
const MEME_SYMBOLS = new Set(["DOGE", "SHIB", "PEPE", "BONK", "FLOKI", "WIF", "POPCAT", "MOG", "TRUMP", "SPX", "TURBO", "NEIRO", "GOAT", "GIGA", "MEW", "PNUT", "MOODENG", "APU", "MELANIA", "PONKE", "FWOG", "MEME"]);
const DEFI_SYMBOLS = new Set(["UNI", "AAVE", "COMP", "CRV", "SUSHI", "SNX", "LDO", "RUNE", "PENDLE", "DYDX", "JUP", "ENA", "1INCH", "CVX", "GMX", "BAL", "KNC", "ZRX", "COW", "MORPHO", "AERO", "LQTY", "ACH", "BNT", "FXS"]);
const RWA_SYMBOLS = new Set(["ONDO", "CFG", "GFI", "PAXG", "XAUT", "TRU", "PRO", "CPOOL", "HBAR", "XLM", "ALGO", "VET", "XRP", "LINK", "XDC", "LCX", "QNT"]);

const CRYPTO_NEWS_CATEGORY_CHIPS: ReadonlyArray<{
  id: CryptoNewsCategory;
  label: string;
}> = [
  { id: "all", label: "All Crypto" },
  { id: "majors", label: "Majors" },
  { id: "meme", label: "Meme" },
  { id: "defi", label: "DeFi" },
  { id: "rwa", label: "RWA" },
];

function toneClasses(tone: "bullish" | "bearish" | "neutral") {
  if (tone === "bullish") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (tone === "bearish") return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  return "border-white/10 bg-white/5 text-white/70";
}

function importanceClasses(importance: number) {
  if (importance >= 85) return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (importance >= 70) return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  return "border-white/10 bg-white/5 text-white/70";
}

function formatUpdatedTimeLabel(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function buildCryptoHref(ticker: string, isMobilePreview: boolean) {
  const params = new URLSearchParams();
  params.set("source", "/crypto/news");

  if (isMobilePreview) {
    params.set("mobilePreview", "1");
  }

  return `/crypto/${ticker}?${params.toString()}`;
}

function normalizeCategory(value: string | undefined): CryptoNewsCategory {
  if (value === "majors" || value === "meme" || value === "defi" || value === "rwa") {
    return value;
  }

  return "all";
}

function matchesCategory(
  tickers: string[] | undefined,
  category: CryptoNewsCategory
) {
  if (category === "all") return true;

  const values = Array.isArray(tickers)
    ? tickers.map((ticker) => String(ticker).toUpperCase())
    : [];

  if (values.length === 0) return false;

  if (category === "majors") return values.some((ticker) => MAJOR_SYMBOLS.has(ticker));
  if (category === "meme") return values.some((ticker) => MEME_SYMBOLS.has(ticker));
  if (category === "defi") return values.some((ticker) => DEFI_SYMBOLS.has(ticker));
  return values.some((ticker) => RWA_SYMBOLS.has(ticker));
}

function buildCategoryHref(category: CryptoNewsCategory, isMobilePreview: boolean) {
  const params = new URLSearchParams();

  if (category !== "all") {
    params.set("category", category);
  }

  if (isMobilePreview) {
    params.set("mobilePreview", "1");
  }

  const query = params.toString();
  return query ? `/crypto/news?${query}` : "/crypto/news";
}

export default async function CryptoNewsPage({
  searchParams,
}: {
  searchParams?: Promise<{ mobilePreview?: string; category?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const isMobilePreview = params.mobilePreview === "1";
  const activeCategory = normalizeCategory(params.category);

  let items = [] as Awaited<ReturnType<typeof fetchTopFreeCryptoNews>>;

  try {
    items = await fetchTopFreeCryptoNews({
      tickers: CRYPTO_NEWS_TICKERS,
      limit: 24,
      lookbackHours: 48,
    });
  } catch (error) {
    console.error("Crypto news page data load failed:", error);
  }

  const filteredItems = items.filter((item) => matchesCategory(item.tickers, activeCategory));
  const visibleItems = filteredItems.length > 0 ? filteredItems : items;
  const leadStory =
    visibleItems.find((item) => Boolean(item.image || item.imageUrl)) ?? visibleItems[0] ?? null;
  const feedItems = visibleItems.filter((item) => item.id !== leadStory?.id);
  const updatedAt = leadStory?.rawPublishedAt ?? visibleItems[0]?.rawPublishedAt ?? null;
  const updatedTimeLabel = formatUpdatedTimeLabel(updatedAt);
  const bullishCount = visibleItems.filter((item) => item.tone === "bullish").length;
  const bearishCount = visibleItems.filter((item) => item.tone === "bearish").length;
  const neutralCount = visibleItems.filter((item) => item.tone === "neutral").length;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className={isMobilePreview ? "space-y-4 px-4 pb-6 pt-10" : "space-y-6 px-6 py-8"}>
        <section className={isMobilePreview ? "relative overflow-hidden rounded-3xl border border-white/10 bg-black/60 p-5" : "relative overflow-hidden rounded-3xl border border-white/10 bg-black/60 p-6"}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_34%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(0,0,0,0.96))]" />
          <div className={isMobilePreview ? "relative z-10 pr-28" : "relative z-10"}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/85">
              Sigi Crypto
            </div>
            <h1 className={isMobilePreview ? "mt-3 text-3xl font-semibold" : "mt-3 text-5xl font-semibold"}>
              Crypto News Command Center
            </h1>
            <p className={isMobilePreview ? "mt-2 max-w-3xl text-sm leading-6 text-white/60" : "mt-3 max-w-3xl text-sm leading-6 text-white/60"}>
              Live crypto headlines with article images, market-moving context, and direct links into your crypto detail pages.
            </p>

            <div className={isMobilePreview ? "mt-4 flex flex-wrap items-center gap-2" : "mt-5 flex flex-wrap items-center gap-2"}>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                Live Crypto Headlines
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
                Last updated {updatedTimeLabel ?? "now"}
              </div>
              <NewsAutoRefresh />
            </div>

            <div className={isMobilePreview ? "mt-4 flex flex-wrap gap-2" : "mt-5 flex flex-wrap gap-2"}>
              {CRYPTO_NEWS_CATEGORY_CHIPS.map((chip) => {
                const active = activeCategory === chip.id;

                return (
                  <Link
                    key={chip.id}
                    href={buildCategoryHref(chip.id, isMobilePreview)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      active
                        ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-100"
                        : "border-white/10 bg-white/4 text-white/65 hover:bg-white/8 hover:text-white",
                    ].join(" ")}
                  >
                    {chip.label}
                  </Link>
                );
              })}
            </div>

            <div className={isMobilePreview ? "mt-4 grid grid-cols-3 gap-3" : "mt-6 grid gap-3 md:grid-cols-3"}>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Bullish</div>
                <div className="mt-2 text-2xl font-semibold text-emerald-300">{bullishCount}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Neutral</div>
                <div className="mt-2 text-2xl font-semibold text-white/80">{neutralCount}</div>
              </div>
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/8 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Bearish</div>
                <div className="mt-2 text-2xl font-semibold text-rose-300">{bearishCount}</div>
              </div>
            </div>
          </div>
        </section>

        {leadStory ? (
          <section className={isMobilePreview ? "space-y-4" : "grid gap-6 xl:grid-cols-[1.2fr_0.8fr]"}>
            <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/4">
              <NewsImage
                src={leadStory.image}
                href={leadStory.url}
                title={leadStory.headline}
                variant="banner"
              />
              <div className="p-5 md:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                    Lead Story
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClasses(leadStory.tone)}`}>
                    {leadStory.tone}
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${importanceClasses(leadStory.importance)}`}>
                    {leadStory.importance} importance
                  </div>
                </div>

                <a
                  href={leadStory.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 block text-2xl font-semibold leading-tight text-white transition hover:text-cyan-100"
                >
                  {leadStory.headline}
                </a>

                <p className="mt-4 text-sm leading-7 text-white/62">{leadStory.summary}</p>

                {leadStory.whyItMatters ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/58">
                    {leadStory.whyItMatters}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                  <NewsSourceMark source={leadStory.source} compact />
                  <span>-</span>
                  <span>{leadStory.publishedAt}</span>
                </div>

                {(leadStory.tickers ?? []).length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {leadStory.tickers.slice(0, 6).map((ticker) => (
                      <Link
                        key={ticker}
                        href={buildCryptoHref(ticker, isMobilePreview)}
                        className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                      >
                        {ticker}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>

            <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Fast Tape
              </div>
              <div className="mt-4 space-y-3">
                {feedItems.slice(0, 5).map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-white/20 hover:bg-white/6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/42">
                          <span>{item.source}</span>
                          <span>{item.publishedAt}</span>
                        </div>
                        <div className="mt-2 text-sm font-semibold leading-6 text-white/88">{item.headline}</div>
                      </div>
                      <div className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClasses(item.tone)}`}>
                        {item.tone}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-white/4 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
                Crypto Article Feed
              </div>
              <div className="mt-1 text-sm text-white/52">
                Image-led crypto stories covering majors, DeFi, memes, and tokenized-asset themes.
              </div>
            </div>

            <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
              {visibleItems.length} articles
            </div>
          </div>

          {visibleItems.length > 0 ? (
            <div className={isMobilePreview ? "mt-5 space-y-4" : "mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3"}>
              {visibleItems.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-black/25 transition hover:border-white/18 hover:bg-white/5"
                >
                  <NewsImage
                    src={item.image}
                    href={item.url}
                    title={item.headline}
                    variant="thumbnail"
                  />
                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClasses(item.tone)}`}>
                        {item.tone}
                      </div>
                      <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${importanceClasses(item.importance)}`}>
                        {item.impact}
                      </div>
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-3 block text-base font-semibold leading-6 text-white transition hover:text-cyan-100"
                    >
                      {item.headline}
                    </a>

                    <p className="mt-3 text-sm leading-6 text-white/58">{item.summary}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                      <NewsSourceMark source={item.source} compact />
                      <span>-</span>
                      <span>{item.publishedAt}</span>
                    </div>

                    {(item.tickers ?? []).length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.tickers.slice(0, 5).map((ticker) => (
                          <Link
                            key={`${item.id}-${ticker}`}
                            href={buildCryptoHref(ticker, isMobilePreview)}
                            className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200 transition hover:bg-cyan-400/20"
                          >
                            {ticker}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 px-4 py-5 text-sm text-white/58">
              No crypto articles loaded yet. The page will populate as fresh headlines come through the feed.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}