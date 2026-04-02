import type { ReactNode } from "react";
import { SelectedSignalProvider } from "@/components/chart/SelectedSignalContext";
import TopNav from "@/components/shell/TopNav";
import StickyMacroStrip from "@/components/shell/StickyMacroStrip";
import BreakingNewsTicker from "@/components/news/BreakingNewsTicker";

export default function NewsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SelectedSignalProvider>
      <div className="min-h-screen bg-black text-white">
        <TopNav />
        <StickyMacroStrip />
        <BreakingNewsTicker />
        <div className="h-2" />

        <div className="mx-auto w-full max-w-470 px-4 md:px-6 xl:px-8 2xl:px-10">
          <main className="min-w-0 w-full">
            <div className="rounded-3xl border border-cyan-400/10 bg-linear-to-b from-[#031525] to-[#020814] p-4 md:p-5 xl:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SelectedSignalProvider>
  );
}
