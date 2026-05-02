"use client";

import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
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
import SigiMiniPanel from "@/components/sigi/SigiMiniPanel";
import { SigiPanelProvider } from "@/components/sigi/SigiPanelContext";
import SigiUpgradeAnalyticsBridge from "@/components/sigi/SigiUpgradeAnalyticsBridge";
import { useResponsiveMobilePreviewWidth } from "@/components/shell/useResponsiveMobilePreview";

const MOBILE_PREVIEW_STORAGE_KEY = "signalos-dev-mobile-preview-today";

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
  const hasMobilePreviewParam = searchParams.get("mobilePreview") === "1";
  const isDevMobilePreview =
    process.env.NODE_ENV !== "production" && hasMobilePreviewParam;
  const isDensePreviewRoute = /^\/stocks\/[^/]+\/live(?:\/.*)?$/i.test(pathname);
  const mobilePreviewWidth = useResponsiveMobilePreviewWidth(
    isDevMobilePreview,
    isDensePreviewRoute ? "dense" : "standard"
  );

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

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const html = document.documentElement;
    const body = document.body;

    const prevHtmlWidth = html.style.maxWidth;
    const prevHtmlMargin = html.style.marginInline;
    const prevHtmlOverflow = html.style.overflowX;
    const prevBodyWidth = body.style.maxWidth;
    const prevBodyMargin = body.style.marginInline;
    const prevBodyOverflow = body.style.overflowX;

    if (isDevMobilePreview) {
      html.style.maxWidth = `${mobilePreviewWidth}px`;
      html.style.marginInline = "auto";
      html.style.overflowX = "hidden";
      body.style.maxWidth = `${mobilePreviewWidth}px`;
      body.style.marginInline = "auto";
      body.style.overflowX = "hidden";
    } else {
      html.style.maxWidth = "";
      html.style.marginInline = "";
      html.style.overflowX = "";
      body.style.maxWidth = "";
      body.style.marginInline = "";
      body.style.overflowX = "";
    }

    return () => {
      html.style.maxWidth = prevHtmlWidth;
      html.style.marginInline = prevHtmlMargin;
      html.style.overflowX = prevHtmlOverflow;
      body.style.maxWidth = prevBodyWidth;
      body.style.marginInline = prevBodyMargin;
      body.style.overflowX = prevBodyOverflow;
    };
  }, [isDevMobilePreview, mobilePreviewWidth]);

  const isWorkspaceStockPage =
    pathname.startsWith("/stocks/") && pathname.includes("/workspace");
  const isCryptoMode = pathname.startsWith("/crypto");
  const isScreenerRoute = pathname.startsWith("/screener");

  const hideShellRightRail = isWorkspaceStockPage || isScreenerRoute;
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
              "min-h-screen bg-black pb-32 text-white transition-colors md:pb-0",
              isCryptoMode
                ? "bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.10),transparent_34%),#000]"
                : "",
            ].join(" ")}
          >
            <TopNav forceMobilePreview={isDevMobilePreview} />
            <MarketPulseStrip />
            <BreakingNewsTicker mode="market" />
            {isCryptoMode ? (
              <div className="border-b border-cyan-400/20 bg-cyan-400/[0.035] px-6 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Crypto Mode · 24/7 market intelligence
              </div>
            ) : null}
            <div
              className={[
                "flex w-full",
                !isDevMobilePreview && !hideShellRightRail ? "md:pr-4 xl:pr-6 2xl:pr-8" : "",
              ].join(" ")}
            >
              <div className="min-w-0 flex-1">{children}</div>
              {!hideShellRightRail && !isDevMobilePreview ? <div className="hidden md:block"><ContextAwareRightRail /></div> : null}
            </div>
          </div>

          {process.env.NODE_ENV !== "production" && !isDevMobilePreview ? (
            <div className="hidden md:block">
              <MarketDataDebugOverlay />
            </div>
          ) : null}

          {!isDevMobilePreview ? <SigiMiniPanel /> : null}
          <MobileSigiSheet forceDesktopPreview={isDevMobilePreview} />
          <MobileBottomNav forceVisible={isDevMobilePreview} />
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
    <Suspense fallback={null}>
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