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
      if (selectedTicker.activeTicker !== null) {
        selectedTicker.setActiveTicker(null);
      }
      return;
    }

    const normalizedTicker = shouldLockToPreviewTicker
      ? previewTicker
      : ticker
        ? normalizeTicker(ticker)
        : null;

    if (!normalizedTicker) {
      return;
    }

    const needsTickerSync = selectedTicker.activeTicker !== normalizedTicker;

    if (!needsTickerSync) {
      return;
    }

    selectedTicker.setActiveTicker(normalizedTicker);

    const timeoutId = window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [previewTicker, selectedTicker, shouldLockToPreviewTicker, ticker]);

  return null;
}