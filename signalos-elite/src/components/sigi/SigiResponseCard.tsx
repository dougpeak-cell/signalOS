"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { renderTickerParagraphs } from "@/components/sigi/renderTickerText";
import { buildStockLiveUrl } from "@/lib/sigi/sigiNavigation";

export type SigiResponseCardData = {
  question?: string | null;
  title?: string | null;
  summary: string;
  actionLabel?: string | null;
  tone?: "bullish" | "bearish" | "neutral" | "caution" | null;
  badges?: string[];
  analysis?: string | null;
  risk?: string | null;
  catalyst?: string | null;
  nextStep?: string | null;
};

function sectionLabelClass(accent: "cyan" | "rose") {
  return accent === "rose"
    ? "text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-200/78"
    : "text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/78";
}

function tonePillClass(tone?: SigiResponseCardData["tone"]) {
  switch (tone) {
    case "bullish":
      return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
    case "bearish":
      return "border-rose-400/25 bg-rose-400/10 text-rose-200";
    case "caution":
      return "border-amber-400/25 bg-amber-400/10 text-amber-200";
    default:
      return "border-cyan-400/25 bg-cyan-400/10 text-cyan-100";
  }
}

export default function SigiResponseCard({
  response,
  onAction,
  onTickerClick,
  showQuestion = true,
}: {
  response: SigiResponseCardData;
  onAction?: (() => void) | null;
  onTickerClick?: ((ticker: string) => void) | null;
  showQuestion?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function buildTickerUrl(ticker: string) {
    const baseUrl = buildStockLiveUrl(ticker);

    if (searchParams.get("mobilePreview") !== "1") {
      return baseUrl;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("mobilePreview", "1");
    const nextQuery = nextParams.toString();
    return nextQuery ? `${baseUrl}?${nextQuery}` : baseUrl;
  }

  return (
    <div className="rounded-[30px] border border-cyan-400/14 bg-[linear-gradient(180deg,rgba(9,14,28,0.96),rgba(4,8,20,0.92))] p-5 shadow-[0_16px_44px_rgba(0,0,0,0.34)]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/76">
        Sigi Read
      </div>
      {showQuestion && response.question ? (
        <div className="mt-2 text-sm text-white/42">
          Question: {response.question}
        </div>
      ) : null}
      {response.title ? (
        <div className="mt-3 max-w-[24rem] text-[1.7rem] font-black leading-[1.05] tracking-[-0.03em] text-white sm:text-[1.9rem]">
          {response.title}
        </div>
      ) : null}
      {response.tone || response.badges?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {response.tone ? (
            <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${tonePillClass(response.tone)}`}>
              {response.tone}
            </span>
          ) : null}
          {(response.badges ?? []).slice(0, 4).map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70"
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-5 border-t border-white/8 pt-4 whitespace-pre-wrap text-[15px] leading-7 text-white/74">
        {renderTickerParagraphs(response.summary, {
          onTickerClick: (ticker) => {
            if (onTickerClick) {
              onTickerClick(ticker);
              return;
            }

            router.push(buildTickerUrl(ticker));
          },
        })}
      </div>
      {response.analysis || response.risk || response.catalyst || response.nextStep ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {response.analysis ? (
            <div className="rounded-3xl border border-cyan-400/14 bg-[linear-gradient(180deg,rgba(13,20,38,0.82),rgba(7,11,24,0.8))] p-4 sm:col-span-2">
              <div className={sectionLabelClass("cyan")}>
                Analysis
              </div>
              <div className="mt-3 text-[15px] leading-7 text-white/74">{response.analysis}</div>
            </div>
          ) : null}
          {response.risk ? (
            <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,15,24,0.78),rgba(10,8,16,0.76))] p-4">
              <div className={sectionLabelClass("rose")}>
                Risk
              </div>
              <div className="mt-3 text-sm leading-6 text-white/72">{response.risk}</div>
            </div>
          ) : null}
          {response.catalyst ? (
            <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,28,0.8),rgba(7,10,18,0.76))] p-4">
              <div className={sectionLabelClass("cyan")}>
                Catalyst
              </div>
              <div className="mt-3 text-sm leading-6 text-white/72">{response.catalyst}</div>
            </div>
          ) : null}
          {response.nextStep ? (
            <div className="rounded-3xl border border-cyan-400/22 bg-[linear-gradient(180deg,rgba(10,42,54,0.28),rgba(8,18,28,0.82))] p-4 shadow-[0_0_0_1px_rgba(34,211,238,0.04)] sm:col-span-2">
              <div className={sectionLabelClass("cyan")}>
                Next Step
              </div>
              <div className="mt-3 text-[15px] leading-7 text-cyan-50/92">{response.nextStep}</div>
            </div>
          ) : null}
        </div>
      ) : null}
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-11 items-center rounded-2xl border border-cyan-400/28 bg-cyan-400/12 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/18"
        >
          {response.actionLabel ?? "Open Chart"}
        </button>
      ) : null}
    </div>
  );
}