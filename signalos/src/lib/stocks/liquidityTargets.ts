import type { ChartSignal } from "../chartSignals";

export type LiquidityTarget = {
  price: number;
  side: "up" | "down";
  strength: number;
  label: string;
};

function getSignalPrice(signal: ChartSignal): number | null {
  if (typeof (signal as any).price === "number") return (signal as any).price;
  if (typeof (signal as any).level === "number") return (signal as any).level;
  if (typeof (signal as any).value === "number") return (signal as any).value;
  return null;
}

export function buildLiquidityTargets(signals: ChartSignal[]): LiquidityTarget[] {
  const targets: LiquidityTarget[] = [];

  for (const s of signals) {
    const price = getSignalPrice(s);
    if (!price) continue;

    const type = String((s as any).type ?? "");

    if (type.includes("equal_high")) {
      targets.push({
        price,
        side: "up",
        strength: (s as any).confidence ?? 0.6,
        label: "Liquidity Target",
      });
    }

    if (type.includes("equal_low")) {
      targets.push({
        price,
        side: "down",
        strength: (s as any).confidence ?? 0.6,
        label: "Liquidity Target",
      });
    }

    if (type.includes("sweep_high")) {
      targets.push({
        price,
        side: "down",
        strength: 0.7,
        label: "Reversion Target",
      });
    }

    if (type.includes("sweep_low")) {
      targets.push({
        price,
        side: "up",
        strength: 0.7,
        label: "Reversion Target",
      });
    }
  }

  return targets;
}