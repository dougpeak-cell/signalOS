"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { SessionLevels } from "@/lib/stocks/sessionLevels";

export type SelectedSignal = {
  key?: string | null;
  label?: string | null;
  score?: number | null;
  confidence?: number | null;
};

type ContextType = {
  selected: SelectedSignal | null;
  setSelected: (s: SelectedSignal | null) => void;
  sessionLevels: SessionLevels | null;
  setSessionLevels: (levels: SessionLevels | null) => void;
  liveVwap: number | null;
  setLiveVwap: (value: number | null) => void;
  liveConfluencePrice: number | null;
  setLiveConfluencePrice: (value: number | null) => void;
  liveConfluenceLabel: string | null;
  setLiveConfluenceLabel: (value: string | null) => void;
};

const SelectedSignalContext = createContext<ContextType | null>(null);

export function SelectedSignalProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<SelectedSignal | null>(null);
  const [sessionLevels, setSessionLevels] = useState<SessionLevels | null>(null);
  const [liveVwap, setLiveVwap] = useState<number | null>(null);
  const [liveConfluencePrice, setLiveConfluencePrice] = useState<number | null>(null);
  const [liveConfluenceLabel, setLiveConfluenceLabel] = useState<string | null>(null);

  return (
    <SelectedSignalContext.Provider
      value={{
        selected,
        setSelected,
        sessionLevels,
        setSessionLevels,
        liveVwap,
        setLiveVwap,
        liveConfluencePrice,
        setLiveConfluencePrice,
        liveConfluenceLabel,
        setLiveConfluenceLabel,
      }}
    >
      {children}
    </SelectedSignalContext.Provider>
  );
}

export function useSelectedSignal() {
  const ctx = useContext(SelectedSignalContext);
  if (!ctx) {
    throw new Error(
      "useSelectedSignal must be used inside SelectedSignalProvider"
    );
  }
  return ctx;
}