import Link from "next/link";
import DayChartClient from "@/components/stocks/DayChartClient";
import { fetchSignalByTicker } from "@/lib/queries/signals";
import type { JSX } from "react";

export default async function StockDayPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<JSX.Element> {
  const { ticker } = await params;
  const symbol: string = String(ticker ?? "").toUpperCase().trim();
  const row = await fetchSignalByTicker(symbol);

  if (!row) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <div className="text-sm text-neutral-400">Stock not found</div>
            <div className="mt-3">
              <Link
                href="/"
                className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-200"
              >
                Back to Today
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <DayChartClient
        ticker={row.ticker}
        companyName={row.company_name}
      />
    </main>
  );
}