"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StocksPage() {
  const [ticker, setTicker] = useState("");
  const router = useRouter();

  function search() {
    if (!ticker) return;
    router.push(`/stocks/${ticker.toUpperCase()}`);
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-semibold mb-6">Stock Explorer</h1>

      <div className="flex gap-2">
        <input
          className="border rounded px-4 py-2 w-full"
          placeholder="Enter ticker (AAPL)"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
        />

        <button
          onClick={search}
          className="bg-black text-white px-4 rounded"
        >
          Search
        </button>
      </div>
    </div>
  );
}