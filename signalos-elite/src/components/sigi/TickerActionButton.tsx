"use client";

import type { ReactNode } from "react";

import { useGlobalTicker } from "@/components/sigi/GlobalTickerContext";

export default function TickerActionButton({
  ticker,
  children,
  className = "",
}: {
  ticker: string;
  children?: ReactNode;
  className?: string;
}) {
  const { analyzeTicker } = useGlobalTicker();

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        analyzeTicker(ticker);
      }}
      className={[
        "cursor-pointer underline decoration-cyan-300/35 underline-offset-4 transition hover:text-cyan-200 hover:decoration-cyan-200",
        className,
      ].join(" ")}
    >
      {children ?? ticker}
    </button>
  );
}