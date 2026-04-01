"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import LiveStockChart from "@/components/stocks/LiveStockChart";
import SignalRailPanel from "@/components/stocks/SignalRailPanel";
import type { ChartSignal } from "@/lib/chartSignals";

type StockChartClientProps = {
  stock: {
    ticker: string;
    name: string | null;
  };
};

type ConfluenceState = {
  buySideSweep: boolean;
  upsideExhaustion: boolean;
  equalHighs: boolean;
  bullishAbsorption: boolean;
  confluenceShort: boolean;
};

type SignalRailPayload = Parameters<
  NonNullable<ComponentProps<typeof LiveStockChart>["onSignalRailData"]>
>[0];

function signalToneClasses(tone?: ChartSignal["tone"]) {
  if (tone === "bullish") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  }
  if (tone === "bearish") {
    return "border-rose-400/25 bg-rose-400/10 text-rose-300";
  }
  return "border-amber-400/25 bg-amber-400/10 text-amber-300";
}

function confluenceBadgeClasses(active: boolean, emphasis?: "bull" | "bear") {
  if (!active) {
    return "border border-white/10 bg-white/5 text-white/35";
  }

  if (emphasis === "bear") {
    return "border border-rose-400/25 bg-rose-400/10 text-rose-300";
  }

  return "border border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
}

export default function StockChartClient({ stock }: StockChartClientProps) {
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [railSignals, setRailSignals] = useState<ChartSignal[]>([]);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [jumpToTime, setJumpToTime] = useState<(time: number | null) => void>(
    () => {}
  );
  const [floatingMode, setFloatingMode] = useState(false);

  const [confluenceState, setConfluenceState] = useState<ConfluenceState>({
    buySideSweep: false,
    upsideExhaustion: false,
    equalHighs: false,
    bullishAbsorption: false,
    confluenceShort: false,
  });

  useEffect(() => {
    if (!floatingMode) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFloatingMode(false);
    };

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [floatingMode]);

  const handleSignalRailData = useCallback(
    ({
      signals,
      selectedTime,
      selectedSignalKey,
      jumpToTime,
      confluenceState,
    }: SignalRailPayload) => {
      setRailSignals(signals);
      setSelectedTime(selectedTime);
      setJumpToTime(() => (time: number | null) => {
        jumpToTime?.(selectedSignalKey, time);
      });
      setConfluenceState(
        confluenceState ?? {
          buySideSweep: false,
          upsideExhaustion: false,
          equalHighs: false,
          bullishAbsorption: false,
          confluenceShort: false,
        }
      );
    },
    []
  );

  const shellClassName = useMemo(() => {
    return railCollapsed
      ? "grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_56px]"
      : "grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.9fr)_300px] 2xl:grid-cols-[minmax(0,2fr)_320px]";
  }, [railCollapsed]);

  const topSignals = railSignals.slice(0, 5);
  const primarySignal = railSignals[0];

  const confluenceBadges = useMemo(
    () => [
      {
        label: "Buy-Side Sweep",
        active: confluenceState.buySideSweep,
        emphasis: "bear" as const,
      },
      {
        label: "Upside Exhaustion",
        active: confluenceState.upsideExhaustion,
        emphasis: "bear" as const,
      },
      {
        label: "Equal Highs",
        active: confluenceState.equalHighs,
        emphasis: "bear" as const,
      },
      {
        label: "Bullish Absorption",
        active: confluenceState.bullishAbsorption,
        emphasis: "bull" as const,
      },
      {
        label: "Confluence Short",
        active: confluenceState.confluenceShort,
        emphasis: "bear" as const,
      },
    ],
    [confluenceState]
  );

  return (
    <main className="bg-black text-white">
      <div className="w-full max-w-none px-1 pb-6 pt-2 xl:px-1.5 2xl:px-2">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/watchlist"
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
            >
              ← Back to Watchlist
            </Link>

            <div className="mt-2 flex min-w-0 items-end gap-3">
              <h1 className="truncate text-2xl font-semibold tracking-[0.18em] text-white sm:text-3xl">
                {stock.ticker}
              </h1>
              <div className="truncate pb-1 text-sm text-white/40">
                {stock.name ?? "Day Chart Focus"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFloatingMode(true)}
              className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/15 hover:text-white"
            >
              Open Fullscreen
            </button>

            <div className="hidden text-right xl:block">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/65">
                SignalOS
              </div>
              <div className="mt-1 text-xs text-white/45">
                Day Chart Command Center
              </div>
            </div>
          </div>
        </div>

        <div className={shellClassName}>
          <section className="min-w-0">
            <div className="relative overflow-hidden rounded-3xlrder border-cyan-400/20 bg-[radial-gradient(circle_at_top,rgba(0,160,255,0.10),transparent_24%),linear-gradient(180deg,rgba(4,10,20,0.98),rgba(0,0,0,1))] shadow-[0_0_55px_rgba(0,145,255,0.10)]">
              <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2">
                <Link
                  href="/watchlist"
                  className="inline-flex items-center rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
                >
                  ← Watchlist
                </Link>

                <div className="rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-sm font-semibold tracking-[0.2em] text-white/95 backdrop-blur">
                  {stock.ticker}
                </div>

                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300 backdrop-blur">
                  Day Chart Focus
                </div>
              </div>

              <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRailCollapsed((v) => !v)}
                  className="rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[11px] font-medium text-white/75 backdrop-blur transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
                >
                  {railCollapsed ? "Show Rail" : "Hide Rail"}
                </button>
              </div>

              {topSignals.length > 0 ? (
                <div className="pointer-events-none absolute left-4 top-16 z-20 flex max-w-[70%] flex-wrap gap-2">
                  {topSignals.map((signal) => (
                    <div
                      key={`${signal.type}-${signal.time}-${signal.label ?? ""}`}
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold shadow-lg backdrop-blur ${signalToneClasses(
                        signal.tone
                      )}`}
                    >
                      {signal.label ?? signal.type}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="pointer-events-none absolute left-4 right-4 top-28 z-20 hidden flex-wrap gap-2 xl:flex">
                {confluenceBadges.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur ${confluenceBadgeClasses(
                      item.active,
                      item.emphasis
                    )}`}
                  >
                    {item.label}
                  </div>
                ))}
              </div>

              <div className="relative z-0 p-2 pt-14 xl:p-2.5 xl:pt-24">
                <div className="overflow-hidden rounded-[22px] border border-cyan-400/15 bg-black/70 shadow-[inset_0_0_25px_rgba(0,140,255,0.08)]">
                  <div className="min-h-160 w-full">
                    <LiveStockChart
                      ticker={stock.ticker}
                      expanded
                      showSignalRail={false}
                      onSignalRailData={handleSignalRailData}
                      enableLiveStream={false}
                      signals={[]}
                    />
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black via-black/65 to-transparent" />

              <div className="absolute bottom-4 left-4 z-20">
                <div className="rounded-2xl border border-cyan-400/15 bg-black/65 px-4 py-3 backdrop-blur">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/70">
                    Live Setup Beacon
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {primarySignal?.label ?? "High Confluence Active"}
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    Open intraday structure in full focus with clean chart
                    visibility.
                  </div>
                </div>
              </div>

              <div className="absolute bottom-4 right-4 z-20">
                <div className="flex flex-wrap justify-end gap-2">
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                    {railSignals.length} signals
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
                    command view
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="min-w-0">
            <SignalRailPanel
              ticker={stock.ticker}
              collapsed={railCollapsed}
              onToggleCollapse={() => setRailCollapsed((v) => !v)}
              signals={railSignals}
              selectedTime={selectedTime}
              onSignalClick={(time) => {
                setSelectedTime(time);
                jumpToTime(time);
              }}
              signalCount={railSignals.length}
            />
          </aside>
        </div>
      </div>

      {floatingMode ? (
        <div className="fixed inset-0 z-100 bg-black/90 backdrop-blur-sm">
          <div className="flex h-full flex-col p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/65">
                  SignalOS Fullscreen
                </div>
                <div className="mt-1 truncate text-xl font-semibold text-white">
                  {stock.ticker} Command View
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFloatingMode(false)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-h-0">
                <div className="relative h-full overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[radial-gradient(circle_at_top,rgba(0,160,255,0.10),transparent_24%),linear-gradient(180deg,rgba(4,10,20,0.98),rgba(0,0,0,1))] shadow-[0_0_55px_rgba(0,145,255,0.10)]">
                  <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2">
                    <div className="rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-sm font-semibold tracking-[0.2em] text-white/95 backdrop-blur">
                      {stock.ticker}
                    </div>

                    <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300 backdrop-blur">
                      Day Chart Focus
                    </div>
                  </div>

                  {topSignals.length > 0 ? (
                    <div className="pointer-events-none absolute left-4 top-16 z-20 flex max-w-[70%] flex-wrap gap-2">
                      {topSignals.map((signal) => (
                        <div
                          key={`${signal.type}-${signal.time}-${signal.label ?? ""}-floating`}
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold shadow-lg backdrop-blur ${signalToneClasses(
                            signal.tone
                          )}`}
                        >
                          {signal.label ?? signal.type}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="pointer-events-none absolute left-4 right-4 top-28 z-20 hidden flex-wrap gap-2 xl:flex">
                    {confluenceBadges.map((item) => (
                      <div
                        key={`${item.label}-floating`}
                        className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur ${confluenceBadgeClasses(
                          item.active,
                          item.emphasis
                        )}`}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>

                  <div className="h-full p-3 pt-14 xl:pt-24">
                    <div className="h-full overflow-hidden rounded-[22px] border border-cyan-400/15 bg-black/70 shadow-[inset_0_0_25px_rgba(0,140,255,0.08)]">
                      <div className="h-full min-h-140 w-full">
                        <LiveStockChart
                          ticker={stock.ticker}
                          expanded
                          showSignalRail={false}
                          onSignalRailData={handleSignalRailData}
                          enableLiveStream={false}
                          signals={[]}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black via-black/70 to-transparent" />

                  <div className="absolute bottom-4 left-4 z-20">
                    <div className="rounded-2xl border border-cyan-400/15 bg-black/65 px-4 py-3 backdrop-blur">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/70">
                        Active Setup
                      </div>
                      <div className="mt-1 text-lg font-semibold text-white">
                        {primarySignal?.label ?? "High Confluence Active"}
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-4 right-4 z-20">
                    <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                      ESC to close
                    </div>
                  </div>
                </div>
              </div>

              {!railCollapsed ? (
                <aside className="min-w-0 border-l border-white/10 bg-black/25 backdrop-blur-sm">
                  <div className="h-full overflow-x-hidden p-3">
                    <SignalRailPanel
                      ticker={stock.ticker}
                      collapsed={false}
                      onToggleCollapse={() => setRailCollapsed(true)}
                      signals={railSignals}
                      selectedTime={selectedTime}
                      onSignalClick={(time) => {
                        setSelectedTime(time);
                        jumpToTime(time);
                      }}
                      signalCount={railSignals.length}
                    />
                  </div>
                </aside>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}