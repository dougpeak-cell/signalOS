"use client";

import { Suspense, useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SelectedSignalProvider } from "@/components/chart/SelectedSignalContext";
import TopNav from "@/components/shell/TopNav";
import StickyMacroStrip from "@/components/shell/StickyMacroStrip";
import MobileSigiSheet from "@/components/shell/MobileSigiSheet";
import BreakingNewsTicker from "@/components/news/BreakingNewsTicker";
import SigiMiniPanel from "@/components/sigi/SigiMiniPanel";
import { SigiPanelProvider } from "@/components/sigi/SigiPanelContext";
import { useResponsiveMobilePreviewFrame } from "@/components/shell/useResponsiveMobilePreview";

const MOBILE_PREVIEW_STORAGE_KEY = "signalos-dev-mobile-preview-today";

function NewsLayoutInner({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasSyncedMobilePreviewRef = useRef(false);
  const isDevMobilePreview =
    process.env.NODE_ENV !== "production" && searchParams.get("mobilePreview") === "1";
  const mobilePreviewFrame = useResponsiveMobilePreviewFrame(isDevMobilePreview);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const storedPreference = window.localStorage.getItem(MOBILE_PREVIEW_STORAGE_KEY);
    const shouldEnablePreview = storedPreference === "1";

    if (!hasSyncedMobilePreviewRef.current) {
      hasSyncedMobilePreviewRef.current = true;

      if (storedPreference === null) {
        window.localStorage.setItem(MOBILE_PREVIEW_STORAGE_KEY, isDevMobilePreview ? "1" : "0");
        return;
      }

      if (shouldEnablePreview !== isDevMobilePreview) {
        const nextParams = new URLSearchParams(searchParams.toString());

        if (shouldEnablePreview) {
          nextParams.set("mobilePreview", "1");
        } else {
          nextParams.delete("mobilePreview");
        }

        const nextQuery = nextParams.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
        return;
      }
    }

    window.localStorage.setItem(MOBILE_PREVIEW_STORAGE_KEY, isDevMobilePreview ? "1" : "0");
  }, [isDevMobilePreview, pathname, router, searchParams]);

  return (
    <SelectedSignalProvider>
      <SigiPanelProvider>
        <div
          className="min-h-screen bg-black pb-[calc(8rem+env(safe-area-inset-bottom))] text-white lg:pb-0"
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
          <TopNav forceMobilePreview={isDevMobilePreview} />
          <StickyMacroStrip />
          <BreakingNewsTicker />
          <div className="h-2" />

          <div className="mx-auto w-full px-0 md:px-6 xl:px-8 2xl:px-10">
            <main className="min-w-0 w-full">
              <div className="rounded-none border-0 bg-transparent p-0 md:rounded-3xl md:border md:border-cyan-400/10 md:bg-linear-to-b md:from-[#031525] md:to-[#020814] md:p-5 xl:md:p-6">
                {children}
              </div>
            </main>
          </div>
        </div>

        {!isDevMobilePreview ? <SigiMiniPanel /> : null}
        <MobileSigiSheet forceDesktopPreview={isDevMobilePreview} />
      </SigiPanelProvider>
    </SelectedSignalProvider>
  );
}

export default function NewsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <NewsLayoutInner>{children}</NewsLayoutInner>
    </Suspense>
  );
}
