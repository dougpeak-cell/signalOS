"use client";

import Link from "next/link";

import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import { prefetchCompanyProfile } from "@/lib/companyCache";

type MoverRow = {
  ticker: string;
  name: string;
  price?: number | null;
  changePct?: number | null;
};

function pctClass(v?: number | null) {
  if (v == null) return "text-white/45";
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-rose-400";
  return "text-white/45";
}

export default function CompactMoverList({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: MoverRow[];
  tone: "up" | "down";
}) {
  void tone;
  const { setActiveTicker } = useSelectedTicker();

  return (
    <div className="rounded-3xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] p-4 shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_24px_rgba(0,255,255,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
          {title}
        </div>
        <Link href="/stocks" className="text-xs text-white/45 hover:text-white">
          View all
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {rows.slice(0, 5).map((row) => (
          <Link
            key={row.ticker}
            href={`/stocks/${row.ticker}`}
            onClick={() => setActiveTicker(row.ticker)}
            onMouseEnter={() => prefetchCompanyProfile(row.ticker)}
            onFocus={() => prefetchCompanyProfile(row.ticker)}
            className="flex items-center justify-between rounded-2xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] px-3 py-3 transition hover:border-cyan-400/25 hover:bg-cyan-400/6"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">{row.ticker}</div>
              <div className="truncate text-xs text-white/50">{row.name}</div>
            </div>

            <div className="text-right">
              <div className="text-sm font-semibold text-white">
                {row.price != null ? `$${row.price.toFixed(2)}` : "--"}
              </div>
              <div className={`text-xs ${pctClass(row.changePct)}`}>
                {row.changePct != null
                  ? `${row.changePct >= 0 ? "+" : ""}${row.changePct.toFixed(2)}%`
                  : "--"}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}