"use client";

import { useMemo, useState } from "react";
import { useOptionalMarketData } from "@/components/providers/MarketDataProvider";

function formatTime(value: number | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function Pill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/4 px-2 py-1">
      <div className="text-[9px] uppercase tracking-[0.14em] text-white/40">
        {label}
      </div>
      <div className="mt-1 text-xs font-semibold text-white">{value}</div>
    </div>
  );
}

function TickerBlock({
  title,
  tickers,
  tone = "default",
}: {
  title: string;
  tickers: string[];
  tone?: "default" | "critical" | "visible" | "background";
}) {
  const toneClass =
    tone === "critical"
      ? "border-cyan-400/20 bg-cyan-400/10"
      : tone === "visible"
        ? "border-emerald-400/20 bg-emerald-400/10"
        : tone === "background"
          ? "border-amber-400/20 bg-amber-400/10"
          : "border-white/10 bg-white/4";

  return (
    <div className={`rounded-2xl border p-2 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">
        {title}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {tickers.length ? (
          tickers.map((ticker) => (
            <span
              key={ticker}
              className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] font-medium text-white/90"
            >
              {ticker}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-white/45">None</span>
        )}
      </div>
    </div>
  );
}

function IntelBlock({
  label,
  value,
  reason,
  accent = false,
  warn = false,
}: {
  label: string;
  value: string;
  reason?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-3",
        accent
          ? "border-cyan-400/20 bg-cyan-400/10"
          : warn
            ? "border-amber-400/20 bg-amber-400/10"
            : "border-white/10 bg-white/4",
      ].join(" ")}
    >
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">
        {label}
      </div>
      <div
        className={[
          "mt-2 text-sm font-semibold",
          accent
            ? "text-cyan-200"
            : warn
              ? "text-amber-200"
              : "text-white",
        ].join(" ")}
      >
        {value || "—"}
      </div>
      <div className="mt-2 text-[11px] leading-5 text-white/60">
        {reason || "No explanation available."}
      </div>
    </div>
  );
}

export default function MarketDataDebugOverlay() {
  const marketData = useOptionalMarketData();
  const [open, setOpen] = useState(false);

  if (!marketData) {
    return null;
  }

  const { refreshNow, refreshIntel, intel, debug } = marketData;

  const totalTracked = useMemo(() => {
    return (
      debug.criticalTickers.length +
      debug.visibleTickers.length +
      debug.backgroundTickers.length
    );
  }, [debug]);

  return (
    <div className="pointer-events-none fixed right-3 bottom-24 z-40 md:right-3 md:bottom-3 md:z-90">
      {open ? (
        <div className="pointer-events-auto max-h-[85vh] w-95 overflow-y-auto rounded-3xl border border-white/10 bg-black/85 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                Market Data Debug
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                Live provider state
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void refreshIntel()}
                className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/15"
              >
                Intel
              </button>
              <button
                type="button"
                onClick={() => void refreshNow()}
                className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/15"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-white/10 bg-white/4 px-2.5 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/8"
              >
                Close
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Pill label="Tracked" value={totalTracked} />
            <Pill label="Quotes Cached" value={debug.quoteCount} />
            <Pill label="Sparklines Cached" value={debug.sparklineCount} />
            <Pill label="Quote Requests" value={debug.quoteRequests} />
            <Pill label="Spark Requests" value={debug.sparklineRequests} />
            <Pill label="Intel Requests" value={debug.intelRequests} />
            <Pill label="Last Update" value={formatTime(debug.lastUpdatedAt)} />
            <Pill label="Last Quote" value={formatTime(debug.lastQuoteRefreshAt)} />
            <Pill label="Last Spark" value={formatTime(debug.lastSparklineRefreshAt)} />
            <Pill label="Last Intel" value={formatTime(debug.lastIntelRefreshAt)} />
            <Pill label="Stream" value={debug.streamConnected ? "Connected" : "Offline"} />
            <Pill label="Stream Tickers" value={debug.streamTickerCount} />
          </div>

          <div className="mt-3 space-y-2">
            <TickerBlock
              title={`Critical (${debug.criticalTickers.length})`}
              tickers={debug.criticalTickers}
              tone="critical"
            />
            <TickerBlock
              title={`Visible (${debug.visibleTickers.length})`}
              tickers={debug.visibleTickers}
              tone="visible"
            />
            <TickerBlock
              title={`Background (${debug.backgroundTickers.length})`}
              tickers={debug.backgroundTickers}
              tone="background"
            />
          </div>

          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Intelligence Snapshot
            </div>

            <div className="mt-2 grid gap-2">
              <IntelBlock
                label="Regime"
                value={intel?.regime ?? "—"}
                reason={intel?.regimeReason}
                accent={intel?.regime === "Bullish"}
                warn={intel?.regime === "Risk Off"}
              />
              <IntelBlock
                label="Top Signal"
                value={intel?.topSignal ?? "—"}
                reason={intel?.topSignalReason}
                accent
              />
              <IntelBlock
                label="Best Setup"
                value={intel?.bestSetup ?? "—"}
                reason={intel?.bestSetupReason}
                accent
              />
              <IntelBlock
                label="Mover"
                value={intel?.mover ?? "—"}
                reason={intel?.moverReason}
              />
              <IntelBlock
                label="Risk Name"
                value={intel?.riskName ?? "—"}
                reason={intel?.riskNameReason}
                warn
              />
              <Pill label="Intel Updated" value={formatTime(intel?.updatedAt ?? null)} />
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto rounded-full border border-white/10 bg-black/75 px-3 py-2 text-xs font-medium text-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:bg-black/85"
        >
          Market Debug
        </button>
      )}
    </div>
  );
}
