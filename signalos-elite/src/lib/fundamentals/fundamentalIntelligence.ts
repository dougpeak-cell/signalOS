export type FundamentalSnapshot = {
  pe?: number | null;
  peg?: number | null;
  marketCap?: number | null;
  cash?: number | null;
  debt?: number | null;
  dividendYield?: number | null;
  volume?: number | null;
  avgVolume?: number | null;
};

export type FundamentalSignalTone = "positive" | "neutral" | "warning" | "negative";

export type FundamentalSignal = {
  label: string;
  value: string;
  signal: string;
  tone: FundamentalSignalTone;
};

export type FundamentalIntelligence = {
  score: number;
  grade: "Strong" | "Healthy" | "Balanced" | "Caution" | "Weak";
  summary: string;
  signals: FundamentalSignal[];
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatNumber(value?: number | null, digits = 2): string {
  if (!isFiniteNumber(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatCompactCurrency(value?: number | null): string {
  if (!isFiniteNumber(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value?: number | null): string {
  if (!isFiniteNumber(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function pushSignal(
  signals: FundamentalSignal[],
  scores: number[],
  label: string,
  value: string,
  signal: string,
  tone: FundamentalSignalTone,
  score: number
) {
  signals.push({ label, value, signal, tone });
  scores.push(score);
}

function gradeFromScore(score: number): FundamentalIntelligence["grade"] {
  if (score >= 80) return "Strong";
  if (score >= 67) return "Healthy";
  if (score >= 52) return "Balanced";
  if (score >= 38) return "Caution";
  return "Weak";
}

function summaryFromSignals(
  cashTone?: FundamentalSignalTone,
  debtTone?: FundamentalSignalTone,
  pegTone?: FundamentalSignalTone,
  peTone?: FundamentalSignalTone,
  volumeTone?: FundamentalSignalTone,
  dividendTone?: FundamentalSignalTone
): string {
  const parts: string[] = [];

  if (cashTone === "positive" && debtTone !== "negative") {
    parts.push("strong balance sheet");
  } else if (debtTone === "negative") {
    parts.push("debt pressure");
  }

  if (pegTone === "positive") {
    parts.push("attractive growth-adjusted valuation");
  } else if (pegTone === "warning" || peTone === "warning") {
    parts.push("valuation risk");
  }

  if (volumeTone === "positive") {
    parts.push("high liquidity");
  }

  if (dividendTone === "positive" || dividendTone === "neutral") {
    parts.push("income support");
  }

  if (!parts.length) {
    return "Mixed fundamentals with no single dominant strength or weakness.";
  }

  const first = parts[0];
  const rest = parts.slice(1);

  if (!rest.length) {
    return `${capitalize(first)}.`;
  }

  return `${capitalize(first)} with ${rest.join(" and ")}.`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildFundamentalIntelligence(
  input: FundamentalSnapshot
): FundamentalIntelligence {
  const signals: FundamentalSignal[] = [];
  const scores: number[] = [];

  let cashTone: FundamentalSignalTone | undefined;
  let debtTone: FundamentalSignalTone | undefined;
  let pegTone: FundamentalSignalTone | undefined;
  let peTone: FundamentalSignalTone | undefined;
  let volumeTone: FundamentalSignalTone | undefined;
  let dividendTone: FundamentalSignalTone | undefined;

  if (isFiniteNumber(input.pe)) {
    if (input.pe < 20) {
      peTone = "positive";
      pushSignal(signals, scores, "PE", formatNumber(input.pe), "Cheap", peTone, 88);
    } else if (input.pe <= 35) {
      peTone = "neutral";
      pushSignal(signals, scores, "PE", formatNumber(input.pe), "Fair", peTone, 64);
    } else {
      peTone = "warning";
      pushSignal(signals, scores, "PE", formatNumber(input.pe), "Expensive", peTone, 36);
    }
  } else {
    pushSignal(signals, scores, "PE", "—", "Unavailable", "neutral", 50);
  }

  if (isFiniteNumber(input.peg)) {
    if (input.peg < 1) {
      pegTone = "positive";
      pushSignal(signals, scores, "PEG", formatNumber(input.peg), "Undervalued", pegTone, 92);
    } else if (input.peg <= 2) {
      pegTone = "neutral";
      pushSignal(signals, scores, "PEG", formatNumber(input.peg), "Fair", pegTone, 66);
    } else {
      pegTone = "warning";
      pushSignal(signals, scores, "PEG", formatNumber(input.peg), "Expensive", pegTone, 34);
    }
  } else {
    pushSignal(signals, scores, "PEG", "—", "Unavailable", "neutral", 50);
  }

  if (isFiniteNumber(input.cash) && isFiniteNumber(input.debt)) {
    if (input.cash > input.debt * 1.15) {
      cashTone = "positive";
      debtTone = "positive";
      pushSignal(
        signals,
        scores,
        "Cash / Debt",
        `${formatCompactCurrency(input.cash)} / ${formatCompactCurrency(input.debt)}`,
        "Balance Sheet Strength",
        "positive",
        88
      );
    } else if (input.debt > input.cash * 1.5) {
      cashTone = "neutral";
      debtTone = "negative";
      pushSignal(
        signals,
        scores,
        "Cash / Debt",
        `${formatCompactCurrency(input.cash)} / ${formatCompactCurrency(input.debt)}`,
        "Debt Risk",
        "negative",
        28
      );
    } else {
      cashTone = "neutral";
      debtTone = "neutral";
      pushSignal(
        signals,
        scores,
        "Cash / Debt",
        `${formatCompactCurrency(input.cash)} / ${formatCompactCurrency(input.debt)}`,
        "Balanced",
        "neutral",
        60
      );
    }
  } else {
    pushSignal(signals, scores, "Cash / Debt", "—", "Unavailable", "neutral", 50);
  }

  if (isFiniteNumber(input.volume) && isFiniteNumber(input.avgVolume) && input.avgVolume > 0) {
    const ratio = input.volume / input.avgVolume;

    if (ratio >= 1.2) {
      volumeTone = "positive";
      pushSignal(
        signals,
        scores,
        "Volume",
        `${formatNumber(input.volume, 0)} / ${formatNumber(input.avgVolume, 0)}`,
        "Active",
        volumeTone,
        82
      );
    } else if (ratio >= 0.8) {
      volumeTone = "neutral";
      pushSignal(
        signals,
        scores,
        "Volume",
        `${formatNumber(input.volume, 0)} / ${formatNumber(input.avgVolume, 0)}`,
        "Normal",
        volumeTone,
        62
      );
    } else {
      volumeTone = "warning";
      pushSignal(
        signals,
        scores,
        "Volume",
        `${formatNumber(input.volume, 0)} / ${formatNumber(input.avgVolume, 0)}`,
        "Light",
        volumeTone,
        42
      );
    }
  } else {
    pushSignal(signals, scores, "Volume", "—", "Unavailable", "neutral", 50);
  }

  if (isFiniteNumber(input.dividendYield)) {
    if (input.dividendYield >= 3) {
      dividendTone = "positive";
      pushSignal(
        signals,
        scores,
        "Dividend",
        formatPercent(input.dividendYield),
        "Income",
        dividendTone,
        76
      );
    } else if (input.dividendYield > 0) {
      dividendTone = "neutral";
      pushSignal(
        signals,
        scores,
        "Dividend",
        formatPercent(input.dividendYield),
        "Moderate",
        dividendTone,
        62
      );
    } else {
      dividendTone = "neutral";
      pushSignal(signals, scores, "Dividend", "0.00%", "Growth", dividendTone, 58);
    }
  } else {
    pushSignal(signals, scores, "Dividend", "—", "Unavailable", "neutral", 50);
  }

  if (isFiniteNumber(input.marketCap)) {
    const capSignal =
      input.marketCap >= 200_000_000_000
        ? "Mega Cap"
        : input.marketCap >= 10_000_000_000
          ? "Large Cap"
          : input.marketCap >= 2_000_000_000
            ? "Mid Cap"
            : "Small Cap";

    pushSignal(
      signals,
      scores,
      "Market Cap",
      formatCompactCurrency(input.marketCap),
      capSignal,
      "neutral",
      60
    );
  } else {
    pushSignal(signals, scores, "Market Cap", "—", "Unavailable", "neutral", 50);
  }

  const averageScore = scores.length
    ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
    : 50;

  return {
    score: averageScore,
    grade: gradeFromScore(averageScore),
    summary: summaryFromSignals(
      cashTone,
      debtTone,
      pegTone,
      peTone,
      volumeTone,
      dividendTone
    ),
    signals,
  };
}