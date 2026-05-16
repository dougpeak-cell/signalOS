"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import AddStockModal from "@/components/watchlist/AddStockModal";

type StockOption = {
  ticker: string;
  company: string;
  sector?: string;
};

export default function StocksHeaderActions({
  stocks,
}: {
  stocks: StockOption[];
}) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const isMobilePreview = searchParams.get("mobilePreview") === "1";
  const modalStocks = useMemo(() => stocks, [stocks]);
  const watchlistHref = useMemo(() => {
    if (searchParams.get("mobilePreview") !== "1") {
      return "/watchlist";
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("mobilePreview", "1");
    const nextQuery = nextParams.toString();
    return nextQuery ? `/watchlist?${nextQuery}` : "/watchlist";
  }, [searchParams]);

  return (
    <>
      <div
        className={[
          isMobilePreview
            ? "grid w-full grid-cols-1 gap-2"
            : "flex items-center gap-2",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={[
            "inline-flex items-center justify-center rounded-xl bg-orange-500/90 px-4 py-2 text-sm font-semibold text-black transition hover:bg-orange-400",
            isMobilePreview ? "w-full" : "",
          ].join(" ")}
        >
          + Add Stock
        </button>

        <Link
          href={watchlistHref}
          className={[
            "inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white",
            isMobilePreview ? "w-full" : "",
          ].join(" ")}
        >
          Open Watchlist
        </Link>
      </div>

      <AddStockModal
        open={open}
        onClose={() => setOpen(false)}
        stocks={modalStocks}
        onAdded={() => setOpen(false)}
      />
    </>
  );
}