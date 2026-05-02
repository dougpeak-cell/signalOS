"use client";

import WatchlistLiveRail from "@/components/watchlist/WatchlistLiveRail";

export default function RightRailStocks() {
  return (
    <div className="space-y-5">
      <WatchlistLiveRail stocks={[]} title="Watchlist Live" />
    </div>
  );
}
