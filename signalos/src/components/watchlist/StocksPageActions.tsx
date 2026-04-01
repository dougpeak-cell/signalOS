"use client";

import { useMemo, useState } from "react";
import AddStockModal from "@/components/watchlist/AddStockModal";

type StockOption = {
  ticker: string;
  company: string;
  sector?: string;
};

export default function StocksPageActions({
  stocks,
}: {
  stocks: StockOption[];
}) {
  const [open, setOpen] = useState(false);

  const modalStocks = useMemo(() => stocks, [stocks]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400"
      >
        + Add Stock
      </button>

      <AddStockModal
        open={open}
        onClose={() => setOpen(false)}
        stocks={modalStocks}
        onAdded={() => setOpen(false)}
      />
    </>
  );
}
