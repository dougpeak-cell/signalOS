export type MarketSessionState =
  | "premarket"
  | "open"
  | "after-hours"
  | "closed";

export function getMarketSessionState(
  date = new Date(),
): MarketSessionState {
  const easternTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(
    easternTime.map((part) => [part.type, part.value]),
  );

  const weekday = values.weekday;
  const hour = Number(values.hour);
  const minute = Number(values.minute);
  const totalMinutes = hour * 60 + minute;

  if (weekday === "Sat" || weekday === "Sun") {
    return "closed";
  }

  if (totalMinutes >= 240 && totalMinutes < 570) {
    return "premarket";
  }

  if (totalMinutes >= 570 && totalMinutes < 960) {
    return "open";
  }

  if (totalMinutes >= 960 && totalMinutes < 1200) {
    return "after-hours";
  }

  return "closed";
}
