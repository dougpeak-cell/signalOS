"use client";

import { useEffect, useMemo, useState } from "react";
import {
  hasInWatchlist,
  toggleWatchlistTicker,
  readWatchlist,
} from "@/lib/watchlist/localWatchlist";

export default function WatchlistToggleButton({
  ticker,
  defaultInWatchlist = false,
  compact = false,
}: {
  ticker: string;
  defaultInWatchlist?: boolean;
  compact?: boolean;
}) {
  const [inWatchlist, setInWatchlist] = useState(defaultInWatchlist);
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    setInWatchlist(hasInWatchlist(ticker) || defaultInWatchlist);
    setMounted(true);
  }, [ticker, defaultInWatchlist]);

  useEffect(() => {
    const onStorage = () => {
      setInWatchlist(hasInWatchlist(ticker));
    };

    const onCustomUpdate = () => {
      setInWatchlist(hasInWatchlist(ticker));
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(
      "signalos-watchlist-updated",
      onCustomUpdate as EventListener
    );

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "signalos-watchlist-updated",
        onCustomUpdate as EventListener
      );
    };
  }, [ticker]);

  useEffect(() => {
    if (!justAdded) return;

    const timer = window.setTimeout(() => {
      setJustAdded(false);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [justAdded]);

  const label = useMemo(() => {
    if (!mounted) return compact ? "+ Save" : "+ Watchlist";
    if (justAdded && inWatchlist) return compact ? "Added" : "✓ Added";
    if (inWatchlist) return compact ? "Saved" : "✓ In Watchlist";
    return compact ? "+ Save" : "+ Watchlist";
  }, [compact, mounted, justAdded, inWatchlist]);

  const handleToggle = () => {
    const result = toggleWatchlistTicker(ticker);
    setInWatchlist(result.inWatchlist);
    setIsAnimating(true);

    if (result.inWatchlist) {
      setJustAdded(true);
    } else {
      setJustAdded(false);
    }

    window.dispatchEvent(
      new CustomEvent("signalos-watchlist-updated", {
        detail: {
          ticker,
          inWatchlist: result.inWatchlist,
          tickers: result.tickers,
          count: result.tickers.length,
        },
      })
    );

    window.setTimeout(() => {
      setIsAnimating(false);
    }, 220);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={!mounted}
      aria-pressed={inWatchlist}
      className={[
        compact
          ? "inline-flex shrink-0 items-center justify-center rounded-xl px-2.5 py-1.5 text-[11px] font-semibold leading-none transition-all duration-200"
          : "inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200",
        "disabled:cursor-not-allowed disabled:opacity-70",
        isAnimating ? "scale-[1.03]" : "scale-100",
        inWatchlist
          ? justAdded
            ? "border border-emerald-300/30 bg-emerald-400/15 text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.22)]"
            : "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
          : "border border-white/10 bg-white/5 text-white/80 hover:border-orange-400/30 hover:bg-orange-500/10 hover:text-orange-200",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
