export type DataState = "loading" | "ready" | "empty" | "error";

export function isStale(updatedAt: string, maxAgeMinutes = 15) {
  const updated = new Date(updatedAt).getTime();
  const age = Date.now() - updated;

  return age > maxAgeMinutes * 60_000;
}