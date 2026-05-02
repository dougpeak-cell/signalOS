export type ExecutionModelInput = {
  livePrice: number | null;
  tier: string | null;
  conviction: number | null;
  dbEntryLow?: number | null;
  dbEntryHigh?: number | null;
};

export type ExecutionModelOutput = {
  entryLow: number | null;
  entryHigh: number | null;
  stop: number | null;
};

export function buildExecutionModel({
  livePrice,
  tier,
  conviction,
  dbEntryLow,
  dbEntryHigh,
}: ExecutionModelInput): ExecutionModelOutput {
  if (livePrice == null || !Number.isFinite(livePrice) || livePrice <= 0) {
    return {
      entryLow: dbEntryLow ?? null,
      entryHigh: dbEntryHigh ?? null,
      stop: null,
    };
  }

  const normalizedTier = (tier ?? "").toLowerCase();
  const convictionScore =
    conviction == null ? 75 : conviction <= 1 ? conviction * 100 : conviction;

  const pullbackPct =
    normalizedTier === "elite"
      ? convictionScore >= 90
        ? 0.02
        : 0.025
      : normalizedTier === "strong"
        ? 0.035
        : 0.05;

  const entryHigh = Number((livePrice * (1 - pullbackPct * 0.35)).toFixed(2));
  const entryLow = Number((livePrice * (1 - pullbackPct)).toFixed(2));

  const stopBufferPct =
    normalizedTier === "elite"
      ? 0.035
      : normalizedTier === "strong"
        ? 0.045
        : 0.06;

  const stop = Number((entryLow * (1 - stopBufferPct)).toFixed(2));

  return {
    entryLow,
    entryHigh,
    stop,
  };
}