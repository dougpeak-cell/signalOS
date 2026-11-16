import { NextRequest } from "next/server";
import { getFmpBars } from "@/lib/market/fmpData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const ticker = req.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) return Response.json({ error: "Ticker is required." }, { status: 400 });
  if (!process.env.FMP_API_KEY) return Response.json({ error: "FMP_API_KEY is not configured." }, { status: 503 });
  const encoder = new TextEncoder();
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    req.signal.removeEventListener("abort", cleanup);
    controller?.close();
  };
  const send = (payload: unknown) => {
    if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
  };
  const stream = new ReadableStream<Uint8Array>({
    start(target) {
      controller = target;
      req.signal.addEventListener("abort", cleanup, { once: true });
      if (req.signal.aborted) { cleanup(); return; }
      send({ type: "status", provider: "fmp", message: "FMP minute candles; refreshes every 30 seconds. Tick trades and order-book quotes unavailable." });
      const poll = async () => {
        try {
          const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
          const bars = await getFmpBars(ticker, today, today, "1m");
          for (const { timestamp, ...bar } of bars.slice(-2)) {
            send({ type: "bar", ticker, provider: "fmp", time: timestamp / 1000, ...bar });
          }
        } catch (error) {
          send({ type: "error", message: error instanceof Error ? error.message : "FMP minute candles unavailable." });
        }
        if (!closed) timer = setTimeout(poll, 30_000);
      };
      void poll();
    },
    cancel() {
      closed = true;
      clearTimeout(timer);
      req.signal.removeEventListener("abort", cleanup);
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
