export type BaseBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type SessionLevels = {
  premarketHigh: number | null;
  premarketLow: number | null;
  sessionHigh: number | null;
  sessionLow: number | null;
  previousDayHigh: number | null;
  previousDayLow: number | null;
};

export type StockSessionSummary = {
  regularClose: number | null;
  regularCloseTime: number | null;
  previousClose: number | null;
  premarketPrice: number | null;
  premarketTime: number | null;
  afterHoursPrice: number | null;
  afterHoursTime: number | null;
};

const marketDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getMarketDateAndMinutes(ts: number) {
  const parts = marketDateTimeFormatter.formatToParts(new Date(ts * 1000));
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return {
    dateKey: `${values.get("year")}-${values.get("month")}-${values.get("day")}`,
    minutesOfDay:
      Number(values.get("hour") ?? 0) * 60 + Number(values.get("minute") ?? 0),
  };
}

function getDateKey(ts: number) {
  return getMarketDateAndMinutes(ts).dateKey;
}

function getMinutesOfDay(ts: number) {
  return getMarketDateAndMinutes(ts).minutesOfDay;
}

export function isExtendedSessionTimestamp(ts: number): boolean {
  const minutes = getMinutesOfDay(ts);
  return minutes >= 4 * 60 && minutes < 9 * 60 + 30 ||
    minutes >= 16 * 60 && minutes < 20 * 60;
}

export function isPremarketTimestamp(ts: number): boolean {
  const minutes = getMinutesOfDay(ts);
  return minutes >= 4 * 60 && minutes < 9 * 60 + 30;
}

export function getStockSessionSummary(bars: BaseBar[]): StockSessionSummary {
  const sorted = [...bars].sort((left, right) => left.time - right.time);
  if (!sorted.length) {
    return {
      regularClose: null,
      regularCloseTime: null,
      previousClose: null,
      premarketPrice: null,
      premarketTime: null,
      afterHoursPrice: null,
      afterHoursTime: null,
    };
  }

  const latestDateKey = getDateKey(sorted[sorted.length - 1].time);
  const dateKeys = Array.from(new Set(sorted.map((bar) => getDateKey(bar.time))));
  const regularDateKeys = dateKeys.filter((dateKey) =>
    sorted.some((bar) => {
      const marketTime = getMarketDateAndMinutes(bar.time);
      return marketTime.dateKey === dateKey &&
        marketTime.minutesOfDay >= 9 * 60 + 30 &&
        marketTime.minutesOfDay < 16 * 60;
    }),
  );
  const latestRegularDateKey = regularDateKeys.at(-1) ?? null;
  const previousRegularDateKey = regularDateKeys.at(-2) ?? null;
  const latestRegularBars = latestRegularDateKey
    ? sorted.filter((bar) => {
        const { dateKey, minutesOfDay } = getMarketDateAndMinutes(bar.time);
        return dateKey === latestRegularDateKey && minutesOfDay >= 9 * 60 + 30 && minutesOfDay < 16 * 60;
      })
    : [];
  const previousRegularBars = previousRegularDateKey
    ? sorted.filter((bar) => {
        const { dateKey, minutesOfDay } = getMarketDateAndMinutes(bar.time);
        return dateKey === previousRegularDateKey && minutesOfDay >= 9 * 60 + 30 && minutesOfDay < 16 * 60;
      })
    : [];
  const premarketBars = sorted.filter((bar) => {
    const { dateKey, minutesOfDay } = getMarketDateAndMinutes(bar.time);
    return dateKey === latestDateKey && minutesOfDay >= 4 * 60 && minutesOfDay < 9 * 60 + 30;
  });
  const afterHoursBars = sorted.filter((bar) => {
    const { minutesOfDay } = getMarketDateAndMinutes(bar.time);
    return minutesOfDay >= 16 * 60 && minutesOfDay < 20 * 60;
  });
  const regularCloseBar = latestRegularBars.at(-1) ?? null;
  const previousCloseBar = previousRegularBars.at(-1) ?? null;
  const premarketBar = premarketBars.at(-1) ?? null;
  const afterHoursBar = afterHoursBars.at(-1) ?? null;

  return {
    regularClose: regularCloseBar?.close ?? null,
    regularCloseTime: regularCloseBar?.time ?? null,
    previousClose: previousCloseBar?.close ?? null,
    premarketPrice: premarketBar?.close ?? null,
    premarketTime: premarketBar?.time ?? null,
    afterHoursPrice: afterHoursBar?.close ?? null,
    afterHoursTime: afterHoursBar?.time ?? null,
  };
}

function maxHigh(bars: BaseBar[]) {
  if (!bars.length) return null;
  return Math.max(...bars.map((b) => b.high));
}

function minLow(bars: BaseBar[]) {
  if (!bars.length) return null;
  return Math.min(...bars.map((b) => b.low));
}

export function getSessionLevels(bars: BaseBar[]): SessionLevels {
  if (!bars.length) {
    return {
      premarketHigh: null,
      premarketLow: null,
      sessionHigh: null,
      sessionLow: null,
      previousDayHigh: null,
      previousDayLow: null,
    };
  }

  const sorted = [...bars].sort((a, b) => a.time - b.time);
  const latestDateKey = getDateKey(sorted[sorted.length - 1].time);

  const todayBars = sorted.filter((b) => getDateKey(b.time) === latestDateKey);

  const priorBars = sorted.filter((b) => getDateKey(b.time) !== latestDateKey);

  const previousDateKey =
    priorBars.length > 0 ? getDateKey(priorBars[priorBars.length - 1].time) : null;

  const previousDayBars = previousDateKey
    ? priorBars.filter((b) => getDateKey(b.time) === previousDateKey)
    : [];

  // US market convention:
  // Premarket: 04:00-09:29
  // Regular session: 09:30-16:00
  const premarketBars = todayBars.filter((b) => {
    const mins = getMinutesOfDay(b.time);
    return mins >= 4 * 60 && mins < 9 * 60 + 30;
  });

  const regularSessionBars = todayBars.filter((b) => {
    const mins = getMinutesOfDay(b.time);
    return mins >= 9 * 60 + 30 && mins <= 16 * 60;
  });

  return {
    premarketHigh: maxHigh(premarketBars),
    premarketLow: minLow(premarketBars),
    sessionHigh: maxHigh(regularSessionBars),
    sessionLow: minLow(regularSessionBars),
    previousDayHigh: maxHigh(previousDayBars),
    previousDayLow: minLow(previousDayBars),
  };
}
