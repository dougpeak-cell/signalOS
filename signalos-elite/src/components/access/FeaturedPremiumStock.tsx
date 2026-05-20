"use client";

import Link from "next/link";
import { getTodayFeaturedStock } from "@/lib/premiumAccess";

export default function FeaturedPremiumStock() {
  const ticker = getTodayFeaturedStock();

  return (
    <div className="rounded-3xl border border-cyan-400/30 bg-cyan-500/10 p-5 shadow-xl">
      <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
        Featured Premium Access
      </p>

      <h3 className="mt-2 text-2xl font-bold text-white">
        {ticker} unlocked today
      </h3>

      <p className="mt-2 text-sm text-slate-300">
        Free users can experience Smart and Pro-style intelligence for today’s featured stock.
      </p>

      <Link
        href={`/stocks/${ticker}`}
        className="mt-4 inline-flex rounded-2xl bg-cyan-400 px-4 py-2 font-semibold text-black hover:bg-cyan-300"
      >
        Open {ticker}
      </Link>
    </div>
  );
}