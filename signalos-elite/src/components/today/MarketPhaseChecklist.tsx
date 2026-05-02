"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentMarketPhase } from "@/lib/today/marketPhase";
import type { MarketPhase } from "@/lib/today/topSetups";

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  href?: string;
  tag?: string;
};

const focusLinks: Record<MarketPhase, Array<{ label: string; href: string }>> = {
  premarket: [
    { label: "Futures direction", href: "#macro" },
    { label: "Pre-market movers", href: "#top-setups" },
    { label: "Earnings reactions", href: "#global-pulse" },
    { label: "Macro drops at 8:30 ET", href: "#featured-macro" },
  ],
  open: [
    { label: "Volume confirmation", href: "#top-setups" },
    { label: "Breakout quality", href: "#opportunity-panel" },
    { label: "Leader / laggard split", href: "#leadership" },
    { label: "Failed first moves", href: "#risk-dashboard" },
  ],
  midday: [
    { label: "Trend continuation", href: "#leadership" },
    { label: "Range compression", href: "#opportunity-panel" },
    { label: "Relative strength persistence", href: "#top-setups" },
    { label: "Setups into power hour", href: "#elite-grid" },
  ],
  close: [
    { label: "Closing strength", href: "#top-setups" },
    { label: "Institutional flow", href: "#opportunity-panel" },
    { label: "Trend confirmation", href: "#leadership" },
    { label: "Tomorrow watchlist prep", href: "/watchlist" },
  ],
  postmarket: [
    { label: "Refresh watchlist", href: "/watchlist" },
    { label: "Review leaders", href: "#leadership" },
    { label: "Scan news flow", href: "/news" },
    { label: "Prepare tomorrow’s plan", href: "/portfolio" },
  ],
};

function getPhaseMeta(phase: MarketPhase) {
  switch (phase) {
    case "premarket":
      return {
        label: "Pre-Market",
        window: "4:00 AM – 9:30 AM ET",
        toneClass:
          "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
        focus: [
          "Futures direction",
          "Pre-market movers",
          "Earnings reactions",
          "Macro drops at 8:30 ET",
        ],
      };
    case "open":
      return {
        label: "Market Open",
        window: "9:30 AM – 10:30 AM ET",
        toneClass:
          "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
        focus: [
          "Volume confirmation",
          "Breakout quality",
          "Leader / laggard split",
          "Failed first moves",
        ],
      };
    case "midday":
      return {
        label: "Midday",
        window: "10:30 AM – 3:00 PM ET",
        toneClass:
          "border-amber-400/20 bg-amber-400/10 text-amber-300",
        focus: [
          "Trend continuation",
          "Range compression",
          "Relative strength persistence",
          "Setups into power hour",
        ],
      };
    case "close":
      return {
        label: "Power Hour",
        window: "3:00 PM – 4:00 PM ET",
        toneClass:
          "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-300",
        focus: [
          "Closing strength",
          "Institutional flow",
          "Trend confirmation",
          "Tomorrow watchlist prep",
        ],
      };
    default:
      return {
        label: "After Hours / Weekend",
        window: "Outside regular session",
        toneClass:
          "border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] text-cyan-100/75",
        focus: [
          "Refresh watchlist",
          "Review leaders",
          "Scan news flow",
          "Prepare tomorrow’s plan",
        ],
      };
  }
}

function getChecklist(phase: MarketPhase): ChecklistItem[] {
  switch (phase) {
    case "premarket":
      return [
        {
          id: "futures",
          label: "Check index direction",
          description: "Read SPY, QQQ, VIX, DXY, and TNX for overall tone.",
          href: "#macro",
          tag: "Macro",
        },
        {
          id: "movers",
          label: "Scan pre-market movers",
          description: "Look for unusual gaps, high volume, and catalyst-driven names.",
          href: "#top-setups",
          tag: "Movers",
        },
        {
          id: "earnings",
          label: "Check earnings reactions",
          description: "Prioritize names reacting to fresh reports before the bell.",
          href: "#global-pulse",
          tag: "Earnings",
        },
        {
          id: "macro-drop",
          label: "Watch 8:30 ET macro releases",
          description: "CPI, jobs, PPI, and other reports can flip the entire session.",
          href: "#featured-macro",
          tag: "Macro",
        },
      ];
    case "open":
      return [
        {
          id: "confirm-volume",
          label: "Confirm volume",
          description: "The first move matters less than whether volume confirms it.",
          href: "#top-setups",
          tag: "Open",
        },
        {
          id: "leaders",
          label: "Identify leaders quickly",
          description: "See which names are holding above VWAP and pushing with breadth.",
          href: "#leadership",
          tag: "Leaders",
        },
        {
          id: "failed-moves",
          label: "Spot fake-outs early",
          description: "If the move cannot hold opening momentum, treat it carefully.",
          href: "#opportunity-panel",
          tag: "Risk",
        },
        {
          id: "flow",
          label: "Focus on strongest conviction names",
          description: "Keep attention on names already showing clear structure.",
          href: "#top-setups",
          tag: "Conviction",
        },
      ];
    case "midday":
      return [
        {
          id: "trend",
          label: "Track trend continuation",
          description: "Midday is where weak setups fade and real leaders keep going.",
          href: "#leadership",
          tag: "Trend",
        },
        {
          id: "rotation",
          label: "Watch sector rotation",
          description: "See whether semis, software, internet, or defensives are taking over.",
          href: "#leadership",
          tag: "Rotation",
        },
        {
          id: "prep-close",
          label: "Build power-hour watchlist",
          description: "Line up names that could expand again into the close.",
          href: "#top-setups",
          tag: "Prep",
        },
      ];
    case "close":
      return [
        {
          id: "closing-strength",
          label: "Measure closing strength",
          description: "Strong closes often matter more than midday noise.",
          href: "#top-setups",
          tag: "Close",
        },
        {
          id: "institutional-flow",
          label: "Look for institutional confirmation",
          description: "Power hour can reveal where real money wants exposure overnight.",
          href: "#opportunity-panel",
          tag: "Flow",
        },
        {
          id: "tomorrow",
          label: "Build tomorrow’s plan",
          description: "Promote strong names into watchlist or portfolio workflow.",
          href: "#elite-grid",
          tag: "Plan",
        },
      ];
    default:
      return [
        {
          id: "review",
          label: "Review leaders and laggards",
          description: "Use the off-session to prepare your highest-conviction map.",
          href: "#leadership",
          tag: "Review",
        },
        {
          id: "watchlist",
          label: "Refresh your watchlist",
          description: "Keep only the names that still have a reason to be there.",
          href: "/watchlist",
          tag: "Watchlist",
        },
        {
          id: "news",
          label: "Read macro and company news",
          description: "Build the next session’s context before the tape gets noisy.",
          href: "#global-pulse",
          tag: "News",
        },
      ];
  }
}

function anchorOrHref(href?: string) {
  return href?.startsWith("#") ? href : href ?? "#";
}

export default function MarketPhaseChecklist() {
  const [phase, setPhase] = useState<MarketPhase>("premarket");

  useEffect(() => {
    const sync = () => setPhase(getCurrentMarketPhase());

    sync();
    const id = window.setInterval(sync, 60_000);

    return () => window.clearInterval(id);
  }, []);

  const meta = useMemo(() => getPhaseMeta(phase), [phase]);
  const checklist = useMemo(() => getChecklist(phase), [phase]);

  return (
    <section
      id="market-phase"
      className="rounded-[28px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_26%),linear-gradient(180deg,rgba(10,16,33,0.96),rgba(6,10,21,0.98))] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_60px_rgba(0,0,0,0.35)] sm:p-6"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
              Market Phase
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${meta.toneClass}`}
            >
              {meta.label}
            </span>
          </div>

          <div className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            What matters right now
          </div>

          <div className="mt-2 text-sm text-white/50">
            {meta.window}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {focusLinks[phase].map((item) => {
              const card = (
                <div className="rounded-2xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] px-3 py-3 text-sm text-white/78 transition hover:border-cyan-400/25 hover:bg-cyan-400/6 hover:text-white">
                  {item.label}
                </div>
              );

              return item.href.startsWith("#") ? (
                <a key={item.label} href={item.href} className="block">
                  {card}
                </a>
              ) : (
                <Link key={item.label} href={item.href} className="block">
                  {card}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 rounded-3xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] p-4 shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_30px_rgba(0,255,255,0.08)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/38">
                Immediate Checklist
              </div>
              <div className="mt-1 text-sm text-white/55">
                Use this before drifting into noise.
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {checklist.map((item, index) => {
              const href = anchorOrHref(item.href);

              const content = (
                <div className="group rounded-2xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] px-4 py-3 transition hover:border-cyan-400/25 hover:bg-cyan-400/6">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 text-[11px] font-semibold text-cyan-300">
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-white">
                          {item.label}
                        </div>
                        {item.tag ? (
                          <span className="rounded-full border border-cyan-400/10 bg-cyan-400/6 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-cyan-100/55">
                            {item.tag}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 text-sm leading-6 text-white/62">
                        {item.description}
                      </div>
                    </div>
                  </div>
                </div>
              );

              if (href.startsWith("#")) {
                return (
                  <a key={`${href}-${index}`} href={href} className="block">
                    {content}
                  </a>
                );
              }

              return (
                <Link key={`${href}-${index}`} href={href} className="block">
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}