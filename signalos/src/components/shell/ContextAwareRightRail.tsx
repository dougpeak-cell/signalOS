"use client";

import { usePathname } from "next/navigation";

import RightRailWatchlist from "@/components/shell/RightRailWatchlist";
import RightRailPortfolio from "@/components/shell/RightRailPortfolio";
import RightRailScreener from "@/components/shell/RightRailScreener";
import RightRailFallback from "@/components/shell/RightRailFallback";
import RightRailStocks from "@/components/shell/RightRailStocks";
import { useSelectedSignal } from "@/components/chart/SelectedSignalContext";

export default function ContextAwareRightRail() {
  const pathname = usePathname();
  const { selected } = useSelectedSignal();

  if (pathname.includes("/stocks/") && pathname.includes("/live")) {
    return null;
  }

  if (pathname.startsWith("/news")) {
    return null;
  }

  if (!pathname) {
    return (
      <div className="space-y-5">
        <RightRailFallback />
      </div>
    );
  }

  if (pathname === "/" || pathname.startsWith("/today")) {
    return null;
  }

  if (pathname.startsWith("/stocks")) {
    return (
      <div className="space-y-5">
        <RightRailStocks />
      </div>
    );
  }

  if (pathname.startsWith("/watchlist")) {
    return (
      <div className="space-y-5">
        <RightRailWatchlist />
      </div>
    );
  }

  if (pathname.startsWith("/portfolio")) {
    return (
      <div className="space-y-5">
        <RightRailPortfolio />
      </div>
    );
  }

  if (pathname.startsWith("/screener")) {
    return (
      <div className="space-y-5">
        <RightRailScreener />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <RightRailFallback />
    </div>
  );
}
