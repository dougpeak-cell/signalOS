"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { AMSAStockPulse } from "@/lib/amsa";
import { VisionPulseHero } from "@/components/vision/VisionPulseHero";
import { formatVerifiedPulseTimestamp } from "@/lib/market/formatMarketTimestamp";

type SigiPulseCardProps = {
  symbol: string;
  aside?: ReactNode;
};

type PulseApiResponse = {
  success: boolean;
  asOf?: string | null;
  pulse?: AMSAStockPulse;
  error?: string;
};

function toPulseDirection(
  direction: AMSAStockPulse["direction"],
): "improving" | "weakening" | "stable" {
  if (
    direction === "rising" ||
    direction === "strongly-rising"
  ) {
    return "improving";
  }

  if (
    direction === "falling" ||
    direction === "strongly-falling"
  ) {
    return "weakening";
  }

  return "stable";
}

export default function SigiPulseCard({
  symbol,
  aside,
}: SigiPulseCardProps) {
  const [pulse, setPulse] = useState<AMSAStockPulse | null>(null);
  const [pulseAsOf, setPulseAsOf] = useState<string | null>(null);
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
          setPulseAsOf(payload.asOf ?? null);
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
          Sigi is reading {symbol.toUpperCase()}&apos;s Pulse...
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

  const pulseUpdatedAt =
    pulseAsOf ??
    pulse.updatedAt ??
    pulse.calculatedAt ??
    pulse.recordedAt ??
    null;

  const formattedPulseUpdatedAt =
    formatVerifiedPulseTimestamp(pulseUpdatedAt);

  return (
    <section className="space-y-5">
      <div className={aside ? "grid gap-5 xl:grid-cols-[1fr_320px] xl:items-start" : ""}>
        <VisionPulseHero
          symbol={pulse.symbol ?? symbol.toUpperCase()}
          score={pulse.score ?? 0}
          state={pulse.state}
          confidence={pulse.confidence}
          direction={toPulseDirection(pulse.direction)}
          updatedAt={formattedPulseUpdatedAt}
        />

        {aside ? <div>{aside}</div> : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
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
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/3 p-4">
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
