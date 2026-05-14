"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { openMobileSigiSheet } from "@/components/shell/mobileSigiSheetEvents";
import { useSigiTier } from "@/hooks/useSigiTier";
import { renderTickerParagraphs } from "@/components/sigi/renderTickerText";
import { buildMetricContextAnswer } from "@/lib/sigi/sigiMetricContext";
import { getSigiProfile } from "@/lib/sigi/sigiProfile";
import { getVisibleSigiTextFromPayload } from "@/lib/sigi/responseVisibility";

type MetricCard = {
  label: string;
  term: string;
  value: string;
  rawValue?: string | number | null;
};

type StockFundamentalsGridProps = {
  ticker: string;
  stockName?: string | null;
  metrics: MetricCard[];
};

const EDUCATION_PROMPTS: Record<string, string> = {
  beta: "What is Beta?",
  "52 week high": "What is 52-week high?",
  "52 week low": "What is 52-week low?",
};

function FundamentalTile({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 rounded-2xl border border-white/10 bg-white/3 p-3 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/10 md:p-4"
    >
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/40 md:text-xs md:tracking-[0.18em]">
        {label}
      </div>
      <div className="mt-2 text-[1.125rem] leading-none font-black tracking-tight text-white md:text-lg xl:text-xl">
        {value || "—"}
      </div>
      <div className="mt-2 text-[11px] leading-5 text-cyan-300 md:text-xs">Ask SIGI what this means</div>
    </button>
  );
}

export default function StockFundamentalsGrid({
  ticker,
  stockName,
  metrics,
}: StockFundamentalsGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tier } = useSigiTier();
  const [sigiRead, setSigiRead] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMobilePreview = searchParams.get("mobilePreview") === "1";
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const hasSigiSmart = tier === "smart" || tier === "pro";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileViewport(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

  function openMetricInMobileSigi(prompt: string) {
    openMobileSigiSheet({
      prompt: `${prompt} Focus on ${ticker}.`,
      autoSubmit: true,
    });
  }

  async function handleAskSigi(prompt: string) {
    setLoading(true);
    setError(null);

    try {
      const contextRes = await fetch(
        `/api/sigi/context?ticker=${encodeURIComponent(ticker)}`,
        {
          cache: "no-store",
        }
      );

      const contextData = await contextRes.json();

      if (!contextRes.ok) {
        throw new Error(contextData?.error || "Unable to load stock context.");
      }

      const res = await fetch("/api/sigi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `${prompt} Focus on ${ticker}.`,
          stock: contextData?.stock || { ticker },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Sigi request failed.");
      }

      setSigiRead(getVisibleSigiTextFromPayload(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sigi request failed.");
    } finally {
      setLoading(false);
    }
  }

  function explainMetric(term: string, value?: string | number | null) {
    const profile = getSigiProfile();

    const response = buildMetricContextAnswer({
      term,
      value,
      ticker,
      name: stockName,
      userName: profile?.name || "friend",
    });

    setError(null);
    setSigiRead(response);
    setFollowUps([
      `Explain ${term} simply`,
      `Is ${ticker} strong fundamentally?`,
      `Show trade setup for ${ticker}`,
    ]);
  }

  function handleMetricClick(term: string, value?: string | number | null) {
    if (!hasSigiSmart) {
      router.push("/auth/upgrade?plan=smart");
      return;
    }

    const educationPrompt = EDUCATION_PROMPTS[term.trim().toLowerCase()];
    const shouldOpenMobileSheet = isMobilePreview || isMobileViewport;

    if (shouldOpenMobileSheet) {
      openMetricInMobileSigi(educationPrompt ?? `What does ${term} mean for ${ticker}?`);
      return;
    }

    if (educationPrompt) {
      setFollowUps([]);
      void handleAskSigi(educationPrompt);
      return;
    }

    explainMetric(term, value);
  }

  async function handleFollowUp(prompt: string) {
    const explainMatch = prompt.match(/^Explain\s+(.+?)\s+simply$/i);

    if (explainMatch?.[1]) {
      const matchingMetric = metrics.find(
        (metric) => metric.term.toLowerCase() === explainMatch[1].trim().toLowerCase()
      );

      explainMetric(explainMatch[1].trim(), matchingMetric?.rawValue ?? null);
      return;
    }

    await handleAskSigi(prompt);
  }

  return (
    <>
      <div className={isMobilePreview ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 gap-3 md:grid-cols-5"}>
        {metrics.map((metric) => (
          <FundamentalTile
            key={metric.label}
            label={metric.label}
            value={metric.value}
            onClick={() => handleMetricClick(metric.term, metric.rawValue ?? null)}
          />
        ))}
      </div>

      <div className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
        {hasSigiSmart
          ? "Tap any metric for SIGI context"
          : "Upgrade to Smart to unlock SIGI metric context"}
      </div>

      {sigiRead ? (
        <div className="mt-4 rounded-2xl border border-cyan-400/14 bg-cyan-400/6 p-4 text-sm leading-7 text-white/80">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
            SIGI Metric Read
          </div>
          <div className="whitespace-pre-wrap">{renderTickerParagraphs(sigiRead)}</div>

          {followUps.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {followUps.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => void handleFollowUp(item)}
                  disabled={loading}
                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/15 hover:shadow-[0_0_16px_rgba(34,211,238,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}

          {loading ? <div className="mt-3 text-xs text-white/50">SIGI is thinking...</div> : null}
          {error ? <div className="mt-3 text-xs text-rose-300">{error}</div> : null}
        </div>
      ) : null}
    </>
  );
}