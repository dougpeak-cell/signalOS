"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { gradientStyle } from "@/lib/ui/teamColors";

export type Pick = {
  key: string;
  name: string;
  team?: string | null;
  opponent?: string | null;
  startTime?: string | null;
  market?: string | null;
  line?: number | null;
  proj?: number | null;
  edge?: number | null;
  confidencePct?: number | null;

  tier?: "Elite" | "Strong" | "Risk" | null;
  reasons?: string[] | null;
  headshotUrl?: string | null;
  teamLogoUrl?: string | null;
};

type BaseProps = {
  selected?: boolean;
  disabled?: boolean;
  onToggle?: (p: Pick) => void;
  onClick?: (p: Pick) => void;
  showExpand?: boolean;
  defaultExpanded?: boolean;
  className?: string;
};

type PlayerCardProps =
  | ({ pick: Pick; item?: never } & BaseProps)
  | ({ item: Pick; pick?: never } & BaseProps);

function n(v: unknown) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function fmtNum(v: number | null | undefined, digits = 1) {
  const x = n(v);
  if (x == null) return "—";
  return x.toFixed(digits);
}

function fmtPct(v: number | null | undefined) {
  const x = n(v);
  if (x == null) return "—";
  return `${Math.round(x)}%`;
}

function tierStyles(tier: Pick["tier"]) {
  // PrizePicks-ish vibe: neon-ish left edge + subtle background tint
  switch (tier) {
    case "Elite":
      return {
        edge: "bg-emerald-500",
        badge: "bg-emerald-500 text-white",
        tint: "bg-emerald-500/10",
        ring: "ring-emerald-500/30",
        label: "Elite",
      };
    case "Strong":
      return {
        edge: "bg-amber-500",
        badge: "bg-amber-500 text-black",
        tint: "bg-amber-500/10",
        ring: "ring-amber-500/30",
        label: "Strong",
      };
    default:
      return {
        edge: "bg-rose-500",
        badge: "bg-rose-500 text-white",
        tint: "bg-rose-500/10",
        ring: "ring-rose-500/30",
        label: "Risk",
      };
  }
}

function prettyTime(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // local time
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PlayerCard(props: PlayerCardProps) {
  const pick: Pick = ("pick" in props ? props.pick : props.item) ?? {
    key: "",
    name: "",
    team: null,
    opponent: null,
    startTime: null,
    market: "",
    line: null,
    proj: null,
    edge: null,
    confidencePct: null,
    tier: null,
    headshotUrl: null,
    teamLogoUrl: null,
    reasons: null,
  };

  const {
    selected = false,
    disabled = false,
    onToggle,
    onClick,
    showExpand = true,
    defaultExpanded = false,
    className = "",
  } = props;

  const [expanded, setExpanded] = useState(defaultExpanded);

  const t = tierStyles(pick.tier ?? null);

  // Use teamLogoUrl if present, else fallback to default.png
  const imgSrc = pick.teamLogoUrl || "/team-logos/default.png";

  const isHeadshot = Boolean(pick.headshotUrl);

  const proj = n(pick.proj);
  const line = n(pick.line);
  const edge = n(pick.edge);

  const edgeText =
    edge == null
      ? "—"
      : `${edge >= 0 ? "+" : ""}${fmtNum(edge, 1)}`;

  const timeLabel = prettyTime(pick.startTime);
  const oppLabel = pick.opponent ?? null;

  function handleToggle() {
    if (disabled) return;
    onToggle?.(pick);
  }

  function handleCardClick() {
    if (disabled) return;
    // If caller wants click behavior, use it; otherwise toggle selection by default
    if (onClick) onClick(pick);
    else handleToggle();
  }

  return (
    <motion.div
      onMouseMove={onMove}
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -4, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className={[
        "pp-card relative w-72 shrink-0 select-none rounded-2xl border shadow-sm",
        "transition-transform will-change-transform",
        selected ? "border-black/20" : "border-black/10",
        disabled ? "opacity-60" : "hover:shadow-md",
        "ring-1",
        selected ? "ring-black/15" : t.ring,
        pick.tier === "Elite" ? "pp-elite-glow pp-shimmer pp-shimmer-on" : "pp-shimmer",
        className,
      ].join(" ")}
      style={gradientStyle(pick.team)}
    >
      {/* rarity edge bar */}
      <div className={["absolute left-0 top-0 h-full w-1.5 rounded-l-2xl", t.edge].join(" ")} />

      {/* shimmer overlay (above gradient, below content) */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl z-10" aria-hidden />

      {/* glass overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/75 backdrop-blur-[1px] z-20" />

      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          // keyboard click support
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        className="w-full text-left cursor-pointer relative z-30"
      >
        {/* top row */}
        <div className="flex gap-3 p-3">
          {/* Avatar (PrizePicks-style: logo badge) */}
          <div className="relative">
            <div
              className={[
                "relative h-16 w-16 overflow-hidden rounded-xl",
                "bg-white",
                "shadow-[0_6px_18px_rgba(0,0,0,0.08)]",
                "ring-1",
                selected ? "ring-black/20" : "ring-black/10",
              ].join(" ")}
            >
              {/* inner pad keeps logos crisp and centered */}
              <div className="absolute inset-0 p-1.5">
                <Image
                  src={pick.teamLogoUrl || "/team-logos/default.png"}
                  alt={pick.team ?? pick.name}
                  fill
                  sizes="56px"
                  className="object-contain"
                  priority={false}
                />
              </div>
            </div>

            {/* confidence badge overlay */}
            <div className="absolute -right-1 -top-1">
              <div
                className={[
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm",
                  t.badge,
                ].join(" ")}
                title="Model confidence"
              >
                {fmtPct(pick.confidencePct)}
              </div>
            </div>
          </div>

          {/* Main info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-black">
                  {pick.name}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-black/60">
                  {pick.team ? <span className="truncate">{pick.team}</span> : null}
                  {oppLabel ? <span className="truncate">vs {oppLabel}</span> : null}
                  {timeLabel ? <span className="truncate">• {timeLabel}</span> : null}
                </div>
              </div>

              {/* Expand control */}
              {showExpand ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((v) => !v);
                  }}
                  className={[
                    "rounded-full border px-2 py-1 text-xs font-medium",
                    "text-black/70 hover:text-black",
                    "border-black/10 hover:border-black/20 bg-white",
                  ].join(" ")}
                  aria-label={expanded ? "Collapse" : "Expand"}
                >
                  {expanded ? "−" : "+"}
                </button>
              ) : null}
            </div>

            {/* market strip */}
            <div className="mt-2 flex items-center gap-2">
              <div
                className={[
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                  "border border-black/10",
                  t.tint,
                ].join(" ")}
                title="Rarity tier"
              >
                {t.label}
              </div>

              <div className="text-xs text-black/60">
                {pick.market ?? "—"}
              </div>
            </div>
          </div>
        </div>

        {/* bottom quick stats (always visible) */}
        <div className="px-3 pb-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-black/10 bg-black/2 p-2">
              <div className="text-[10px] font-medium text-black/50">Proj</div>
              <div className="mt-0.5 text-sm font-semibold text-black">
                {fmtNum(proj, 1)}
              </div>
            </div>

            <div className="rounded-xl border border-black/10 bg-black/2 p-2">
              <div className="text-[10px] font-medium text-black/50">Line</div>
              <div className="mt-0.5 text-sm font-semibold text-black">
                {fmtNum(line, 1)}
              </div>
            </div>

            <div className="rounded-xl border border-black/10 bg-black/2 p-2">
              <div className="text-[10px] font-medium text-black/50">Edge</div>
              <div
                className={[
                  "mt-0.5 text-sm font-semibold",
                  edge == null
                    ? "text-black"
                    : edge >= 0
                    ? "text-emerald-700"
                    : "text-rose-700",
                ].join(" ")}
              >
                {edgeText}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded panel */}
      <AnimatePresence initial={false}>
        {showExpand && expanded ? (
          <motion.div
            key="expand"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-black/10"
          >
            <div className="p-3">
              <div className="text-xs font-semibold text-black/70">
                Details
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-black/10 p-2">
                  <div className="text-[10px] text-black/50">Market</div>
                  <div className="mt-0.5 font-semibold text-black">
                    {pick.market ?? "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-black/10 p-2">
                  <div className="text-[10px] text-black/50">Confidence</div>
                  <div className="mt-0.5 font-semibold text-black">
                    {fmtPct(pick.confidencePct)}
                  </div>
                </div>

                <div className="rounded-xl border border-black/10 p-2">
                  <div className="text-[10px] text-black/50">Opponent</div>
                  <div className="mt-0.5 font-semibold text-black">
                    {oppLabel ?? "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-black/10 p-2">
                  <div className="text-[10px] text-black/50">Start</div>
                  <div className="mt-0.5 font-semibold text-black">
                    {timeLabel ?? "—"}
                  </div>
                </div>
              </div>

              {pick.reasons?.length ? (
                <div className="mt-3">
                  <div className="text-[10px] font-semibold text-black/60">
                    Why we like it
                  </div>
                  <ul className="mt-1 space-y-1">
                    {pick.reasons.slice(0, 3).map((r, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-black/10 bg-black/2 px-2 py-1 text-xs text-black/70"
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* CTA row */}
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-black/50">
                  Tap card to {selected ? "remove" : "add"}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle();
                  }}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    selected
                      ? "bg-black text-white"
                      : "bg-white text-black border border-black/15 hover:border-black/25",
                  ].join(" ")}
                >
                  {selected ? "Added" : "Add"}
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

export function PlayerCardList({ picks }: { picks: Pick[] }) {
  return picks.map((it) => (
    <PlayerCard key={it.key} pick={it} />
  ));
}

function onMove(e: React.MouseEvent<HTMLDivElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * 100;
  const y = ((e.clientY - r.top) / r.height) * 100;
  e.currentTarget.style.setProperty("--mx", `${x}%`);
  e.currentTarget.style.setProperty("--my", `${y}%`);
}