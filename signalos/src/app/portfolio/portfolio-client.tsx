import ConfidenceBar from "@/components/ui/ConfidenceBar";
"use client";

import Link from "next/link";


import { useMemo, useState, useTransition } from "react";
import { addHolding, deleteHolding, updateHolding } from "./actions";
import type { PortfolioPosition, TickerOption } from "./types";

type FormState = {
  id?: number;
  ticker: string;
  shares: string;
  avg_cost: string;
  notes: string;
};

const emptyForm: FormState = {
  ticker: "",
  shares: "",
  avg_cost: "",
  notes: "",
};


function money(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return `$${Number(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pct(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return `${v >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`;
}


function signedPct(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  const n = Number(v);
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function signedMoney(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  const n = Number(v);
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n > 0 ? "+" : n < 0 ? "-" : ""}$${abs}`;
}

function tierStyles(tier: string | null | undefined) {
  const t = (tier ?? "").toLowerCase();
  if (t === "elite") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (t === "strong") return "border-sky-200 bg-sky-50 text-sky-700";
  if (t === "risk") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-neutral-200 bg-neutral-50 text-neutral-700";
}

function weightTone(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "text-neutral-500";
  if (v >= 20) return "text-red-600";
  if (v >= 10) return "text-amber-600";
  return "text-neutral-900";
}

function toneText(v: number | null | undefined) {
  if (v == null || !Number.isFinite(Number(v))) return "text-neutral-900";
  if (Number(v) > 0) return "text-emerald-700";
  if (Number(v) < 0) return "text-rose-700";
  return "text-neutral-900";
}

export default function PortfolioClient({
  positions,
  tickerOptions,
}: {
  positions: PortfolioPosition[];
  tickerOptions: TickerOption[];
}) {
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();


  const sorted = useMemo(
    () => [...positions].sort((a, b) => String(a.ticker).localeCompare(String(b.ticker))),
    [positions]
  );

  // For summary, use sorted as the "rows" array

  const summary = useMemo(() => {
    let portfolioValue = 0;
    let totalPL = 0;

    let bestWinner: PortfolioPosition | null = null;
    let largestPosition: PortfolioPosition | null = null;

    for (const row of sorted) {
      const marketValue = Number(row.market_value ?? 0);
      const unrealizedPL = Number(row.unrealized_pl ?? 0);

      portfolioValue += marketValue;
      totalPL += unrealizedPL;

      if (
        row.unrealized_pl_pct != null &&
        Number.isFinite(Number(row.unrealized_pl_pct))
      ) {
        if (
          !bestWinner ||
          Number(row.unrealized_pl_pct) >
            Number(bestWinner.unrealized_pl_pct ?? -Infinity)
        ) {
          bestWinner = row;
        }
      }

      if (
        !largestPosition ||
        marketValue > Number(largestPosition.market_value ?? 0)
      ) {
        largestPosition = row;
      }
    }

    const costBasis = portfolioValue - totalPL;
    const totalPLPct = costBasis > 0 ? (totalPL / costBasis) * 100 : null;

    return {
      portfolioValue,
      totalPL,
      totalPLPct,
      positions: sorted.length,
      bestWinner,
      largestPosition,
    };
  }, [sorted]);

  // Helper to get weight percentage of a position
  const getWeightPct = (row: PortfolioPosition) => {
    const portfolioValue = Number(summary.portfolioValue ?? 0);
    const marketValue = Number(row.market_value ?? 0);
    if (!portfolioValue || !Number.isFinite(portfolioValue)) return null;
    return (marketValue / portfolioValue) * 100;
  };

  function beginAdd() {
    setMode("add");
    setForm(emptyForm);
    setError("");
  }

  function beginEdit(row: PortfolioPosition) {
    setMode("edit");
    setForm({
      id: row.id,
      ticker: row.ticker ?? "",
      shares: String(row.shares ?? ""),
      avg_cost: row.avg_cost == null ? "" : String(row.avg_cost),
      notes: row.notes ?? "",
    });
    setError("");
  }

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const fd = new FormData();
        if (mode === "edit" && form.id != null) fd.set("id", String(form.id));
        fd.set("ticker", form.ticker);
        fd.set("shares", form.shares);
        fd.set("avg_cost", form.avg_cost);
        fd.set("notes", form.notes);

        if (mode === "add") {
          await addHolding(fd);
          setForm(emptyForm);
        } else {
          await updateHolding(fd);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function onDelete(id: number) {
    const ok = window.confirm("Delete this holding?");
    if (!ok) return;

    setError("");

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", String(id));
        await deleteHolding(fd);

        if (form.id === id) {
          setMode("add");
          setForm(emptyForm);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
        {/* Portfolio summary grid */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Portfolio Value
            </div>
            <div className="mt-2 text-2xl font-semibold text-neutral-900">
              {money(summary.portfolioValue)}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Total P&amp;L
            </div>
            <div className={`mt-2 text-2xl font-semibold ${toneText(summary.totalPL)}`}>
              {signedMoney(summary.totalPL)}
            </div>
            <div className={`mt-1 text-sm ${toneText(summary.totalPLPct)}`}>
              {pct(summary.totalPLPct)}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Positions
            </div>
            <div className="mt-2 text-2xl font-semibold text-neutral-900">
              {summary.positions}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Best Winner
            </div>
            <div className="mt-2 text-2xl font-semibold text-neutral-900">
              {summary.bestWinner?.ticker ?? "—"}
            </div>
            <div className={`mt-1 text-sm ${toneText(summary.bestWinner?.unrealized_pl_pct)}`}>
              {summary.bestWinner
                ? pct(summary.bestWinner.unrealized_pl_pct)
                : "—"}
            </div>
          </div>

          {/* Largest Position summary card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Largest Position
            </div>
            <div className="mt-2 text-2xl font-semibold text-neutral-900">
              {summary.largestPosition?.ticker ?? "—"}
            </div>
            <div
              className={`mt-1 text-sm ${weightTone(
                summary.largestPosition ? getWeightPct(summary.largestPosition) : null
              )}`}
            >
              {summary.largestPosition
                ? pct(getWeightPct(summary.largestPosition))
                : "—"}
            </div>
          </div>
        </div>

        {sorted.length ? (
          <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[1.05fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.9fr] gap-4 border-b border-neutral-100 bg-neutral-50 px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 lg:grid">
              <div>Name</div>
              <div>Shares</div>
              <div>Price</div>
              <div>Cost</div>
              <div>P&amp;L</div>
              <div>Target</div>
              <div>Actions</div>
            </div>

            <div className="divide-y divide-neutral-100">
              {sorted.map((row) => {
                const current = row.current_price ?? row.avg_cost ?? 0;
                const cost = row.avg_cost ?? 0;
                const shares = row.shares ?? 0;
                const prevClose = row.prev_close ?? row.previous_close ?? current;

                const unrealized = (current - cost) * shares;
                const dayPL = (current - prevClose) * (row.shares ?? 0);
                const dayPLPct =
                  prevClose > 0 ? ((current - prevClose) / prevClose) * 100 : 0;

                const unrealizedPct =
                  cost > 0 ? ((current - cost) / cost) * 100 : 0;

                return (
                  <Link
                    key={row.id}
                    href={`/stocks/${row.ticker}/live`}
                    className="block px-6 py-5"
                  >
                  <div className="rounded-2xl border border-neutral-800 bg-black p-4 hover:border-neutral-600 transition grid gap-4 lg:grid-cols-[1.05fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.9fr] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-2xl font-semibold tracking-tight">{row.ticker}</div>
                        <div
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${tierStyles(
                            row.tier
                          )}`}
                        >
                          {row.tier ?? "Holding"}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-neutral-500">
                        {row.company_name ?? "Company"} • {row.sector ?? "Sector"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wide text-neutral-500 lg:hidden">Shares</div>
                      <div className="font-semibold">{row.shares.toLocaleString()}</div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wide text-neutral-500 lg:hidden">Price</div>
                      <div className="font-semibold">{money(current)}</div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wide text-neutral-500 lg:hidden">Avg cost</div>
                      <div className="font-semibold">{money(cost)}</div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wide text-neutral-500 lg:hidden">P&amp;L</div>
                      <div
                        className={`font-semibold ${
                          unrealized >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {unrealized >= 0 ? "+" : ""}
                        {unrealized.toFixed(2)}
                      </div>

                      <div className="text-xs text-white/50">
                        ({unrealizedPct >= 0 ? "+" : ""}
                        {unrealizedPct.toFixed(2)}%)
                      </div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wide text-neutral-500 lg:hidden">Target</div>
                      <div className="font-semibold">{money(row.target_price)}</div>
                      <div className="text-sm text-neutral-500">{signedPct(row.upside_to_target_pct)}</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => beginEdit(row)}
                        className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(row.id)}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </div>

                    {/* Portfolio weight metric */}
                    <div>
                      <div className="text-xs uppercase tracking-wide text-neutral-500 lg:hidden">
                        Weight
                      </div>
                      <div className={`font-semibold ${weightTone(getWeightPct(row))}`}>
                        {pct(getWeightPct(row))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3 lg:hidden">
                    <div className="rounded-2xl bg-neutral-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-neutral-500">Market value</div>
                      <div className="mt-1 font-semibold">{money(current * shares)}</div>
                    </div>
                    <div className="rounded-2xl bg-neutral-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-neutral-500">Stop loss</div>
                      <div className="mt-1 font-semibold">{money(row.stop_loss)}</div>
                    </div>
                    <div className="rounded-2xl bg-neutral-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-neutral-500">Conviction</div>
                      <div className="mt-1 font-semibold">{pct(row.conviction)}</div>
                      <div className="mt-2">
                        <ConfidenceBar value={typeof row.conviction === "number" ? Math.round(row.conviction * 100) : 0} tone="bullish" size="sm" />
                      </div>
                    </div>
                  </div>

                  {row.notes ? (
                    <div className="mt-4 rounded-2xl bg-neutral-900 px-4 py-3 text-sm leading-6 text-neutral-300">
                      {row.notes}
                    </div>
                  ) : null}
                  </Link>
              )})}
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold tracking-tight">
                {mode === "add" ? "Add holding" : "Edit holding"}
              </div>
              <div className="mt-1 text-sm text-neutral-500">
                Create, update, or remove positions directly from the portfolio page.
              </div>
            </div>

            {mode === "edit" ? (
              <button
                type="button"
                onClick={beginAdd}
                className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
              >
                New
              </button>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">Ticker</label>
              <input
                value={form.ticker}
                onChange={(e) => onChange("ticker", e.target.value.toUpperCase())}
                placeholder="NVDA"
                className="h-12 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm outline-none transition focus:border-neutral-950"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">Shares</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.shares}
                  onChange={(e) => onChange("shares", e.target.value)}
                  placeholder="25"
                  className="h-12 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm outline-none transition focus:border-neutral-950"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">Average cost</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.avg_cost}
                  onChange={(e) => onChange("avg_cost", e.target.value)}
                  placeholder="118.40"
                  className="h-12 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-sm outline-none transition focus:border-neutral-950"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => onChange("notes", e.target.value)}
                placeholder="Core AI infrastructure position"
                rows={4}
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-950"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {isPending ? "Saving..." : mode === "add" ? "Add holding" : "Save changes"}
              </button>

              {mode === "edit" && form.id != null ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onDelete(form.id!)}
                  className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                >
                  Delete holding
                </button>
              ) : null}
            </div>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}
