"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useOptionalSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import { useSigiTier } from "@/hooks/useSigiTier";
import { getFeaturedPreviewTicker } from "@/lib/premiumAccess";
import { normalizeTicker } from "@/lib/tickerAliases";

export default function TodayPageQueryTickerSync() {
  const searchParams = useSearchParams();
  const ticker = searchParams.get("ticker");
  const selectedTicker = useOptionalSelectedTicker();
  const { tier, previewActive } = useSigiTier();
  const previewTicker = getFeaturedPreviewTicker();
  const shouldLockToPreviewTicker = previewActive && tier === "free";

  useEffect(() => {
    if (ticker) {
      return;
    }

    if (window.location.hash === "#sigi-command-panel") {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [ticker]);

  useEffect(() => {
    if (!selectedTicker) {
      return;
    }

    if (!shouldLockToPreviewTicker && !ticker) {
      return;
    }

    const normalizedTicker = shouldLockToPreviewTicker
      ? previewTicker
      : normalizeTicker(ticker);

    if (!normalizedTicker) {
      return;
    }

    const needsTickerSync = selectedTicker.activeTicker !== normalizedTicker;

    if (!needsTickerSync) {
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
  }, [previewTicker, selectedTicker, shouldLockToPreviewTicker, ticker]);

  return null;
}