"use client";

import { useMemo, useState } from "react";

type PracticeWithTalentsProps = {
  symbol: string;
  price: number;
};

export function PracticeWithTalents({
  symbol,
  price,
}: PracticeWithTalentsProps) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => {
    if (!Number.isFinite(price) || !Number.isFinite(quantity)) {
      return 0;
    }

    return price * quantity;
  }, [price, quantity]);

  async function submitTrade() {
    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const response = await fetch("/api/talents/trade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol,
          side,
          quantity,
          price,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.error ?? "Unable to complete Talent trade."
        );
      }

      setMessage(
        `${side === "buy" ? "Bought" : "Sold"} ${quantity} ${
          quantity === 1 ? "share" : "shares"
        } of ${symbol} using ${total.toLocaleString("en-US", {
          maximumFractionDigits: 2,
        })} Talents.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete Talent trade."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.12]"
      >
        Practice with Talents
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-cyan-400/15 bg-slate-950/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Practice Trade
          </div>

          <h3 className="mt-1 text-lg font-semibold text-white">
            {symbol}
          </h3>

          <p className="mt-1 text-xs text-white/40">
            Simulated trade only — no real money.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-white/35 transition hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSide("buy")}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            side === "buy"
              ? "bg-emerald-400 text-slate-950"
              : "border border-white/10 bg-white/[0.03] text-white/55"
          }`}
        >
          Buy
        </button>

        <button
          type="button"
          onClick={() => setSide("sell")}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            side === "sell"
              ? "bg-amber-300 text-slate-950"
              : "border border-white/10 bg-white/[0.03] text-white/55"
          }`}
        >
          Sell
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-white/40">
            Shares
          </label>

          <input
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(event) =>
              setQuantity(
                Math.max(1, Number(event.target.value) || 1)
              )
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-cyan-400/30"
          />
        </div>

        <div>
          <div className="text-xs font-medium text-white/40">
            Market Price
          </div>

          <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 font-medium text-white">
            ${price.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="text-xs text-white/35">
          {side === "buy"
            ? "Talent cost"
            : "Talents received"}
        </div>

        <div className="mt-1 text-2xl font-semibold text-white">
          {total.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          T
        </div>

        <div className="mt-1 text-xs text-cyan-300">
          1 Talent = $1 simulated
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={submitTrade}
        disabled={submitting}
        className="mt-5 w-full rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? "Processing..."
          : side === "buy"
          ? `Buy ${symbol} with Talents`
          : `Sell ${symbol} for Talents`}
      </button>
    </div>
  );
}