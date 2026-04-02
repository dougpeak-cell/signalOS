"use client";

import { useEffect, useState } from "react";

type Props = {
  ticker: string;
  fallbackPrice?: number | null;
};

type QuoteResponse = {
  price?: number | null;
};

function formatPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "--";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function LiveMiniPrice({ ticker, fallbackPrice = null }: Props) {
  const [price, setPrice] = useState<number | null>(fallbackPrice);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          `/api/massive/quote?ticker=${encodeURIComponent(ticker)}&ts=${Date.now()}`,
          { cache: "no-store" }
        );

        if (!res.ok) return;

        const json = (await res.json()) as QuoteResponse;

        if (!cancelled && typeof json.price === "number") {
          setPrice(json.price);
        }
      } catch {
        // keep fallback price
      }
    }

    load();
    const id = window.setInterval(load, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [ticker]);

  return <>{formatPrice(price)}</>;
}