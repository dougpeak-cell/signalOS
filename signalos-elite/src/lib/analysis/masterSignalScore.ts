type Input = {
  technicalScore: number | null;
  fundamentalScore: number | null;
  conviction: number | null;
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

function normalizeConviction(conviction: number | null) {
  if (conviction == null || !Number.isFinite(conviction)) return 50;
  return conviction <= 1 ? conviction * 100 : conviction;
}

function labelFromScore(score: number) {
  if (score >= 85) return "Elite";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Constructive";
  if (score >= 40) return "Neutral";
  return "Risk";
}

function toneFromScore(score: number) {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-sky-300";
  if (score >= 55) return "text-cyan-300";
  if (score >= 40) return "text-amber-300";
  return "text-red-400";
}

export function computeMasterSignalScore(input: Input) {
  const technical = clamp(input.technicalScore ?? 50);
  const fundamental = clamp(input.fundamentalScore ?? 50);
  const conviction = clamp(normalizeConviction(input.conviction));

  const composite =
    technical * 0.45 +
    fundamental * 0.35 +
    conviction * 0.2;

  const score = Math.round(composite);

  return {
    score,
    label: labelFromScore(score),
    tone: toneFromScore(score),
    breakdown: {
      technical,
      fundamental,
      conviction,
    },
  };
}
