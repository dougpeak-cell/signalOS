export type HistoryBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function rangeToDays(range: string) {
  switch (range) {
    case "1mo":
      return 30;
    case "3mo":
      return 90;
    case "6mo":
      return 180;
    case "1y":
      return 365;
    default:
      return 180;
  }
}

export async function getHistoryBars(
  ticker: string,
  range = "6mo"
): Promise<HistoryBar[]> {
  const normalizedTicker = ticker.trim().toUpperCase();
  const apiKey =
    process.env.MASSIVE_API_KEY ||
    process.env.NEXT_PUBLIC_MASSIVE_API_KEY ||
    "";

  if (!normalizedTicker || !apiKey) {
    return [];
  }

  const days = rangeToDays(range);
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days);

  const url = `https://api.massive.com/v2/aggs/ticker/${encodeURIComponent(normalizedTicker)}/range/1/day/${formatDate(from)}/${formatDate(to)}?adjusted=true&sort=asc&limit=5000&apiKey=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return [];
    }

    const data = (await res.json()) as { results?: Array<Record<string, unknown>> };

    return (data.results ?? []).map((item) => ({
      date: new Date(Number(item.t)).toISOString().slice(0, 10),
      open: Number(item.o ?? 0),
      high: Number(item.h ?? 0),
      low: Number(item.l ?? 0),
      close: Number(item.c ?? 0),
      volume: Number(item.v ?? 0),
    }));
  } catch {
    return [];
  }
}