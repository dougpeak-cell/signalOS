"use client";

import { createContext, useContext, type ReactNode } from "react";

type ShellMarketContextValue = {
  hasAccountSession: boolean;
  watchlistTickers: string[];
  portfolioTickers: string[];
};

const ShellMarketContext = createContext<ShellMarketContextValue>({
  hasAccountSession: false,
  watchlistTickers: [],
  portfolioTickers: [],
});

export function ShellMarketContextProvider({
  value,
  children,
}: {
  value: ShellMarketContextValue;
  children: ReactNode;
}) {
  return (
    <ShellMarketContext.Provider value={value}>
      {children}
    </ShellMarketContext.Provider>
  );
}

export function useShellMarketContext() {
  return useContext(ShellMarketContext);
}
