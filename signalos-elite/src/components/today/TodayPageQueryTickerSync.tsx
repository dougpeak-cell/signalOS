"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useOptionalSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import { normalizeTicker } from "@/lib/tickerAliases";

export default function TodayPageQueryTickerSync() {
  const searchParams = useSearchParams();
  const ticker = searchParams.get("ticker");
  const selectedTicker = useOptionalSelectedTicker();

  useEffect(() => {
    if (!ticker || !selectedTicker) {
      return;
    }

    const normalizedTicker = normalizeTicker(ticker);

    if (!normalizedTicker) {
      return;
    }

    selectedTicker.setActiveTicker(normalizedTicker);

    const timeoutId = window.setTimeout(() => {
      document
        .getElementById("sigi-command-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [ticker, selectedTicker]);

  return null;
}