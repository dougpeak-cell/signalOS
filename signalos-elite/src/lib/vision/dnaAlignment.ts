function toScore(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;
}

export function calculateDNAAlignment(
  components: Array<{ score?: unknown }> | null | undefined
): number | null {
  const scores = (components ?? [])
    .map((component) => toScore(component.score))
    .filter((score): score is number => score !== null);

  if (!scores.length) return null;

  const average = scores.reduce((total, score) => total + score, 0) / scores.length;
  const spread = Math.max(...scores) - Math.min(...scores);
  const consistencyPenalty = Math.min(25, spread * 0.35);

  return Math.max(0, Math.min(100, average - consistencyPenalty));
}