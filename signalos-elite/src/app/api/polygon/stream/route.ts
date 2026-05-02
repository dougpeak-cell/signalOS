import { NextRequest } from "next/server";
import WebSocket from "ws";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

function sse(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = String(searchParams.get("ticker") ?? "").toUpperCase().trim();

  if (!POLYGON_API_KEY) {
    return new Response(sse({ type: "error", message: "Missing POLYGON_API_KEY" }), {
      status: 500,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  if (!ticker) {
    return new Response(sse({ type: "error", message: "Ticker is required." }), {
      status: 400,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const encoder = new TextEncoder();
  let ws: WebSocket | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

   const safeEnqueue = (payload: string) => {
     if (closed || !controllerRef) return;
     try {
       controllerRef.enqueue(encoder.encode(payload));
     } catch {
       cleanup(); // IMPORTANT: fully cleanup instead of just setting closed
     }
   };

  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

  const cleanup = () => {
    if (closed) return;
    closed = true;

    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }

    try {
      ws?.close();
    } catch {}

    ws = null;

    try {
      controllerRef?.close();
    } catch {}

    controllerRef = null;
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;

      safeEnqueue(`: connected\n\n`);

      ws = new WebSocket("wss://socket.massive.com/stocks");

      ws.on("open", () => {
        if (closed) return;
        try {
          ws?.send(JSON.stringify({ action: "auth", params: POLYGON_API_KEY }));
        } catch {
          cleanup();
        }
      });

      ws.on("message", (raw) => {
        if (closed) return;

        try {
          const text = raw.toString();
          const messages = JSON.parse(text);

          if (!Array.isArray(messages)) return;

          for (const msg of messages) {
            if (closed) return;

            const ev = String(msg?.ev ?? "");

            if (ev === "status") {
              safeEnqueue(
                sse({
                  type: "status",
                  status: msg?.status ?? null,
                  message: msg?.message ?? null,
                })
              );

              const statusText = String(msg?.message ?? msg?.status ?? "").toLowerCase();
              const authenticated =
                statusText.includes("auth") ||
                statusText.includes("authenticated") ||
                statusText.includes("connected successfully");

              if (authenticated && ws?.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    action: "subscribe",
                    params: `AM.${ticker},T.${ticker},Q.${ticker}`,
                  })
                );
              }

              continue;
            }

            if (ev === "Q") {
              safeEnqueue(
                sse({
                  type: "quote",
                  ticker: msg?.sym ?? ticker,
                  bid: Number(msg?.bp ?? 0),
                  ask: Number(msg?.ap ?? 0),
                  time: Math.floor(Number(msg?.t ?? Date.now()) / 1000),
                })
              );
              continue;
            }

            if (ev === "AM") {
              safeEnqueue(
                sse({
                  type: "bar",
                  ticker: msg?.sym ?? ticker,
                  time: Math.floor(Number(msg?.s ?? Date.now()) / 1000),
                  open: Number(msg?.o ?? 0),
                  high: Number(msg?.h ?? 0),
                  low: Number(msg?.l ?? 0),
                  close: Number(msg?.c ?? 0),
                  volume: Number(msg?.v ?? 0),
                })
              );
              continue;
            }

            if (ev === "T") {
              safeEnqueue(
                sse({
                  type: "trade",
                  ticker: msg?.sym ?? ticker,
                  price: Number(msg?.p ?? 0),
                  size: Number(msg?.s ?? 0),
                  time: Math.floor(Number(msg?.t ?? Date.now()) / 1000),
                })
              );
            }
          }
        } catch (error) {
          safeEnqueue(
            sse({
              type: "error",
              message: error instanceof Error ? error.message : "Stream parse error",
            })
          );
        }
      });

      ws.on("error", (error) => {
        if (closed) return;
        safeEnqueue(
          sse({
            type: "error",
            message: error instanceof Error ? error.message : "WebSocket error",
          })
        );
      });

      ws.on("close", () => {
        cleanup();
      });

      heartbeat = setInterval(() => {
        safeEnqueue(`: ping\n\n`);
      }, 15000);
    },

    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}