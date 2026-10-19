import type { AMSAPulseSnapshot } from "../types";

export const PULSE_ALERT_PREFERENCE_KEY = "signalos.pulse.alerts.enabled.v1";
export const PULSE_ALERT_PREFERENCE_EVENT = "signalos:pulse-alerts-changed";
export const PULSE_ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function distinctVerifiedStockReadings(snapshots: AMSAPulseSnapshot[]): AMSAPulseSnapshot[] {
  const readings = new Map<string, AMSAPulseSnapshot>();
  for (const snapshot of [...snapshots].sort((first, second) =>
    Date.parse(first.calculatedAt) - Date.parse(second.calculatedAt),
  )) {
    if (snapshot.entityType !== "stock" || snapshot.frequency !== "daily" ||
        snapshot.metadata?.verified !== true || typeof snapshot.score !== "number" ||
        !Number.isFinite(snapshot.score) || snapshot.score < 0 || snapshot.score > 100 ||
        !snapshot.sourceUpdatedAt || !Number.isFinite(Date.parse(snapshot.sourceUpdatedAt)) ||
        !Number.isFinite(Date.parse(snapshot.calculatedAt))) continue;
    readings.set(`${snapshot.entityKey}:${Date.parse(snapshot.sourceUpdatedAt)}`, snapshot);
  }
  return [...readings.values()].sort((first, second) =>
    Date.parse(first.sourceUpdatedAt!) - Date.parse(second.sourceUpdatedAt!),
  );
}

export function isMeaningfulPulseChange(
  previous: AMSAPulseSnapshot,
  current: AMSAPulseSnapshot,
  lastNotifiedAt: number | null,
  now: number,
): boolean {
  const verified = distinctVerifiedStockReadings([previous, current]);
  return verified.length === 2 && verified[1] === current &&
    previous.entityKey === current.entityKey &&
    Math.abs(current.score! - previous.score!) >= 5 &&
    Date.parse(current.sourceUpdatedAt!) <= now &&
    (lastNotifiedAt === null || now - lastNotifiedAt >= PULSE_ALERT_COOLDOWN_MS);
}