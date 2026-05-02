"use client";

import { renderTickerParagraphs, renderTickerText } from "@/components/sigi/renderTickerText";
import { parseStructuredSigi } from "@/lib/sigi/parseStructuredSigi";

function toneClass(value?: string) {
  const normalized = value?.toLowerCase() ?? "";

  if (normalized.includes("bull")) {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (normalized.includes("bear")) {
    return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  }

  if (normalized.includes("strong")) {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
  }

  if (normalized.includes("weak")) {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  }

  return "border-white/10 bg-white/5 text-white/85";
}

function FieldCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  if (!value) return null;

  return (
    <div className={`rounded-2xl border border-white/10 bg-black/25 p-3 ${className}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
        {label}
      </div>
      <div className="mt-1 text-sm text-white/90">{renderTickerText(value)}</div>
    </div>
  );
}

export default function SigiResponseCards({
  response,
}: {
  response: string;
}) {
  const parsed = parseStructuredSigi(response);

  const hasStructuredFields =
    parsed.bias ||
    parsed.momentum ||
    parsed.setup ||
    parsed.entry ||
    parsed.stop ||
    parsed.target ||
    parsed.risk ||
    parsed.invalidation ||
    parsed.action;

  if (!hasStructuredFields) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white/85 whitespace-pre-wrap">
        {renderTickerParagraphs(response)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {parsed.bias ? (
          <div className={`rounded-2xl border px-3 py-3 ${toneClass(parsed.bias)}`}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-75">
              Bias
            </div>
            <div className="mt-1 text-sm font-medium">{renderTickerText(parsed.bias)}</div>
          </div>
        ) : null}

        {parsed.momentum ? (
          <div className={`rounded-2xl border px-3 py-3 ${toneClass(parsed.momentum)}`}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-75">
              Momentum
            </div>
            <div className="mt-1 text-sm font-medium">{renderTickerText(parsed.momentum)}</div>
          </div>
        ) : null}
      </div>

      <FieldCard label="Setup" value={parsed.setup} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FieldCard label="Entry" value={parsed.entry} />
        <FieldCard label="Stop" value={parsed.stop} />
        <FieldCard label="Target" value={parsed.target} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldCard label="Risk" value={parsed.risk} />
        <FieldCard label="Invalidation" value={parsed.invalidation} />
      </div>

      <FieldCard
        label="Action"
        value={parsed.action}
        className="border-cyan-400/15 bg-cyan-400/8"
      />
    </div>
  );
}