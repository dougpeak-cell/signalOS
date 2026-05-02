"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export type RouteContext =
  | {
      page: "today";
      panel: string;
      regime: "bullish" | "neutral" | "riskoff" | "";
    }
  | {
      page: "screener";
      view: string;
      theme: string;
    }
  | {
      page: "watchlist";
      view: string;
    }
  | {
      page: "portfolio";
      view: string;
    }
  | {
      page: "experts";
    }
  | {
      page: "stock";
      ticker: string;
      focus: string;
    }
  | {
      page: "other";
    };

function normalize(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function normalizeLower(value: string | null | undefined): string {
  return normalize(value).toLowerCase();
}

function normalizeRegime(value: string | null | undefined): "bullish" | "neutral" | "riskoff" | "" {
  const v = normalizeLower(value);
  if (v === "bullish") return "bullish";
  if (v === "neutral") return "neutral";
  if (v === "risk off" || v === "risk-off" || v === "riskoff") return "riskoff";
  return "";
}

export function useRouteContext(): RouteContext {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(() => {
    const path = String(pathname ?? "");

    if (path === "/" || path.includes("/today")) {
      return {
        page: "today" as const,
        panel: normalize(searchParams.get("panel")),
        regime: normalizeRegime(searchParams.get("regime")),
      };
    }

    if (path.includes("/screener")) {
      return {
        page: "screener" as const,
        view: normalize(searchParams.get("view")),
        theme: normalize(searchParams.get("theme")),
      };
    }

    if (path.includes("/watchlist")) {
      return {
        page: "watchlist" as const,
        view: normalize(searchParams.get("view")),
      };
    }

    if (path.includes("/portfolio")) {
      return {
        page: "portfolio" as const,
        view: normalize(searchParams.get("view")),
      };
    }

    if (path.includes("/experts")) {
      return {
        page: "experts" as const,
      };
    }

    if (path.includes("/stocks/")) {
      const parts = path.split("/");
      const ticker = normalize(parts[2]).toUpperCase();

      return {
        page: "stock" as const,
        ticker,
        focus: normalize(searchParams.get("focus")),
      };
    }

    return { page: "other" as const };
  }, [pathname, searchParams]);
}