"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/today/SectionHeader";
import { formatMarketClockTimeMs } from "@/lib/marketTime";
import { buildActionableRead } from "@/lib/sigi/actionableRead";
import {
  majorSectionClass,
  multiCardRowClass,
  supportSectionClass,
} from "@/components/today/TodayLayoutPrimitives";
import type { TodaySetupItem } from "@/lib/today/pageData";

const ACTIONABLE_READ_REFRESH_MS = 15 * 60 * 1000;

type ActionableReadSetup = {
  ticker: string;
  sector?: string;
  score?: number;
  direction?: "bullish" | "bearish" | "neutral";
  changePct?: number;
};

function toDirection(signal?: string | null): ActionableReadSetup["direction"] {
  const normalized = String(signal ?? "").trim().toLowerCase();

  if (normalized.includes("bull")) return "bullish";
  if (normalized.includes("bear")) return "bearish";
  return "neutral";
}

function toSetup(item: TodaySetupItem): ActionableReadSetup {
  return {
    ticker: item.ticker,
    sector: item.sector ?? undefined,
    score: item.score,
    direction: item.bias,
    changePct: item.changePercent ?? undefined,
  };
}

function fromLiveSetup(item: {
  ticker: string;
  sector?: string;
  signal?: string;
  score?: number | null;
  changePercent?: number | null;
}): ActionableReadSetup {
  return {
    ticker: item.ticker,
    sector: item.sector,
    score: item.score ?? undefined,
    direction: toDirection(item.signal),
    changePct: item.changePercent ?? undefined,
  };
}

export default function TodayActionRowClient({
  initialSetups,
  initialUpdatedAt,
}: {
  initialSetups: TodaySetupItem[];
  initialUpdatedAt: number;
}) {
  const [setups, setSetups] = useState<ActionableReadSetup[]>(() =>
    initialSetups.map(toSetup)
  );
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);

  useEffect(() => {
    let cancelled = false;

    function shouldRefresh() {
      return Date.now() - updatedAt >= ACTIONABLE_READ_REFRESH_MS;
    }

    async function refreshLiveSnapshot() {
      try {
        const response = await fetch("/api/today/live-intelligence", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const json = (await response.json()) as {
          updatedAt?: number;
          liveData?: {
            leadershipSignals?: Array<{
              ticker: string;
              sector?: string;
              signal?: string;
              score?: number | null;
              changePercent?: number | null;
            }> | null;
          } | null;
        };

        const liveSetups = json.liveData?.leadershipSignals?.map(fromLiveSetup) ?? [];

        if (cancelled || liveSetups.length === 0) return;
        setSetups(liveSetups);
        setUpdatedAt(
          typeof json.updatedAt === "number" && Number.isFinite(json.updatedAt)
            ? json.updatedAt
            : Date.now()
        );
      } catch {}
    }

    const onFocus = () => {
      if (document.visibilityState === "visible" && shouldRefresh()) {
        void refreshLiveSnapshot();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && shouldRefresh()) {
        void refreshLiveSnapshot();
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible" && shouldRefresh()) {
        void refreshLiveSnapshot();
      }
    }, 60000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [updatedAt]);

  const actionableRead = buildActionableRead(setups);
  const updatedLabel = formatMarketClockTimeMs(updatedAt, { includeZone: true });
  const nextUpdateLabel = formatMarketClockTimeMs(updatedAt + ACTIONABLE_READ_REFRESH_MS, {
    includeZone: true,
  });

  return (
    <section className={majorSectionClass}>
      <SectionHeader
        eyebrow="Actionable Read"
        title="What matters now"
        subtitle="Fast market context without the clutter."
      />

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
          Source: Top Setups + Screener Signals + Market Pulse
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
          Updated live from current session data
        </span>
        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/8 px-2 py-1 text-cyan-100/80">
          Updated: {updatedLabel}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
          Next update: {nextUpdateLabel}
        </span>
      </div>

      <div className={`${multiCardRowClass} grid-cols-1 lg:grid-cols-3`}>
        <div className={supportSectionClass}>
          <div className="text-sm font-medium text-white">{actionableRead.breadth.title}</div>
          <p className="mt-3 text-sm leading-6 text-white/70">{actionableRead.breadth.body}</p>
        </div>

        <div className={supportSectionClass}>
          <div className="text-sm font-medium text-white">{actionableRead.leaders.title}</div>
          <p className="mt-2 text-sm text-white/60">{actionableRead.leaders.body}</p>
        </div>

        <div className={supportSectionClass}>
          <div className="text-sm font-medium text-white">{actionableRead.action.title}</div>
          <p className="mt-2 text-sm text-white/60">{actionableRead.action.body}</p>
        </div>
      </div>
    </section>
  );
}