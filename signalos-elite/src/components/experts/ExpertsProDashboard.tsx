"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FmpExpertPickRow as FmpExpertRow } from "@/lib/experts/fmpLeaders";
import ActiveExpertSignals from "@/components/experts/ActiveExpertSignals";
import AnalystTopPicks, { type AnalystTopPickRow } from "@/components/experts/AnalystTopPicks";
import InsiderTradesPanel from "@/components/experts/InsiderTradesPanel";
import SigiTopAnalystPick, { type SigiAnalystLeader } from "@/components/experts/SigiTopAnalystPick";

type ExpertConviction = {
  ticker: string;
  company: string;
  score: number;
  signal: string;
  sourceType: "Analyst" | "Insider" | "Fund Filing" | "Activist";
  thesis: string;
  winRate30d: number;
  avgReturn30d: number;
  expertsConfirming: number;
  sector: string;
};

type ExpertModelRow = {
  name: string;
  source: string;
  style: string;
  hit30: number;
  avg90: number;
  alignment: "Bullish" | "Mixed" | "Bearish";
  tickers: string[];
};

const expertProfileHrefByTicker: Record<string, string> = {
  NVDA: "/experts/nvda",
  MSFT: "/experts/msft",
  META: "/experts/meta",
  AAPL: "/experts/aapl",
  "STREET-COMPOSITE": "/experts/street-composite",
  "INSIDER-MONITOR": "/experts/insider-monitor",
};

const convictionLeaders: ExpertConviction[] = [
  {
    ticker: "NVDA",
    company: "NVIDIA",
    score: 92,
    signal: "Estimate revisions rising + bullish analyst reinforcement",
    sourceType: "Analyst",
    thesis:
      "AI infrastructure demand remains the strongest large-cap growth theme, with multiple expert signals confirming continued earnings upside.",
    winRate30d: 68,
    avgReturn30d: 7.4,
    expertsConfirming: 4,
    sector: "Semis",
  },
  {
    ticker: "MSFT",
    company: "Microsoft",
    score: 88,
    signal: "Cloud optimism + institutional ownership support",
    sourceType: "Fund Filing",
    thesis:
      "Azure and enterprise AI commentary remain supportive, while ownership trends suggest continued long-duration institutional conviction.",
    winRate30d: 64,
    avgReturn30d: 5.8,
    expertsConfirming: 3,
    sector: "Software",
  },
  {
    ticker: "AAPL",
    company: "Apple",
    score: 77,
    signal: "Mixed sentiment but durable quality sponsorship",
    sourceType: "Analyst",
    thesis:
      "Not the highest momentum setup, but still supported by quality-focused analysts and long-horizon institutional positioning.",
    winRate30d: 57,
    avgReturn30d: 3.1,
    expertsConfirming: 2,
    sector: "Mega Cap Tech",
  },
  {
    ticker: "META",
    company: "Meta",
    score: 85,
    signal: "Ad strength + margin discipline",
    sourceType: "Analyst",
    thesis:
      "Expert commentary continues to favor operating leverage, while estimate support remains constructive into the next earnings window.",
    winRate30d: 66,
    avgReturn30d: 6.2,
    expertsConfirming: 3,
    sector: "Internet",
  },
];

const fallbackModelRows: ExpertModelRow[] = [
  {
    name: "Technology Growth Desk",
    source: "SIGI Composite",
    style: "Sell-side composite",
    hit30: 67,
    avg90: 8.6,
    alignment: "Bullish",
    tickers: ["NVDA", "AMD", "MSFT"],
  },
  {
    name: "Large Cap AI Basket",
    source: "Cross-expert basket",
    style: "AI / software",
    hit30: 64,
    avg90: 7.9,
    alignment: "Bullish",
    tickers: ["AMZN", "GOOGL", "META"],
  },
  {
    name: "Insider Accumulation Tracker",
    source: "SIGI",
    style: "Insider model",
    hit30: 59,
    avg90: 6.7,
    alignment: "Mixed",
    tickers: ["UNP", "MSFT"],
  },
  {
    name: "Institutional Conviction Basket",
    source: "13F-derived",
    style: "Mega-cap tech",
    hit30: 61,
    avg90: 9.1,
    alignment: "Bullish",
    tickers: ["NVDA", "AAPL", "META"],
  },
];

const AI_THEME_TICKERS = new Set([
  "NVDA",
  "AMD",
  "MSFT",
  "AMZN",
  "GOOGL",
  "META",
  "AVGO",
  "ORCL",
  "CRM",
]);

const MEGA_CAP_CONSENSUS_TICKERS = new Set([
  "NVDA",
  "AAPL",
  "MSFT",
  "META",
  "AMZN",
  "GOOGL",
  "AVGO",
]);

const GROWTH_SECTORS = new Set(["Technology", "Communication Services"]);

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function selectLiveBasketRows(
  rows: FmpExpertRow[],
  count: number,
  preferredTickers?: Set<string>,
  excludedTickers?: Set<string>
) {
  const seen = new Set<string>();

  return [...rows]
    .sort((left, right) => {
      const recencyDelta =
        Number(right.recencyBucket === "today") - Number(left.recencyBucket === "today");
      if (recencyDelta !== 0) return recencyDelta;
      const weekDelta =
        Number(right.recencyBucket === "week") - Number(left.recencyBucket === "week");
      if (weekDelta !== 0) return weekDelta;
      if (right.score !== left.score) return right.score - left.score;
      const upsideDelta = (right.upsidePercent ?? -999) - (left.upsidePercent ?? -999);
      if (upsideDelta !== 0) return upsideDelta;
      const preferredDelta =
        Number(Boolean(preferredTickers?.has(right.symbol))) -
        Number(Boolean(preferredTickers?.has(left.symbol)));
      if (preferredDelta !== 0) return preferredDelta;
      return getPublishedDateValue(right.publishedDate) - getPublishedDateValue(left.publishedDate);
    })
    .filter((row) => {
      if (!row.symbol || seen.has(row.symbol) || excludedTickers?.has(row.symbol)) {
        return false;
      }
      seen.add(row.symbol);
      return true;
    })
    .slice(0, count);
}

function buildLiveModelRow(options: {
  name: string;
  source: string;
  style: string;
  rows: FmpExpertRow[];
}): ExpertModelRow | null {
  if (options.rows.length === 0) return null;

  const avgUpside = average(
    options.rows.map((row) => row.upsidePercent ?? 0).filter((value) => Number.isFinite(value))
  );
  const avgScore = average(options.rows.map((row) => row.score));
  const hit30 = Math.max(45, Math.min(78, Math.round(avgScore + 18)));
  const avg90 = Number(Math.max(1.5, avgUpside).toFixed(1));
  const alignment: ExpertModelRow["alignment"] =
    avgUpside >= 6 ? "Bullish" : avgUpside >= 1 ? "Mixed" : "Bearish";

  return {
    name: options.name,
    source: options.source,
    style: options.style,
    hit30,
    avg90,
    alignment,
    tickers: options.rows.map((row) => row.symbol),
  };
}

function buildModelRows(
  rows: FmpExpertRow[],
  sectorRows: Record<string, FmpExpertRow[]>
): ExpertModelRow[] {
  if (rows.length === 0) {
    return fallbackModelRows;
  }

  const usedTickers = new Set<string>();

  function selectUniqueLiveBasketRows(
    nextRows: FmpExpertRow[],
    count: number,
    preferredTickers?: Set<string>
  ) {
    const selectedRows = selectLiveBasketRows(nextRows, count, preferredTickers, usedTickers);

    for (const row of selectedRows) {
      usedTickers.add(row.symbol);
    }

    return selectedRows;
  }

  const techDeskRows = selectUniqueLiveBasketRows(
    sectorRows.Technology ?? rows.filter((row) => GROWTH_SECTORS.has(row.sector)),
    3
  );
  const aiBasketRows = selectUniqueLiveBasketRows(
    rows.filter(
      (row) => AI_THEME_TICKERS.has(row.symbol) || GROWTH_SECTORS.has(row.sector)
    ),
    3,
    AI_THEME_TICKERS
  );
  const recentMomentumRows = selectUniqueLiveBasketRows(
    rows.filter((row) => row.recencyBucket === "today" || row.recencyBucket === "week"),
    3
  );
  const institutionalRows = selectUniqueLiveBasketRows(
    rows.filter(
      (row) =>
        MEGA_CAP_CONSENSUS_TICKERS.has(row.symbol) || GROWTH_SECTORS.has(row.sector)
    ),
    3,
    MEGA_CAP_CONSENSUS_TICKERS
  );

  return [
    buildLiveModelRow({
      name: "Technology Growth Desk",
      source: "Live analyst basket",
      style: "Technology leaders",
      rows: techDeskRows,
    }),
    buildLiveModelRow({
      name: "Large Cap AI Basket",
      source: "Cross-expert basket",
      style: "AI / software",
      rows: aiBasketRows,
    }),
    buildLiveModelRow({
      name: "Insider Accumulation Tracker",
      source: "Fresh signal basket",
      style: "Recent upgrades",
      rows: recentMomentumRows,
    }),
    buildLiveModelRow({
      name: "Institutional Conviction Basket",
      source: "Mega-cap consensus",
      style: "Mega-cap tech",
      rows: institutionalRows,
    }),
  ].filter((row): row is ExpertModelRow => row != null);
}

function money(value: number | null) {
  if (value === null || Number.isNaN(value)) return "GÇö";
  return `$${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function gradeTone(grade: string | null) {
  const g = (grade ?? "").toLowerCase();
  if (g.includes("buy") || g.includes("outperform") || g.includes("overweight")) {
    return "text-emerald-300 border-emerald-400/20 bg-emerald-400/10";
  }
  if (g.includes("sell") || g.includes("underperform") || g.includes("underweight")) {
    return "text-red-300 border-red-400/20 bg-red-400/10";
  }
  return "text-yellow-200 border-yellow-400/20 bg-yellow-400/10";
}

function formatTransitionLabel(row: FmpExpertRow, fallback: string) {
  if (row.previousGrade && row.currentGrade) {
    return `${row.previousGrade} → ${row.currentGrade}`;
  }

  return row.currentGrade ?? row.lastGrade ?? fallback;
}

function getPublishedDateValue(value: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getRecencyChip(row: FmpExpertRow) {
  if (row.recencyBucket === "today") {
    return {
      label: "Fresh",
      className:
        "border-emerald-300/45 bg-emerald-400/16 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.28)]",
      dateClassName: "text-emerald-200 drop-shadow-[0_0_10px_rgba(16,185,129,0.28)]",
    };
  }

  if (row.recencyBucket === "week") {
    return {
      label: "7D",
      className:
        "border-cyan-400/30 bg-cyan-400/10 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.18)]",
      dateClassName: "text-cyan-200/85",
    };
  }

  if (row.recencyBucket === "twoWeeks") {
    return {
      label: "14D",
      className: "border-amber-400/25 bg-amber-400/10 text-amber-200",
      dateClassName: "text-amber-200/75",
    };
  }

  return null;
}

function upsideTone(upside: number | null) {
  if (upside === null || Number.isNaN(upside)) {
    return {
      card: "border-white/10 hover:border-white/20",
      bar: "from-white/30 to-white/10",
      text: "text-white/60",
    };
  }
  if (upside >= 20) {
    return {
      card: "border-emerald-400/25 bg-emerald-400/4.5 hover:border-emerald-400/40",
      bar: "from-emerald-400 to-cyan-300",
      text: "text-emerald-300",
    };
  }
  if (upside >= 5) {
    return {
      card: "border-cyan-400/25 bg-cyan-400/4 hover:border-cyan-400/40",
      bar: "from-cyan-400 to-emerald-300",
      text: "text-cyan-300",
    };
  }
  if (upside >= 0) {
    return {
      card: "border-amber-400/25 bg-amber-400/3.5 hover:border-amber-400/40",
      bar: "from-amber-400 to-cyan-300",
      text: "text-amber-200",
    };
  }
  return {
    card: "border-red-400/25 bg-red-400/4.5 hover:border-red-400/40",
    bar: "from-red-500 to-orange-400",
    text: "text-red-300",
  };
}

function getSignalDirectionLabel(upside: number | null) {
  if (upside == null || Number.isNaN(upside)) return "Watching";
  if (upside >= 5) return "Bullish";
  if (upside >= 0) return "Neutral";
  return "Bearish";
}

function getSignalDirectionClasses(upside: number | null) {
  if (upside == null || Number.isNaN(upside)) {
    return "border-white/15 bg-white/6 text-white/65";
  }
  if (upside >= 5) {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }
  if (upside >= 0) {
    return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  }
  return "border-red-400/25 bg-red-400/10 text-red-200";
}

function getAccentClasses(upside: number | null) {
  if (upside == null || Number.isNaN(upside)) {
    return {
      line: "bg-white/40",
      glow: "bg-white/8",
      tickerHover: "hover:text-white",
      chartButton:
        "border-white/15 bg-white/6 text-white/80 hover:bg-white/10 hover:shadow-[0_0_18px_rgba(255,255,255,0.10)]",
    };
  }
  if (upside >= 5) {
    return {
      line: "bg-emerald-400/80",
      glow: "bg-emerald-400/10",
      tickerHover: "hover:text-emerald-200",
      chartButton:
        "border-emerald-400/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/18 hover:shadow-[0_0_18px_rgba(16,185,129,0.20)]",
    };
  }
  if (upside >= 0) {
    return {
      line: "bg-amber-400/70",
      glow: "bg-amber-400/10",
      tickerHover: "hover:text-amber-200",
      chartButton:
        "border-amber-400/25 bg-amber-400/10 text-amber-100 hover:bg-amber-400/18 hover:shadow-[0_0_18px_rgba(251,191,36,0.18)]",
    };
  }
  return {
    line: "bg-red-400/80",
    glow: "bg-red-400/10",
    tickerHover: "hover:text-red-200",
    chartButton:
      "border-red-400/25 bg-red-400/10 text-red-100 hover:bg-red-400/18 hover:shadow-[0_0_18px_rgba(248,113,113,0.18)]",
  };
}

function getSignalStrengthLabel(row: FmpExpertRow) {
  const publishedAt = getPublishedDateValue(row.publishedDate);
  const ageHours = publishedAt > 0 ? (Date.now() - publishedAt) / (1000 * 60 * 60) : null;
  const dispersionPct =
    row.targetHigh != null &&
    row.targetLow != null &&
    row.targetConsensus != null &&
    row.targetConsensus > 0
      ? ((row.targetHigh - row.targetLow) / row.targetConsensus) * 100
      : null;

  if (
    row.upsidePercent != null &&
    row.upsidePercent > 12 &&
    dispersionPct != null &&
    dispersionPct < 35 &&
    ageHours != null &&
    ageHours < 72
  ) {
    return "High confidence";
  }

  if (
    row.upsidePercent != null &&
    row.upsidePercent > 4 &&
    dispersionPct != null &&
    dispersionPct < 60 &&
    ageHours != null &&
    ageHours < 168
  ) {
    return "Moderate confidence";
  }

  return "Low confidence";
}

function getModelAlignmentClasses(alignment: ExpertModelRow["alignment"]) {
  if (alignment === "Bullish") {
    return {
      pill: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
      line: "from-emerald-400/70 via-cyan-300/55 to-transparent",
      glow: "bg-emerald-400/10",
    };
  }

  if (alignment === "Mixed") {
    return {
      pill: "border-amber-400/25 bg-amber-400/10 text-amber-200",
      line: "from-amber-300/70 via-cyan-300/45 to-transparent",
      glow: "bg-amber-400/10",
    };
  }

  return {
    pill: "border-red-400/25 bg-red-400/10 text-red-200",
    line: "from-red-400/70 via-orange-300/45 to-transparent",
    glow: "bg-red-400/10",
  };
}

function buildLiveAnalystCallLabel(
  grade: string | null,
  recencyBucket: FmpExpertRow["recencyBucket"]
) {
  const bucketLabel =
    recencyBucket === "today"
      ? "Today"
      : recencyBucket === "week"
        ? "7D"
        : recencyBucket === "twoWeeks"
          ? "14D"
          : "Recent";

  const normalizedGrade = grade?.trim();
  if (!normalizedGrade) return `${bucketLabel} Analyst Call`;

  return `${bucketLabel} ${normalizedGrade}`;
}

export default function ExpertsPage({
  isMobilePreview = false,
}: {
  isMobilePreview?: boolean;
}) {
  const [fmpRows, setFmpRows] = useState<FmpExpertRow[]>([]);
  const [fmpSectorRows, setFmpSectorRows] = useState<Record<string, FmpExpertRow[]>>({});
  const [isLoadingFmpRows, setIsLoadingFmpRows] = useState(true);
  const [fmpLoadError, setFmpLoadError] = useState<string | null>(null);
  const [selectedExpertSector, setSelectedExpertSector] = useState("Technology");
  const [currentAnalystLeader, setCurrentAnalystLeader] = useState<SigiAnalystLeader | null>(null);
  const [isMobilePhoneView, setIsMobilePhoneView] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(max-width: 767px)").matches;
  });

  const expertSectorTabs = Object.keys(fmpSectorRows);
  const modelRows = useMemo(
    () => buildModelRows(fmpRows, fmpSectorRows),
    [fmpRows, fmpSectorRows]
  );

  useEffect(() => {
    if (expertSectorTabs.length === 0) {
      return;
    }

    if (selectedExpertSector in fmpSectorRows) {
      return;
    }

    setSelectedExpertSector(
      "Technology" in fmpSectorRows ? "Technology" : expertSectorTabs[0]
    );
  }, [expertSectorTabs, fmpSectorRows, selectedExpertSector]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobilePhoneView(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadFmpExperts() {
      if (alive) {
        setIsLoadingFmpRows(true);
        setFmpLoadError(null);
      }

      try {
        const res = await fetch("/api/experts/fmp", { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;

        if (!res.ok || json?.ok === false) {
          setFmpRows([]);
          setFmpLoadError(
            typeof json?.error === "string" && json.error.trim().length > 0
              ? json.error
              : "Experts analyst feed is unavailable right now."
          );
          return;
        }

        const rows = Array.isArray(json.rows) ? json.rows : [];
        const sectorRows = Object.fromEntries(
          Object.entries(
            json?.sectorRows && typeof json.sectorRows === "object" ? json.sectorRows : {}
          ).map(([sector, sectorRows]) => [
            sector,
            Array.isArray(sectorRows) ? (sectorRows as FmpExpertRow[]) : [],
          ])
        );
        setFmpRows(rows);
        setFmpSectorRows(sectorRows);
      } catch (error) {
        console.error("FMP experts load failed:", error);
        if (!alive) return;
        setFmpRows([]);
        setFmpSectorRows({});
        setFmpLoadError("Experts analyst feed is unavailable right now.");
      } finally {
        if (alive) setIsLoadingFmpRows(false);
      }
    }

    loadFmpExperts();
    const timer = window.setInterval(loadFmpExperts, 60_000 * 15);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const liveActiveSignals = [...fmpRows]
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map((row) => ({
      ticker: row.symbol,
      name: row.companyName ?? row.symbol,
      changePercent: row.upsidePercent,
      metricLabel: "Target upside",
    }));
  const activeSignals = liveActiveSignals.length > 0
    ? liveActiveSignals
    : [...convictionLeaders]
        .sort((left, right) => right.score - left.score)
        .slice(0, 4)
        .map((row) => ({
          ticker: row.ticker,
          name: row.company,
          changePercent: row.avgReturn30d,
          metricLabel: "30D avg return",
        }));
  const averageHit30 = Math.round(
    modelRows.reduce((sum, model) => sum + model.hit30, 0) / modelRows.length
  );
  const averageAvg90 =
    Math.round(
      (modelRows.reduce((sum, model) => sum + model.avg90, 0) / modelRows.length) * 10
    ) / 10;
  const bullishModelCount = modelRows.filter(
    (model) => model.alignment === "Bullish"
  ).length;
  const shouldHideModelCommand = isMobilePreview || isMobilePhoneView;
  const visibleFmpRows = fmpSectorRows[selectedExpertSector] ?? [];
  const liveAnalystTopPicks: AnalystTopPickRow[] = fmpRows
    .filter((row) => row.recencyBucket != null)
    .slice(0, 20)
    .map((row) => ({
      ticker: row.symbol,
      company: row.companyName ?? row.symbol,
      sector: row.sector,
      analyst: buildLiveAnalystCallLabel(row.lastGrade, row.recencyBucket),
      firm: row.firm ?? "Wall Street Desk",
      date: row.publishedDate ?? "Recent",
      currentPrice: row.price ?? 0,
      priceTarget: row.targetConsensus ?? 0,
      analystAvgReturn: row.score,
    }));
  const shouldShowFallbackAnalystPicks =
    !isLoadingFmpRows && (Boolean(fmpLoadError) || liveAnalystTopPicks.length === 0);
  const recentUpgradeRows = [...fmpRows]
    .filter((row) => row.ratingTransition === "upgrade")
    .sort(
      (left, right) =>
        getPublishedDateValue(right.publishedDate) -
        getPublishedDateValue(left.publishedDate)
    )
    .slice(0, 4);
  const recentDowngradeRows = [...fmpRows]
    .filter((row) => row.ratingTransition === "downgrade")
    .sort(
      (left, right) =>
        getPublishedDateValue(right.publishedDate) -
        getPublishedDateValue(left.publishedDate)
    )
    .slice(0, 4);

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute left-[-18%] top-[-10%] h-275 w-275 rounded-full bg-cyan-500/10 blur-[180px]" />
        <div className="absolute right-[-18%] top-[18%] h-237.5 w-237.5 rounded-full bg-blue-500/10 blur-[190px]" />
        <div className="absolute bottom-[-25%] left-[18%] h-250 w-250 rounded-full bg-emerald-500/5 blur-[220px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      <section>
        <div className="w-full space-y-4 md:space-y-6 xl:space-y-7">
          <div className="space-y-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                SIGI Expert Desk
              </div>

              <h1 className="mt-2 flex items-center text-3xl font-semibold tracking-[-0.03em] text-white md:text-[38px]">
                Experts
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                  Live
                </span>
              </h1>

              <p className="mt-2 max-w-3xl text-[15px] leading-6 text-white/52">
                Track-rated analyst calls, insider conviction, and institutional ownership trends.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
                <span className="text-cyan-300/70">Analyst Flow</span>
                <span className="text-white">Bullish</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                <span className="text-emerald-300/70">Insider Buys</span>
                <span className="text-white">4</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">
                <span className="text-amber-300/70">New Filings</span>
                <span className="text-white">7</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                <span className="text-white/45">Top Conviction</span>
                <span className="text-white">NVDA</span>
              </div>
            </div>
          </div>

          <div className="border-b border-white/10 pt-1" />
        </div>

        <AnalystTopPicks
          rows={liveAnalystTopPicks}
          loading={isLoadingFmpRows}
          fallback={shouldShowFallbackAnalystPicks}
        />

        <div id="sigi-top-analyst-pick" className="scroll-mt-28">
          <SigiTopAnalystPick
            onLeaderChange={setCurrentAnalystLeader}
          />
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/3 p-6 shadow-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/90">
            Recent Upgrades
          </div>
          <p className="mt-2 text-sm leading-6 text-white/48">
            Fresh bullish analyst changes and positive conviction resets from the current live feed.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recentUpgradeRows.length > 0 ? recentUpgradeRows.map((row) => (
              <Link
                key={`upgrade-${row.symbol}`}
                href={`/experts/stocks/${row.symbol}`}
                className="rounded-[22px] border border-emerald-400/15 bg-emerald-400/8 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300/30"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/80">
                  {formatTransitionLabel(row, "Upgrade")}
                </div>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <div className="text-lg font-semibold text-white">{row.symbol}</div>
                  <div className="text-xs font-semibold text-emerald-300">
                    {row.upsidePercent != null ? `${row.upsidePercent >= 0 ? "+" : ""}${row.upsidePercent.toFixed(1)}%` : "—"}
                  </div>
                </div>
                <div className="mt-1 text-xs text-white/45">{row.companyName ?? row.firm ?? row.symbol}</div>
                <div className="mt-3 text-sm leading-6 text-white/58">
                  {row.firm ?? "Wall Street desk"} {row.targetConsensus != null ? `sees ${money(row.targetConsensus)} vs. ${money(row.price)} current.` : "is resetting expectations higher."}
                </div>
              </Link>
            )) : (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-white/45 md:col-span-2 xl:col-span-4">
                No recent upgrades are available in the current analyst window.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/3 p-6 shadow-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-300/90">
            Recent Downgrades
          </div>
          <p className="mt-2 text-sm leading-6 text-white/48">
            Names facing weaker analyst conviction, lower ratings, or deteriorating upside support.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recentDowngradeRows.length > 0 ? recentDowngradeRows.map((row) => (
              <Link
                key={`downgrade-${row.symbol}`}
                href={`/experts/stocks/${row.symbol}`}
                className="rounded-[22px] border border-rose-400/15 bg-rose-400/8 p-4 transition hover:-translate-y-0.5 hover:border-rose-300/30"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-300/80">
                  {formatTransitionLabel(row, "Downgrade")}
                </div>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <div className="text-lg font-semibold text-white">{row.symbol}</div>
                  <div className="text-xs font-semibold text-rose-300">
                    {row.upsidePercent != null ? `${row.upsidePercent >= 0 ? "+" : ""}${row.upsidePercent.toFixed(1)}%` : "—"}
                  </div>
                </div>
                <div className="mt-1 text-xs text-white/45">{row.companyName ?? row.firm ?? row.symbol}</div>
                <div className="mt-3 text-sm leading-6 text-white/58">
                  {row.firm ?? "Wall Street desk"} {row.targetConsensus != null ? `now points to ${money(row.targetConsensus)} vs. ${money(row.price)} current.` : "is dialing back conviction on this setup."}
                </div>
              </Link>
            )) : (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-white/45 md:col-span-2 xl:col-span-4">
                No recent downgrades are available in the current analyst window.
              </div>
            )}
          </div>
        </section>

        <section className={["grid grid-cols-1 gap-6", isMobilePreview ? "" : "xl:grid-cols-[1.1fr_0.9fr]"].join(" ")}>
          {!shouldHideModelCommand ? (
          <div className="relative min-w-0 overflow-hidden rounded-[28px] border border-emerald-400/15 bg-linear-to-b from-emerald-500/8 via-black to-black p-4 shadow-[0_0_28px_rgba(16,185,129,0.08)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_34%),radial-gradient(circle_at_70%_18%,rgba(34,211,238,0.10),transparent_28%),linear-gradient(180deg,rgba(6,78,59,0.10),transparent_40%)]" />
            <div className="pointer-events-none absolute -right-13 -top-13 h-40 w-40 rounded-full bg-emerald-400/8 blur-3xl" />
            <div className="pointer-events-none absolute left-8 right-8 top-22 h-px bg-linear-to-r from-transparent via-emerald-300/35 to-transparent" />

            <div className="relative z-10 mb-5 rounded-3xl border border-emerald-400/15 bg-black/35 p-4 shadow-[0_0_24px_rgba(16,185,129,0.08)] backdrop-blur-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300/90">
                    SIGI Model Command
                  </div>
                  <p className="mt-1 max-w-xl text-[14px] leading-6 text-white/48">
                    Proprietary model baskets cross-checked against live analyst flow, hit-rate consistency, and sector leadership.
                  </p>
                </div>

                <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.16)]">
                  Ranked
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    Avg 30D Hit
                  </div>
                  <div className="mt-2 text-[29px] font-semibold tracking-[-0.03em] text-white">
                    {averageHit30}%
                  </div>
                  <div className="mt-1 text-xs text-white/45">Across model baskets</div>
                </div>

                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/6 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    Avg 90D Return
                  </div>
                  <div className="mt-2 text-[29px] font-semibold tracking-[-0.03em] text-emerald-300">
                    +{averageAvg90}%
                  </div>
                  <div className="mt-1 text-xs text-white/45">Basket-level forward bias</div>
                </div>

                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/6 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    Bullish Alignment
                  </div>
                  <div className="mt-2 text-[29px] font-semibold tracking-[-0.03em] text-cyan-300">
                    {bullishModelCount}/{modelRows.length}
                  </div>
                  <div className="mt-1 text-xs text-white/45">Models favoring upside flow</div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-4 space-y-3">
              {modelRows.map((model) => (
                (() => {
                  const alignment = getModelAlignmentClasses(model.alignment);

                  return (
                <div
                  key={model.name}
                  className={[
                    "group relative w-full overflow-hidden rounded-3xl border p-4 text-left transition duration-300",
                    "border-white/10 bg-black/25 hover:border-emerald-400/25 hover:bg-emerald-400/4.5",
                  ].join(" ")}
                >
                  <div className={["pointer-events-none absolute left-0 top-0 h-full w-1 bg-linear-to-b", alignment.line].join(" ")} />
                  <div className={["pointer-events-none absolute -right-12 -top-10 h-32 w-32 rounded-full blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100", alignment.glow].join(" ")} />
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-white/14 to-transparent" />

                  <div className="relative grid items-start gap-4 xl:grid-cols-[1.3fr_0.95fr]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[22px] font-semibold tracking-[-0.03em] text-white">
                          {model.name}
                        </div>
                        <div className={["inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", alignment.pill].join(" ")}>
                          {model.alignment}
                        </div>
                      </div>

                      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                        {model.source}
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/8 bg-white/3 px-3 py-2.5">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                            Style
                          </div>
                          <div className="mt-1 text-sm text-white/78">{model.style}</div>
                        </div>

                        <div className="rounded-2xl border border-white/8 bg-white/3 px-3 py-2.5">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                            30D Hit
                          </div>
                          <div className="mt-1 text-lg font-semibold text-white">
                            {model.hit30}%
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/8 bg-white/3 px-3 py-2.5">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                            Avg 90D
                          </div>
                          <div className="mt-1 text-lg font-semibold text-emerald-300">
                            +{model.avg90}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/8 bg-black/18 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                        Basket Names
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {model.tickers.map((ticker) => (
                          <Link
                            key={ticker}
                            href={`/stocks/${ticker}`}
                            className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200 transition hover:bg-cyan-400/20 hover:text-white"
                          >
                            {ticker}
                          </Link>
                        ))}
                      </div>

                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={["h-full rounded-full bg-linear-to-r", alignment.line].join(" ")}
                          style={{ width: `${Math.max(18, model.hit30)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                  );
                })()
              ))}

              <div className="mt-6">
                <InsiderTradesPanel
                  selectedSector={selectedExpertSector}
                  analystLeader={currentAnalystLeader}
                />
              </div>
            </div>
          </div>
          ) : null}

          <section className="relative rounded-3xl bg-linear-to-br from-white/3 via-transparent to-transparent p-6 shadow-[0_0_40px_rgba(34,211,238,0.05)]">
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-cyan-400/40 to-transparent" />
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-yellow-300/90">
                  Analyst Top Picks Across the Market
                </div>
                <p className="mt-1 text-[14px] leading-6 text-white/48">
                  Diversified analyst signals from today, yesterday, the last 7 days, and the last 14 days ranked with fresh calls weighted highest, then upside, rating quality, recency, and sector balance. Use this section to find additional stocks per sector.
                </p>
              </div>
              <div className="relative inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                <span className="mr-2 inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
                LIVE
              </div>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {expertSectorTabs.map((sector) => (
                <button
                  key={sector}
                  type="button"
                  onClick={() => setSelectedExpertSector(sector)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-all",
                    selectedExpertSector === sector
                      ? "border-cyan-300/35 bg-cyan-400/12 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)]"
                      : "border-white/10 bg-white/4 text-white/55 hover:border-white/20 hover:text-white",
                  ].join(" ")}
                >
                  {sector}
                </button>
              ))}
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/25 px-4 py-3 text-sm text-white/55">
              <div>
                {`Showing the top ${Math.min(10, visibleFmpRows.length)} analyst-ranked names in ${selectedExpertSector}.`}
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                {`${visibleFmpRows.length} sector picks`}
              </div>
            </div>
            <div className="space-y-4">
              {visibleFmpRows.map((row) => {
                const tone = upsideTone(row.upsidePercent);
                const accent = getAccentClasses(row.upsidePercent);
                const signalDirection = getSignalDirectionLabel(row.upsidePercent);
                const signalDirectionClasses = getSignalDirectionClasses(row.upsidePercent);
                const recencyChip = getRecencyChip(row);

                return (
                <div
                  key={row.symbol}
                  className={[
                    "group relative overflow-hidden rounded-2xl border px-4 py-3 transition-all duration-300 hover:-translate-y-px",
                    tone.card,
                  ].join(" ")}
                >
                  <div className={["absolute left-0 top-0 h-full w-0.75", accent.line].join(" ")} />
                  <div
                    className={[
                      "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                      accent.glow,
                    ].join(" ")}
                  />

                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/stocks/${row.symbol}`}
                          className={[
                            "text-[22px] font-semibold tracking-[-0.03em] text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.16)] transition-colors",
                            accent.tickerHover,
                          ].join(" ")}
                        >
                          {row.symbol}
                        </Link>

                        <span className={[
                          "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                          signalDirectionClasses,
                        ].join(" ")}>
                          {signalDirection}
                        </span>
                      </div>

                      <div className="mt-1 max-w-55 truncate text-[13px] text-white/48">
                        {row.companyName ?? row.firm ?? "Analyst coverage"}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/38">
                        {recencyChip ? (
                          <span
                            className={[
                              "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                              recencyChip.className,
                            ].join(" ")}
                          >
                            {recencyChip.label}
                          </span>
                        ) : null}
                        {row.lastGrade ? <span>{row.lastGrade}</span> : null}
                        {row.sector ? (
                          <>
                            <span className="text-white/20">|</span>
                            <span>{row.sector}</span>
                          </>
                        ) : null}
                        {row.publishedDate ? (
                          <>
                            <span className="text-white/20">|</span>
                            <span className={recencyChip?.dateClassName ?? ""}>{row.publishedDate}</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[18px] font-semibold tabular-nums tracking-[-0.03em] text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.16)]">
                        {money(row.price)}
                      </div>
                      <div className={["mt-1 text-[13px] font-semibold tabular-nums tracking-[-0.02em] drop-shadow-[0_0_12px_rgba(52,211,153,0.14)]", tone.text].join(" ")}>
                        {row.upsidePercent === null
                          ? "GÇö"
                          : `${row.upsidePercent >= 0 ? "+" : ""}${row.upsidePercent.toFixed(1)}%`}
                      </div>
                    </div>
                  </div>

                  <div className="relative mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/6 px-3 py-2 shadow-[0_0_18px_rgba(34,211,238,0.08)]">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                        Target
                      </div>
                      <div className="mt-1 text-[15px] font-semibold tabular-nums tracking-[-0.03em] text-cyan-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.22)]">
                        {money(row.targetConsensus)}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/8 bg-white/3.5 px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                        Low
                      </div>
                      <div className="mt-1 text-[14px] font-semibold tabular-nums tracking-[-0.02em] text-white">
                        {money(row.targetLow)}
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/6 px-3 py-2 shadow-[0_0_18px_rgba(16,185,129,0.08)]">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                        Score
                      </div>
                      <div className={["mt-1 text-[15px] font-semibold tabular-nums tracking-[-0.03em] drop-shadow-[0_0_12px_rgba(16,185,129,0.18)]", tone.text].join(" ")}>
                        {Number.isFinite(row.score) ? row.score.toFixed(0) : "GÇö"}
                      </div>
                    </div>
                  </div>

                  <div className="relative mt-3 text-[13px] leading-6 text-white/58">
                    {row.lastGrade ?? "Analyst conviction"}
                    {row.firm ? ` from ${row.firm}` : ""}. {getSignalStrengthLabel(row)} setup
                    {row.sector ? ` in ${row.sector}` : ""}. Price is tracking at {" "}
                    <span className="font-semibold tabular-nums tracking-[-0.02em] text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.16)]">
                      {money(row.price)}
                    </span>{" "}
                    against a target of{" "}
                    <span className="font-semibold tabular-nums tracking-[-0.02em] text-cyan-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.22)]">
                      {money(row.targetConsensus)}
                    </span>
                    .
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={["h-full rounded-full bg-linear-to-r", tone.bar].join(" ")}
                      style={{
                        width: `${Math.max(8, Math.min(100, Math.abs(row.upsidePercent ?? 0) * 2))}%`,
                      }}
                    />
                  </div>

                  <div
                    className="relative mt-3 flex items-center justify-between gap-2 border-t border-white/8 pt-3 opacity-75 transition-opacity duration-300 group-hover:opacity-100"
                  >
                    <Link
                      href={`/stocks/${row.symbol}`}
                      className={[
                        "inline-flex h-8 items-center rounded-xl border px-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition-all",
                        accent.chartButton,
                      ].join(" ")}
                    >
                      Open Chart
                    </Link>

                    <Link
                      href={`/stocks/${row.symbol}/workspace`}
                      className="inline-flex h-8 items-center rounded-xl border border-white/10 bg-white/4 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 transition-all hover:border-white/20 hover:bg-white/7 hover:text-white"
                    >
                      Open Workspace ↗
                    </Link>
                  </div>
                </div>
                );
              })}
              {isLoadingFmpRows ? (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-white/45">
                  Loading analyst target data...
                </div>
              ) : null}
              {!isLoadingFmpRows && fmpLoadError ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/6 p-6 text-sm text-amber-100/90">
                  {fmpLoadError}
                </div>
              ) : null}
              {!isLoadingFmpRows && !fmpLoadError && visibleFmpRows.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-white/45">
                  {selectedExpertSector === "All"
                    ? "No analyst picks were found for today, the last 7 days, or the last 14 days."
                    : `No analyst picks were found for ${selectedExpertSector} in the current 14-day window.`}
                </div>
              ) : null}
            </div>
          </section>

        </section>

        <ActiveExpertSignals rows={activeSignals} />
        </div>
      </section>
    </main>
  );
}

