"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type TalentAccount = {
  id: string;
  starting_talents: number;
  cash_talents: number;
};

type TalentPosition = {
  id: string;
  symbol: string;
  quantity: number;
  average_price: number;
};

type TalentTrade = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  execution_price: number;
  talent_amount: number;
  created_at: string;
};

type TalentData = {
  account: TalentAccount | null;
  positions: TalentPosition[];
  trades: TalentTrade[];
};

const money = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function TalentPortfolioPage() {
  const [data, setData] = useState<TalentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTalentPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/talents/positions", {
        cache: "no-store",
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "Unable to load Talent Portfolio.");
      }

      setData(json);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Talent Portfolio."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTalentPortfolio();
  }, [loadTalentPortfolio]);

  async function startTalentPortfolio() {
    try {
      setStarting(true);
      setError(null);

      const response = await fetch("/api/talents/account", {
        cache: "no-store",
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "Unable to start Talent Portfolio.");
      }

      await loadTalentPortfolio();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start Talent Portfolio."
      );
    } finally {
      setStarting(false);
    }
  }

  const investedCost = useMemo(() => {
    return (
      data?.positions.reduce((total, position) => {
        return total + position.quantity * position.average_price;
      }, 0) ?? 0
    );
  }, [data]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 pb-24 pt-8 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            Loading your Talent Portfolio...
          </div>
        </div>
      </main>
    );
  }

  if (!data?.account) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 pb-24 pt-8 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/portfolio"
            className="text-sm text-white/45 transition hover:text-white"
          >
            ← Back to My Portfolio
          </Link>

          <section className="mt-8 overflow-hidden rounded-[32px] border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.08] via-white/[0.03] to-transparent p-8 sm:p-10">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
                Sigi Training
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                Put your Talents to work.
              </h1>

              <p className="mt-5 text-base leading-7 text-white/55">
                Build a simulated stock portfolio using real market prices.
                Learn, test ideas, and develop discipline without risking real
                money.
              </p>

              <div className="mt-6 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] px-4 py-3">
                <div className="text-sm font-medium text-white">
                  Talent Portfolio
                </div>

                <div className="mt-1 text-xs text-white/40">
                  Simulated training positions. No real money is invested.
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-6">
                <div className="text-sm text-white/40">
                  Your starting balance
                </div>

                <div className="mt-2 text-4xl font-semibold text-white">
                  100,000 Talents
                </div>

                <div className="mt-2 text-sm font-medium text-cyan-300">
                  1 Talent = $1 simulated buying power
                </div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <Feature
                  title="Real prices"
                  text="Practice against actual market prices."
                />

                <Feature
                  title="No real money"
                  text="Talents are educational credits only."
                />

                <Feature
                  title="Separate portfolio"
                  text="Your real Portfolio is never changed."
                />
              </div>

              {error ? (
                <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                onClick={startTalentPortfolio}
                disabled={starting}
                className="mt-8 rounded-xl bg-cyan-300 px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {starting
                  ? "Creating Talent Portfolio..."
                  : "Start with 100,000 Talents"}
              </button>

              <p className="mt-5 max-w-xl text-xs leading-5 text-white/30">
                Talents are simulated educational credits. Talents are not
                U.S. dollars, cannot be withdrawn, and have no cash value.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 pb-24 pt-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/portfolio"
              className="text-sm text-white/45 transition hover:text-white"
            >
              ← My Portfolio
            </Link>

            <div className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
              Sigi Training
            </div>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Talent Portfolio
            </h1>

            <p className="mt-2 text-sm text-white/45">
              Your practice portfolio. Completely separate from your actual
              holdings.
            </p>
          </div>

          <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06] px-4 py-3 text-right">
            <div className="text-[10px] uppercase tracking-wider text-white/35">
              Training Rule
            </div>

            <div className="mt-1 text-sm font-semibold text-cyan-300">
              1 Talent = $1 simulated
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] px-4 py-3">
          <div className="text-sm font-medium text-white">
            Talent Portfolio
          </div>

          <div className="mt-1 text-xs text-white/40">
            Simulated training positions. No real money is invested.
          </div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Available Talents"
            value={`${money.format(data.account.cash_talents)} T`}
          />

          <StatCard
            label="Starting Balance"
            value={`${money.format(data.account.starting_talents)} T`}
          />

          <StatCard
            label="Invested Cost"
            value={`${money.format(investedCost)} T`}
          />
        </section>

        <section className="mt-8 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
              Practice Holdings
            </div>

            <h2 className="mt-2 text-xl font-semibold">
              Talent Positions
            </h2>
          </div>

          {data.positions.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
              <div className="text-lg font-medium text-white">
                No Talent positions yet
              </div>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/40">
                Find a stock in SigiOS and choose{" "}
                <span className="font-medium text-cyan-300">
                  Practice with Talents
                </span>
                .
              </p>

              <Link
                href="/stocks"
                className="mt-5 inline-flex rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]"
              >
                Explore Stocks →
              </Link>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[650px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-white/30">
                    <th className="pb-3 font-medium">Symbol</th>
                    <th className="pb-3 font-medium">Shares</th>
                    <th className="pb-3 font-medium">Average Price</th>
                    <th className="pb-3 text-right font-medium">
                      Cost Basis
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.positions.map((position) => {
                    const cost =
                      position.quantity * position.average_price;

                    return (
                      <tr
                        key={position.id}
                        className="border-b border-white/[0.05]"
                      >
                        <td className="py-4 font-semibold text-white">
                          {position.symbol}
                        </td>

                        <td className="py-4 text-white/65">
                          {position.quantity}
                        </td>

                        <td className="py-4 text-white/65">
                          ${money.format(position.average_price)}
                        </td>

                        <td className="py-4 text-right font-medium text-white">
                          {money.format(cost)} T
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
            History
          </div>

          <h2 className="mt-2 text-xl font-semibold">
            Talent Trades
          </h2>

          {data.trades.length === 0 ? (
            <p className="mt-5 text-sm text-white/40">
              Your practice trades will appear here.
            </p>
          ) : (
            <div className="mt-5 space-y-2">
              {data.trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          trade.side === "buy"
                            ? "text-emerald-300"
                            : "text-amber-300"
                        }
                      >
                        {trade.side.toUpperCase()}
                      </span>

                      <span className="font-semibold">
                        {trade.symbol}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-white/35">
                      {trade.quantity} shares @ $
                      {money.format(trade.execution_price)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-medium">
                      {money.format(trade.talent_amount)} T
                    </div>

                    <div className="mt-1 text-xs text-white/30">
                      {new Date(trade.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6 text-center text-xs leading-5 text-white/25">
          Talents are simulated educational credits and have no cash value.
          Talent trades do not execute securities transactions.
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
      <div className="text-[11px] uppercase tracking-wider text-white/30">
        {label}
      </div>

      <div className="mt-2 text-2xl font-semibold tracking-tight text-white">
        {value}
      </div>
    </div>
  );
}

function Feature({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
      <div className="text-sm font-semibold text-white">
        {title}
      </div>

      <div className="mt-1 text-xs leading-5 text-white/40">
        {text}
      </div>
    </div>
  );
}