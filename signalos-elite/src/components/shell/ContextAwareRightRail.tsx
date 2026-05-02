"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStoredWatchlistTickers } from "@/hooks/useStoredWatchlistTickers";
import { useRouteContext } from "@/lib/routing/useRouteContext";
import {
  buildRightRailContextModel,
  buildRightRailShellModel,
  type RightRailContextModel,
  type RightRailStatusTone,
} from "@/lib/shell/rightRailContext";
import { useRailSparklines } from "@/lib/market/useRailSparklines";

function toneClasses(tone: RightRailStatusTone = "default") {
  if (tone === "accent") {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
  }
  if (tone === "success") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }
  if (tone === "warn") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  }
  if (tone === "danger") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  }

  return "border-white/10 bg-white/[0.03] text-white";
}

function dotClasses(tone: RightRailStatusTone = "default") {
  if (tone === "accent") return "bg-cyan-300";
  if (tone === "success") return "bg-emerald-300";
  if (tone === "warn") return "bg-amber-300";
  if (tone === "danger") return "bg-rose-300";
  return "bg-white/30";
}

function directionToTone(
  direction: "up" | "down" | "flat",
  fallback: RightRailStatusTone
): RightRailStatusTone {
  if (direction === "up") return "success";
  if (direction === "down") return "danger";
  return fallback;
}

function Sparkline({
  points,
  tone = "default",
  isLive = false,
}: {
  points?: number[];
  tone?: RightRailStatusTone;
  isLive?: boolean;
}) {
  if (!points || points.length < 2) return null;

  const width = 64;
  const height = 20;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 1);

  const d = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point - min) / range) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const stroke =
    tone === "accent"
      ? "#67e8f9"
      : tone === "success"
      ? "#6ee7b7"
      : tone === "warn"
      ? "#fcd34d"
      : tone === "danger"
      ? "#fb7185"
      : "rgba(255,255,255,0.65)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`shrink-0 opacity-90 ${isLive ? "signalos-rail-spark-live" : ""}`}
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RailItemCard({
  label,
  value,
  href,
  tone = "default",
  statusDot = "default",
  sparkline,
  isLive = false,
  preserveMobilePreview = false,
}: {
  label: string;
  value: string;
  href?: string;
  tone?: RightRailStatusTone;
  statusDot?: RightRailStatusTone;
  sparkline?: number[];
  isLive?: boolean;
  preserveMobilePreview?: boolean;
}) {
  const searchParams = useSearchParams();

  const content = (
    <div
      className={`rounded-2xl border px-2.5 py-2.5 transition ${toneClasses(
        tone
      )}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dotClasses(
                statusDot
              )} ${isLive ? "signalos-rail-dot-live" : ""}`}
            />
            <div className="truncate text-[9px] uppercase tracking-[0.16em] text-white/42">
              {label}
            </div>
          </div>

          <div className="mt-1 truncate text-[13px] font-semibold leading-tight">
            {value || "—"}
          </div>
        </div>

        <Sparkline points={sparkline} tone={tone} isLive={isLive} />
      </div>
    </div>
  );

  if (!href) return content;

  const nextHref = (() => {
    if (!preserveMobilePreview) return href;

    const nextParams = new URLSearchParams();
    nextParams.set("mobilePreview", "1");
    const query = nextParams.toString();
    return href.includes("?") ? `${href}&${query}` : `${href}?${query}`;
  })();

  return (
    <Link href={nextHref} className="block transition hover:scale-[1.01]">
      {content}
    </Link>
  );
}

export default function ContextAwareRightRail() {
  const route = useRouteContext();
  const searchParams = useSearchParams();
  const { watchlistTickers } = useStoredWatchlistTickers();
  const [mounted, setMounted] = useState(false);
  const isMobilePreview = searchParams.get("mobilePreview") === "1";

  const [model, setModel] = useState<RightRailContextModel>(() =>
    buildRightRailShellModel(route)
  );

  const routeKey = useMemo(() => JSON.stringify(route), [route]);
  const watchlistKey = useMemo(
    () => [...watchlistTickers].sort().join("|"),
    [watchlistTickers]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const sync = () => setModel(buildRightRailContextModel(route));

    sync();

    const onStorage = () => sync();
    const onFocus = () => sync();
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    const onWatchlistUpdated = () => sync();
    const onPortfolioUpdated = () => sync();

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("signalos:watchlist-updated", onWatchlistUpdated);
    window.addEventListener("signalos:portfolio-updated", onPortfolioUpdated);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(
        "signalos:watchlist-updated",
        onWatchlistUpdated
      );
      window.removeEventListener(
        "signalos:portfolio-updated",
        onPortfolioUpdated
      );
    };
  }, [mounted, routeKey, route, watchlistKey]);

  const visibleTickers = useMemo(
    () =>
      model.sections.flatMap((section) =>
        section.items
          .map((item) => item.ticker)
          .filter((ticker): ticker is string => Boolean(ticker))
      ),
    [model]
  );

  const { data: liveSparklines } = useRailSparklines(visibleTickers);

  const previousLiveRef = useRef<Record<string, string>>({});
  const [livePulseMap, setLivePulseMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const nextPulseMap: Record<string, boolean> = {};
    const nextPrev: Record<string, string> = { ...previousLiveRef.current };

    for (const [ticker, live] of Object.entries(liveSparklines)) {
      const signature = JSON.stringify(live.points);
      if (
        previousLiveRef.current[ticker] &&
        previousLiveRef.current[ticker] !== signature
      ) {
        nextPulseMap[ticker] = true;
      }
      nextPrev[ticker] = signature;
    }

    previousLiveRef.current = nextPrev;

    if (Object.keys(nextPulseMap).length) {
      setLivePulseMap((prev) => ({ ...prev, ...nextPulseMap }));

      const timeout = window.setTimeout(() => {
        setLivePulseMap({});
      }, 950);

      return () => window.clearTimeout(timeout);
    }
  }, [liveSparklines]);

  const enhancedModel = useMemo<RightRailContextModel>(() => {
    return {
      ...model,
      sections: model.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => {
          if (!item.ticker) return item;

          const live = liveSparklines[item.ticker];
          if (!live) return item;

          const liveTone = directionToTone(
            live.direction,
            item.tone ?? "default"
          );

          const pct =
            typeof live.changePct === "number"
              ? `${live.changePct > 0 ? "+" : ""}${live.changePct.toFixed(2)}%`
              : null;

          return {
            ...item,
            value: pct ? `${item.value} · ${pct}` : item.value,
            sparkline: live.points,
            tone: item.tone === "accent" ? item.tone : liveTone,
            statusDot: liveTone,
          };
        }),
      })),
    };
  }, [liveSparklines, model]);

  return (
    <aside className="space-y-2.5">
      <section className="rounded-3xl border border-white/10 bg-white/3 p-3 shadow-[0_10px_36px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="text-[9px] uppercase tracking-[0.2em] text-white/35">
          {enhancedModel.eyebrow}
        </div>

        <h3 className="mt-1.5 text-[15px] font-semibold text-white">
          {enhancedModel.title}
        </h3>
      </section>

      {enhancedModel.sections.map((section) => (
        <section
          key={section.title}
          className="rounded-3xl border border-white/10 bg-white/3 p-3 shadow-[0_10px_36px_rgba(0,0,0,0.22)] backdrop-blur-xl"
        >
          <div className="text-[9px] uppercase tracking-[0.2em] text-white/35">
            {section.title}
          </div>

          <div className="mt-2.5 space-y-1.5">
            {section.items.map((item, index) => (
              <RailItemCard
                key={`${section.title}-${item.label}-${item.value}-${item.href ?? ""}-${item.ticker ?? ""}-${index}`}
                label={item.label}
                value={item.value}
                href={item.href}
                preserveMobilePreview={isMobilePreview}
                tone={item.tone}
                statusDot={item.statusDot}
                sparkline={item.sparkline}
                isLive={Boolean(item.ticker && livePulseMap[item.ticker])}
              />
            ))}
          </div>
        </section>
      ))}
    </aside>
  );
}