import {
  rankTopSetupCandidates,
  type TopSetupRankCandidate,
} from "@/lib/today/topSetupRanking";

export type MarketPhase =
  | "premarket"
  | "open"
  | "midday"
  | "close"
  | "postmarket";

export type { TopSetupRankCandidate };

export function rankTopSetups<T extends TopSetupRankCandidate>(
  candidates: T[],
  _phase?: MarketPhase
): T[] {
  return rankTopSetupCandidates(candidates);
}

export function buildSetupReasonLine(item: {
  rvol?: number | null;
  changePct?: number | null;
  hasNews?: boolean;
  hasEarnings?: boolean;
}) {
  const parts: string[] = [];

  const rvol =
    typeof item.rvol === "number" && Number.isFinite(item.rvol)
      ? item.rvol
      : null;

  const changePct =
    typeof item.changePct === "number" && Number.isFinite(item.changePct)
      ? item.changePct
      : null;

  if (rvol != null && rvol > 0) {
    parts.push(`RVOL ${rvol.toFixed(1)}x`);
  }

  if (changePct != null) {
    parts.push(`${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}% move`);
  }

  if (item.hasEarnings) {
    parts.push("Earnings catalyst");
  } else if (item.hasNews) {
    parts.push("News catalyst");
  } else {
    parts.push("Flow setup");
  }

  return parts.join(" • ");
}