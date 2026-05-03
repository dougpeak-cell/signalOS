"use client";

import { useEffect, useMemo, useState } from "react";
import { addToWatchlist as addTickerToWatchlist } from "@/lib/watchlist/localWatchlist";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { appendReturnTo, buildReturnTo } from "@/lib/routing/returnNavigation";
import { useMarketData } from "@/components/providers/MarketDataProvider";
import { buildMarketIntel } from "@/lib/intelligence/buildMarketIntel";

type WatchlistItem =
  | string
  | {
      ticker?: string;
      symbol?: string;
      conviction?: number | null;
      score?: number | null;
      signal?: string | null;
      target?: number | null;
      currentPrice?: number | null;
      price?: number | null;
      changePercent?: number | null;
      theme?: string | null;
      sector?: string | null;
      name?: string | null;
    };

type PortfolioItem = {
  ticker?: string;
  symbol?: string;
  stop?: number | null;
  target?: number | null;
  currentPrice?: number | null;
  price?: number | null;
  signal?: string | null;
  shares?: number | null;
  quantity?: number | null;
  avgCost?: number | null;
  averageCost?: number | null;
  entryPrice?: number | null;
  costBasis?: number | null;
  marketValue?: number | null;
};

type CommandBarIntel = {
  watchlistCount: number;
  portfolioCount: number;
  strongestSetup: string;
  atRiskCount: number;
  nearTargetCount: number;
  lastUpdatedLabel: string;
};

type PageIntelChip = {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
  href?: string;
  description?: string;
};

const WATCHLIST_KEYS = [
  "signalos:watchlist",
  "signalos.watchlist",
  "signalos.watchlist.v1",
  "signalos.watchlist.rows.v1",
  "signalos.watchlist.quick-add.v1",
  "watchlist",
  "signalos_watchlist",
  "signal-os-watchlist",
];

const PORTFOLIO_KEYS = [
  "signalos.portfolio.holdings.v1",
  "signalos.portfolio",
  "portfolio",
  "signalos_portfolio",
  "signal-os-portfolio",
];

const WATCHLIST_QUICK_ADD_KEY = "signalos.watchlist.quick-add.v1";
const PORTFOLIO_HOLDINGS_KEY = "signalos.portfolio.holdings.v1";
const PORTFOLIO_TICKERS_KEY = "signalos.portfolio.tickers.v1";

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function readFirstStorageValue<T>(keys: string[]): T | null {
  if (typeof window === "undefined") return null;

  for (const key of keys) {
    const parsed = safeJsonParse<T>(window.localStorage.getItem(key));
    if (parsed != null) return parsed;
  }

  return null;
}

function readAllStorageValues<T>(keys: string[]): T[] {
  if (typeof window === "undefined") return [];

  const values: T[] = [];

  for (const key of keys) {
    const parsed = safeJsonParse<T>(window.localStorage.getItem(key));
    if (parsed != null) values.push(parsed);
  }

  return values;
}

function normalizeTicker(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

function getWatchlistTicker(item: WatchlistItem): string {
  if (typeof item === "string") return normalizeTicker(item);
  return normalizeTicker(item.ticker ?? item.symbol ?? "");
}

function getPortfolioTicker(item: PortfolioItem): string {
  return normalizeTicker(item.ticker ?? item.symbol ?? "");
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getWatchlistPrice(item: WatchlistItem): number | null {
  if (typeof item === "string") return null;
  return getNumber(item.currentPrice) ?? getNumber(item.price);
}

function getPortfolioPrice(item: PortfolioItem): number | null {
  return getNumber(item.currentPrice) ?? getNumber(item.price);
}

function getDistanceToTargetPct(
  price: number | null,
  target: number | null
): number | null {
  if (price == null || target == null || price <= 0 || target <= 0) return null;
  return ((target - price) / price) * 100;
}

function getDistanceToStopPct(
  price: number | null,
  stop: number | null
): number | null {
  if (price == null || stop == null || price <= 0 || stop <= 0) return null;
  return ((price - stop) / price) * 100;
}

function buildLastUpdatedLabel(now: number | null): string {
  if (!now) return "—";
  return new Date(now).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildTopLevelIntel(lastUpdatedAt: number | null): CommandBarIntel {
  const watchlist = readAllStorageValues<WatchlistItem[]>(WATCHLIST_KEYS).flat();
  const portfolio = readFirstStorageValue<PortfolioItem[]>(PORTFOLIO_KEYS) ?? [];

  const watchlistTickers = watchlist.map(getWatchlistTicker).filter(Boolean);
  const portfolioTickers = portfolio.map(getPortfolioTicker).filter(Boolean);

  const strongestSetup = watchlistTickers[0] || portfolioTickers[0] || "—";

  const atRiskCount = portfolio.filter((item) => {
    const dist = getDistanceToStopPct(
      getPortfolioPrice(item),
      getNumber(item.stop)
    );
    return dist != null && dist <= 3;
  }).length;

  const nearTargetCount = watchlist.filter((item) => {
    if (typeof item === "string") return false;
    const dist = getDistanceToTargetPct(
      getWatchlistPrice(item),
      getNumber(item.target)
    );
    return dist != null && dist >= 0 && dist <= 5;
  }).length;

  return {
    watchlistCount: watchlistTickers.length,
    portfolioCount: portfolioTickers.length,
    strongestSetup,
    atRiskCount,
    nearTargetCount,
    lastUpdatedLabel: buildLastUpdatedLabel(lastUpdatedAt),
  };
}

function commandBuildLiveChartHref(ticker: string, pathname: string): string {
  const base =
    pathname.includes("/watchlist")
      ? "/watchlist"
      : pathname.includes("/portfolio")
        ? "/portfolio"
        : pathname.includes("/screener")
          ? "/screener"
          : pathname.includes("/experts")
            ? "/experts"
            : "/";

  return `/stocks/${ticker}?source=${encodeURIComponent(base)}`;
}

function commandBuildStockHref(ticker: string, pathname: string): string {
  const base =
    pathname.includes("/watchlist")
      ? "/watchlist"
      : pathname.includes("/portfolio")
        ? "/portfolio"
        : pathname.includes("/screener")
          ? "/screener"
          : pathname.includes("/experts")
            ? "/experts"
            : "/";

  return `/stocks/${ticker}?source=${encodeURIComponent(base)}`;
}

function buildPortfolioRiskHref(ticker: string, pathname: string): string {
  return `/stocks/${ticker}?source=${encodeURIComponent(
    pathname.includes("/portfolio") ? "/portfolio" : "/"
  )}&focus=portfolio&view=risk`;
}

function buildWatchlistMoverHref(ticker: string, pathname: string): string {
  const base = pathname.includes("/watchlist") ? "/watchlist" : "/";
  return `/watchlist?focus=${encodeURIComponent(ticker)}&context=mover&source=${encodeURIComponent(base)}`;
}

function buildSetupHref(ticker: string, pathname: string): string {
  return commandBuildLiveChartHref(ticker, pathname);
}

function buildRegimeHref(pathname: string) {
  const base = pathname.includes("/today") || pathname === "/" ? "/" : pathname;
  return `${base.includes("?") ? base : `${base}?`}panel=regime`;
}

type IntelFieldKey =
  | "regime"
  | "topSignal"
  | "bestSetup"
  | "mover"
  | "riskName";

function hasIntelValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim() !== "—";
}

function pickIntelField(
  intel: ReturnType<typeof useMarketData>["intel"],
  candidates: IntelFieldKey[]
): {
  key: IntelFieldKey | null;
  value: string;
  description?: string;
} {
  if (!intel) {
    return { key: null, value: "—" };
  }

  for (const key of candidates) {
    const value = intel[key];
    if (!hasIntelValue(value)) continue;

    const descriptionKey = `${key}Reason` as const;
    const description = intel[descriptionKey as keyof typeof intel];

    return {
      key,
      value,
      description: typeof description === "string" ? description : undefined,
    };
  }

  return { key: null, value: "—" };
}

function buildPageAwareIntel(
  pathname: string,
  intel: ReturnType<typeof useMarketData>["intel"]
): PageIntelChip[] {
  if (pathname === "/" || pathname.includes("/today")) {
    const topSignalIntel = pickIntelField(intel, ["topSignal", "bestSetup", "mover"]);
    const bestSetupIntel = pickIntelField(intel, ["bestSetup", "topSignal", "mover"]);

    return [
      {
        label: "REGIME",
        value: intel?.regime ?? "—",
        accent: intel?.regime === "Bullish",
        warn: intel?.regime === "Risk Off",
        href: buildRegimeHref(pathname),
        description: intel?.regimeReason,
      },
      {
        label: "TOP SIGNAL",
        value: topSignalIntel.value,
        accent: true,
        href:
          hasIntelValue(topSignalIntel.value)
            ? buildSetupHref(topSignalIntel.value, pathname)
            : "/",
        description: topSignalIntel.description,
      },
      {
        label: "BEST SETUP",
        value: bestSetupIntel.value,
        accent: true,
        href:
          hasIntelValue(bestSetupIntel.value)
            ? buildSetupHref(bestSetupIntel.value, pathname)
            : "/",
        description: bestSetupIntel.description,
      },
    ];
  }

  if (pathname.includes("/watchlist")) {
    return [
      {
        label: "MOVER",
        value: intel?.mover ?? "—",
        accent: true,
        href:
          intel?.mover && intel.mover !== "—"
            ? buildWatchlistMoverHref(intel.mover, pathname)
            : "/watchlist",
        description: intel?.moverReason,
      },
      {
        label: "TOP SIGNAL",
        value: intel?.topSignal ?? "—",
        accent: true,
        href:
          intel?.topSignal && intel.topSignal !== "—"
            ? buildSetupHref(intel.topSignal, pathname)
            : "/watchlist",
        description: intel?.topSignalReason,
      },
      {
        label: "BEST SETUP",
        value: intel?.bestSetup ?? "—",
        accent: true,
        href:
          intel?.bestSetup && intel.bestSetup !== "—"
            ? buildSetupHref(intel.bestSetup, pathname)
            : "/watchlist?view=opportunities",
        description: intel?.bestSetupReason,
      },
    ];
  }

  if (pathname.includes("/portfolio")) {
    return [
      {
        label: "RISK NAME",
        value: intel?.riskName ?? "—",
        warn: true,
        href:
          intel?.riskName && intel.riskName !== "—"
            ? buildPortfolioRiskHref(intel.riskName, pathname)
            : "/portfolio?view=risk",
        description: intel?.riskNameReason,
      },
      {
        label: "REGIME",
        value: intel?.regime ?? "—",
        accent: intel?.regime === "Bullish",
        warn: intel?.regime === "Risk Off",
        href: buildRegimeHref(pathname),
        description: intel?.regimeReason,
      },
      {
        label: "TOP SIGNAL",
        value: intel?.topSignal ?? "—",
        accent: true,
        href:
          intel?.topSignal && intel.topSignal !== "—"
            ? buildSetupHref(intel.topSignal, pathname)
            : "/portfolio",
        description: intel?.topSignalReason,
      },
    ];
  }

  if (pathname.includes("/screener")) {
    return [
      {
        label: "BEST SETUP",
        value: intel?.bestSetup ?? "—",
        accent: true,
        href:
          intel?.bestSetup && intel.bestSetup !== "—"
            ? buildSetupHref(intel.bestSetup, pathname)
            : "/screener",
        description: intel?.bestSetupReason,
      },
      {
        label: "MOVER",
        value: intel?.mover ?? "—",
        accent: true,
        href:
          intel?.mover && intel.mover !== "—"
            ? commandBuildStockHref(intel.mover, pathname)
            : "/screener",
        description: intel?.moverReason,
      },
      {
        label: "REGIME",
        value: intel?.regime ?? "—",
        accent: intel?.regime === "Bullish",
        warn: intel?.regime === "Risk Off",
        href: buildRegimeHref(pathname),
        description: intel?.regimeReason,
      },
    ];
  }

  if (pathname.includes("/experts")) {
    return [
      {
        label: "TOP IDEA",
        value: intel?.topSignal ?? "—",
        accent: true,
        href:
          intel?.topSignal && intel.topSignal !== "—"
            ? commandBuildStockHref(intel.topSignal, pathname)
            : "/experts",
        description: intel?.topSignalReason,
      },
      {
        label: "FOCUS",
        value: "Analysts",
        accent: true,
        href: "/experts",
      },
      {
        label: "RANKINGS",
        value: "Live",
        href: "/experts/rankings",
      },
    ];
  }

  if (pathname.includes("/stocks/")) {
    const parts = pathname.split("/");
    const ticker = normalizeTicker(parts[2] ?? "");

    return [
      {
        label: "TICKER",
        value: ticker || "—",
        accent: true,
        href: ticker ? `/stocks/${ticker}` : "/stocks",
      },
      {
        label: "REGIME",
        value: intel?.regime ?? "—",
        accent: intel?.regime === "Bullish",
        warn: intel?.regime === "Risk Off",
        href: buildRegimeHref(pathname),
        description: intel?.regimeReason,
      },
      {
        label: "TOP SIGNAL",
        value: intel?.topSignal ?? "—",
        accent: true,
        href:
          intel?.topSignal && intel.topSignal !== "—"
            ? buildSetupHref(intel.topSignal, pathname)
            : "/stocks",
        description: intel?.topSignalReason,
      },
    ];
  }

  return [
    {
      label: "REGIME",
      value: intel?.regime ?? "—",
      accent: intel?.regime === "Bullish",
      warn: intel?.regime === "Risk Off",
      href: buildRegimeHref(pathname),
      description: intel?.regimeReason,
    },
    {
      label: "TOP SIGNAL",
      value: intel?.topSignal ?? "—",
      accent: true,
      href:
        intel?.topSignal && intel.topSignal !== "—"
          ? buildSetupHref(intel.topSignal, pathname)
          : "/",
      description: intel?.topSignalReason,
    },
    {
      label: "BEST SETUP",
      value: intel?.bestSetup ?? "—",
      accent: true,
      href:
        intel?.bestSetup && intel.bestSetup !== "—"
          ? buildSetupHref(intel.bestSetup, pathname)
          : "/",
      description: intel?.bestSetupReason,
    },
  ];
}

function SectionShell({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-black/55 p-3 shadow-[0_10px_32px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[9px] uppercase tracking-[0.2em] text-white/35">
          {title}
        </div>
        {right}
      </div>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function ActionButton({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border px-3 py-2 text-sm font-medium transition",
        active
          ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
          : "border-white/10 bg-white/3 text-white/80 hover:bg-white/6",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function LivePulse({
  label,
  live,
}: {
  label: string;
  live: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/3 px-2 py-1">
      <span
        className={[
          "h-2 w-2 rounded-full transition-all duration-500",
          live
            ? "bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.7)]"
            : "bg-white/35",
        ].join(" ")}
      />
      <span className="text-[10px] tracking-[0.14em] text-white/45">
        LIVE {label}
      </span>
    </div>
  );
}

function IntelChip({
  label,
  value,
  accent = false,
  warn = false,
  href,
  description,
  testId,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
  href?: string;
  description?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      title={description}
      className={[
        "min-w-0 rounded-2xl border px-2 py-1.5 backdrop-blur-sm transition-all duration-200",
        accent
          ? "border-cyan-400/25 bg-cyan-400/10"
          : warn
            ? "border-amber-400/25 bg-amber-400/10"
            : "border-white/10 bg-white/5",
        href
          ? "cursor-pointer hover:scale-[1.02] hover:border-white/20 hover:bg-white/8"
          : "",
      ].join(" ")}
    >
      <div className="text-[8px] uppercase tracking-[0.12em] text-white/45">
        {label}
      </div>

      <div
        className={[
          "mt-1 truncate text-sm font-semibold leading-tight",
          accent
            ? "text-cyan-200"
            : warn
              ? "text-amber-200"
              : "text-white",
        ].join(" ")}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function ShortcutCard({
  keyLabel,
  description,
}: {
  keyLabel: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/4 px-2.5 py-2.5">
      <div className="text-[9px] uppercase tracking-[0.16em] text-white/38">
        {keyLabel}
      </div>
      <div className="mt-1.5 text-[13px] font-semibold leading-tight text-white">
        {description}
      </div>
    </div>
  );
}

export default function SignalOSCommandBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    quotes,
    intel,
    lastUpdatedAt,
    refreshIntel,
    registerTickers,
    unregisterTickers,
    debug,
  } = useMarketData();

  const emptyTopLevelIntel: CommandBarIntel = {
    watchlistCount: 0,
    portfolioCount: 0,
    strongestSetup: "—",
    atRiskCount: 0,
    nearTargetCount: 0,
    lastUpdatedLabel: "—",
  };

  const [command, setCommand] = useState("");
  const [mounted, setMounted] = useState(false);
  const [topLevelIntel, setTopLevelIntel] =
    useState<CommandBarIntel>(emptyTopLevelIntel);

  const currentReturnTo = useMemo(() => {
    const query = searchParams?.toString();
    return buildReturnTo(pathname || "/", query ? `?${query}` : "");
  }, [pathname, searchParams]);

  const fallbackIntel = useMemo(() => {
    if (!mounted) return null;

    const watchlist = readAllStorageValues<WatchlistItem[]>(WATCHLIST_KEYS).flat();
    const portfolio = readFirstStorageValue<PortfolioItem[]>(PORTFOLIO_KEYS) ?? [];

    if (!watchlist.length && !portfolio.length) return null;

    return buildMarketIntel({
      watchlist,
      portfolio,
      quotes,
    });
  }, [mounted, quotes]);

  const effectiveIntel = intel ?? fallbackIntel;

  const pageIntel = useMemo(
    () => buildPageAwareIntel(pathname, effectiveIntel),
    [pathname, effectiveIntel]
  );

  function withReturn(href?: string) {
    if (!href) return undefined;
    return appendReturnTo(href, currentReturnTo);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setTopLevelIntel(buildTopLevelIntel(lastUpdatedAt));
  }, [mounted, lastUpdatedAt, intel]);

  useEffect(() => {
    const critical = [
      intel?.topSignal,
      intel?.bestSetup,
      intel?.mover,
      intel?.riskName,
    ]
      .map((v) => normalizeTicker(v ?? ""))
      .filter((v) => v && v !== "—");

    if (!critical.length) return;

    registerTickers(critical, "critical");
    return () => {
      unregisterTickers(critical, "critical");
    };
  }, [
    intel?.topSignal,
    intel?.bestSetup,
    intel?.mover,
    intel?.riskName,
    registerTickers,
    unregisterTickers,
  ]);

  useEffect(() => {
    if (!mounted) return;

    const sync = () => setTopLevelIntel(buildTopLevelIntel(lastUpdatedAt));

    sync();

    const onStorage = () => sync();
    const onFocus = () => sync();
    const onWatchlistUpdated = () => {
      sync();
      void refreshIntel();
    };
    const onPortfolioUpdated = () => {
      sync();
      void refreshIntel();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    window.addEventListener("signalos:watchlist-updated", onWatchlistUpdated);
    window.addEventListener("signalos:portfolio-updated", onPortfolioUpdated);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("signalos:watchlist-updated", onWatchlistUpdated);
      window.removeEventListener("signalos:portfolio-updated", onPortfolioUpdated);
    };
  }, [mounted, lastUpdatedAt, refreshIntel]);

  function normalizedTicker() {
    return command.trim().toUpperCase();
  }

  function goLiveChart() {
    const ticker = normalizedTicker();
    if (!ticker) return;

    router.push(
      appendReturnTo(commandBuildLiveChartHref(ticker, pathname), currentReturnTo)
    );
  }

  function goStockPage() {
    const ticker = normalizedTicker();
    if (!ticker) return;

    router.push(
      appendReturnTo(commandBuildStockHref(ticker, pathname), currentReturnTo)
    );
  }

  function addToWatchlist() {
    const ticker = normalizedTicker();
    if (!ticker) return;

    const currentRows = readAllStorageValues<WatchlistItem[]>(WATCHLIST_KEYS).flat();
    const exists = currentRows.some((item) => getWatchlistTicker(item) === ticker);
    if (exists) return;

    const quickAdds =
      safeJsonParse<string[]>(window.localStorage.getItem(WATCHLIST_QUICK_ADD_KEY)) ?? [];
    const nextQuickAdds = Array.from(
      new Set([...quickAdds.map((value) => normalizeTicker(value)).filter(Boolean), ticker])
    );

    addTickerToWatchlist(ticker, {
      thesis: "Added from SigiOS Command.",
      conviction: 60,
      signal: "Neutral",
    });

    window.localStorage.setItem(WATCHLIST_QUICK_ADD_KEY, JSON.stringify(nextQuickAdds));
    window.dispatchEvent(new Event("signalos:watchlist-updated"));
    setTopLevelIntel(buildTopLevelIntel(lastUpdatedAt));
  }

  function addToPortfolio() {
    const ticker = normalizedTicker();
    if (!ticker) return;

    const current = readFirstStorageValue<PortfolioItem[]>(PORTFOLIO_KEYS) ?? [];
    const exists = current.some((item) => getPortfolioTicker(item) === ticker);
    if (exists) return;

    const holdings =
      safeJsonParse<PortfolioItem[]>(window.localStorage.getItem(PORTFOLIO_HOLDINGS_KEY)) ?? [];
    window.localStorage.setItem(
      PORTFOLIO_HOLDINGS_KEY,
      JSON.stringify([...holdings, { ticker }])
    );

    const raw = window.localStorage.getItem(PORTFOLIO_TICKERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const tickerList = Array.isArray(parsed) ? parsed : [];
    const merged = Array.from(new Set([ticker, ...tickerList]));
    window.localStorage.setItem(PORTFOLIO_TICKERS_KEY, JSON.stringify(merged));

    window.dispatchEvent(new Event("signalos:portfolio-updated"));
    setTopLevelIntel(buildTopLevelIntel(lastUpdatedAt));
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      const isTyping =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        Boolean(active && active.getAttribute("contenteditable") === "true");

      if (!isTyping) return;
      if (e.key !== "Enter") return;

      if (e.shiftKey) {
        e.preventDefault();
        goStockPage();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault();
        addToWatchlist();
        return;
      }

      if (e.altKey) {
        e.preventDefault();
        addToPortfolio();
        return;
      }

      e.preventDefault();
      goLiveChart();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [command, pathname, currentReturnTo, lastUpdatedAt]);

  const pageIntelTitle = useMemo(() => {
    if (pathname === "/" || pathname.includes("/today")) return "Today Intelligence";
    if (pathname.includes("/watchlist")) return "Watchlist Intelligence";
    if (pathname.includes("/portfolio")) return "Portfolio Intelligence";
    if (pathname.includes("/screener")) return "Screener Intelligence";
    if (pathname.includes("/experts")) return "Experts Intelligence";
    if (pathname.includes("/stocks/")) return "Ticker Intelligence";
    return "SigiOS Intelligence";
  }, [pathname]);

  function chipTestId(label: string, section: "summary" | "page") {
    return `shell-${section}-chip-${label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  }

  return (
    <aside className="space-y-2.5" data-testid="shell-command-rail">
      <SectionShell
        title="SigiOS Command"
        right={
          <LivePulse
            label={topLevelIntel.lastUpdatedLabel}
            live={debug.streamConnected || Boolean(lastUpdatedAt)}
          />
        }
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-2">
            <ActionButton
              active={pathname === "/" || pathname.includes("/today")}
              onClick={() => router.push("/")}
            >
              Today
            </ActionButton>

            <ActionButton
              active={pathname.includes("/watchlist")}
              onClick={() => router.push("/watchlist")}
            >
              Watchlist
            </ActionButton>

            <ActionButton
              active={pathname.includes("/portfolio")}
              onClick={() => router.push("/portfolio")}
            >
              Portfolio
            </ActionButton>

            <ActionButton
              active={pathname.includes("/screener")}
              onClick={() => router.push("/screener")}
            >
              Screener
            </ActionButton>

            <ActionButton
              active={pathname.includes("/stocks")}
              onClick={() => router.push("/stocks")}
            >
              Stocks
            </ActionButton>
          </div>

          <div className="grid auto-rows-fr grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => router.push("/watchlist")}
              className="text-left"
              data-testid="shell-summary-chip-button-watch"
            >
              <IntelChip
                label="WATCH"
                value={String(topLevelIntel.watchlistCount)}
                testId={chipTestId("WATCH", "summary")}
              />
            </button>

            <button
              type="button"
              onClick={() => router.push("/portfolio")}
              className="text-left"
              data-testid="shell-summary-chip-button-port"
            >
              <IntelChip
                label="PORT"
                value={String(topLevelIntel.portfolioCount)}
                testId={chipTestId("PORT", "summary")}
              />
            </button>

            <button
              type="button"
              onClick={() => {
                const href =
                  intel?.bestSetup && intel.bestSetup !== "—"
                    ? appendReturnTo(
                        buildSetupHref(intel.bestSetup, pathname),
                        currentReturnTo
                      )
                    : "/";
                router.push(href);
              }}
              className="text-left"
              data-testid="shell-summary-chip-button-setup"
            >
              <IntelChip
                label="SETUP"
                value={intel?.bestSetup ?? topLevelIntel.strongestSetup}
                accent
                description={intel?.bestSetupReason}
                testId={chipTestId("SETUP", "summary")}
              />
            </button>

            <button
              type="button"
              onClick={() => {
                const href =
                  intel?.riskName && intel.riskName !== "—"
                    ? appendReturnTo(
                        buildPortfolioRiskHref(intel.riskName, pathname),
                        currentReturnTo
                      )
                    : "/portfolio?view=risk";
                router.push(href);
              }}
              className="text-left"
              data-testid="shell-summary-chip-button-risk"
            >
              <IntelChip
                label="RISK"
                value={intel?.riskName ?? String(topLevelIntel.atRiskCount)}
                warn={Boolean(intel?.riskName && intel.riskName !== "—")}
                description={intel?.riskNameReason}
                testId={chipTestId("RISK", "summary")}
              />
            </button>

            <button
              type="button"
              onClick={() => router.push("/watchlist?view=targets")}
              className="text-left"
              data-testid="shell-summary-chip-button-target"
            >
              <IntelChip
                label="TARGET"
                value={String(topLevelIntel.nearTargetCount)}
                testId={chipTestId("TARGET", "summary")}
              />
            </button>

            <button
              type="button"
              onClick={() => router.push(buildRegimeHref(pathname))}
              className="text-left"
              data-testid="shell-summary-chip-button-regime"
            >
              <IntelChip
                label="REGIME"
                value={intel?.regime ?? "—"}
                accent={intel?.regime === "Bullish"}
                warn={intel?.regime === "Risk Off"}
                description={intel?.regimeReason}
                testId={chipTestId("REGIME", "summary")}
              />
            </button>
          </div>
        </div>
      </SectionShell>

      <SectionShell title="SigiOS Command">
        <div className="space-y-2.5">
          <div className="rounded-2xl border border-white/10 bg-white/3 px-3 py-2.5">
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Type ticker... NVDA, AAPL, TSLA"
              data-testid="shell-command-input"
              className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/32"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={goLiveChart} className="text-left">
              <ShortcutCard keyLabel="Enter" description="Open live chart" />
            </button>
            <button type="button" onClick={goStockPage} className="text-left">
              <ShortcutCard keyLabel="Shift + Enter" description="Open stock page" />
            </button>
            <button type="button" onClick={addToWatchlist} className="text-left">
              <ShortcutCard keyLabel="Cmd/Ctrl + Enter" description="Add to watchlist" />
            </button>
            <button type="button" onClick={addToPortfolio} className="text-left">
              <ShortcutCard keyLabel="Alt + Enter" description="Add to portfolio" />
            </button>
          </div>
        </div>
      </SectionShell>

      <SectionShell title={pageIntelTitle}>
        <div className="grid auto-rows-fr grid-cols-3 gap-2">
          {pageIntel.map((chip) => {
            const href = withReturn(chip.href);

            return (
              <button
                key={`${chip.label}-${chip.value}`}
                type="button"
                onClick={() => {
                  if (!href) return;
                  router.push(href);
                }}
                className="group text-left"
                data-testid={`${chipTestId(chip.label, "page")}-button`}
              >
                <IntelChip
                  label={chip.label}
                  value={chip.value}
                  accent={chip.accent}
                  warn={chip.warn}
                  href={href}
                  description={chip.description}
                  testId={chipTestId(chip.label, "page")}
                />
              </button>
            );
          })}
        </div>
      </SectionShell>
    </aside>
  );
}
