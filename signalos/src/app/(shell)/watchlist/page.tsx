import WatchlistPageClient from "@/components/watchlist/WatchlistPageClient";
import { getQuotePrice } from "@/lib/market/quotes";
import { fetchLatestSignalRows } from "@/lib/queries/signals";
import {
  convictionToPct,
  signalToneFromTargets,
} from "@/lib/signalUtils";

function signalLabelFromBias(
  bias: "bullish" | "neutral" | "bearish" | null | undefined
): "Bullish" | "Neutral" | "Bearish" {
  if (bias === "bullish") return "Bullish";
  if (bias === "bearish") return "Bearish";
  return "Neutral";
}

export default async function WatchlistPage() {
  const rows = await fetchLatestSignalRows(100);

  const allStocks = rows.map((row, index) => {
    const rawConviction = convictionToPct(row.conviction) ?? 0;

    const conviction =
      rawConviction >= 95
        ? 92 + (rawConviction - 95) * 0.4
        : rawConviction >= 85
          ? 84 + (rawConviction - 85) * 0.8
          : rawConviction >= 70
            ? 68 + (rawConviction - 70) * 1.0
            : rawConviction;

    const fallbackPrice = getQuotePrice(row.ticker) ?? null;
    const bias = signalToneFromTargets(fallbackPrice, row.target_price);
    const signal = signalLabelFromBias(bias);

    return {
      id: `${row.ticker}-${row.as_of_date ?? index}`,
      ticker: row.ticker,
      company: row.company_name ?? row.ticker,
      sector: row.sector ?? "Market",
      price: fallbackPrice,
      conviction,
      signal,
      thesis:
        row.thesis?.trim() ||
        "Institutional participation and signal structure are being monitored.",
      href: `/stocks/${row.ticker}`,
      liveHref: `/stocks/${row.ticker}/live`,
    };
  });

  return <WatchlistPageClient allStocks={allStocks} />;
}