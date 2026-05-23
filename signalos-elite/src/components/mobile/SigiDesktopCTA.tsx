"use client";

import Link from "next/link";
import { ArrowRight, Monitor, Sparkles } from "lucide-react";

export default function SigiDesktopCTA({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div className="my-5 rounded-2xl border border-cyan-400/20 bg-linear-to-br from-cyan-400/10 via-slate-900/90 to-blue-950/80 p-4 shadow-[0_0_30px_rgba(34,211,238,0.12)] backdrop-blur-xl md:hidden">
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

          <h3 className="mt-2 text-lg font-extrabold text-white">
            Access the Full Trading Workspace
          </h3>

          {!compact && (
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Your SigiOS membership includes desktop access with expanded charts,
              multi-panel workflows, analyst intelligence, and advanced market monitoring.
            </p>
          )}

          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Open SigiOS Desktop
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}