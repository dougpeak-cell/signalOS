"use client";

import Link from "next/link";

import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import type { RankedSetupItem } from "@/lib/today/setupDiscovery";

type TodaySetupPanelsProps = {
  topSetups: RankedSetupItem[];
  emergingSetups: RankedSetupItem[];
};

function percentClass(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "text-white/45";
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-white/45";
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function SetupPanel({
  eyebrow,
  title,
  subtitle,
  items,
  footerHref,
  footerLabel,
  showRank,
  emergingMode = false,
  onItemFocus,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: RankedSetupItem[];
  footerHref: string;
  footerLabel: string;
  showRank: boolean;
  emergingMode?: boolean;
  onItemFocus: (ticker: string) => void;
}) {
  return (
    <div className="glow-panel rounded-3xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] p-6 shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_30px_rgba(0,255,255,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
            {eyebrow}
          </div>
          <div className="mt-2 text-4xl font-semibold tracking-tight text-white">{title}</div>
          <div className="mt-2 text-lg text-white/50">{subtitle}</div>
        </div>

        <Link
          href={footerHref}
          className="rounded-full border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] px-4 py-2 text-sm text-cyan-100/75 transition hover:border-cyan-400/25 hover:bg-cyan-400/6 hover:text-cyan-50"
        >
          {footerLabel}
        </Link>
      </div>

      <div className="mt-6 grid gap-4">
        {items.length ? (
          items.map((item, index) => (
            <Link
              key={item.ticker}
              href={`/stocks/${item.ticker}`}
              onClick={() => onItemFocus(item.ticker)}
              onMouseEnter={() => onItemFocus(item.ticker)}
              onFocus={() => onItemFocus(item.ticker)}
              className="flex items-center justify-between rounded-3xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] px-5 py-4 transition hover:border-cyan-400/25 hover:bg-cyan-400/6"
            >
              <div>
                <div className="text-2xl font-semibold text-white">{item.ticker}</div>
                <div className="mt-1 text-lg text-white/65">
                  {emergingMode
                    ? formatPercent(item.changePercent) ?? item.setupBiasLabel
                    : item.setupBiasLabel}
                </div>
                <div className="mt-1 text-sm text-white/45">
                  {emergingMode ? item.shortReasonTag : item.whyThisSetup}
                </div>
                {emergingMode ? (
                  <div className="mt-1 text-[11px] text-white/40">
                    {item.rvol != null ? `RVOL ${item.rvol.toFixed(1)}x` : "RVOL pending"}
                  </div>
                ) : null}
              </div>

              <div className="text-right">
                {showRank ? (
                  <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-cyan-300">
                    <div className="text-xl font-semibold">Rank #{index + 1}</div>
                    <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">
                      {item.shortReasonTag}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-cyan-300">
                    <div className={`text-lg font-semibold ${percentClass(item.changePercent)}`}>
                      {formatPercent(item.changePercent) ?? "--"}
                    </div>
                    <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">
                      {item.shortReasonTag}
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] px-5 py-8 text-white/45 shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_30px_rgba(0,255,255,0.08)]">
            No setups are available yet.
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <Link
          href={footerHref}
          className="text-sm font-medium text-cyan-200/80 transition hover:text-cyan-100"
        >
          {footerLabel}
        </Link>
      </div>
    </div>
  );
}

export default function TodaySetupPanels({
  topSetups,
  emergingSetups,
}: TodaySetupPanelsProps) {
  const { setActiveTicker } = useSelectedTicker();

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SetupPanel
        eyebrow="Top Setups"
        title="Top Setups"
        subtitle="High-conviction names worth opening first."
        items={topSetups.slice(0, 5)}
        footerHref="/screener/setups?view=top"
        footerLabel="See All Setups"
        showRank
        onItemFocus={setActiveTicker}
      />

      <SetupPanel
        eyebrow="Emerging Setups"
        title="Emerging Setups"
        subtitle="Higher-energy names showing expansion and unusual activity."
        items={emergingSetups.slice(0, 6)}
        footerHref="/screener/setups?view=emerging"
        footerLabel="Explore Emerging"
        showRank={false}
        emergingMode
        onItemFocus={setActiveTicker}
      />
    </div>
  );
}