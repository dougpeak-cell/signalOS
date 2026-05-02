"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ContextType = {
  ticker: string | null;
  openPanel: (ticker: string) => void;
  closePanel: () => void;
};

const SigiPanelContext = createContext<ContextType | null>(null);

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

export function SigiPanelProvider({ children }: { children: ReactNode }) {
  const [ticker, setTicker] = useState<string | null>(null);

  return (
    <SigiPanelContext.Provider
      value={{
        ticker,
        openPanel: (nextTicker: string) => setTicker(normalizeTicker(nextTicker)),
        closePanel: () => setTicker(null),
      }}
    >
      {children}
    </SigiPanelContext.Provider>
  );
}

export function useSigiPanel() {
  const ctx = useContext(SigiPanelContext);

  if (!ctx) {
    throw new Error("Missing SigiPanelProvider");
  }

  return ctx;
}
