"use client";

import Link from "next/link";
import type { ReactNode } from "react";

function money(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";

  const maximumFractionDigits =
    value >= 100 ? 2 :
    value >= 1 ? 4 :
    value >= 0.01 ? 6 :
    8;

  return `$${value.toLocaleString(undefined, { maximumFractionDigits })}`;
}

function signedMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : "-"}${money(Math.abs(value))}`;
}

function pct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function CryptoQuickViewRow({
  symbol,
  name,
  detailHref,
  price,
  changePercent,
  changeAmount,
  actions,
}: {
  symbol: string;
  name: string;
  detailHref: string;
  price: number | null | undefined;
  changePercent: number | null | undefined;
  changeAmount: number | null | undefined;
  actions?: ReactNode;
}) {
  const toneClass =
    (changePercent ?? 0) >= 0
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : "border-rose-400/20 bg-rose-400/10 text-rose-300";
  const valueToneClass = (changePercent ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300";

  return (
    <article className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[10px] uppercase tracking-[0.18em] text-white/38">
            {name}
          </div>
          <Link
            href={detailHref}
            className="mt-1 block text-lg font-semibold tracking-tight text-white transition hover:text-cyan-100"
          >
            {symbol}
          </Link>
        </div>

        <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>
          {pct(changePercent)}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/3 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">Current</div>
          <div className="mt-1 text-sm font-semibold text-white">{money(price)}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/3 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">Change %</div>
          <div className={`mt-1 text-sm font-semibold ${valueToneClass}`}>{pct(changePercent)}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/3 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">Day Move</div>
          <div className={`mt-1 text-sm font-semibold ${valueToneClass}`}>
            {signedMoney(changeAmount)}
          </div>
        </div>
      </div>

      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}