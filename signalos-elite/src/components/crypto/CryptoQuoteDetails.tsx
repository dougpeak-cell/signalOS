"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { CryptoQuote } from "@/lib/crypto/fmpQuote";

type QuoteState = {
  ticker: string;
  quote: CryptoQuote | null;
  error: string | null;
  loading: boolean;
  retrievedAt: string | null;
};

function amount(value: number | null | undefined, currency = false): string {
  if (value == null) return "Unavailable";
  return new Intl.NumberFormat("en-US", currency ? {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
    maximumFractionDigits: value !== 0 && Math.abs(value) < 1 ? 12 : 2,
  } : { maximumFractionDigits: 2 }).format(value);
}

function signed(value: number | null | undefined, percentage = false): string {
  if (value == null) return "Unavailable";
  return `${value > 0 ? "+" : ""}${percentage ? `${value.toLocaleString("en-US", { maximumFractionDigits: 5 })}%` : amount(value, true)}`;
}

export default function CryptoQuoteDetails({ ticker, compact = false }: {
  ticker: string;
  compact?: boolean;
}): React.JSX.Element {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<QuoteState>({ ticker: "", quote: null, error: null, loading: true, retrievedAt: null });

  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    async function load(): Promise<void> {
      if (running) return;
      running = true;
      setState((previous) => previous.ticker === ticker ? { ...previous, loading: true } : {
        ticker, quote: null, error: null, loading: true, retrievedAt: null,
      });
      try {
        const response = await fetch(`/api/crypto/quote?symbol=${encodeURIComponent(ticker)}`, {
          cache: "no-store", signal: controller.signal,
        });
        const payload = await response.json() as { ok?: boolean; quote?: CryptoQuote; error?: string; retrievedAt?: string };
        if (!response.ok || !payload.ok || !payload.quote) throw new Error(payload.error ?? "FMP quote unavailable.");
        if (!controller.signal.aborted) setState({
          ticker, quote: payload.quote, error: null, loading: false, retrievedAt: payload.retrievedAt ?? null,
        });
      } catch (error) {
        if (!controller.signal.aborted) setState({
          ticker, quote: null, loading: false, retrievedAt: null,
          error: error instanceof Error ? error.message : "FMP quote unavailable.",
        });
      } finally {
        running = false;
      }
    }
    void load();
    const timer = window.setInterval(() => { void load(); }, 30_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [ticker, attempt]);

  const current = state.ticker === ticker ? state : { quote: null, error: null, loading: true, retrievedAt: null };
  const quote = current.quote;
  const asOf = quote?.timestamp != null ? new Date(quote.timestamp * 1000) : null;
  const age = asOf && current.retrievedAt ? Date.parse(current.retrievedAt) - asOf.getTime() : null;
  const metrics = quote ? [
    ["Price (USD)", amount(quote.price, true)],
    ["Change (USD)", signed(quote.change)],
    ["Change (%)", signed(quote.changePercentage, true)],
    ["Volume", amount(quote.volume)],
    ["Day low", amount(quote.dayLow, true)],
    ["Day high", amount(quote.dayHigh, true)],
    ["52-week low", amount(quote.yearLow, true)],
    ["52-week high", amount(quote.yearHigh, true)],
    ["Market cap (USD)", amount(quote.marketCap)],
    ["50-day average", amount(quote.priceAvg50, true)],
    ["200-day average", amount(quote.priceAvg200, true)],
    ["Open", amount(quote.open, true)],
    ["Previous close", amount(quote.previousClose, true)],
    ["Exchange", quote.exchange ?? "Unavailable"],
    ["Quote timestamp (Unix)", quote.timestamp?.toString() ?? "Unavailable"],
  ] : [];

  return (
    <section aria-label="FMP Market Quote" aria-busy={current.loading} className="mb-6 min-w-0 border-y border-white/10 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-emerald-300">FMP / USD</p>
          <h2 className="mt-1 break-words text-xl font-semibold">{quote?.name ?? `${ticker} Market Quote`}</h2>
          {quote && <p className="mt-1 text-xs text-white/50">{quote.symbol} · {asOf ? <>As of <time dateTime={asOf.toISOString()}>{asOf.toLocaleString("en-US", { timeZone: "UTC" })} UTC</time></> : "Quote time unavailable"}</p>}
        </div>
        <button type="button" title="Refresh FMP quote" aria-label="Refresh FMP quote" disabled={current.loading}
          onClick={() => setAttempt((value) => value + 1)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/15 text-white/70 hover:bg-white/5 disabled:opacity-40">
          <RefreshCw size={17} className={current.loading ? "animate-spin" : ""} />
        </button>
      </div>
      {current.loading && !quote && <p role="status" className="mt-4 text-sm text-white/50">Loading FMP quote...</p>}
      {current.error && <p role="alert" className="mt-4 text-sm text-amber-200">{current.error}</p>}
      {age != null && age > 600_000 && <p className="mt-3 text-xs text-amber-200">Delayed quote: the provider timestamp is more than 10 minutes old.</p>}
      {age != null && age < -300_000 && <p className="mt-3 text-xs text-amber-200">The provider timestamp is ahead of retrieval time; quote freshness cannot be verified.</p>}
      {quote && (
        <>
          <dl className={`mt-4 grid min-w-0 grid-cols-2 gap-x-4 gap-y-5 ${compact ? "" : "md:grid-cols-3 xl:grid-cols-5"}`}>
            {metrics.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-white/45">{label}</dt>
                <dd className="mt-1 break-words text-sm font-semibold tabular-nums text-white/90 [overflow-wrap:anywhere]">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-xs leading-5 text-white/40">Source: FMP quote snapshot. {current.retrievedAt ? `Retrieved ${new Date(current.retrievedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC. ` : ""}Quote time is independent of the streaming chart price.</p>
        </>
      )}
    </section>
  );
}