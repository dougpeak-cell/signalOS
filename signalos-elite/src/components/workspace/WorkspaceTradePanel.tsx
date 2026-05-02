import Link from "next/link";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";

type WorkspaceTradePanelProps = {
  ticker: string;
  inWatchlist: boolean;
  inPortfolio: boolean;
  openChartHref: string;
  onAnalyzeWithSigi: () => void;
  onAddWatchlist: () => void;
  onAddTrade: () => void;
};

export default function WorkspaceTradePanel({
  ticker,
  inWatchlist,
  inPortfolio,
  openChartHref,
  onAnalyzeWithSigi,
  onAddWatchlist,
  onAddTrade,
}: WorkspaceTradePanelProps) {
  return (
    <WorkspacePanel title="Trade Actions">
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onAnalyzeWithSigi}
          className="inline-flex items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-3 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/15 hover:text-white"
        >
          Analyze with Sigi
        </button>
        <button
          type="button"
          onClick={onAddWatchlist}
          className={`inline-flex items-center justify-center rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
            inWatchlist
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
              : "border-white/10 bg-white/5 text-white/78 hover:border-white/20 hover:bg-white/8 hover:text-white"
          }`}
        >
          {inWatchlist ? "Tracked in Watchlist" : "Add Watchlist"}
        </button>
        <button
          type="button"
          onClick={onAddTrade}
          className={`inline-flex items-center justify-center rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
            inPortfolio
              ? "border-amber-400/22 bg-amber-400/10 text-amber-200"
              : "border-white/10 bg-white/5 text-white/78 hover:border-white/20 hover:bg-white/8 hover:text-white"
          }`}
        >
          {inPortfolio ? "Trade Added" : "Add Trade"}
        </button>
        <Link
          href={openChartHref}
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-white/78 transition hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-white"
        >
          Open Chart
        </Link>
      </div>
    </WorkspacePanel>
  );
}