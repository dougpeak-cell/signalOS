"use client";

import { useEffect, useState } from "react";

type InsiderTradeRow = {
  symbol: string;
  companyName: string;
  amountPurchased: number | null;
  sharesPurchased: number | null;
  transactionDate: string | null;
  filingDate: string | null;
  purchaserName: string;
  purchaserTitle: string;
  transactionType: string;
  securityName: string | null;
  filingUrl: string | null;
};

function buildSigiSummary(rows: InsiderTradeRow[]) {
  if (rows.length === 0) {
    return "Sigi is waiting for fresh insider purchase filings before ranking the most meaningful recent activity.";
  }

  const highestConvictionRow = [...rows].sort(
    (left, right) => (right.amountPurchased ?? -1) - (left.amountPurchased ?? -1)
  )[0];
  const mostRecentDate = rows[0]?.transactionDate ?? rows[0]?.filingDate ?? null;
  const uniqueSymbols = [...new Set(rows.map((row) => row.symbol).filter(Boolean))];

  const leadingBuyer = `${highestConvictionRow.purchaserName} (${highestConvictionRow.purchaserTitle})`;
  const leadingAmount = formatCurrency(highestConvictionRow.amountPurchased);
  const leadingDate = formatDate(highestConvictionRow.transactionDate ?? highestConvictionRow.filingDate);

  return `Sigi is showing the 5 most recent insider purchases first. The most meaningful disclosed buy in this recent window is ${highestConvictionRow.companyName} (${highestConvictionRow.symbol}) by ${leadingBuyer} on ${leadingDate} because it carries the largest visible dollar commitment at ${leadingAmount}. Across this window, insider buying touched ${uniqueSymbols.length} company${uniqueSymbols.length === 1 ? "" : "ies"} starting ${formatDate(mostRecentDate)}.`;
}

function formatCurrency(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value);
}

function formatShares(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 100 ? 2 : 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(parsed));
}

export default function InsiderTradesPanel() {
  const [rows, setRows] = useState<InsiderTradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadRows() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/experts/insiders", { cache: "no-store" });
        const data = (await response.json()) as {
          ok?: boolean;
          error?: string;
          rows?: InsiderTradeRow[];
        };

        if (!response.ok || data.ok === false) {
          throw new Error(data.error || "Failed to load insider trades");
        }

        if (!alive) return;
        setRows(Array.isArray(data.rows) ? data.rows : []);
      } catch (nextError) {
        if (!alive) return;
        setRows([]);
        setError(nextError instanceof Error ? nextError.message : "Failed to load insider trades");
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadRows();
    const timer = window.setInterval(loadRows, 1000 * 60 * 15);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/30 p-5 shadow-[0_0_28px_rgba(255,255,255,0.03)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300/90">
            Insider Trading
          </div>
          <p className="mt-1 max-w-2xl text-[14px] leading-6 text-white/48">
            The 5 most recent reported insider stock purchases, with SIGI highlighting the strongest disclosed buy in the current window.
          </p>
        </div>

        <div className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100">
          Live filings
        </div>
      </div>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-6 text-sm text-white/55">
          Loading latest insider purchases...
        </div>
      ) : error ? (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/8 px-4 py-6 text-sm text-rose-100/80">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-6 text-sm text-white/55">
          No recent insider purchase filings were available.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/8 px-4 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
              SIGI Summary
            </div>
            <p className="mt-2 text-sm leading-6 text-white/80">{buildSigiSummary(rows)}</p>
          </div>

          {rows.map((row) => (
            <article
              key={`${row.symbol}-${row.purchaserName}-${row.transactionDate}`}
              className="rounded-2xl border border-white/10 bg-white/3 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="wrap-break-word text-base font-semibold text-white">
                    {row.companyName}
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
                    {row.symbol}
                  </div>
                </div>

                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  {formatCurrency(row.amountPurchased)}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetaStat label="Purchased" value={formatCurrency(row.amountPurchased)} />
                <MetaStat label="Shares" value={formatShares(row.sharesPurchased)} />
                <MetaStat label="Trade Date" value={formatDate(row.transactionDate)} />
                <MetaStat label="Buyer" value={`${row.purchaserName} · ${row.purchaserTitle}`} />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/45">
                <span>{row.transactionType}</span>
                <span>Filed {formatDate(row.filingDate)}</span>
                {row.filingUrl ? (
                  <a
                    href={row.filingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-cyan-200 transition hover:text-cyan-100"
                  >
                    SEC filing ↗
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/8 bg-black/25 px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {label}
      </div>
      <div className="mt-2 wrap-break-word text-sm font-semibold leading-6 text-white/88">
        {value}
      </div>
    </div>
  );
}