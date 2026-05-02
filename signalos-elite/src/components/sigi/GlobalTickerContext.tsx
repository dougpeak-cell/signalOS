"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  buildAnalyzeTickerMessage,
  buildLiveChartUrl,
  buildStockPageUrl,
  cleanTicker,
} from "@/lib/sigi/tickerActions";

type GlobalTickerContextValue = {
  activeTicker: string | null;
  analyzeTicker: (ticker: string) => void;
  openStockPage: (ticker: string) => void;
  openLiveChart: (ticker: string) => void;
};

const GlobalTickerContext = createContext<GlobalTickerContextValue | null>(null);

export function GlobalTickerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [activeTicker, setActiveTicker] = useState<string | null>(null);

  function analyzeTicker(ticker: string) {
    const clean = cleanTicker(ticker);
    if (!clean) return;

    setActiveTicker(clean);

    window.dispatchEvent(
      new CustomEvent("signalos:sigi-analyze-ticker", {
        detail: {
          ticker: clean,
          message: buildAnalyzeTickerMessage(clean),
          source: "trusted-ui",
        },
      })
    );
  }

  function openStockPage(ticker: string) {
    const clean = cleanTicker(ticker);
    if (!clean) return;
    setActiveTicker(clean);
    router.push(buildStockPageUrl(clean));
  }

  function openLiveChart(ticker: string) {
    const clean = cleanTicker(ticker);
    if (!clean) return;
    setActiveTicker(clean);
    router.push(buildLiveChartUrl(clean));
  }

  return (
    <GlobalTickerContext.Provider
      value={{
        activeTicker,
        analyzeTicker,
        openStockPage,
        openLiveChart,
      }}
    >
      {children}
    </GlobalTickerContext.Provider>
  );
}

export function useGlobalTicker() {
  const context = useContext(GlobalTickerContext);

  if (!context) {
    throw new Error("useGlobalTicker must be used inside GlobalTickerProvider");
  }

  return context;
}