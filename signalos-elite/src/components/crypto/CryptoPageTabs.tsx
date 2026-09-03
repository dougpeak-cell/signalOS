"use client";

import Link from "next/link";
import type { ReactElement } from "react";

export type CryptoPageTabKey =
  | "market"
  | "meme"
  | "defi"
  | "rwa"
  | "news"
  | "watchlist"
  | "portfolio";

const CRYPTO_PAGE_TABS: ReadonlyArray<{
  key: CryptoPageTabKey;
  label: string;
  href:
    | "/crypto"
    | "/crypto/meme"
    | "/crypto/defi"
    | "/crypto/rwa"
    | "/crypto/news"
    | "/crypto/watchlist"
    | "/crypto/portfolio";
}> = [
  { key: "market", label: "Market", href: "/crypto" },
  { key: "meme", label: "Meme", href: "/crypto/meme" },
  { key: "defi", label: "DeFi", href: "/crypto/defi" },
  { key: "rwa", label: "RWA", href: "/crypto/rwa" },
  { key: "news", label: "News", href: "/crypto/news" },
  { key: "watchlist", label: "Watchlist", href: "/crypto/watchlist" },
  { key: "portfolio", label: "Portfolio", href: "/crypto/portfolio" },
];

export default function CryptoPageTabs({
  active,
  isMobilePreview,
  className = "",
}: {
  active: CryptoPageTabKey;
  isMobilePreview: boolean;
  className?: string;
}): ReactElement {
  return (
    <nav
      aria-label="Crypto sections"
      className={[
        "grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap",
        className,
      ].filter(Boolean).join(" ")}
    >
      {CRYPTO_PAGE_TABS.map((tab) => {
        const href = isMobilePreview ? `${tab.href}?mobilePreview=1` : tab.href;
        const isActive = tab.key === active;

        return (
          <Link
            key={tab.key}
            href={href}
            className={[
              "inline-flex min-h-9 items-center justify-center rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition",
              isActive
                ? "border-cyan-400/30 bg-cyan-400/14 text-cyan-200"
                : "border-white/10 bg-black/20 text-white/60 hover:border-cyan-400/20 hover:text-cyan-100",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}