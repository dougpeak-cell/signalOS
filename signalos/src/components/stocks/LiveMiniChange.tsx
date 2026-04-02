"use client";

import { useEffect, useState } from "react";

type Props = {
  ticker: string;
  fallbackChangePct?: number | null;
};

type QuoteResponse = {
  changePct?: number | null;
};

function pctClass(value: number | null | undefined) {
  if (value == null) return "text-white/35";
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-white/55";
}

export default function LiveMiniChange({
  ticker,
  fallbackChangePct = null,
}: Props) {
  const [changePct, setChangePct] = useState<number | null>(fallbackChangePct);

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

        if (!cancelled && typeof json.changePct === "number") {
          setChangePct(json.changePct);
        }
      } catch {
        // keep fallback
      }
    }

    load();
    const id = window.setInterval(load, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [ticker]);

  return (
    <div className={`text-sm font-semibold ${pctClass(changePct)}`}>
      {changePct != null
        ? `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%`
        : "—"}
    </div>
  );
}