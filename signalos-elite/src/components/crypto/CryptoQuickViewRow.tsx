"use client";

import Link from "next/link";

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
}: {
  symbol: string;
  name: string;
  detailHref: string;
  price: number | null | undefined;
  changePercent: number | null | undefined;
  changeAmount: number | null | undefined;
}) {
  const valueToneClass =
    typeof changePercent === "number" && changePercent > 0
      ? "text-emerald-300"
      : typeof changePercent === "number" && changePercent < 0
        ? "text-rose-300"
        : "text-white/55";

  return (
    <Link
      href={detailHref}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3 transition hover:border-cyan-400/20 hover:bg-cyan-400/5"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold tracking-tight text-white">{symbol}</div>
          <span className="truncate text-xs text-white/42">{name}</span>
        </div>
      </div>

      <div className="flex items-end justify-end gap-3 text-right">
        <div className={`text-sm font-semibold ${changeAmount == null ? "text-white/35" : valueToneClass}`}>
          {signedMoney(changeAmount)}
        </div>

        <div>
          <div className="text-lg font-semibold text-white">{money(price)}</div>
          <div className={`mt-0.5 text-sm font-semibold ${valueToneClass}`}>
            {pct(changePercent)}
          </div>
        </div>
      </div>
    </Link>
  );
}