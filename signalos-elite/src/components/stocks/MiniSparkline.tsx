"use client";

import { useEffect, useMemo } from "react";
import { useOptionalLiveMarket } from "@/components/market/LiveMarketProvider";

export type MiniSparklineProps = {
  ticker: string;
  className?: string;
  width?: number;
  height?: number;
  showPulse?: boolean;
};

function buildPath(points: number[], width: number, height: number): string {
  if (!points.length) return "";

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x =
        points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function MiniSparkline({
  ticker,
  className,
  width = 100,
  height = 44,
  showPulse,
}: MiniSparklineProps) {
  const liveMarket = useOptionalLiveMarket();
  const points = liveMarket?.historyMap[ticker] ?? [];

  useEffect(() => {
    if (!liveMarket) return;

    liveMarket.ensureHistory([ticker]);
    void liveMarket.refreshHistoryNow([ticker]);
  }, [liveMarket, ticker]);

  const path = useMemo(() => buildPath(points, width, height), [height, points, width]);

  if (!points.length || !path) {
    return (
      <div className={className}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-hidden"
        />
      </div>
    );
  }

  const first = points[0] ?? 0;
  const last = points[points.length - 1] ?? 0;
  const isPositive = last >= first;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-hidden"
      >
        <path
          d={path}
          fill="none"
          stroke={isPositive ? "#10b981" : "#ef4444"}
          strokeOpacity="0.7"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          className={isPositive ? "opacity-100" : "opacity-80"}
        />
      </svg>
    </div>
  );
}
