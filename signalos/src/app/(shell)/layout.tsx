"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { SelectedSignalProvider } from "@/components/chart/SelectedSignalContext";
import ContextAwareRightRail from "@/components/shell/ContextAwareRightRail";
import TopNav from "@/components/shell/TopNav";
import StickyMacroStrip from "@/components/shell/StickyMacroStrip";
import BreakingNewsTicker from "@/components/news/BreakingNewsTicker";

export default function ShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const isLiveStockPage =
    pathname.startsWith("/stocks/") && pathname.includes("/live");

  const isStockPage = pathname.startsWith("/stocks/");

  return (
    <SelectedSignalProvider>
      <div className="min-h-screen bg-black text-white">
        <TopNav />
        <StickyMacroStrip />
        <BreakingNewsTicker />
        <div className="h-2" />

        {isLiveStockPage ? (
          <div className="mx-auto w-full max-w-none px-2 pb-6 pt-2 md:px-3 xl:px-4 2xl:px-5">
            {children}
          </div>
        ) : (
          <div
            className={`mx-auto w-full ${
              isStockPage ? "max-w-425" : "max-w-470"
            } space-y-6 px-4 md:px-6 xl:px-8 2xl:px-10 xl:space-y-7`}
          >
            <div
              className={`grid grid-cols-1 gap-6 xl:items-start ${
                isStockPage
                  ? "xl:grid-cols-[minmax(0,1.72fr)_320px] 2xl:grid-cols-[minmax(0,1.82fr)_340px]"
                  : "xl:grid-cols-[minmax(0,1.45fr)_320px] 2xl:grid-cols-[minmax(0,1.56fr)_340px]"
              }`}
            >
              <main className="min-w-0 w-full">
                {isStockPage ? (
                  <div className="min-w-0 w-full">{children}</div>
                ) : (
                  <div className="rounded-3xl border border-cyan-400/10 bg-linear-to-b from-[#031525] to-[#020814] p-4 md:p-5 xl:p-6">
                    {children}
                  </div>
                )}
              </main>

              <aside className="min-w-0 sticky top-24 h-fit border-t border-white/6 pt-6 xl:border-t-0 xl:pt-0">
                <div className="mb-3 flex items-center justify-between xl:hidden">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/70">
                    Market Intelligence
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                    Live
                  </div>
                </div>

                <div className="min-w-0">
                  <ContextAwareRightRail />
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>
    </SelectedSignalProvider>
  );
}