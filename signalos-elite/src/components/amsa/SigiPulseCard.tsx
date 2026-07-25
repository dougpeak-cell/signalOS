"use client";

import { useEffect, useState } from "react";
import type { AMSAStockPulse } from "@/lib/amsa";

type SigiPulseCardProps = {
  symbol: string;
};

type PulseApiResponse = {
  success: boolean;
  pulse?: AMSAStockPulse;
  error?: string;
};

export default function SigiPulseCard({
  symbol,
}: SigiPulseCardProps) {
  const [pulse, setPulse] = useState<AMSAStockPulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPulse() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/amsa/${encodeURIComponent(symbol)}`,
          {
            cache: "no-store",
          },
        );

        const payload =
          (await response.json()) as PulseApiResponse;

        if (!response.ok || !payload.pulse) {
          throw new Error(
            payload.error ?? "Pulse is unavailable.",
          );
        }

        if (!cancelled) {
          setPulse(payload.pulse);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Pulse is unavailable.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPulse();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-cyan-400/15 bg-slate-950/80 p-5">
        <p className="text-sm text-cyan-200">
          Sigi is reading {symbol.toUpperCase()}'s Pulse...
        </p>
      </div>
    );
  }

  if (error || !pulse) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-500/5 p-5">
        <p className="font-semibold text-rose-200">
          Pulse unavailable
        </p>
        <p className="mt-2 text-sm text-slate-400">
          {error ?? "AMSA could not complete the reading."}
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-cyan-400/20 bg-[linear-gradient(145deg,rgba(3,12,24,0.98),rgba(2,6,18,0.96))] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300">
            Sigi Pulse(TM)
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            {pulse.symbol}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Powered by AMSA(TM)
          </p>
        </div>

        <div className="text-right">
          <p className="text-5xl font-bold text-cyan-200">
            {pulse.score ?? "-"}
          </p>

          <p className="mt-1 text-sm font-semibold text-white">
            {pulse.state}
          </p>

          <p className="mt-1 text-xs capitalize text-emerald-300">
            {pulse.direction.replaceAll("-", " ")}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">AMSA confidence</span>
          <span className="font-semibold text-cyan-200">
            {pulse.confidence}%
          </span>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-linear-to-r from-cyan-400 to-emerald-300"
            style={{
              width: `${pulse.confidence}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {pulse.components
          .filter(
            (component) =>
              component.component !== "sector" &&
              component.component !== "market",
          )
          .map((component) => (
            <div
              key={component.component}
              className="rounded-xl border border-white/10 bg-white/2.5 p-3"
            >
              <p className="text-lg font-bold text-white">
                {component.score ?? "-"}
              </p>

              <p className="mt-1 text-[9px] uppercase tracking-[0.13em] text-slate-500">
                {component.label}
              </p>
            </div>
          ))}
      </div>

      {pulse.reasons.length ? (
        <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-500/3 p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Why Sigi reads this Pulse
          </p>

          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            {pulse.reasons.slice(0, 4).map((reason) => (
              <li key={reason}>- {reason}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
