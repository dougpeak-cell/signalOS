"use client";

import { createContext, useContext, useState } from "react";

export type SelectedSignal = {
  time: number;
  type: string;
  price?: number;
};

type SignalContextType = {
  selectedSignal: SelectedSignal | null;
  setSelectedSignal: (signal: SelectedSignal | null) => void;
};

const SignalContext = createContext<SignalContextType | undefined>(undefined);

export function SignalProvider({ children }: { children: React.ReactNode }) {
  const [selectedSignal, setSelectedSignal] = useState<SelectedSignal | null>(null);

  return (
    <SignalContext.Provider value={{ selectedSignal, setSelectedSignal }}>
      {children}
    </SignalContext.Provider>
  );
}

export function useSignal() {
  const ctx = useContext(SignalContext);
  if (!ctx) throw new Error("useSignal must be used within SignalProvider");
  return ctx;
}