import type { Stage } from "@/lib/pullback/engine";
import type { PullbackEvent } from "@/lib/pullback/types";

export function evidenceHref(symbol: string, stage: Stage, event?: PullbackEvent): string {
  const params = new URLSearchParams({ symbol, pullbackWatch: "1", stage });
  if (event) params.set("event", event.id);
  if (process.env.NODE_ENV !== "production") params.set("previewPlan", "pro");
  return `/vision?${params}`;
}

export function latestPullbackEvent(events: readonly PullbackEvent[]): PullbackEvent | null {
  return events.reduce<PullbackEvent | null>((latest, event) => {
    if (!latest || Date.parse(event.created_at) > Date.parse(latest.created_at) ||
      (event.created_at === latest.created_at && event.stage === "price-volume")) return event;
    return latest;
  }, null);
}

export function pullbackPreviewHeaders(): Record<string, string> {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return {};
  const tier = new URLSearchParams(window.location.search).get("previewPlan");
  return tier && ["free", "smart", "pro"].includes(tier) ? { "x-signalos-preview-plan": tier } : {};
}
