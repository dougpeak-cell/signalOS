"use client";

import { useEffect, useRef, useState } from "react";

type Tick = {
  price: number;
  timestamp: number;
};

export function useCryptoStream(symbol: string) {
  const [price, setPrice] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!symbol) return;

    const ws = new WebSocket("wss://socket.polygon.io/crypto");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          action: "auth",
          params: process.env.NEXT_PUBLIC_POLYGON_KEY,
        })
      );

      ws.send(
        JSON.stringify({
          action: "subscribe",
          params: `XQ.${symbol}USD`,
        })
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (Array.isArray(data)) {
        data.forEach((msg) => {
          if (msg.bp) {
            setPrice(msg.bp);
          }
        });
      }
    };

    return () => {
      ws.close();
    };
  }, [symbol]);

  return price;
}