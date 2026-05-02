"use client";

import { useRouter } from "next/navigation";

type NewsTickerChipLinksProps = {
  tickers: string[];
  className: string;
  limit?: number;
};

function buildTickerHref(ticker: string) {
  const cleanTicker = String(ticker).trim().toUpperCase();
  return cleanTicker ? `/stocks/${cleanTicker}` : "/stocks";
}

export default function NewsTickerChipLinks({
  tickers,
  className,
  limit,
}: NewsTickerChipLinksProps) {
  const router = useRouter();
  const visibleTickers = typeof limit === "number" ? tickers.slice(0, limit) : tickers;

  return visibleTickers.map((ticker) => (
    <button
      key={ticker}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        router.push(buildTickerHref(ticker));
      }}
      className={className}
    >
      {ticker}
    </button>
  ));
}