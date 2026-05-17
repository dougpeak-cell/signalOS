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
const DEV_PREVIEW_PLAN_COOKIE = "signalos-dev-preview-plan";

function buildPreviewPlanSummary(tier: SigiTier): SigiPlanSummary {
  return {
    currentTier: tier,
    nextTier: tier === "free" ? "smart" : tier === "smart" ? "pro" : null,
    hasSmartFeatures: tier === "smart" || tier === "pro",
    hasProFeatures: tier === "pro",
    isSignedIn: true,
  };
}

function readPreviewPlanCookie(): SigiTier | null {
  if (typeof document === "undefined") return null;

  const cookieValue = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${DEV_PREVIEW_PLAN_COOKIE}=`))
    ?.split("=")[1];

  if (cookieValue === "free" || cookieValue === "smart" || cookieValue === "pro") {
    return cookieValue;
  }

  return null;
}

function readPreviewTierOverride(): SigiTier | null {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") {
    return null;
  }

  const nextPreviewPlan = new URLSearchParams(window.location.search).get("previewPlan");

  if (nextPreviewPlan === "free" || nextPreviewPlan === "smart" || nextPreviewPlan === "pro") {
    return nextPreviewPlan;
  }

  if (nextPreviewPlan === "off" || nextPreviewPlan === "clear") {
    return null;
  }

  return readPreviewPlanCookie();
}

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

    const previewTierOverride = readPreviewTierOverride();
    if (previewTierOverride && !cancelled) {
      setPlanSummaryState(buildPreviewPlanSummary(previewTierOverride));
      return () => {
        cancelled = true;
      };
    }

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