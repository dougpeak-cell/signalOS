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

function getDateKey(ts: number) {
  const d = new Date(ts * 1000);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMinutesOfDay(ts: number) {
  const d = new Date(ts * 1000);
  return d.getHours() * 60 + d.getMinutes();
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
