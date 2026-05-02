"use client";

import type { ReactNode } from "react";
import TickerHover from "@/components/sigi/TickerHover";

const NON_TICKERS = new Set([
  "BEST",
  "NEWS",
  "LIVE",
  "OPEN",
  "VIEW",
  "HIGH",
  "LOW",
  "BUY",
  "SELL",
  "HOLD",
  "RISK",
  "FAST",
  "READ",
  "SETUP",
  "STOCK",
  "MARKET",
  "TODAY",
  "SIGI",
  "AI",
]);

export function renderTickerText(
  text: string,
  options?: { onTickerClick?: (ticker: string) => void }
): ReactNode {
  const parts = text.split(/\b([A-Z]{2,5})\b/g);

  return parts.map((part, index) => {
    const isTicker = /^[A-Z]{2,5}$/.test(part) && !NON_TICKERS.has(part);

    if (!isTicker) {
      return <span key={index}>{part}</span>;
    }

    if (options?.onTickerClick) {
      return (
        <button
          key={`${part}-${index}`}
          type="button"
          onClick={() => options.onTickerClick?.(part)}
          className="cursor-pointer underline decoration-cyan-400/40 underline-offset-2 hover:text-cyan-200"
        >
          {part}
        </button>
      );
    }

    return (
      <TickerHover key={`${part}-${index}`} ticker={part}>
        <span className="cursor-pointer underline decoration-cyan-400/40 underline-offset-2 hover:text-cyan-200">
          {part}
        </span>
      </TickerHover>
    );
  });
}

export function renderTickerParagraphs(
  text: string,
  options?: { onTickerClick?: (ticker: string) => void }
): ReactNode {
  return text.split("\n").map((line, index) => (
    <div key={index} className="leading-7">
      {renderTickerText(line, options)}
    </div>
  ));
}
