"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchCompanyProfile } from "@/lib/companyCache";
import { buildStockLiveUrl } from "@/lib/sigi/sigiNavigation";

type CompanyProfile = {
  ticker: string;
  name?: string;
  description?: string;
  sector?: string;
  industry?: string;
  error?: string;
};

const MISSING_PROFILE_COPY = "Company profile is not available yet.";

export default function CompanyHoverCard({
  ticker,
  onClose,
  onAnalyze,
}: {
  ticker: string;
  onClose: () => void;
  onAnalyze: () => void;
}) {
  const [data, setData] = useState<CompanyProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const normalizedTicker = ticker.trim().toUpperCase();

  useEffect(() => {
    let mounted = true;

    setStatus("loading");
    setData(null);

    void fetchCompanyProfile(ticker)
      .then((res) => {
        if (!mounted) return;

        if (!res) {
          setStatus("error");
          return;
        }

        setData(res);
        setStatus("ready");
      })
      .catch(() => {
        if (mounted) setStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, [ticker]);

  const detailCopy =
    status === "loading"
      ? "Loading company profile..."
      : status === "error" || !data
        ? "Company profile is not available yet, but Sigi can still analyze the setup."
        : data.description && data.description !== MISSING_PROFILE_COPY
          ? data.description
          : "Sigi has this ticker ready for a deeper chart and setup read.";

  const companyName =
    status === "ready" && data?.name && data.name !== data.ticker ? data.name : null;

  return (
    <div className="text-xs">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Sigi Focus
          </div>
          <div className="mt-1 text-xl font-bold text-white">{normalizedTicker}</div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60 hover:text-white"
        >
          ×
        </button>
      </div>

      {companyName ? <div className="text-sm font-medium text-white/82">{companyName}</div> : null}

      <div className="mt-2 line-clamp-3 text-sm leading-6 text-white/68">{detailCopy}</div>

      {status === "ready" && data ? (
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-white/40">
          {data.sector ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              {data.sector}
            </span>
          ) : null}
          {data.industry ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              {data.industry}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onAnalyze}
          className="rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/25"
        >
          Analyze with Sigi
        </button>

        <Link
          href={buildStockLiveUrl(normalizedTicker)}
          onClick={onClose}
          className="rounded-xl border border-emerald-300/40 bg-emerald-400/20 px-3 py-2 text-center text-xs font-bold text-emerald-100 shadow-[0_0_22px_rgba(52,211,153,0.28)] hover:bg-emerald-400/30"
        >
          Open Chart →
        </Link>
      </div>
    </div>
  );
}