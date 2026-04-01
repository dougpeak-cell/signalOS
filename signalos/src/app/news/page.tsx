import Link from "next/link";
import NewsAutoRefresh from "@/components/news/NewsAutoRefresh";
import NewsImage from "@/components/news/NewsImage";
import React from "react";

function MarketStatusBar({
  intelligence,
  newsItems,
  watchlistNews,
}: {
  intelligence: any;
  newsItems: any[];
  watchlistNews: any[];
}) {
  const sentiment =
    intelligence.bullish > intelligence.bearish
      ? "Bullish"
      : intelligence.bearish > intelligence.bullish
        ? "Bearish"
        : "Mixed";

  const sentimentClasses =
    sentiment === "Bullish"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : sentiment === "Bearish"
        ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
        : "border-white/10 bg-white/5 text-white/70";

  return (
    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
        <span className="text-cyan-300/70">Regime</span>
        <span className="text-white">Trend Day</span>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
        <span className="text-emerald-300/70">Risk</span>
        <span className="text-white">Risk On</span>
      </div>

      <div
        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${sentimentClasses}`}
      >
        <span className={sentiment === "Mixed" ? "text-white/45" : ""}>
          Sentiment
        </span>
        <span>{sentiment}</span>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
        <span className="text-white/45">Headlines</span>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-white">{newsItems.length} Live</span>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
        <span className="text-amber-300/70">Watchlist</span>
        <span className="text-white">{watchlistNews.length} In Focus</span>
      </div>
    </div>
  );
}

function toneClasses(tone: "bullish" | "bearish" | "neutral") {
  if (tone === "bullish") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (tone === "bearish") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  }

  return "border-white/10 bg-white/5 text-white/70";
}

function importanceClasses(importance: number) {
  if (importance >= 85) {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (importance >= 70) {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  }

  return "border-white/10 bg-white/5 text-white/70";
}

function buildNewsIntelligence(items: any[]) {
  const bullish = items.filter((item) => item.tone === "bullish").length;
  const bearish = items.filter((item) => item.tone === "bearish").length;
  const neutral = items.filter((item) => item.tone === "neutral").length;

  const tickerCounts = new Map<string, number>();

  for (const item of items) {
    for (const ticker of item.tickers ?? []) {
      const key = String(ticker).toUpperCase().trim();
      if (!key) continue;
      tickerCounts.set(key, (tickerCounts.get(key) ?? 0) + 1);
    }
  }

  const trendingTickers = Array.from(tickerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const topCategories = items.reduce<Record<string, number>>((acc, item) => {
    const key = String(item.category ?? "other");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const dominantCategory =
    Object.entries(topCategories).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "market";

  const rotationSeed = Math.floor(Date.now() / 10000);
  let narrative = "Headline flow is balanced with no dominant market theme yet.";

  if (bullish > bearish + 2) {
    const bullishVariants = [
      `Bullish headline flow is leading this tape, with ${dominantCategory} stories driving market attention.`,
      `Market tone is bullish, with ${dominantCategory} headlines fueling risk appetite.`,
      `Strong bullish momentum as ${dominantCategory} stories dominate the news stream.`,
    ];
    narrative = bullishVariants[rotationSeed % bullishVariants.length];
  } else if (bearish > bullish + 2) {
    const bearishVariants = [
      `Bearish headline flow is pressuring sentiment, with ${dominantCategory} developments weighing on risk appetite.`,
      `Sentiment is bearish, led by ${dominantCategory} stories dampening risk.`,
      `Bearish momentum as ${dominantCategory} news drives caution in the market.`,
    ];
    narrative = bearishVariants[rotationSeed % bearishVariants.length];
  } else if (dominantCategory === "ai" || dominantCategory === "semis") {
    const aiVariants = [
      "AI and semiconductor stories dominate the tape.",
      "Growth and momentum leadership from AI and semis.",
      "AI and chip headlines are setting the market tone.",
    ];
    narrative = aiVariants[rotationSeed % aiVariants.length];
  } else if (dominantCategory === "macro" || dominantCategory === "fed") {
    const macroVariants = [
      "Macro and Fed commentary influencing sentiment.",
      "Rate-sensitive headlines are shaping market direction.",
      "Macro themes and Fed speak are in focus.",
    ];
    narrative = macroVariants[rotationSeed % macroVariants.length];
  } else if (dominantCategory === "energy") {
    const energyVariants = [
      "Energy-linked headlines gaining attention.",
      "Oil and commodity sensitivity back in focus.",
      "Energy sector stories are driving market action.",
    ];
    narrative = energyVariants[rotationSeed % energyVariants.length];
  }

  return {
    bullish,
    bearish,
    neutral,
    trendingTickers,
    narrative,
  };
}

export default async function NewsPage() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/news`, {
    cache: "no-store",
  });

  const data = await res.json();

  const newsItems = Array.isArray(data?.items) ? data.items : [];
  const watchlistNews = Array.isArray(data?.watchlist) ? data.watchlist : [];
  const liveStream = Array.isArray(data?.liveStream) ? data.liveStream : [];
  const leadStory =
    newsItems.find((item: any) => item.imageUrl && item.importance >= 70) ??
    newsItems.find((item: any) => item.imageUrl) ??
    newsItems[0] ??
    null;
  const updatedAt = data?.updatedAt ?? null;

  const intelligence = buildNewsIntelligence(newsItems);

  return (
    <main className="min-h-screen bg-black text-white w-full">
      <div className="w-full space-y-6 md:space-y-6 xl:space-y-7">
        <div className="space-y-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
                SignalOS
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-[34px]">
                News
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-white/55">
                Live market intelligence, watchlist headlines, and
                trader-relevant macro flow.
              </p>
            </div>

            <div className="flex flex-col gap-2 lg:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                  Live
                </div>

                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
                  Last updated{" "}
                  {updatedAt
                    ? new Date(updatedAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "now"}
                </div>

                <NewsAutoRefresh />
              </div>

              <MarketStatusBar
                intelligence={intelligence}
                newsItems={newsItems}
                watchlistNews={watchlistNews}
              />
            </div>
          </div>

          <div className="border-b border-white/10 pt-1" />
        </div>

        <div className="rounded-[28px] border border-emerald-400/15 bg-linear-to-b from-emerald-500/8 via-black to-black p-4 shadow-[0_0_28px_rgba(16,185,129,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
                SignalOS Intelligence
              </div>
              <div className="mt-1 text-xs text-white/40">
                Live narrative engine
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              Live
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
                Bullish
              </div>
              <div className="mt-1 text-lg font-semibold text-emerald-300">
                {intelligence.bullish}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/4 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Neutral
              </div>
              <div className="mt-1 text-lg font-semibold text-white">
                {intelligence.neutral}
              </div>
            </div>

            <div className="rounded-2xl border border-rose-400/15 bg-rose-400/10 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300/70">
                Bearish
              </div>
              <div className="mt-1 text-lg font-semibold text-rose-300">
                {intelligence.bearish}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-white/10 bg-white/3 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Market narrative
            </div>
            <p className="mt-2 text-sm leading-6 text-white/68">
              {intelligence.narrative}
            </p>
          </div>

          <div className="mt-4 rounded-[20px] border border-white/10 bg-white/3 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Trending tickers
            </div>

            {intelligence.trendingTickers.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {intelligence.trendingTickers.map(([ticker, count]: [string, number]) => (
                  <div
                    key={ticker}
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                      {ticker}
                    </span>
                    <span className="rounded-full bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/70">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-sm text-white/45">
                No ticker concentration detected yet.
              </div>
            )}
          </div>
        </div>

        {leadStory ? (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <Link
              href={leadStory.url}
              className="group min-w-0 rounded-[28px] border border-cyan-400/15 bg-linear-to-br from-cyan-500/10 via-black to-black p-6 transition hover:border-cyan-300/30"
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  Lead story
                </div>

                <div
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClasses(
                    leadStory.tone
                  )}`}
                >
                  {leadStory.tone}
                </div>

                <div
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${importanceClasses(
                    leadStory.importance
                  )}`}
                >
                  {leadStory.importance} importance
                </div>
              </div>

              <h2 className="max-w-4xl text-2xl font-semibold tracking-tight text-white md:text-3xl">
                {leadStory.headline}
              </h2>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-white/65">
                {leadStory.summary}
              </p>

              {leadStory.whyItMatters ? (
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/3 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                    Why it matters
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/62">
                    {leadStory.whyItMatters}
                  </p>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-white/45">
                <span>{leadStory.source}</span>
                <span>•</span>
                <span>{leadStory.publishedAt}</span>
              </div>

              {(leadStory.tickers ?? []).length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {leadStory.tickers.slice(0, 6).map((ticker: string) => (
                    <span
                      key={ticker}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75"
                    >
                      {ticker}
                    </span>
                  ))}
                </div>
              ) : null}
            </Link>

            <div className="min-w-0 rounded-[28px] border border-emerald-400/15 bg-linear-to-b from-emerald-500/8 via-black to-black p-4 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
                    SignalOS Visuals
                  </div>
                  <div className="mt-1 text-xs text-white/40">
                    Live market imagery
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                  Live
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  href={leadStory.url}
                  className="group block overflow-hidden rounded-[22px] border border-white/10 bg-black/40 transition hover:border-cyan-400/20"
                >
                  {leadStory.imageUrl ? (
                    <div className="relative aspect-16/10 overflow-hidden">
                      <NewsImage
                        src={leadStory.imageUrl}
                        alt={leadStory.headline}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent" />

                      <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        Lead visual
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <div className="line-clamp-3 text-sm font-semibold leading-5 text-white">
                          {leadStory.headline}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                          <span>{leadStory.source}</span>
                          <span>•</span>
                          <span>{leadStory.publishedAt}</span>
                        </div>

                        {(leadStory.tickers ?? []).length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {leadStory.tickers.slice(0, 4).map((ticker: string) => (
                              <span
                                key={ticker}
                                className="rounded-full border border-white/10 bg-black/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80"
                              >
                                {ticker}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-linear-to-br from-cyan-500/15 via-emerald-500/10 to-black p-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        Lead visual
                      </div>

                      <div className="mt-4 text-sm font-semibold leading-5 text-white">
                        {leadStory.headline}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/55">
                        <span>{leadStory.source}</span>
                        <span>•</span>
                        <span>{leadStory.publishedAt}</span>
                      </div>

                      {(leadStory.tickers ?? []).length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {leadStory.tickers.slice(0, 4).map((ticker: string) => (
                            <span
                              key={ticker}
                              className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80"
                            >
                              {ticker}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </Link>

                <div className="rounded-[20px] border border-white/10 bg-white/3 p-3">
                  <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                    Visual stream
                  </div>

                  <div className="space-y-3">
                    {liveStream.slice(1, 5).map((item: any, index: number) => (
                      <Link
                        key={item.id ?? `${item.headline}-${index}`}
                        href={item.url}
                        className="group flex gap-3 rounded-[18px] border border-white/10 bg-black/30 p-3 transition hover:border-white/15 hover:bg-white/4.5"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.headline}
                            className="h-16 w-20 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="h-16 w-20 shrink-0 rounded-xl bg-linear-to-br from-cyan-500/15 via-emerald-500/10 to-black" />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 text-xs font-semibold leading-5 text-white group-hover:text-cyan-100">
                            {item.headline}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-white/35">
                            <span>{item.source}</span>
                            <span>•</span>
                            <span>{item.publishedAt}</span>
                          </div>

                          {(item.tickers ?? []).length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {item.tickers.slice(0, 3).map((ticker: string) => (
                                <span
                                  key={ticker}
                                  className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-300"
                                >
                                  {ticker}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </Link>
                    ))}

                    {liveStream.length <= 1 ? (
                      <div className="rounded-[18px] border border-white/10 bg-black/30 p-4 text-sm text-white/45">
                        More live visuals will appear here as fresh headlines arrive.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/3 p-6 text-white/60">
            No lead story available.
          </div>
        )}

        {watchlistNews.length > 0 ? (
          <section className="space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
              Watchlist headlines
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {watchlistNews.map((item: any) => (
                <Link
                  key={item.id}
                  href={item.url}
                  className="rounded-3xl border border-white/10 bg-white/3 p-5 transition hover:border-white/15 hover:bg-white/5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                      Watchlist
                    </div>

                    <div
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClasses(
                        item.tone
                      )}`}
                    >
                      {item.tone}
                    </div>
                  </div>

                  <div className="mt-3 text-base font-semibold leading-6 text-white">
                    {item.headline}
                  </div>

                  <p className="mt-3 text-sm leading-6 text-white/58">
                    {item.summary}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(item.tickers ?? []).slice(0, 6).map((ticker: string) => (
                      <span
                        key={ticker}
                        className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300"
                      >
                        {ticker}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {newsItems.length > 0 ? (
          <section className="space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
              Market headlines
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {newsItems.map((item: any) => (
                <Link
                  key={item.id}
                  href={item.url}
                  className="rounded-3xl border border-white/10 bg-white/3 p-5 transition hover:border-white/15 hover:bg-white/5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClasses(
                        item.tone
                      )}`}
                    >
                      {item.tone}
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                      {item.category}
                    </div>

                    <div
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${importanceClasses(
                        item.importance
                      )}`}
                    >
                      {item.impact}
                    </div>
                  </div>

                  <div className="mt-3 text-base font-semibold leading-6 text-white">
                    {item.headline}
                  </div>

                  <p className="mt-3 text-sm leading-6 text-white/58">
                    {item.summary}
                  </p>

                  {item.whyItMatters ? (
                    <p className="mt-3 text-xs leading-5 text-white/45">
                      {item.whyItMatters}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                    <span>{item.source}</span>
                    <span>•</span>
                    <span>{item.publishedAt}</span>
                  </div>

                  {(item.tickers ?? []).length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.tickers.slice(0, 6).map((ticker: string) => (
                        <span
                          key={ticker}
                          className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300"
                        >
                          {ticker}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
