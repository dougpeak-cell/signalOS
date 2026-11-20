import type { Stage } from "@/lib/pullback/engine";
import type { PullbackEvent, PullbackFeed } from "@/lib/pullback/types";

export function pullbackStageLabel(stage: Stage): string {
  return stage === "early" ? "Early Signal" : stage === "analyst" ? "Analyst Support" : "Price & Volume";
}

export function activePullbackEvents(feed: PullbackFeed): PullbackEvent[] {
  return feed.events.filter((event) => {
    const watch = feed.watches.find((entry) => entry.symbol === event.symbol);
    return watch?.notify && watch.notify_since != null &&
      Date.parse(event.created_at) >= Date.parse(watch.notify_since);
  });
}

export function headerPullbackEvent(events: readonly PullbackEvent[]): PullbackEvent | null {
  const confirmed = events.filter((event) => event.stage === "price-volume");
  return latestPullbackEvent(confirmed.length ? confirmed : events);
}

export function evidenceHref(symbol: string, stage: Stage, event?: PullbackEvent): string {
  const params = new URLSearchParams({ symbol, pullbackWatch: "1", stage });
  if (event) params.set("event", event.id);
  if (process.env.NODE_ENV !== "production") params.set("previewPlan", "pro");
  return `/vision?${params}`;
}

export function latestPullbackEvent(events: readonly PullbackEvent[]): PullbackEvent | null {
  return events.reduce<PullbackEvent | null>((latest, event) => {
    if (!latest || Date.parse(event.created_at) > Date.parse(latest.created_at) ||
      (event.created_at === latest.created_at &&
        (event.stage === "price-volume" || (event.stage === "analyst" && latest.stage === "early")))) return event;
    return latest;
  }, null);
}

export function pullbackPreviewHeaders(): Record<string, string> {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return {};
  const tier = new URLSearchParams(window.location.search).get("previewPlan");
  return tier && ["free", "smart", "pro"].includes(tier) ? { "x-signalos-preview-plan": tier } : {};
}
