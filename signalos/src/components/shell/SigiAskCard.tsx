"use client";

import { useMemo, useState } from "react";

type SigiAskCardProps = {
  onAsk?: (question: string) => void;
  onExplain?: () => void;
  onKeyLevels?: () => void;
  onRiskView?: () => void;
  onWhatChanged?: () => void;
};

const QUICK_PROMPTS = [
  "Bull case",
  "Bear case",
  "News impact",
] as const;

export default function SigiAskCard({
  onAsk,
  onExplain,
  onKeyLevels,
  onRiskView,
  onWhatChanged,
}: SigiAskCardProps) {
  const [value, setValue] = useState("");

  const canSubmit = useMemo(() => value.trim().length > 0, [value]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAsk?.(trimmed);
    setValue("");
  };

  const handleQuickPrompt = (prompt: string) => {
    const normalized = prompt.toLowerCase();

    if (normalized === "key levels") {
      onKeyLevels?.();
      return;
    }

    if (normalized === "risk view") {
      onRiskView?.();
      return;
    }

    if (normalized === "what changed?") {
      onWhatChanged?.();
      return;
    }

    if (normalized === "bull case") {
      onAsk?.("Give me the bull case.");
      return;
    }

    if (normalized === "bear case") {
      onAsk?.("Give me the bear case.");
      return;
    }

    if (normalized === "news impact") {
      onAsk?.("What is the news impact?");
      return;
    }

    onAsk?.(prompt);
  };

  return (
    <section className="glow-panel rounded-3xl p-5">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/85">
          Ask Sigi
        </div>
        <p className="mt-2 text-sm leading-6 text-white/65">
          Ask for structure, levels, risk, or what changed in the setup.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
        <label htmlFor="sigi-ask-input" className="sr-only">
          Ask Sigi a question
        </label>

        <textarea
          id="sigi-ask-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={3}
          placeholder="Ask Sigi: Why is this bullish? Where are key levels? What changed?"
          className="w-full resize-none border-0 bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/30"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-[11px] text-white/35">
            Press Enter to send
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-xl border border-cyan-400/30 bg-cyan-400/12 px-3 py-2 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ask Sigi
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => handleQuickPrompt(prompt)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onExplain}
          className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-[11px] font-medium text-cyan-100 transition hover:bg-cyan-400/15"
        >
          Explain Setup
        </button>

        <button
          type="button"
          onClick={onKeyLevels}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-white/80 transition hover:bg-white/10"
        >
          Key Levels
        </button>

        <button
          type="button"
          onClick={onWhatChanged}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-white/80 transition hover:bg-white/10"
        >
          What Changed?
        </button>

        <button
          type="button"
          onClick={onRiskView}
          className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-[11px] font-medium text-rose-100 transition hover:bg-rose-400/15"
        >
          Risk View
        </button>
      </div>
    </section>
  );
}