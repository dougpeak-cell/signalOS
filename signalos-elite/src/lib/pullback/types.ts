import type { Evaluation, Firm, Stage } from "@/lib/pullback/engine";

export type PullbackItem = { symbol: string; trustedFirms: readonly Firm[]; evaluation: Evaluation; warnings: string[]; coverage: Firm[] };
export type PullbackEvent = {
  id: string; symbol: string; pullback_id: string; stage: Stage; created_at: string; evidence: PullbackItem;
};
export type PullbackWatch = {
  symbol: string; trusted_firms: Firm[]; notify: boolean; snapshot: PullbackItem | null;
};
export type PullbackFeed = { watches: PullbackWatch[]; events: PullbackEvent[] };
