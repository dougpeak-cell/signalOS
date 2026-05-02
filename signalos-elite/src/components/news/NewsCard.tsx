import type { CSSProperties } from "react";

import NewsImage from "@/components/news/NewsImage";
import NewsSourceMark from "@/components/news/NewsSourceMark";
import NewsTickerChipLinks from "@/components/news/NewsTickerChipLinks";
import TickerLogo from "@/components/stocks/TickerLogo";
import type { NewsItem } from "@/lib/news";

function NewsCardVisual({
  item,
  accentClassName,
}: {
  item: NewsItem;
  accentClassName: string;
}) {
  const primaryTicker = String(item.tickers?.[0] ?? "").toUpperCase().trim();

  if (item.image) {
    return (
      <div className="relative overflow-hidden border-b border-cyan-400/20 bg-black/30">
        <NewsImage
          src={item.image}
          href={item.url}
          title={item.headline || item.title}
          variant="thumbnail"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative h-23 overflow-hidden border-b border-cyan-400/20 ${accentClassName}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.18),transparent_45%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(0,0,0,0.98))]" />
      <div className="absolute inset-0 opacity-25 bg-[linear-gradient(115deg,transparent_0%,rgba(34,211,238,0.12)_45%,transparent_70%)]" />
      <div className="absolute left-4 right-4 bottom-3 h-px bg-cyan-300/25 shadow-[0_0_18px_rgba(34,211,238,0.45)]" />

      {primaryTicker ? (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 rounded-2xl border border-cyan-300/20 bg-black/35 p-1 opacity-70 shadow-[0_0_20px_rgba(34,211,238,0.16)]">
          <TickerLogo ticker={primaryTicker} size={42} />
        </div>
      ) : (
        <div className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl border border-cyan-300/20 bg-black/35 text-sm font-bold text-cyan-100/70 shadow-[0_0_20px_rgba(34,211,238,0.16)]">
          {String(item.source ?? "N").slice(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default function NewsCard({
  item,
  accentClassName,
  toneClassName,
  importanceClassName,
  style,
}: {
  item: NewsItem;
  accentClassName: string;
  toneClassName: string;
  importanceClassName: string;
  style?: CSSProperties;
}) {
  return (
    <article
      className="group relative overflow-hidden rounded-xl border border-white/10 transition hover:border-white/15 hover:bg-white/5"
      style={style}
    >
      <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-cyan-400/20 opacity-20 blur-xl" />

      <div className="absolute inset-0 overflow-hidden rounded-xl">
        {item.image ? (
          <img
            src={item.image}
            alt={item.headline || item.title}
            className="h-full w-full scale-105 object-cover opacity-25 blur-[1px]"
          />
        ) : null}

        <div className="absolute inset-0 bg-linear-to-r from-black via-black/80 to-black/40" />
        <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(56,189,248,0.25),transparent_60%)] opacity-20" />
      <div className="relative z-10">
        <div className="absolute right-4 top-4 flex gap-2">
          {item.tickers?.slice(0, 3).map((ticker) => (
            <div
              key={ticker}
              className="rounded-xl border border-cyan-300/30 bg-black/50 p-1 shadow-[0_0_15px_rgba(34,211,238,0.25)] backdrop-blur"
            >
              <TickerLogo ticker={ticker} size={28} />
            </div>
          ))}
        </div>

        <NewsCardVisual item={item} accentClassName={accentClassName} />

        <div className="p-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.25)] backdrop-blur">
            MARKET DRIVER
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClassName}`}
            >
              {item.tone}
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
              {item.category}
            </div>

            <div
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${importanceClassName}`}
            >
              {item.impact}
            </div>
          </div>

          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block wrap-anywhere text-base font-semibold leading-6 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] transition hover:text-cyan-100"
          >
            {item.headline}
          </a>

          <p className="mt-3 wrap-anywhere text-sm leading-6 text-white/58">{item.summary}</p>

          {item.whyItMatters ? (
            <p className="mt-3 wrap-anywhere text-xs leading-5 text-white/45">
              {item.whyItMatters}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
            <NewsSourceMark source={item.source} compact />
            <span>-</span>
            <span>{item.publishedAt}</span>
          </div>

          {(item.tickers ?? []).length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <NewsTickerChipLinks
                tickers={item.tickers}
                limit={6}
                className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300"
              />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}