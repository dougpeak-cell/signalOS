// Compute hit and error for a prediction
// hit = Math.abs(actual - predicted) <= threshold
// error = Math.abs(actual - predicted)

export function computeHitAndError(predicted: number | null | undefined, actual: number | null | undefined, threshold: number = 2): { hit: boolean | null, error: number | null } {
  if (!Number.isFinite(predicted) || !Number.isFinite(actual)) {
    return { hit: null, error: null };
  }
  const error = Math.abs(Number(actual) - Number(predicted));
  const hit = error <= threshold;
  return { hit, error };
}
