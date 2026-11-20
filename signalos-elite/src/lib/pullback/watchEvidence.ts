import type { PullbackItem, PullbackWatch } from "./types";

export function matchingSnapshot(watch: PullbackWatch): PullbackItem | null {
  const item = watch.snapshot;
  if (item?.symbol !== watch.symbol || !Number.isFinite(Date.parse(item.evaluation?.evaluatedAt)) ||
    !Array.isArray(item.trustedFirms) || item.trustedFirms.length !== watch.trusted_firms.length ||
    !watch.trusted_firms.every((firm) => item.trustedFirms.includes(firm))) return null;
  if (watch.notify ? !item.early || !watch.notify_since ||
    Date.parse(item.early.since) !== Date.parse(watch.notify_since) : item.early != null) return null;
  return item;
}

export function isRecentSnapshot(item: PullbackItem, now: number): boolean {
  const age = now - Date.parse(item.evaluation.evaluatedAt);
  return age >= 0 && age < 30_000;
}

export async function refreshWatchEvidence(
  symbols: readonly string[], watches: PullbackWatch[], signal: AbortSignal,
  fetchItem: (symbol: string) => Promise<PullbackItem>, publish: (rows: PullbackItem[]) => void,
  onError: (symbol: string, error: unknown) => void,
): Promise<void> {
  const rows = new Map<string, PullbackItem>();
  const now = Date.now();
  for (const watch of watches) {
    const snapshot = matchingSnapshot(watch);
    if (snapshot) rows.set(watch.symbol, snapshot);
  }
  const emit = () => publish(symbols.flatMap((symbol) => rows.get(symbol) ?? []));
  if (signal.aborted) return;
  emit();
  const pending = symbols.filter((symbol) => {
    const item = rows.get(symbol);
    return !item || !isRecentSnapshot(item, now);
  }).values();
  async function worker(): Promise<void> {
    for (const symbol of pending) {
      if (signal.aborted) return;
      try {
        const item = await fetchItem(symbol);
        if (signal.aborted) return;
        rows.set(symbol, item);
        emit();
      } catch (error) {
        if (!signal.aborted) onError(symbol, error);
      }
    }
  }
  await Promise.all([worker(), worker()]);
}
