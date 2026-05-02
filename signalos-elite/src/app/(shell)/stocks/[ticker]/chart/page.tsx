import Link from "next/link";
import { fetchSignalByTicker } from "@/lib/queries/signals";
import StockChartClient from "./StockChartClient";

export default async function StockChartPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const symbol = String(ticker ?? "").toUpperCase().trim();
  const row = await fetchSignalByTicker(symbol);

  if (!row) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/watchlist"
            className="text-sm text-neutral-400 transition hover:text-white"
          >
            Back to Watchlist
          </Link>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8">
            <div className="text-sm uppercase tracking-[0.2em] text-neutral-500">
              Symbol not found
            </div>
            <h1 className="mt-3 text-3xl font-semibold">{symbol}</h1>
            <p className="mt-3 max-w-xl text-sm text-neutral-400">
              We could not find this ticker in the current signals table.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const stock = {
    ticker: row.ticker,
    name: row.company_name ?? "Company",
  };

  return <StockChartClient stock={stock} />;
}
