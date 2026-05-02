import Link from "next/link";
import SigiMiniPanel from "@/components/sigi/SigiMiniPanel";
import { SigiPanelProvider } from "@/components/sigi/SigiPanelContext";
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

  return (
    <main className="min-h-screen bg-black text-white">
      <SigiPanelProvider>
        <DayChartClient
          ticker={row?.ticker ?? symbol}
          companyName={row?.company_name ?? null}
        />
        <SigiMiniPanel />
      </SigiPanelProvider>

      {!row ? (
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
            Day chart loaded from ticker fallback because no saved signal row was found for {symbol}.
            <div className="mt-3">
              <Link
                href={`/stocks/${symbol}`}
                className="rounded-full border border-white/10 bg-black/25 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                Back to Stock Detail
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}