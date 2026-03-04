"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PlayerCard, { Pick } from "@/components/PlayerCard";

type Props = {
  title: string;
  subtitle?: string;
  items?: Pick[]; // ✅ allow undefined so Today page never hard-crashes
  maxPicks?: number;
  storageKey?: string; // optional: allow multiple slips
};

const DEFAULT_STORAGE_KEY = "slip:picks:v1";

function safeParsePicks(raw: string | null): Pick[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    // Keep only objects with a string key
    return v.filter((x) => x && typeof x === "object" && typeof x.key === "string");
  } catch {
    return [];
  }
}

export default function TopRailWithSlip({
  title,
  subtitle,
  items = [],
  maxPicks = 6,
  storageKey = DEFAULT_STORAGE_KEY,
}: Props) {
  const [selected, setSelected] = useState<Pick[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // ✅ hydrate selected from localStorage (client-only)
  useEffect(() => {
    setHydrated(true);
    try {
      const raw = window.localStorage.getItem(storageKey);
      const initial = safeParsePicks(raw);
      setSelected(initial.slice(0, maxPicks));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // ✅ persist selected to localStorage (client-only)
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(selected));
    } catch {
      // ignore
    }
  }, [selected, hydrated, storageKey]);

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

  function clear() {
    setSelected([]);
  }

  const count = selected.length;

  return (
    <section className="w-full">
      {/* Header */}
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{title}</div>
          {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
        </div>

        {/* Slip summary */}
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Slip: <span className="font-medium text-foreground">{count}</span> / {maxPicks}
          </div>

          <Link
            href="/slip"
            className={[
              "inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium",
              count ? "bg-foreground text-background" : "opacity-50 pointer-events-none",
            ].join(" ")}
            aria-disabled={!count}
          >
            Open Slip
          </Link>

          <button
            type="button"
            onClick={clear}
            className={[
              "rounded-md border px-3 py-1.5 text-sm",
              count ? "" : "opacity-50 pointer-events-none",
            ].join(" ")}
            aria-disabled={!count}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Two-column layout: rail + slip */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Rail */}
        <div className="min-w-0">
          {items.length === 0 ? (
            <div className="rounded-xl border p-4 text-sm text-muted-foreground">
              No picks available for Today yet.
            </div>
          ) : (
            <div className="pp-snap-x flex gap-3 overflow-x-auto pb-2">
              {items.map((it) => {
                const itemKey = it.key;
                if (!itemKey) return null;

                return (
                  <div key={itemKey} className="min-w-70">
                    <PlayerCard
                      pick={it}
                      selected={selectedKeys.has(itemKey)}
                      onToggle={toggle}
                      disabled={selected.length >= maxPicks && !selectedKeys.has(itemKey)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Slip panel */}
        <aside className="rounded-xl border p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Your Slip</div>
            <div className="text-xs text-muted-foreground">
              {count ? `${count} selected` : "Empty"}
            </div>
          </div>

          {count === 0 ? (
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Tap cards to add picks.
            </div>
          ) : (
            <div className="space-y-2">
              {selected.map((it) => (
                <div key={it.key} className="flex items-center gap-2 rounded-lg border p-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{it.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {it.team ? it.team : "—"}
                      {it.opponent ? ` vs ${it.opponent}` : ""}
                      {it.market ? ` • ${it.market}` : ""}
                      {it.line != null ? ` • ${it.line}` : ""}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeKey(it.key)}
                    className="rounded-md border px-2 py-1 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 text-xs text-muted-foreground">
            Picks persist automatically on this device.
          </div>
        </aside>
      </div>
    </section>
  );
}

export function TopRailWithSlipSkeleton() {
  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="h-6 w-1/2 rounded-md bg-muted" />

        {/* Slip summary */}
        <div className="flex items-center gap-2">
          <div className="h-6 w-24 rounded-md bg-muted" />
          <div className="h-6 w-24 rounded-md bg-muted" />
          <div className="h-6 w-24 rounded-md bg-muted" />
        </div>
      </div>

      {/* Two-column layout: rail + slip */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Rail */}
        <div className="min-w-0">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="shrink-0">
                <div className="h-40 w-28 rounded-xl bg-muted" />
              </div>
            ))}
          </div>
        </div>

        {/* Slip panel */}
        <aside className="rounded-xl border p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="h-4 w-20 rounded-md bg-muted" />
            <div className="h-3 w-12 rounded-md bg-muted" />
          </div>

          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-12 rounded-lg bg-muted" />
            ))}
          </div>

          <div className="mt-3 h-3 w-40 rounded-md bg-muted" />
        </aside>
      </div>
    </section>
  );
}

export function TopRailWithSlipError({ error }: { error?: Error }) {
  return (
    <div className="rounded-xl border p-4 text-sm text-destructive">
      <div className="mb-2 font-medium">Failed to load picks</div>
      <div>{error?.message || "An unknown error occurred."}</div>
    </div>
  );
}