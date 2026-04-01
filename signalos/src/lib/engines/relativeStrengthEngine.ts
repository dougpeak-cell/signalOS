import { VPCandle } from "@/components/stocks/VolumeProfile";

type RSSetup =
  | "REL_STRENGTH_BREAKOUT"
  | "REL_STRENGTH_TREND"
  | "REL_WEAKNESS_BREAKDOWN"
  | "MARKET_DIVERGENCE_LONG"
  | "MARKET_DIVERGENCE_SHORT";

export type RSDetection = {
  time: number;
  type: RSSetup;
  strength: number;
  description: string;
};

function percentMove(a: number, b: number) {
  return ((b - a) / a) * 100;
}

export function detectRelativeStrength(
  stock: VPCandle[],
  spy: VPCandle[],
  qqq: VPCandle[]
): RSDetection[] {
  const signals: RSDetection[] = [];

  const len = Math.min(stock.length, spy.length, qqq.length);

  for (let i = 20; i < len; i++) {
    const s = stock[i];
    const sPrev = stock[i - 20];

    const spyMove = percentMove(spy[i - 20].close, spy[i].close);
    const qqqMove = percentMove(qqq[i - 20].close, qqq[i].close);
    const stockMove = percentMove(sPrev.close, s.close);

    const marketMove = (spyMove + qqqMove) / 2;

    const rs = stockMove - marketMove;

    if (rs > 1.2 && stockMove > 0.8) {
      signals.push({
        time: Number(s.time),
        type: "REL_STRENGTH_BREAKOUT",
        strength: rs,
        description: "Stock outperforming market with upward expansion",
      });
    }

    if (rs > 0.8 && stockMove > 0) {
      signals.push({
        time: Number(s.time),
        type: "REL_STRENGTH_TREND",
        strength: rs,
        description: "Sustained relative strength vs market",
      });
    }

    if (rs < -1.2 && stockMove < -0.8) {
      signals.push({
        time: Number(s.time),
        type: "REL_WEAKNESS_BREAKDOWN",
        strength: rs,
        description: "Stock underperforming market with downward expansion",
      });
    }

    if (stockMove > 0.5 && marketMove < -0.3) {
      signals.push({
        time: Number(s.time),
        type: "MARKET_DIVERGENCE_LONG",
        strength: rs,
        description: "Stock rising while market declines",
      });
    }

    if (stockMove < -0.5 && marketMove > 0.3) {
      signals.push({
        time: Number(s.time),
        type: "MARKET_DIVERGENCE_SHORT",
        strength: rs,
        description: "Stock falling while market rises",
      });
    }
  }

  return signals;
}
