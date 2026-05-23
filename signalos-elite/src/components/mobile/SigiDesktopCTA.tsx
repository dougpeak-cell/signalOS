"use client";

import Link from "next/link";
import { ArrowRight, Monitor, Sparkles } from "lucide-react";

export default function SigiDesktopCTA({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-cyan-400/20 bg-linear-to-br from-cyan-400/10 via-slate-900/90 to-blue-950/80 shadow-[0_0_30px_rgba(34,211,238,0.12)] backdrop-blur-xl md:hidden",
        compact ? "my-4 p-3" : "my-5 p-4",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2">
          <Monitor className="h-5 w-5 text-cyan-300" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">
              SigiOS Desktop
            </p>
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
          </div>

          <h3 className={compact ? "mt-2 text-base font-extrabold text-white" : "mt-2 text-lg font-extrabold text-white"}>
            Access the Full SigiOS Desktop Command Center
          </h3>

          <p className={compact ? "mt-2 text-[13px] leading-5 text-slate-300" : "mt-2 text-sm leading-6 text-slate-300"}>
            Your SigiOS membership includes full desktop access with expanded charts,
            multi-panel workflows, analyst intelligence, sector monitoring, and advanced trading tools.
          </p>

          <Link
            href="/desktop"
            className={[
              "inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200",
              compact ? "mt-3" : "mt-4",
            ].join(" ")}
          >
            Open SigiOS Desktop
            <ArrowRight className="h-4 w-4" />
          </Link>

          <p className={compact ? "mt-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75" : "mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75"}>
            Built for mobile. Engineered for desktop.
          </p>
        </div>
      </div>
    </div>
  );
}