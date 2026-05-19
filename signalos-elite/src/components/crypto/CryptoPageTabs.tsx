"use client";

import Link from "next/link";
import type { ReactElement } from "react";

type CryptoPageTabKey = "market" | "watchlist" | "portfolio";

const CRYPTO_PAGE_TABS: ReadonlyArray<{
  key: CryptoPageTabKey;
  label: string;
  href: "/crypto" | "/crypto/watchlist" | "/crypto/portfolio";
}> = [
  { key: "market", label: "Market", href: "/crypto" },
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
    <nav className={["flex flex-wrap gap-2", className].filter(Boolean).join(" ")}>
      {CRYPTO_PAGE_TABS.map((tab) => {
        const href = isMobilePreview ? `${tab.href}?mobilePreview=1` : tab.href;
        const isActive = tab.key === active;

        return (
          <Link
            key={tab.key}
            href={href}
            className={[
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition",
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