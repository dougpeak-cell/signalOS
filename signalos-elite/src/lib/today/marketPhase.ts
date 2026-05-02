import type { MarketPhase } from "@/lib/today/topSetups";

export function isPreMarketNow() {
  const now = new Date();

  const eastern = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );

  const hour = eastern.getHours();
  const minute = eastern.getMinutes();
  const totalMinutes = hour * 60 + minute;

  return totalMinutes >= 240 && totalMinutes < 570;
}

export function getCurrentMarketPhase(): MarketPhase {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = formatter.formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const totalMinutes = hour * 60 + minute;

  const isWeekend = weekday === "Sat" || weekday === "Sun";
  if (isWeekend) return "postmarket";
  if (isPreMarketNow()) return "premarket";
  if (totalMinutes >= 9 * 60 + 30 && totalMinutes < 10 * 60 + 30) return "open";
  if (totalMinutes >= 10 * 60 + 30 && totalMinutes < 15 * 60) return "midday";
  if (totalMinutes >= 15 * 60 && totalMinutes < 16 * 60) return "close";
  return "postmarket";
}