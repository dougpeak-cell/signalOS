"use client";

import { useEffect, useMemo, useState } from "react";

import type { AMSAPulseEvolution } from "@/lib/amsa";

import { PulseTimeline } from "@/components/vision/PulseTimeline";

type StockPulseTimelineProps = {
  symbol: string;
};

type EvolutionApiResponse = {
  success?: boolean;
  evolution?: AMSAPulseEvolution;
  error?: string;
};

function formatTimelineLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function StockPulseTimeline({
  symbol,
}: StockPulseTimelineProps) {
  const [evolution, setEvolution] = useState<AMSAPulseEvolution | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEvolution() {
      try {
        const response = await fetch(
          `/api/amsa/evolution/stock/${encodeURIComponent(symbol)}?limit=5&frequency=daily`,
          {
            cache: "no-store",
          },
        );

        const payload = (await response.json()) as EvolutionApiResponse;

        if (!response.ok || !payload.evolution) {
          if (!cancelled) {
            setEvolution(null);
          }

          return;
        }

        if (!cancelled) {
          setEvolution(payload.evolution);
        }
      } catch {
        if (!cancelled) {
          setEvolution(null);
        }
      }
    }

    void loadEvolution();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const timelinePoints = useMemo(
    () =>
      evolution?.history
        .filter(
          (point): point is typeof point & { score: number } =>
            typeof point.score === "number" && Number.isFinite(point.score),
        )
        .slice(-5)
        .map((point) => ({
          label: formatTimelineLabel(point.date),
          score: point.score,
          state: point.state ?? null,
        })) ?? [],
    [evolution],
  );

  return <PulseTimeline points={timelinePoints} />;
}