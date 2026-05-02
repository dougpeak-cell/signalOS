"use client";

import { useEffect, useState } from "react";
import type { SigiTier } from "@/lib/sigi/gates";

export type SigiPlanSummary = {
  currentTier: SigiTier;
  nextTier: SigiTier | null;
  hasSmartFeatures: boolean;
  hasProFeatures: boolean;
  isSignedIn: boolean;
};

const PLAN_SUMMARY_SESSION_KEY = "signalos.sigi.plan-summary.v1";

function readCachedPlanSummary(): SigiPlanSummary | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = window.sessionStorage.getItem(PLAN_SUMMARY_SESSION_KEY);
    return cached ? (JSON.parse(cached) as SigiPlanSummary) : null;
  } catch {
    window.sessionStorage.removeItem(PLAN_SUMMARY_SESSION_KEY);
    return null;
  }
}

export function useSigiTier() {
  const [planSummary, setPlanSummaryState] = useState<SigiPlanSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cached = readCachedPlanSummary();
    if (cached && !cancelled) {
      setPlanSummaryState(cached);
    }

    const loadPlan = async () => {
      try {
        const res = await fetch("/api/sigi/plan", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as SigiPlanSummary;
        if (!cancelled) {
          setPlanSummaryState(data);
        }
        window.sessionStorage.setItem(PLAN_SUMMARY_SESSION_KEY, JSON.stringify(data));
      } catch {
        if (!cancelled && !cached) {
          setPlanSummaryState(null);
        }
      }
    };

    void loadPlan();

    return () => {
      cancelled = true;
    };
  }, []);

  function setPlanSummary(nextSummary: SigiPlanSummary) {
    setPlanSummaryState(nextSummary);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PLAN_SUMMARY_SESSION_KEY, JSON.stringify(nextSummary));
    }
  }

  return {
    tier: planSummary?.currentTier ?? "free",
    planSummary,
    setPlanSummary,
  };
}