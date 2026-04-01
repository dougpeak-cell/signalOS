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
    const conviction = convictionToPct(row.conviction) ?? 0;
    const price = getQuotePrice(row.ticker) ?? 0;
    const bias = signalToneFromTargets(price || null, row.target_price);
    const signal = signalLabelFromBias(bias);

    return {
      id: `${row.ticker}-${row.as_of_date ?? index}`,
      ticker: row.ticker,
      company: row.company_name ?? row.ticker,
      sector: row.sector ?? "Market",
      price,
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