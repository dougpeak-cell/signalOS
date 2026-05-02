"use client";

import { openMobileSigiSheet } from "@/components/shell/mobileSigiSheetEvents";

export default function MobileSigiFab() {
  function handleClick() {
    openMobileSigiSheet();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="fixed bottom-24 right-4 z-50 inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-400/22 bg-cyan-400/14 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.22)] backdrop-blur-xl transition hover:bg-cyan-400/20 md:hidden"
      aria-label="Open Sigi"
    >
      <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.85)]" />
      Sigi
    </button>
  );
}