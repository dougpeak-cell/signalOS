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
      page: "crypto";
      section: "front" | "news" | "meme" | "defi" | "rwa";
      ticker?: string;
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

function normalizeCryptoSection(
  value: string | null | undefined
): "front" | "news" | "meme" | "defi" | "rwa" {
  const v = normalizeLower(value);
  if (v === "/crypto/news" || v === "news") return "news";
  if (v === "/crypto/meme" || v === "meme") return "meme";
  if (v === "/crypto/defi" || v === "defi") return "defi";
  if (v === "/crypto/rwa" || v === "rwa") return "rwa";
  return "front";
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

    if (path === "/crypto") {
      return {
        page: "crypto" as const,
        section: "front",
      };
    }

    if (path === "/crypto/news") {
      return {
        page: "crypto" as const,
        section: "news",
      };
    }

    if (path === "/crypto/meme" || path === "/crypto/defi" || path === "/crypto/rwa") {
      return {
        page: "crypto" as const,
        section: normalize(path.split("/")[2]) as "meme" | "defi" | "rwa",
      };
    }

    if (path.startsWith("/crypto/")) {
      const ticker = normalize(path.split("/")[2]).toUpperCase();

      return {
        page: "crypto" as const,
        section: normalizeCryptoSection(searchParams.get("source")),
        ticker,
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