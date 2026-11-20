import type { Evaluation, Firm, Stage } from "@/lib/pullback/engine";

export type EarlySignal = {
  id: string;
  kind: "analyst-upgrade" | "hedge-fund" | "senator" | "insider";
  title: string;
  source: string;
  publishedAt: string;
  dateOnly: boolean;
  details: string;
  filingUrl: string | null;
};
export type EarlyEvidence = { since: string; signals: EarlySignal[]; warnings: string[] };
export type PullbackItem = {
  symbol: string; trustedFirms: readonly Firm[]; evaluation: Evaluation; warnings: string[]; coverage: Firm[];
  early?: EarlyEvidence;
};
export type PullbackEvent = {
  id: string; symbol: string; pullback_id: string; stage: Stage; created_at: string; evidence: PullbackItem;
};
export type PullbackWatch = {
  symbol: string; trusted_firms: Firm[]; notify: boolean; notify_since: string | null; snapshot: PullbackItem | null;
};
export type PullbackFeed = { watches: PullbackWatch[]; events: PullbackEvent[] };
