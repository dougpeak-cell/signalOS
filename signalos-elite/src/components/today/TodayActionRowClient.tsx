"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/today/SectionHeader";
import {
  majorSectionClass,
  multiCardRowClass,
  supportSectionClass,
} from "@/components/today/TodayLayoutPrimitives";
import type { TodayActionRowMetrics } from "@/lib/today/actionRow";

export default function TodayActionRowClient({
  initialMetrics,
}: {
  initialMetrics: TodayActionRowMetrics;
}) {
  const [metrics, setMetrics] = useState(initialMetrics);

  useEffect(() => {
    let cancelled = false;

    async function refreshLiveSnapshot() {
      try {
        const response = await fetch("/api/today/live-intelligence", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const json = (await response.json()) as {
          actionRowMetrics?: TodayActionRowMetrics | null;
        };

        if (cancelled || !json.actionRowMetrics) return;
        setMetrics(json.actionRowMetrics);
      } catch {}
    }

    const onFocus = () => {
      if (document.visibilityState === "visible") {
        void refreshLiveSnapshot();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshLiveSnapshot();
      }
    };

    void refreshLiveSnapshot();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshLiveSnapshot();
      }
    }, 30000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

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
      </div>

      <div className={`${multiCardRowClass} grid-cols-1 lg:grid-cols-3`}>
        <div className={supportSectionClass}>
          <div className="text-sm font-medium text-white">Breadth</div>
          <p className="mt-3 text-sm leading-6 text-white/70">{metrics.breadthText}</p>
        </div>

        <div className={supportSectionClass}>
          <div className="text-sm font-medium text-white">Leaders / Laggards</div>
          <p className="mt-2 text-sm text-white/60">{metrics.leadershipText}</p>
        </div>

        <div className={supportSectionClass}>
          <div className="text-sm font-medium text-white">Actionable read</div>
          <p className="mt-2 text-sm text-white/60">{metrics.actionableText}</p>
        </div>
      </div>
    </section>
  );
}