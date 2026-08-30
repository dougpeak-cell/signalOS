"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}

export default function TodayStockPulseQuickAccess() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeSymbol(symbol);
    if (!/^[A-Z.\-]{1,5}$/.test(normalized)) return;

    router.push(`/vision?symbol=${encodeURIComponent(normalized)}`);
  }

  return (
    <section className="rounded-lg border border-cyan-300/15 bg-[#04101a] p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300">
        Check a Stock&apos;s Pulse
      </p>
      <form onSubmit={submit} className="mt-2 flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Type ticker</span>
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}
            placeholder="Type ticker..."
            autoComplete="off"
            spellCheck={false}
            className="h-11 w-full rounded-md border border-slate-700 bg-black/25 px-3 text-sm font-semibold uppercase text-white outline-none placeholder:font-normal placeholder:normal-case placeholder:text-slate-600 focus:border-cyan-300/50"
          />
        </label>
        <button
          type="submit"
          disabled={!symbol.trim()}
          aria-label="Check stock Pulse"
          className="flex size-11 shrink-0 items-center justify-center rounded-md border border-cyan-300/30 bg-cyan-300/8 text-cyan-100 disabled:opacity-40"
        >
          <ArrowRight className="size-5" />
        </button>
      </form>
    </section>
  );
}
