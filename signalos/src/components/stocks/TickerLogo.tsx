"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

export default function TickerLogo({
  ticker,
  size = 36,
}: {
  ticker: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  const normalizedTicker = useMemo(
    () => String(ticker ?? "").toUpperCase().trim(),
    [ticker]
  );

  const src = `/logos/${normalizedTicker.toLowerCase()}.png`;

  if (!normalizedTicker || failed) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-white/85"
        style={{ width: size, height: size }}
      >
        {normalizedTicker.slice(0, 1) || "?"}
      </div>
    );
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5"
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={`${normalizedTicker} logo`}
        fill
        sizes={`${size}px`}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
