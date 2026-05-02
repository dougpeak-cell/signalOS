import { computeFundamentalScore } from "@/lib/analysis/fundamentalScore";
import { computeMasterSignalScore } from "@/lib/analysis/masterSignalScore";

type TechnicalStructure =
  | "breakout"
  | "above_support"
  | "pullback"
  | "below_support"
  | "range";

type Input = {
  conviction: number | null;
  pe?: number | null;
  peg?: number | null;
  marketCap?: number | null;
  revenue?: number | null;
  netIncome?: number | null;
  cash?: number | null;
  debt?: number | null;
  dividendYield?: number | null;

  price?: number | null;
  sma20?: number | null;
  sma50?: number | null;
  atrPct?: number | null;
  rsi14?: number | null;
  structure?: TechnicalStructure;
};

function scoreTechnicalModel({
  price,
  sma20,
  sma50,
  atrPct,
  rsi14,
  structure,
}: {
  price?: number | null;
  sma20?: number | null;
  sma50?: number | null;
  atrPct?: number | null;
  rsi14?: number | null;
  structure?: TechnicalStructure;
}) {
  const trend =
    price != null && sma20 != null && sma50 != null
      ? price > sma20 && sma20 > sma50
        ? 88
        : price < sma20 && sma20 < sma50
          ? 28
          : 60
      : 50;

  const momentum =
    rsi14 != null
      ? rsi14 >= 60 && rsi14 <= 75
        ? 84
        : rsi14 > 75
          ? 52
          : rsi14 < 40
            ? 30
            : 62
      : 50;

  const volatility =
    atrPct != null
      ? atrPct <= 2.5
        ? 82
        : atrPct <= 4.5
          ? 64
          : 42
      : 50;

  const structureScore =
    structure === "breakout"
      ? 90
      : structure === "above_support"
        ? 72
        : structure === "pullback"
          ? 76
          : structure === "below_support"
            ? 18
            : structure === "range"
              ? 55
              : 50;

  return Math.round((trend + momentum + volatility + structureScore) / 4);
}

export function buildMasterScoreRow(input: Input) {
  const fundamental = computeFundamentalScore({
    pe: input.pe ?? null,
    peg: input.peg ?? null,
    marketCap: input.marketCap ?? null,
    revenue: input.revenue ?? null,
    netIncome: input.netIncome ?? null,
    cash: input.cash ?? null,
    debt: input.debt ?? null,
    dividendYield: input.dividendYield ?? null,
  });

  const technical = scoreTechnicalModel({
    price: input.price ?? null,
    sma20: input.sma20 ?? null,
    sma50: input.sma50 ?? null,
    atrPct: input.atrPct ?? null,
    rsi14: input.rsi14 ?? null,
    structure: input.structure,
  });

  const master = computeMasterSignalScore({
    technicalScore: technical,
    fundamentalScore: fundamental.composite,
    conviction: input.conviction ?? null,
  });

  return {
    technicalScore: technical,
    fundamentalScore: fundamental.composite,
    masterScore: master.score,
    masterLabel: master.label,
    masterTone: master.tone,
  };
}
