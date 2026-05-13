import type { ReactElement } from "react";
import SigiEyeLogo from "@/components/sigi/SigiEyeLogo";

export default function TodayLoadingScreen({
  className = "",
  fullHeight = true,
}: {
  className?: string;
  fullHeight?: boolean;
}): ReactElement {
  const heightClass = fullHeight ? "min-h-screen" : "min-h-[calc(100dvh-7rem)]";

  return (
    <div className={`relative overflow-hidden bg-black text-white ${heightClass} ${className}`.trim()}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,145,178,0.18),transparent_42%),radial-gradient(circle_at_center,rgba(20,184,166,0.12),transparent_58%)]" />
      <main className={`relative flex items-center justify-center px-6 py-10 ${heightClass}`}>
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