"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { renderTickerParagraphs } from "@/components/sigi/renderTickerText";
import { buildStockLiveUrl } from "@/lib/sigi/sigiNavigation";

export type SigiResponseCardData = {
  question?: string | null;
  title?: string | null;
  summary: string;
  actionLabel?: string | null;
};

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
    <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/76">
        Sigi Read
      </div>
      {showQuestion && response.question ? (
        <div className="mt-2 text-sm text-white/45">
          Question: {response.question}
        </div>
      ) : null}
      {response.title ? (
        <div className="mt-2 text-lg font-bold text-white">
          {response.title}
        </div>
      ) : null}
      <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/74">
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
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 inline-flex min-h-11 items-center rounded-2xl border border-cyan-400/28 bg-cyan-400/12 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/18"
        >
          {response.actionLabel ?? "Open Chart"}
        </button>
      ) : null}
    </div>
  );
}