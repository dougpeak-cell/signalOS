export function buildVisionSummary({
  leader,
  improving,
  laggard,
  regime,
  mainRisk,
}: {
  leader: string;
  improving?: string;
  laggard: string;
  regime: string;
  mainRisk: string;
}) {
  const improvingText = improving
    ? ` ${improving} is also showing improving participation.`
    : "";

  return `The market is currently in a ${regime} regime, led by ${leader}.${improvingText} ${laggard} remains the weakest sector, while ${mainRisk} is the primary risk to the current thesis.`;
}