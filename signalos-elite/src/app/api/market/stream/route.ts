import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QuoteRow = {
  ticker?: string;
  price?: number | null;
  currentPrice?: number | null;
  changePercent?: number | null;
  changePct?: number | null;
  changesPercentage?: number | null;
};

type QuoteMap = Record<
  string,
  {
    ticker: string;
    price?: number | null;
    currentPrice?: number | null;
    changePercent?: number | null;
    updatedAt?: number | null;
  }
>;

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function sseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function fetchQuotes(origin: string, tickers: string[]) {
  const unique = [...new Set(tickers.map(normalizeTicker).filter(Boolean))];
  if (!unique.length) return [];

  try {
    const res = await fetch(
      `${origin}/api/quotes?tickers=${encodeURIComponent(unique.join(","))}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!res.ok) return [];

    const json: { quotes?: QuoteRow[] } = await res.json();
    return Array.isArray(json?.quotes) ? json.quotes : [];
  } catch {
    return [];
  }
}

function isStreamQuote(
  row: QuoteMap[string] | null
): row is QuoteMap[string] {
  return row !== null;
}

function rowsToQuoteMap(rows: QuoteRow[]): QuoteMap {
  const next: QuoteMap = {};

  for (const row of rows) {
    const ticker = normalizeTicker(String(row?.ticker ?? ""));
    if (!ticker) continue;

    next[ticker] = {
      ticker,
      price: getNumber(row?.price),
      currentPrice:
        getNumber(row?.currentPrice) ?? getNumber(row?.price),
      changePercent:
        getNumber(row?.changePercent) ??
        getNumber(row?.changePct) ??
        getNumber(row?.changesPercentage),
      updatedAt: Date.now(),
    };
  }

  return next;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);

  const tickersParam = searchParams.get("tickers") ?? "";

  const criticalTickers = [...new Set(
    tickersParam
      .split(",")
      .map(normalizeTicker)
      .filter(Boolean)
  )].slice(0, 75);
  const allTickers = criticalTickers;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (event: string, payload: unknown) => {
        if (closed) return;

        try {
          controller.enqueue(encoder.encode(sseEvent(event, payload)));
        } catch {
          closed = true;
        }
      };

      send("ready", {
        ok: true,
        tickers: criticalTickers,
        startedAt: Date.now(),
      });

      const heartbeat = setInterval(() => {
        send("heartbeat", {
          ts: Date.now(),
        });
      }, 15000);

      const pushSnapshot = async () => {
        const rows = await fetchQuotes(origin, allTickers);
        if (closed) return;

        const quotes = rows
          .map((row: QuoteRow) => {
            const ticker = normalizeTicker(String(row?.ticker ?? ""));
            if (!ticker) return null;

            return {
              ticker,
              price: getNumber(row?.price),
              currentPrice:
                getNumber(row?.currentPrice) ?? getNumber(row?.price),
              changePercent:
                getNumber(row?.changePercent) ??
                getNumber(row?.changePct) ??
                getNumber(row?.changesPercentage),
              updatedAt: Date.now(),
            };
          })
          .filter(isStreamQuote);

        send("quote_batch", {
          quotes: quotes.filter((row) =>
            criticalTickers.includes(normalizeTicker(String(row?.ticker ?? "")))
          ),
          updatedAt: Date.now(),
        });
      };

      await pushSnapshot();

      const snapshotInterval = setInterval(async () => {
        await pushSnapshot();
      }, 5000);

      const abort = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearInterval(snapshotInterval);
        try {
          controller.close();
        } catch {}
      };

      req.signal.addEventListener("abort", abort);
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
