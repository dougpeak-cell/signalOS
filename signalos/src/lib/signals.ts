
import type { ChartSignalType } from "@/lib/chartSignals";

export type SignalType = ChartSignalType;

export type ChartSignal = {
  time: number;
  type: SignalType;
  label: string;
  confidence?: number;
  price?: number;
  description?: string;
};
