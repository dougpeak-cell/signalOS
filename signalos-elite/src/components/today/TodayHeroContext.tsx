"use client";

import {
  createContext,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import { useHeroStory } from "@/components/today/useHeroStory";
import type { HeroStory } from "@/components/today/TodayHeroPanel";
import type { SigiStockContext } from "@/hooks/useSigi";

type TodayHeroContextValue = {
  effectiveTicker: string | null;
  heroStory: HeroStory | null;
  stockContext: SigiStockContext | null;
  loadHeroStory: (ticker?: string | null) => Promise<void>;
};

const TodayHeroContext = createContext<TodayHeroContextValue | null>(null);

export function TodayHeroProvider({
  children,
  initialHeroStory = null,
}: {
  children: ReactNode;
  initialHeroStory?: HeroStory | null;
}): ReactElement {
  const { heroStory, loadHeroStory } = useHeroStory(initialHeroStory);
  const { activeTicker } = useSelectedTicker();
  const [stockContext, setStockContext] = useState<SigiStockContext | null>(null);
  const stockContextRequestIdRef = useRef(0);

  const effectiveTicker = useMemo(
    () => activeTicker ?? null,
    [activeTicker]
  );

  const loadStockContext = useCallback(async (symbol?: string | null) => {
    const requestId = ++stockContextRequestIdRef.current;

    if (!symbol) {
      if (requestId === stockContextRequestIdRef.current) {
        setStockContext(null);
      }
      return;
    }

    try {
      const res = await fetch(
        `/api/sigi/context?ticker=${encodeURIComponent(symbol.toUpperCase())}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        if (requestId === stockContextRequestIdRef.current) {
          setStockContext({ ticker: symbol.toUpperCase() });
        }
        return;
      }

      const data = await res.json();
      if (requestId === stockContextRequestIdRef.current) {
        setStockContext((data?.stock ?? null) as SigiStockContext | null);
      }
    } catch {
      if (requestId === stockContextRequestIdRef.current) {
        setStockContext({ ticker: symbol.toUpperCase() });
      }
    }
  }, []);

  useEffect(() => {
    if (!activeTicker) return;
    void loadHeroStory(activeTicker);
  }, [activeTicker, loadHeroStory]);

  useEffect(() => {
    void loadStockContext(effectiveTicker);
  }, [effectiveTicker, loadStockContext]);

  const value = useMemo<TodayHeroContextValue>(
    () => ({
      effectiveTicker,
      heroStory,
      stockContext,
      loadHeroStory,
    }),
    [effectiveTicker, heroStory, stockContext, loadHeroStory]
  );

  return (
    <TodayHeroContext.Provider value={value}>{children}</TodayHeroContext.Provider>
  );
}

export function useTodayHeroContext(): TodayHeroContextValue {
  const context = useContext(TodayHeroContext);

  if (!context) {
    throw new Error("useTodayHeroContext must be used inside TodayHeroProvider");
  }

  return context;
}