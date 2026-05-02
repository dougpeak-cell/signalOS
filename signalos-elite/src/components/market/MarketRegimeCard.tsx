"use client";

import { useMemo } from "react";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";
import {
  computeMarketRegime,
  getMarketRegimeTone,
  type MacroQuote,
} from "@/lib/market/regime";

type LiveMacroSource = {
  ticker: string;
  price?: number | null;
  change?: number | null;
  changePct?: number | null;
};

function toMacroQuote(quote: LiveMacroSource | undefined): MacroQuote | null {
  if (!quote) return null;

  return {
    ticker: quote.ticker,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePct,
  };
}

export function MarketRegimeCard() {
  const { quoteMap } = useLiveMarket();

  const marketRegime = useMemo(() => {
    const macroQuotes = [
      toMacroQuote(quoteMap["^GSPC"]),
      toMacroQuote(quoteMap["^VIX"] ?? quoteMap["VIX"]),
      toMacroQuote(quoteMap["^TNX"] ?? quoteMap["TNX"]),
    ].filter((quote): quote is MacroQuote => quote !== null);

    return computeMarketRegime(macroQuotes);
  }, [quoteMap]);

  const regimeTone = getMarketRegimeTone(marketRegime.regime);

  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">
        Regime
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div
          className={[
            "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold",
            regimeTone.badge,
          ].join(" ")}
        >
          <span className={["h-2 w-2 rounded-full", regimeTone.dot].join(" ")} />
          {marketRegime.regime}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65">
          Score {marketRegime.score > 0 ? `+${marketRegime.score}` : marketRegime.score}
        </div>
      </div>

      <div className="mt-3 text-[11px] text-white/45">
        {marketRegime.reasons.slice(0, 3).join(" · ") || "Macro mixed"}
      </div>
    </div>
  );
}