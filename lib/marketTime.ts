export function formatMarketClockTime(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleString("en-US", {
    timeZone: MARKET_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
}
export const MARKET_TZ = "America/New_York";

export function formatMarketTime(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleString("en-US", {
    timeZone: MARKET_TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
