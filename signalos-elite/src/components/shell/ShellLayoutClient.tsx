"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SelectedSignalProvider } from "@/components/chart/SelectedSignalContext";
import MarketPulseStrip from "@/components/market/MarketPulseStrip";
import BreakingNewsTicker from "@/components/news/BreakingNewsTicker";
import MarketDataDebugOverlay from "@/components/dev/MarketDataDebugOverlay";
import ContextAwareRightRail from "@/components/shell/ContextAwareRightRail";
import MobileBottomNav from "@/components/shell/MobileBottomNav";
import { ShellMarketContextProvider } from "@/components/shell/ShellMarketContext";
import MobileSigiSheet from "@/components/shell/MobileSigiSheet";
import TopNav from "@/components/shell/TopNav";
import SigiEyeLogo from "@/components/sigi/SigiEyeLogo";
import SigiMiniPanel from "@/components/sigi/SigiMiniPanel";
import { SigiPanelProvider } from "@/components/sigi/SigiPanelContext";
import SigiUpgradeAnalyticsBridge from "@/components/sigi/SigiUpgradeAnalyticsBridge";
import type { SigiTier } from "@/lib/sigi/gates";
import { useResponsiveMobilePreviewFrame } from "@/components/shell/useResponsiveMobilePreview";

const MOBILE_PREVIEW_STORAGE_KEY = "signalos-dev-mobile-preview-today";
const DEV_PREVIEW_PLAN_COOKIE = "signalos-dev-preview-plan";

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

function ShellLoadingFallback() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,145,178,0.18),transparent_42%),radial-gradient(circle_at_center,rgba(20,184,166,0.12),transparent_58%)]" />
      <main className="relative flex min-h-screen items-center justify-center px-6 py-10">
        <div className="flex w-full max-w-md flex-col items-center justify-center gap-6 text-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
            <SigiEyeLogo className="relative w-36 max-w-full sm:w-44" />
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.42em] text-cyan-300/78">
              SIGI
            </div>
            <h1 className="text-xl font-semibold tracking-[0.08em] text-white/92 sm:text-2xl">
              Loading Today
            </h1>
            <p className="text-sm text-white/46 sm:text-[15px]">
              Sigi is scanning the market and building your Today view.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function ShellLayoutContent({
  children,
  hasAccountSession,
  watchlistTickers,
  portfolioTickers,
}: {
  children: ReactNode;
  hasAccountSession: boolean;
  watchlistTickers: string[];
  portfolioTickers: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasSyncedMobilePreviewRef = useRef(false);
  const [hasCompactMobileShell, setHasCompactMobileShell] = useState(false);
  const [previewPlan, setPreviewPlan] = useState<SigiTier | null>(null);
  const hasMobilePreviewParam = searchParams.get("mobilePreview") === "1";
  const isDevMobilePreview =
    process.env.NODE_ENV !== "production" && hasMobilePreviewParam;
  const isDensePreviewRoute = /^\/stocks\/[^/]+\/live(?:\/.*)?$/i.test(pathname);
  const mobilePreviewFrame = useResponsiveMobilePreviewFrame(
    isDevMobilePreview,
    isDensePreviewRoute ? "dense" : "standard"
  );

  useEffect(() => {
    const widthQuery = window.matchMedia("(max-width: 767px)");
    const coarseQuery = window.matchMedia("(hover: none) and (pointer: coarse)");

    const sync = () => {
      setHasCompactMobileShell(widthQuery.matches || coarseQuery.matches);
    };

    sync();
    widthQuery.addEventListener("change", sync);
    coarseQuery.addEventListener("change", sync);

    return () => {
      widthQuery.removeEventListener("change", sync);
      coarseQuery.removeEventListener("change", sync);
    };
  }, []);

  const shouldUseCompactShell = isDevMobilePreview || hasCompactMobileShell;

  function applyPreviewPlan(nextPlan: "free" | "smart" | "pro" | "off") {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    if (nextPlan === "off") {
      document.cookie = `${DEV_PREVIEW_PLAN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    } else {
      document.cookie = `${DEV_PREVIEW_PLAN_COOKIE}=${nextPlan}; path=/; SameSite=Lax`;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("previewPlan", nextPlan);
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    router.refresh();
  }

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const nextPreviewPlan = searchParams.get("previewPlan");

    if (nextPreviewPlan === "free" || nextPreviewPlan === "smart" || nextPreviewPlan === "pro") {
      setPreviewPlan(nextPreviewPlan);
      return;
    }

    if (nextPreviewPlan === "off" || nextPreviewPlan === "clear") {
      setPreviewPlan(null);
      return;
    }

    setPreviewPlan(readPreviewPlanCookie());
  }, [pathname, searchParams]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const storedPreference = window.localStorage.getItem(MOBILE_PREVIEW_STORAGE_KEY);

    if (!hasSyncedMobilePreviewRef.current) {
      hasSyncedMobilePreviewRef.current = true;

      if (hasMobilePreviewParam) {
        window.localStorage.setItem(MOBILE_PREVIEW_STORAGE_KEY, "1");
        return;
      }

      if (storedPreference === null) {
        window.localStorage.setItem(MOBILE_PREVIEW_STORAGE_KEY, "0");
        return;
      }

      if (storedPreference === "1") {
        router.replace(`${pathname}?mobilePreview=1`, { scroll: false });
        return;
      }
    }

    window.localStorage.setItem(MOBILE_PREVIEW_STORAGE_KEY, isDevMobilePreview ? "1" : "0");
  }, [hasMobilePreviewParam, isDevMobilePreview, pathname, router, searchParams]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    document.documentElement.setAttribute("data-hide-next-dev-indicator", "true");

    const hideDevIndicator = () => {
      const elements = document.querySelectorAll<HTMLElement>(
        "#devtools-indicator, [data-next-badge-root], .nextjs-toast"
      );

      elements.forEach((element) => {
        element.style.display = "none";
        element.style.pointerEvents = "none";
      });
    };

    hideDevIndicator();

    const observer = new MutationObserver(() => {
      hideDevIndicator();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", hideDevIndicator);

    return () => {
      document.documentElement.removeAttribute("data-hide-next-dev-indicator");
      observer.disconnect();
      window.removeEventListener("resize", hideDevIndicator);
    };
  }, []);

  const isWorkspaceStockPage =
    pathname.startsWith("/stocks/") && pathname.includes("/workspace");
  const isStockChartPage = /^\/stocks\/[^/]+\/chart(?:\/.*)?$/i.test(pathname);
  const isCryptoMode = pathname.startsWith("/crypto");
  const isScreenerRoute = pathname.startsWith("/screener");
  const isTodayShellRoute = pathname === "/" || pathname === "/today";
  const shouldShowMobileBottomNav = !shouldUseCompactShell || !isStockChartPage;

  const hideShellRightRail = isWorkspaceStockPage || isScreenerRoute || shouldUseCompactShell;
  const shellMarketContextValue = useMemo(
    () => ({
      hasAccountSession,
      watchlistTickers,
      portfolioTickers,
    }),
    [hasAccountSession, portfolioTickers, watchlistTickers]
  );

  return (
    <SelectedSignalProvider>
      <SigiPanelProvider>
        <ShellMarketContextProvider
          value={shellMarketContextValue}
        >
          <SigiUpgradeAnalyticsBridge />
          <div
            className={[
              "min-h-screen bg-black pb-[calc(8rem+env(safe-area-inset-bottom))] text-white transition-colors md:pb-0",
              isCryptoMode
                ? "bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.10),transparent_34%),#000]"
                : "",
            ].join(" ")}
            style={
              isDevMobilePreview
                ? {
                    width: "100%",
                    maxWidth: `${mobilePreviewFrame.width}px`,
                    marginInline: "auto",
                    overflowX: "hidden",
                    ...(mobilePreviewFrame.isFramed
                      ? {
                          height: `${mobilePreviewFrame.height}px`,
                          overflowY: "auto",
                          overscrollBehaviorY: "contain",
                        }
                      : null),
                  }
                : undefined
            }
          >
            {process.env.NODE_ENV !== "production" ? (
              <div className="pointer-events-auto fixed bottom-4 left-4 z-120 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-400/25 bg-black/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.16)] backdrop-blur-xl md:bottom-5 md:left-5">
                <span className="text-emerald-200/85">
                  Preview: {previewPlan ?? "off"}
                </span>
                {(["free", "smart", "pro"] as const).map((tier) => {
                  const active = previewPlan === tier;

                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => applyPreviewPlan(tier)}
                      className={[
                        "rounded-full border px-2 py-1 transition",
                        active
                          ? "border-emerald-300/50 bg-emerald-400/20 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-emerald-300/35 hover:bg-emerald-400/12 hover:text-white",
                      ].join(" ")}
                    >
                      {tier}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => applyPreviewPlan("off")}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70 transition hover:border-rose-300/35 hover:bg-rose-400/12 hover:text-white"
                >
                  clear
                </button>
              </div>
            ) : null}
            <div className="block">
              <TopNav forceMobilePreview={shouldUseCompactShell} hasAccountSession={hasAccountSession} />
            </div>
            {!shouldUseCompactShell ? (
              <div className={isTodayShellRoute ? "hidden md:block" : "block"}>
                <MarketPulseStrip />
              </div>
            ) : null}
            {!shouldUseCompactShell ? (
              <div className={isTodayShellRoute ? "hidden md:block" : "block"}>
                <BreakingNewsTicker mode="market" />
              </div>
            ) : null}
            {shouldUseCompactShell && isTodayShellRoute ? (
              <div className="md:hidden">
                <BreakingNewsTicker mode="market" />
              </div>
            ) : null}
            {isCryptoMode ? (
              <div className="border-b border-cyan-400/20 bg-cyan-400/[0.035] px-6 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Crypto Mode · 24/7 market intelligence
              </div>
            ) : null}
            <div className="w-full px-0 py-0 md:px-6 md:py-4 xl:px-8 2xl:px-10">
              <div className="rounded-none border-0 bg-transparent p-0 md:rounded-3xl md:border md:border-cyan-400/10 md:bg-linear-to-b md:from-[#031525] md:to-[#020814] md:p-5 xl:md:p-6">
                <div
                  className={[
                    "flex w-full",
                    !shouldUseCompactShell && !hideShellRightRail ? "md:pr-4 xl:pr-6 2xl:pr-8" : "",
                  ].join(" ")}
                >
                  <div className="min-w-0 flex-1">{children}</div>
                  {!hideShellRightRail && !shouldUseCompactShell ? <div className="hidden md:block"><ContextAwareRightRail /></div> : null}
                </div>
              </div>
            </div>
          </div>

          {process.env.NODE_ENV !== "production" && !shouldUseCompactShell ? (
            <div className="hidden md:block">
              <MarketDataDebugOverlay />
            </div>
          ) : null}

          {!shouldUseCompactShell ? <SigiMiniPanel /> : null}
          <MobileSigiSheet forceDesktopPreview={shouldUseCompactShell} />
          {shouldShowMobileBottomNav ? <MobileBottomNav forceVisible={shouldUseCompactShell} /> : null}
        </ShellMarketContextProvider>
      </SigiPanelProvider>
    </SelectedSignalProvider>
  );
}

export default function ShellLayoutClient({
  children,
  hasAccountSession,
  watchlistTickers,
  portfolioTickers,
}: {
  children: ReactNode;
  hasAccountSession: boolean;
  watchlistTickers: string[];
  portfolioTickers: string[];
}) {
  return (
    <Suspense fallback={<ShellLoadingFallback />}>
      <ShellLayoutContent
        hasAccountSession={hasAccountSession}
        watchlistTickers={watchlistTickers}
        portfolioTickers={portfolioTickers}
      >
        {children}
      </ShellLayoutContent>
    </Suspense>
  );
}