import { useState } from "react";

import {
  buildSigiProfilePrompt,
  getSigiProfile,
} from "@/lib/sigi/sigiProfile";
import { getVisibleSigiTextFromPayload } from "@/lib/sigi/responseVisibility";
import type { SigiTier } from "@/lib/sigi/gates";

export type SigiStockContext = {
  ticker?: string;
  name?: string;
  companyDescription?: string | null;
  sector?: string | null;
  industry?: string | null;
  price?: number | null;
  previousClose?: number | null;
  changePercent?: number | null;
  volume?: number | null;
  avgVolume?: number | null;
  relativeVolume?: number | null;
  marketCap?: number | null;
  peRatio?: number | null;
  setup?: string | null;
  catalyst?: string | null;
  trend?: string | null;
  support?: number | null;
  resistance?: number | null;
  notes?: string | null;
};

export type SigiTodayContext = {
  pathname?: string;
  intel?: {
    regime?: string | null;
    regimeReason?: string | null;
    topSignal?: string | null;
    topSignalReason?: string | null;
    bestSetup?: string | null;
    bestSetupReason?: string | null;
    mover?: string | null;
    moverReason?: string | null;
    riskName?: string | null;
    riskNameReason?: string | null;
  } | null;
  watchlistTickers?: string[];
  portfolioTickers?: string[];
  trackedQuotes?: Array<{
    ticker: string;
    price?: number | null;
    changePercent?: number | null;
  }>;
  headlines?: Array<{
    headline: string;
    tone?: "bullish" | "bearish" | "neutral";
    tickers?: string[];
    source?: string;
  }>;
};

export function useSigi() {
  const [loading, setLoading] = useState(false);

  const sendMessage = async (
    message: string,
    stock?: SigiStockContext | null,
    context?: SigiTodayContext | null
  ) => {
    setLoading(true);

    try {
      const profile = getSigiProfile();
      const userName = profile?.name ?? "friend";
      const profilePrompt = buildSigiProfilePrompt(profile);
      const plan: SigiTier = "free";

      const res = await fetch("/api/sigi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: message,
          ticker: stock?.ticker?.trim().toUpperCase() || undefined,
          plan,
          marketContext: {
            profilePrompt,
            stock: stock ?? null,
            context: context ?? null,
          },
          portfolioContext: {
            tickers: context?.portfolioTickers ?? [],
            trackedQuotes: context?.trackedQuotes ?? [],
          },
          watchlistContext: {
            tickers: context?.watchlistTickers ?? [],
            headlines: context?.headlines ?? [],
          },

          // Legacy compatibility for any route implementation still expecting the older shape.
          message,
          profilePrompt,
          stock: stock ?? null,
          context: context ?? null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Request failed");
      }

      const visibleText = getVisibleSigiTextFromPayload(data);
      if (!visibleText) {
        return null;
      }

      const ticker = stock?.ticker?.trim().toUpperCase();
      const intro = ticker
        ? `${userName}, here's what matters for ${ticker}:`
        : `${userName}, here's what matters:`;
      const responseText = visibleText;

      return responseText ? `${intro}\n\n${responseText}` : intro;
    } catch (error) {
      console.error("useSigi error:", error);
      return "Sigi encountered an error.";
    } finally {
      setLoading(false);
    }
  };

  return { sendMessage, loading };
}
