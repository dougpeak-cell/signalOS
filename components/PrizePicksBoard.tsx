"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PlayerCard, { Pick } from "@/components/PlayerCard";

type Props = {
  title: string;
  subtitle?: string;
  items: Pick[];
  maxPicks?: number;
  minPicks?: number;
};

export default function PrizePicksBoard({
  title,
  subtitle,
  items,
  maxPicks = 6,
  minPicks = 2,
}: Props) {
  const [selected, setSelected] = useState<Pick[]>([]);
  const railRef = useRef<HTMLDivElement | null>(null);

  const selectedKeys = useMemo(() => new Set(selected.map((x) => x.key)), [selected]);

  function toggle(it: Pick) {
    if (!it?.key) return;
    setSelected((prev) => {
      const exists = prev.some((x) => x.key === it.key);
      if (exists) return prev.filter((x) => x.key !== it.key);
      if (prev.length >= maxPicks) return prev;
      return [...prev, it];
    });
  }

  function removeKey(key: string) {
    setSelected((prev) => prev.filter((x) => x.key !== key));
  }

  function clearAll() {
    setSelected([]);
  }

  function scrollByCards(dir: 1 | -1) {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: "smooth" });
  }

  const canBuild = selected.length >= minPicks;

  return (
    <div className="rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b p-5">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span aria-hidden>🔥</span>
            <span>{title}</span>
          </div>
          {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-black/5"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-black/5"
          >
            ▶
          </button>

          <div className="ml-2 text-sm text-muted-foreground">
            Slip: <span className="font-semibold text-foreground">{selected.length}</span> / {maxPicks}
          </div>

          <button
            type="button"
            onClick={clearAll}
            disabled={!selected.length}
            className={[
              "rounded-xl border px-3 py-2 text-sm",
              selected.length ? "hover:bg-black/5" : "opacity-40 cursor-not-allowed",
            ].join(" ")}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-4 p-5 lg:grid-cols-[1fr_360px]">
        {/* Rail */}
        <div className="min-w-0">
          <div
            style={{ marginTop: 14 }}
            className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch]"
          >
            {items.map((it) => {
              const itemKey = it.key;
              if (!itemKey) return null;

              const selectedNow = selectedKeys.has(itemKey);

              return (
                <div key={itemKey} className="snap-start">
                  <PlayerCard
                    item={it}
                    selected={selectedNow}
                    showExpand
                    onToggle={toggle}
                  />
                </div>
              );
            })}
          </div>

          {/* hint row */}
          <div className="text-xs text-muted-foreground">
            Swipe horizontally. Tap cards to add to your slip.
          </div>
        </div>

        {/* Slip */}
        <aside className="rounded-3xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold">Your Slip</div>
            <div className="text-xs text-muted-foreground">
              {selected.length ? `${selected.length} selected` : "Empty"}
            </div>
          </div>

          <div className="mt-3 rounded-2xl border bg-black/2 p-3">
            {selected.length === 0 ? (
              <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                Tap players to add picks.
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {selected.map((it) => (
                    <motion.div
                      key={it.key}
                      layout
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center gap-2 rounded-2xl border bg-white p-2"
                    >
                      {/* your slip row UI */}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{it.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {it.team} vs {it.opponent}
                        </div>
                      </div>
                      {/* Add any additional slip controls or info here */}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {canBuild ? "Ready to build" : `Pick ${minPicks}–${maxPicks} to build a card.`}
              </div>

              <button
                type="button"
                disabled={!canBuild}
                className={[
                  "rounded-xl px-3 py-2 text-sm font-semibold",
                  canBuild
                    ? "bg-emerald-500 text-black hover:bg-emerald-400"
                    : "bg-black/10 text-black/40 cursor-not-allowed",
                ].join(" ")}
              >
                Build
              </button>
            </div>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            Elite picks glow green.
          </div>
        </aside>
      </div>
    </div>
  );
}

