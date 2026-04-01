"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BreakingNewsItem = {
  id: string;
  headline: string;
  url: string;
  source?: string;
  tone?: "bullish" | "bearish" | "neutral";
  publishedAt?: string;
};

function toneDotClass(tone?: string) {
  if (tone === "bullish") return "bg-emerald-400";
  if (tone === "bearish") return "bg-rose-400";
  return "bg-cyan-400";
}

function getRefreshMs() {
  const now = new Date();

  const ny = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const weekday = ny.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(ny.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(ny.find((p) => p.type === "minute")?.value ?? "0");
  const totalMinutes = hour * 60 + minute;
  const isWeekday = !["Sat", "Sun"].includes(weekday);

  if (!isWeekday) return 25000;
  if (totalMinutes >= 570 && totalMinutes < 960) return 10000; // 9:30–16:00 ET
  if (totalMinutes >= 240 && totalMinutes < 570) return 15000; // premarket
  if (totalMinutes >= 960 && totalMinutes < 1200) return 15000; // after hours
  return 25000; // overnight
}

export default function BreakingNewsTicker(): React.ReactElement | null {
  const [items, setItems] = useState<BreakingNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const res = await fetch("/api/news", { cache: "no-store" });
        const data = await res.json();

        const newsItems = Array.isArray(data?.liveStream)
          ? data.liveStream
          : Array.isArray(data?.items)
            ? data.items.slice(0, 8)
            : [];

        if (cancelled) return;

        setItems(
          newsItems.map((item: any, index: number) => ({
            id: item.id ?? `${item.headline}-${index}`,
            headline: item.headline ?? "Market update",
            url: item.url ?? "#",
            source: item.source ?? "",
            tone: item.tone ?? "neutral",
            publishedAt: item.publishedAt ?? "",
          }))
        );
      } catch {
        if (cancelled) return;
        setItems([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          timeoutId = setTimeout(load, getRefreshMs());
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const repeatedItems = useMemo(() => {
    if (items.length === 0) return [];
    return [...items, ...items];
  }, [items]);

  if (!isLoading && items.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-cyan-400/10 bg-black/80 py-1 shadow-[0_0_20px_rgba(34,211,238,0.05)] backdrop-blur-md">
      <div className="mx-auto w-full max-w-470 px-4 md:px-6 xl:px-8">
        <div className="group flex items-center gap-4 overflow-hidden py-1.5">
          <div className="shrink-0">
            <span className="mr-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
              Live Market Feed
            </span>

            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
              Live Feed
            </div>
          </div>

          <div className="relative min-w-0 flex-1 overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-black via-black/95 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-black via-black/95 to-transparent" />

            <div className="ticker-track flex w-max items-center gap-6 pr-6 whitespace-nowrap group-hover:[animation-play-state:paused]">
              {repeatedItems.length > 0 ? (
                repeatedItems.map((item, index) => (
                  <Link
                    key={`${item.id}-${index}`}
                    href={item.url}
                    className="inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-cyan-200"
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${toneDotClass(item.tone)}`}
                    />

                    <span className="font-medium">{item.headline}</span>

                    {item.source ? (
                      <span className="text-[11px] uppercase tracking-[0.14em] text-white/35">
                        {item.source}
                      </span>
                    ) : null}
                  </Link>
                ))
              ) : (
                <div className="text-sm text-white/45">
                  Loading breaking headlines...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ticker-track {
          animation: ticker-scroll 38s linear infinite;
        }

        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
