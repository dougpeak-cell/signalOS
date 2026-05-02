"use client";

import Link from "next/link";

type Row = {
  ticker: string;
  name?: string;
  changePercent?: number | null;
};

type Tone = "bullish" | "bearish" | "neutral";

function tone(change?: number | null): Tone {
  if (!change && change !== 0) return "neutral";
  if (change > 1.5) return "bullish";
  if (change < -1.5) return "bearish";
  return "neutral";
}

function cardStyles(index: number) {
  const palette = [
    "border-cyan-400/15 bg-cyan-400/8",
    "border-emerald-400/15 bg-emerald-400/8",
    "border-amber-400/15 bg-amber-400/8",
    "border-rose-400/15 bg-rose-400/8",
  ];

  return palette[index % palette.length] ?? palette[0];
}

function labelStyles(t: Tone) {
  if (t === "bullish") return "text-emerald-300/80";
  if (t === "bearish") return "text-rose-300/80";
  return "text-white/55";
}

function signalLabel(t: Tone) {
  if (t === "bullish") return "Bullish Bias";
  if (t === "bearish") return "Pressure Watch";
  return "Mixed Signal";
}

function signalRead(row: Row, t: Tone) {
  const name = row.name?.trim() || row.ticker;

  if (t === "bullish") {
    return `${name} is seeing upside momentum and improving expert confirmation.`;
  }

  if (t === "bearish") {
    return `${name} is showing weaker structure with downside pressure in the current model.`;
  }

  return `${name} is holding in a mixed range while signal conviction continues to develop.`;
}

export default function ActiveExpertSignals({
  rows,
}: {
  rows: Row[];
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/3 p-4 shadow-2xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
            Active Expert Signals
          </div>
          <div className="mt-1 text-xs text-white/40">
            Highest conviction names from current signal models
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {rows.map((row, index) => {
          const t = tone(row.changePercent);

          return (
            <Link
              key={row.ticker}
              href={`/stocks/${row.ticker}`}
              className={[
                "rounded-[22px] border p-4 transition hover:-translate-y-0.5 hover:border-white/15",
                cardStyles(index),
              ].join(" ")}
            >
              <div className={["text-[10px] font-semibold uppercase tracking-[0.16em]", labelStyles(t)].join(" ")}>
                {signalLabel(t)}
              </div>

              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="text-lg font-semibold text-white">{row.ticker}</div>

                <div className="text-xs font-semibold text-white/75">
                  {row.changePercent !== null && row.changePercent !== undefined
                    ? `${row.changePercent.toFixed(2)}%`
                    : "-"}
                </div>
              </div>

              <div className="mt-1 text-xs text-white/45">{row.name ?? row.ticker}</div>

              <div className="mt-3 text-sm text-white/55">
                {signalRead(row, t)}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}