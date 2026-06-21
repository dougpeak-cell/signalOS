"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
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

function areSessionLevelsEqual(
  left: SessionLevels | null,
  right: SessionLevels | null
) {
  if (left === right) return true;
  if (left == null || right == null) return left === right;

  return (
    left.premarketHigh === right.premarketHigh &&
    left.premarketLow === right.premarketLow &&
    left.sessionHigh === right.sessionHigh &&
    left.sessionLow === right.sessionLow &&
    left.previousDayHigh === right.previousDayHigh &&
    left.previousDayLow === right.previousDayLow
  );
}

function areSelectedSignalsEqual(
  left: SelectedSignal | null,
  right: SelectedSignal | null
) {
  if (left === right) return true;
  if (left == null || right == null) return left === right;

  return (
    left.key === right.key &&
    left.label === right.label &&
    left.score === right.score &&
    left.confidence === right.confidence
  );
}

export function SelectedSignalProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selected, setSelectedState] = useState<SelectedSignal | null>(null);
  const [sessionLevels, setSessionLevelsState] = useState<SessionLevels | null>(null);
  const [liveVwap, setLiveVwap] = useState<number | null>(null);
  const [liveConfluencePrice, setLiveConfluencePrice] = useState<number | null>(null);
  const [liveConfluenceLabel, setLiveConfluenceLabel] = useState<string | null>(null);

  const setSelected = useCallback((next: SelectedSignal | null) => {
    setSelectedState((current) =>
      areSelectedSignalsEqual(current, next) ? current : next
    );
  }, []);

  const setSessionLevels = useCallback((next: SessionLevels | null) => {
    setSessionLevelsState((current) =>
      areSessionLevelsEqual(current, next) ? current : next
    );
  }, []);

  const setLiveVwapValue = useCallback((next: number | null) => {
    setLiveVwap((current) => (current === next ? current : next));
  }, []);

  const setLiveConfluencePriceValue = useCallback((next: number | null) => {
    setLiveConfluencePrice((current) => (current === next ? current : next));
  }, []);

  const setLiveConfluenceLabelValue = useCallback((next: string | null) => {
    setLiveConfluenceLabel((current) => (current === next ? current : next));
  }, []);

  const value = useMemo(
    () => ({
      selected,
      setSelected,
      sessionLevels,
      setSessionLevels,
      liveVwap,
      setLiveVwap: setLiveVwapValue,
      liveConfluencePrice,
      setLiveConfluencePrice: setLiveConfluencePriceValue,
      liveConfluenceLabel,
      setLiveConfluenceLabel: setLiveConfluenceLabelValue,
    }),
    [
      selected,
      setSelected,
      sessionLevels,
      setSessionLevels,
      liveVwap,
      setLiveVwapValue,
      liveConfluencePrice,
      setLiveConfluencePriceValue,
      liveConfluenceLabel,
      setLiveConfluenceLabelValue,
    ]
  );

  return (
    <SelectedSignalContext.Provider value={value}>
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