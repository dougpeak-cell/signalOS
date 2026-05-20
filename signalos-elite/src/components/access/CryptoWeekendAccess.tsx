"use client";

import Link from "next/link";
import { isWeekendCryptoOpen } from "@/lib/premiumAccess";

export default function CryptoWeekendAccess() {
  const open = isWeekendCryptoOpen();

  return (
    <div className="rounded-3xl border border-purple-400/30 bg-purple-500/10 p-5 shadow-xl">
      <p className="text-xs uppercase tracking-[0.25em] text-purple-300">
        Crypto Weekend Access
      </p>

      <h3 className="mt-2 text-2xl font-bold text-white">
        {open ? "Crypto Command Center is open" : "Crypto opens this weekend"}
      </h3>

      <p className="mt-2 text-sm text-slate-300">
        Free users get weekend access to preview Sigi Crypto Intelligence.
      </p>

      <Link
        href="/crypto"
        className="mt-4 inline-flex rounded-2xl bg-purple-400 px-4 py-2 font-semibold text-black hover:bg-purple-300"
      >
        {open ? "Open Crypto" : "Preview Crypto"}
      </Link>
    </div>
  );
}