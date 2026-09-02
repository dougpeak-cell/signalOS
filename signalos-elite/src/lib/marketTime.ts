export const MARKET_TZ = "America/New_York";
export const MARKET_TIME_ABBR = "ET";
export const MARKET_STANDARD_TIME_ABBR = "EST";

type MarketClockOptions = {
  includeSeconds?: boolean;
  includeZone?: boolean;
  unixUnit?: "seconds" | "milliseconds";
};

function formatMarketClockValue(
  value: number,
  {
    includeSeconds = false,
    includeZone = false,
    unixUnit = "seconds",
  }: MarketClockOptions = {}
) {
  const epochMs = unixUnit === "milliseconds" ? value : value * 1000;
  const formatted = new Date(epochMs).toLocaleString("en-US", {
    timeZone: MARKET_TZ,
    hour: "numeric",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" as const } : null),
  });

  return includeZone ? `${formatted} ${MARKET_TIME_ABBR}` : formatted;
}

export function formatMarketClockTime(unixSeconds: number) {
  return formatMarketClockValue(unixSeconds);
}

export function formatMarketClockTimeWithZone(unixSeconds: number) {
  return formatMarketClockValue(unixSeconds, { includeZone: true });
}

export function formatMarketClockTimeMs(
  epochMs: number,
  options?: Omit<MarketClockOptions, "unixUnit">
) {
  return formatMarketClockValue(epochMs, { ...options, unixUnit: "milliseconds" });
}

export function formatMarketTime(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleString("en-US", {
    timeZone: MARKET_TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
