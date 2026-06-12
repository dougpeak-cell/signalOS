"use client";

import type { ReactNode } from "react";

import LockedLiveChart from "@/components/upgrade/LockedLiveChart";
import { useSigiTier } from "@/hooks/useSigiTier";
import { getPremiumAccess } from "@/lib/premiumAccess";

export default function StockPremiumAccessGate({
  ticker,
  children,
}: {
  ticker: string;
  children: ReactNode;
}) {
  const { tier, previewActive } = useSigiTier();
  const allowed = getPremiumAccess({
    tier,
    ticker,
    feature: "stock",
    previewActive,
  });

  if (!allowed) {
    return <LockedLiveChart ticker={ticker.toUpperCase()} />;
  }

  return <>{children}</>;
}