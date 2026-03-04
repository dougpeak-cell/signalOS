export function computeConfidenceFromMinutes(minutes?: number | null) {
  const m = Number(minutes ?? 0);

  if (m >= 32) return 0.82; // 🔥 Lock
  if (m >= 28) return 0.72; // 🟡 Good
  if (m >= 24) return 0.62; // 🟡 Good (lower)
  return 0.5;               // 🧊 Risky
}

export function computeConfidence(player: any) {
  const minutes =
    player?.minutes ??
    player?.projection?.minutes ??
    player?.pred?.minutes ??
    player?.prediction?.minutes;

  return computeConfidenceFromMinutes(minutes);
}

// DB-driven helpers (what the UI should use)
export function isLock(conf: number | null | undefined) {
  const v = Number(conf);
  return Number.isFinite(v) && v >= 0.75;
}

export function confPct(conf: number | null | undefined) {
  const v = Number(conf);
  if (!Number.isFinite(v)) return "—";
  return `${Math.round(v * 100)}%`;
}
