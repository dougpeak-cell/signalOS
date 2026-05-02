"use client";

import { useMemo, useState, type ReactNode } from "react";

type MoverRow = {
  ticker: string;
  name?: string | null;
  price?: number | null;
  changePct?: number | null;
  volume?: number | null;
};

type MoversTabKey = "top" | "speculative" | "etf";

function isWarrant(name?: string | null, ticker?: string | null) {
  const t = (ticker ?? "").toUpperCase();
  const n = (name ?? "").toLowerCase();
  return t.endsWith("W") || n.includes(" warrant") || n.includes("warrants");
}

function isEtf(name?: string | null, _ticker?: string | null) {
  const n = (name ?? "").toLowerCase();
  return (
    n.includes(" etf") ||
    n.includes(" fund") ||
    n.includes("trust") ||
    n.includes("index fund") ||
    n.includes("invesco") ||
    n.includes("ishares") ||
    n.includes("spdr") ||
    n.includes("direxion") ||
    n.includes("proshares") ||
    n.includes("vanguard")
  );
}

function isSpeculativeMover(row: MoverRow) {
  return (
    isWarrant(row.name, row.ticker) ||
    (row.price ?? 0) < 2 ||
    (row.volume ?? 0) < 1_000_000
  );
}

function isInstitutionalMover(row: MoverRow) {
  return (
    !isWarrant(row.name, row.ticker) &&
    !isEtf(row.name, row.ticker) &&
    (row.price ?? 0) >= 2 &&
    (row.volume ?? 0) >= 1_000_000
  );
}

function formatPrice(price?: number | null) {
  if (price == null || Number.isNaN(price)) return "—";
  return `$${price.toFixed(price >= 10 ? 2 : 2)}`;
}

function formatPct(value?: number | null) {
  const n = Number(value ?? 0);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function pctClass(value?: number | null) {
  const n = Number(value ?? 0);
  if (n > 0) return "text-emerald-300";
  if (n < 0) return "text-rose-300";
  return "text-white/45";
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
        active
          ? "border-cyan-400/30 bg-cyan-400/12 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.08)]"
          : "border-white/10 bg-white/3 text-white/55 hover:border-white/16 hover:text-white/75"
      }`}
    >
      {children}
    </button>
  );
}

function MoversColumn({
  title,
  rows,
}: {
  title: string;
  rows: MoverRow[];
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/72">
          {title}
        </div>
      </div>

      <div className="space-y-3">
        {rows.length ? (
          rows.slice(0, 5).map((row) => (
            <div
              key={`${title}-${row.ticker}`}
              className="rounded-2xl border border-white/8 bg-white/2 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-white">
                    {row.ticker}
                  </div>
                  <div className="truncate text-sm text-white/52">
                    {row.name ?? row.ticker}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-lg font-semibold text-white">
                    {formatPrice(row.price)}
                  </div>
                  <div className={`text-sm font-medium ${pctClass(row.changePct)}`}>
                    {formatPct(row.changePct)}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/8 bg-white/2 px-4 py-5 text-sm text-white/45">
            No names in this category right now.
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommandCenterMoversTabs({
  gainers,
  losers,
}: {
  gainers: MoverRow[];
  losers: MoverRow[];
}) {
  const [tab, setTab] = useState<MoversTabKey>("top");

  const data = useMemo(() => {
    const institutionalGainers = gainers.filter(isInstitutionalMover);
    const institutionalLosers = losers.filter(isInstitutionalMover);

    const speculativeGainers = gainers.filter(
      (row) => !isEtf(row.name, row.ticker) && isSpeculativeMover(row)
    );
    const speculativeLosers = losers.filter(
      (row) => !isEtf(row.name, row.ticker) && isSpeculativeMover(row)
    );

    const etfGainers = gainers.filter((row) => isEtf(row.name, row.ticker));
    const etfLosers = losers.filter((row) => isEtf(row.name, row.ticker));

    return {
      top: {
        gainers: institutionalGainers,
        losers: institutionalLosers,
        subtitle: "High-quality, higher-liquidity movers",
      },
      speculative: {
        gainers: speculativeGainers,
        losers: speculativeLosers,
        subtitle: "Low-priced and higher-risk movers",
      },
      etf: {
        gainers: etfGainers,
        losers: etfLosers,
        subtitle: "ETF and fund-based movers",
      },
    };
  }, [gainers, losers]);

  const active = data[tab];

  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,12,24,0.96),rgba(4,9,18,0.98))] p-4 shadow-[0_0_0_1px_rgba(0,255,255,0.03),0_0_18px_rgba(0,255,255,0.04)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Movers
          </div>
          <div className="mt-1 text-sm text-white/50">{active.subtitle}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TabButton active={tab === "top"} onClick={() => setTab("top")}>
            Top Movers
          </TabButton>
          <TabButton active={tab === "speculative"} onClick={() => setTab("speculative")}>
            High Vol
          </TabButton>
          <TabButton active={tab === "etf"} onClick={() => setTab("etf")}>
            ETFs
          </TabButton>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <MoversColumn title="Top Gainers" rows={active.gainers} />
        <MoversColumn title="Top Losers" rows={active.losers} />
      </div>
    </section>
  );
}