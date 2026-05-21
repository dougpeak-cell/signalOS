"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSigiTier } from "@/hooks/useSigiTier";
import { getFeaturedPreviewTicker } from "@/lib/premiumAccess";

export type SigiAction = "setup" | "volume" | "risk" | "changed";

type SelectedTickerContextValue = {
  activeTicker: string | null;
  setActiveTicker: (ticker: string | null) => void;
  sigiAction: SigiAction;
  sigiActionNonce: number;
  setSigiAction: (action: SigiAction) => void;
  clearActiveTicker: () => void;
};

const SelectedTickerContext = createContext<SelectedTickerContextValue | null>(
  null
);

function normalizeTicker(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return normalized.length ? normalized : null;
}

export function SelectedTickerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { tier, previewActive } = useSigiTier();
  const [activeTicker, setActiveTickerState] = useState<string | null>(null);
  const [sigiAction, setSigiActionState] = useState<SigiAction>("setup");
  const [sigiActionNonce, setSigiActionNonce] = useState(0);

  const setActiveTicker = useCallback((ticker: string | null) => {
    const normalizedTicker = normalizeTicker(ticker);
    const previewTicker = getFeaturedPreviewTicker();
    const nextTicker =
      previewActive && tier === "free" && normalizedTicker && normalizedTicker !== previewTicker
        ? previewTicker
        : normalizedTicker;

    setActiveTickerState((currentTicker) =>
      currentTicker === nextTicker ? currentTicker : nextTicker
    );
  }, [previewActive, tier]);

  const clearActiveTicker = useCallback(() => {
    setActiveTickerState(null);
  }, []);

  const setSigiAction = useCallback((action: SigiAction) => {
    setSigiActionState(action);
    setSigiActionNonce((currentNonce) => currentNonce + 1);
  }, []);

  const value = useMemo(
    () => ({
      activeTicker,
      setActiveTicker,
      sigiAction,
      sigiActionNonce,
      setSigiAction,
      clearActiveTicker,
    }),
    [
      activeTicker,
      setActiveTicker,
      sigiAction,
      sigiActionNonce,
      setSigiAction,
      clearActiveTicker,
    ]
  );

  return (
    <SelectedTickerContext.Provider value={value}>
      {children}
    </SelectedTickerContext.Provider>
  );
}

export function useSelectedTicker() {
  const context = useContext(SelectedTickerContext);

  if (!context) {
    throw new Error(
      "useSelectedTicker must be used inside SelectedTickerProvider"
    );
  }

  return context;
}

export function useOptionalSelectedTicker() {
  return useContext(SelectedTickerContext);
}