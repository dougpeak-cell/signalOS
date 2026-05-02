type ConvictionInputs = {
  successRate?: number | null;
  avgReturn?: number | null;
  hitRate?: number | null;
  coverageCount?: number | null;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function computeConvictionScore({
  successRate,
  avgReturn,
  hitRate,
  coverageCount,
}: ConvictionInputs) {
  const sr = successRate ?? hitRate ?? 0;
  const ar = avgReturn ?? 0;
  const cc = coverageCount ?? 0;

  const successComponent = clamp(sr, 0, 100) * 0.5;
  const returnComponent = clamp(ar * 4, 0, 100) * 0.3;
  const coverageComponent = clamp(cc * 2, 0, 100) * 0.2;

  return clamp(Math.round(successComponent + returnComponent + coverageComponent));
}

export function getConvictionLabel(score: number) {
  if (score >= 80) return "High";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Watch";
  return "Low";
}

export function getConvictionTone(score: number) {
  if (score >= 80) {
    return {
      bar: "bg-emerald-400",
      text: "text-emerald-300",
      track: "bg-emerald-500/10",
    };
  }

  if (score >= 60) {
    return {
      bar: "bg-cyan-400",
      text: "text-cyan-300",
      track: "bg-cyan-500/10",
    };
  }

  if (score >= 40) {
    return {
      bar: "bg-amber-400",
      text: "text-amber-300",
      track: "bg-amber-500/10",
    };
  }

  return {
    bar: "bg-rose-400",
    text: "text-rose-300",
    track: "bg-rose-500/10",
  };
}