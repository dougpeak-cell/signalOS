"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type SigiAnalystLeader = {
  analyst: string;
  firm: string;
  sector: string;
  successRate: string;
  avgReturn: string;
  coveredNames: string[];
  mostRecentPick: string;
  strongestCall: string;
  reason: string;
  risk: string;
};

type TopPickApiResponse = {
  sector: string;
  ticker: string;
  company: string;
  analyst: string;
  firm: string;
  analystAvgReturn: number;
  successRate: number;
  currentPrice: number;
  targetPrice: number;
  upside: number;
  convictionScore: number;
  targetUpdated: string;
  trend: string;
  sigiReason: string;
};

type LegacyTopPickResponse = {
  intelligence?: SigiAnalystLeader;
  thesis?: SigiAnalystLeader;
};

const sectors = [
  "Technology",
  "Healthcare",
  "Financial Services",
  "Industrials",
  "Consumer Cyclical",
  "Consumer Defensive",
  "Energy",
  "Communication Services",
  "Utilities",
  "Real Estate",
  "Basic Materials",
];

export default function SigiTopAnalystPick({
  onLeaderChange,
}: {
  onLeaderChange?: (leader: SigiAnalystLeader | null) => void;
}) {
  const router = useRouter();
  const [activeSector, setActiveSector] = useState("");
  const [hasSelectedSector, setHasSelectedSector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLeader, setAiLeader] = useState<SigiAnalystLeader | null>(null);
  const [topPick, setTopPick] = useState<TopPickApiResponse | null>(null);

  const fallbackTopPick = useMemo(
    () => buildFallbackTopPick(activeSector || "Select a sector"),
    [activeSector]
  );

  const fallbackLeader = useMemo<SigiAnalystLeader>(
    () => ({
      analyst: "Sigi AI Leader",
      firm: "SigiOS Analyst Flow",
      sector: activeSector || "Select a sector",
      successRate: "—",
      avgReturn: "—",
      coveredNames: ["—"],
      mostRecentPick: hasSelectedSector
        ? "Needs live analyst-feed confirmation before publishing."
        : "Select a sector button to load the current top analyst pick.",
      strongestCall: "—",
      reason: hasSelectedSector
        ? "Sigi is ready to rank the strongest stock setup in this sector once live analyst-flow data is connected."
        : "Select a sector first so Sigi can load the matching analyst leader instead of a placeholder.",
      risk: hasSelectedSector
        ? "No live top analyst pick has been calculated yet for this sector."
        : "The analyst pick action stays locked until a sector button is selected.",
    }),
    [activeSector, hasSelectedSector]
  );

  const leader = useMemo(
    () => aiLeader ?? mapTopPickResponseToLeader(topPick ?? fallbackTopPick) ?? fallbackLeader,
    [aiLeader, fallbackLeader, fallbackTopPick, topPick]
  );
  const displayTopPick = topPick ?? fallbackTopPick;

  useEffect(() => {
    onLeaderChange?.(leader);
  }, [leader, onLeaderChange]);

  useEffect(() => {
    if (!hasSelectedSector || !activeSector || topPick?.sector === activeSector) {
      return;
    }

    void requestTopPick(activeSector);
  }, [activeSector, hasSelectedSector, topPick?.sector]);

  const displayAnalyst = isDisclosureHidden(leader.analyst) ? "Sigi Sector Leader" : leader.analyst;
  const displayFirm = isDisclosureHidden(leader.firm) ? "Live analyst feed" : leader.firm;

  async function requestTopPick(nextSector: string) {
    const sector = nextSector.trim();
    if (!sector) return;

    setLoading(true);
    setActiveSector(sector);

    try {
      const res = await fetch(`/api/experts/top-pick?sector=${encodeURIComponent(sector)}`, {
        cache: "no-store",
      });

      const data = (await res.json()) as Partial<
        TopPickApiResponse & SigiAnalystLeader & LegacyTopPickResponse
      >;
      const nextLeader = isTopPickApiResponse(data)
        ? mapTopPickResponseToLeader(data)
        : ((data.intelligence ?? data.thesis ?? data) as SigiAnalystLeader);
      if (isTopPickApiResponse(data)) {
        setTopPick(data);
      } else {
        setTopPick(null);
      }
      setAiLeader(nextLeader);
    } catch (error) {
      console.error("Sigi top analyst pick error:", error);
      setTopPick(null);
      setAiLeader(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectSector(sector: string) {
    setHasSelectedSector(true);
    setActiveSector(sector);
    void requestTopPick(sector);
  }

  function handleAskSigi() {
    const ticker = displayTopPick.ticker?.trim().toUpperCase();
    const sector = activeSector.trim();

    if (!hasSelectedSector || !sector || !ticker || ticker === "—") {
      return;
    }

    const question = `Why is ${ticker} your top analyst pick in ${sector}?`;
    router.push(
      `/today?ticker=${encodeURIComponent(ticker)}&question=${encodeURIComponent(question)}&answerMode=short#sigi-command-panel`
    );
  }

  return (
    <section className="rounded-4xl border border-cyan-400/20 bg-[#020817] p-6 shadow-[0_0_60px_rgba(34,211,238,0.08)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
            Sigi Analyst Intelligence
          </p>
          <h2 className="mt-2 text-3xl font-black text-white sm:text-[2rem]">
            🏆 Sigi Top Analyst Pick
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Sigi combines analyst performance, price targets, momentum, sector
            leadership, and market conditions to identify the highest conviction
            stock in each sector.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAskSigi}
          disabled={loading || !hasSelectedSector || !activeSector || displayTopPick.ticker === "—"}
          className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-black hover:bg-cyan-200 disabled:opacity-50"
        >
          {loading
            ? "Sigi thinking..."
            : hasSelectedSector
              ? "Ask Sigi About Analyst Pick"
              : "Select Sector First"}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {sectors.map((sector) => (
          <button
            key={sector}
            type="button"
            onClick={() => handleSelectSector(sector)}
            disabled={loading}
            className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] transition ${
              activeSector === sector
                ? "border-cyan-300 bg-cyan-300/15 text-cyan-100"
                : "border-white/10 bg-white/5 text-slate-400 hover:border-cyan-300/30 hover:text-white"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {sector}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-950/30 to-slate-950 p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">Top Pick</div>
          <div className="mt-3 text-5xl font-bold text-white">{displayTopPick.ticker}</div>
          <div className="mt-2 text-slate-300">{displayTopPick.company}</div>
          <div className="mt-6 space-y-3 text-sm text-slate-300">
            <div className="flex justify-between gap-3">
              <span>Current Price</span>
              <span>{formatDollars(displayTopPick.currentPrice)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Price Target</span>
              <span className="text-emerald-300">{formatDollars(displayTopPick.targetPrice)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Upside</span>
              <span className="text-emerald-300">{formatPercent(displayTopPick.upside)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Sigi Conviction Score</span>
              <span className="text-cyan-300">{Math.round(displayTopPick.convictionScore)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Target Updated</span>
              <span>{formatDateLabel(displayTopPick.targetUpdated)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push(`/stocks/${encodeURIComponent(displayTopPick.ticker)}/live`)}
            disabled={!displayTopPick.ticker || displayTopPick.ticker === "—"}
            className="mt-6 inline-flex items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-100 hover:border-cyan-300/40 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {`Open ${displayTopPick.ticker} Workspace`}
          </button>
        </div>

        <div className="rounded-3xl border border-cyan-400/20 bg-slate-950 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
            Why Sigi Selected This
          </p>

          <p className="mt-5 text-slate-300 leading-7">{displayTopPick.sigiReason}</p>

          <div className="mt-6 rounded-2xl border border-cyan-400/20 p-4">
            <div className="font-semibold text-white">Top Analyst</div>
            <div className="mt-2 text-slate-300">{displayAnalyst}</div>
            <div className="text-sm text-slate-400">{displayFirm}</div>
            <div className="mt-4 flex justify-between gap-3 text-sm">
              <span>Avg Return</span>
              <span className="text-cyan-300">{formatPercent(displayTopPick.analystAvgReturn, false)}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span>Success Rate</span>
              <span className="text-cyan-300">{Math.round(displayTopPick.successRate)}%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function isDisclosureHidden(value: unknown) {
  if (typeof value !== "string") return false;

  const normalized = value.trim().toLowerCase();
  return (
    normalized === "" ||
    normalized === "—" ||
    normalized === "not disclosed" ||
    normalized === "n/a" ||
    normalized.includes("needs live analyst-feed confirmation")
  );
}

function isTopPickApiResponse(value: unknown): value is TopPickApiResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.ticker === "string" &&
    typeof candidate.company === "string" &&
    typeof candidate.analyst === "string" &&
    typeof candidate.firm === "string" &&
    typeof candidate.sigiReason === "string"
  );
}

function mapTopPickResponseToLeader(value: TopPickApiResponse): SigiAnalystLeader {
  const signedAvgReturn = value.analystAvgReturn > 0 ? `+${value.analystAvgReturn.toFixed(1)}%` : `${value.analystAvgReturn.toFixed(1)}%`;
  const signedUpside = value.upside > 0 ? `+${value.upside.toFixed(1)}%` : `${value.upside.toFixed(1)}%`;

  return {
    analyst: value.analyst,
    firm: value.firm,
    sector: value.sector,
    successRate: `${Math.round(value.successRate)}%`,
    avgReturn: signedAvgReturn,
    coveredNames: [value.ticker, value.company],
    mostRecentPick: `${value.ticker} - ${value.trend} (${signedUpside})`,
    strongestCall: value.ticker,
    reason: value.sigiReason,
    risk: `${value.company} can lose leadership quickly if momentum fades, targets reset lower, or sector rotation turns defensive.`,
  };
}

function buildFallbackTopPick(sector: string): TopPickApiResponse {
  return {
    sector,
    ticker: "—",
    company: "Live top pick unavailable",
    analyst: "Sigi Analyst Desk",
    firm: "SigiOS Intelligence",
    analystAvgReturn: 0,
    successRate: 0,
    currentPrice: 0,
    targetPrice: 0,
    upside: 0,
    convictionScore: 0,
    targetUpdated: "",
    trend: "Awaiting data",
    sigiReason:
      "Sigi is waiting for live analyst-target and momentum inputs before publishing the top sector pick.",
  };
}

function formatDollars(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number, includeSign = true) {
  const signed = includeSign && value > 0 ? "+" : "";
  return `${signed}${value.toFixed(1)}%`;
}

function parseDateLabel(value: string) {
  const normalized = value.trim();
  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 12);
  }

  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return new Date(parsed);
}

function formatDateLabel(value: string) {
  if (!value) {
    return "—";
  }

  const parsed = parseDateLabel(value);
  if (!parsed) {
    return "—";
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const parsedStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffDays = Math.floor(
    (todayStart.getTime() - parsedStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays >= 0 && diffDays < 30) {
    if (diffDays === 0) {
      return "Today";
    }

    if (diffDays === 1) {
      return "1 day ago";
    }

    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }

    const weeksAgo = Math.floor(diffDays / 7);
    return weeksAgo === 1 ? "1 week ago" : `${weeksAgo} weeks ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}
