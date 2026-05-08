"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FundamentalIntelligenceCard from "@/components/stocks/FundamentalIntelligenceCard";
import LiveStockChart from "@/components/stocks/LiveStockChart";
import TechnicalIntelligenceCard from "@/components/stocks/TechnicalIntelligenceCard";
import WorkspaceCatalystPanel from "@/components/workspace/WorkspaceCatalystPanel";
import { WorkspacePanel } from "@/components/workspace/WorkspacePanel";
import WorkspaceRiskPanel from "@/components/workspace/WorkspaceRiskPanel";
import WorkspaceSigiPanel from "@/components/workspace/WorkspaceSigiPanel";
import WorkspaceTradePanel from "@/components/workspace/WorkspaceTradePanel";
import { useStoredWatchlistTickers } from "@/hooks/useStoredWatchlistTickers";
import { buildExecutionModel } from "@/lib/engines/executionModel";
import { buildTargetEngine } from "@/lib/engines/targetEngine";
import {
  addPendingPortfolioHolding,
  readPortfolioTickers,
} from "@/lib/portfolio/localPortfolio";
import { getSigiBackground, type SigiBackgroundMode } from "@/lib/sigiBackgrounds";
import { convictionToPct } from "@/lib/signalUtils";
import { normalizeTicker } from "@/lib/tickerAliases";
import { addToWatchlist } from "@/lib/watchlist/localWatchlist";
import {
  buildWorkspaceConfig,
  deleteWorkspaceCustomPreset,
  DEFAULT_WORKSPACE_CONFIG,
  readWorkspaceConfig,
  readWorkspaceCustomPresets,
  saveWorkspaceCustomPreset,
  WORKSPACE_LAYOUT_META,
  WORKSPACE_MODE_META,
  WORKSPACE_PANEL_META,
  writeWorkspaceConfig,
  type WorkspaceConfig,
  type WorkspaceCustomPreset,
  type WorkspaceLayout,
  type WorkspaceMode,
  type WorkspacePanelKey,
} from "@/lib/workspace/layoutPresets";
import type { StockWorkspaceData } from "@/lib/workspace/stockWorkspaceData";

type Props = {
  data: StockWorkspaceData;
};

function money(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${Number(value).toFixed(2)}`;
}

function formatSignedPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatUpside(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function percentTone(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "text-white/45";
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-white/55";
}

function compactNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function ratioLabel(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}R`;
}

function deriveWorkspaceBackgroundMode({
  conviction,
  tier,
  trend,
  catalysts,
}: {
  conviction: number;
  tier: string | null | undefined;
  trend: string;
  catalysts: string[] | null | undefined;
}): SigiBackgroundMode {
  const lowerTier = String(tier ?? "").toLowerCase();
  const catalystText = (catalysts ?? []).join(" ").toLowerCase();

  if (
    /macro|fed|fomc|cpi|rates|yield|tariff|policy|headline|geopolitical|news/.test(
      catalystText
    )
  ) {
    return catalystText.includes("news") ? "news" : "macro";
  }

  if (lowerTier === "risk" || trend === "bearish" || conviction <= 50) {
    return "bearish";
  }

  if (lowerTier === "elite" || trend === "bullish" || conviction >= 85) {
    return "bullish";
  }

  return "neutral";
}

function backgroundAccentLabel(mode: SigiBackgroundMode) {
  if (mode === "bullish") return "Bullish flow";
  if (mode === "bearish") return "Risk pressure";
  if (mode === "macro") return "Macro-driven";
  if (mode === "news") return "News-active";
  return "Execution mode";
}

function withModeBackground(
  backgroundMode: SigiBackgroundMode,
  mode: WorkspaceMode
): SigiBackgroundMode {
  if (mode === "focus") {
    return backgroundMode === "news" || backgroundMode === "macro"
      ? backgroundMode
      : "neutral";
  }

  return backgroundMode;
}

function WorkspaceMetric({
  label,
  value,
  toneClassName = "text-white",
}: {
  label: string;
  value: string;
  toneClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-cyan-400/12 bg-white/4 px-4 py-3 shadow-[0_0_20px_rgba(34,211,238,0.05)]">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className={`mt-2 text-xl font-semibold ${toneClassName}`}>{value}</div>
    </div>
  );
}

function ToggleChip({
  active,
  label,
  onClick,
  activeClassName,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  activeClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
        active
          ? activeClassName
          : "border-white/10 bg-white/4 text-white/60 hover:border-white/20 hover:bg-white/8 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function workspaceConfigsEqual(left: WorkspaceConfig, right: WorkspaceConfig) {
  return (
    left.mode === right.mode &&
    left.layout === right.layout &&
    left.panelOrder.length === right.panelOrder.length &&
    left.panelOrder.every((value, index) => value === right.panelOrder[index]) &&
    left.panels.sigi === right.panels.sigi &&
    left.panels.risk === right.panels.risk &&
    left.panels.catalysts === right.panels.catalysts &&
    left.panels.trade === right.panels.trade &&
    left.chart.range === right.chart.range &&
    left.chart.interval === right.chart.interval &&
    left.chart.autoFollowEnabled === right.chart.autoFollowEnabled &&
    left.chart.autoFollowLockOff === right.chart.autoFollowLockOff &&
    left.chart.candleDensityMode === right.chart.candleDensityMode &&
    left.chart.priceScaleMode === right.chart.priceScaleMode &&
    left.chart.vwapAnchorMode === right.chart.vwapAnchorMode &&
    left.chart.customAnchorTime === right.chart.customAnchorTime &&
    left.chart.visibleRangeSpan === right.chart.visibleRangeSpan &&
    left.chart.lineVisibility.vwap === right.chart.lineVisibility.vwap &&
    left.chart.lineVisibility.ma5 === right.chart.lineVisibility.ma5 &&
    left.chart.lineVisibility.ma10 === right.chart.lineVisibility.ma10 &&
    left.chart.lineVisibility.ma20 === right.chart.lineVisibility.ma20 &&
    left.chart.lineVisibility.ma30 === right.chart.lineVisibility.ma30
  );
}

function workspaceChartConfigsEqual(left: WorkspaceConfig["chart"], right: WorkspaceConfig["chart"]) {
  return (
    left.range === right.range &&
    left.interval === right.interval &&
    left.autoFollowEnabled === right.autoFollowEnabled &&
    left.autoFollowLockOff === right.autoFollowLockOff &&
    left.candleDensityMode === right.candleDensityMode &&
    left.priceScaleMode === right.priceScaleMode &&
    left.vwapAnchorMode === right.vwapAnchorMode &&
    left.customAnchorTime === right.customAnchorTime &&
    left.visibleRangeSpan === right.visibleRangeSpan &&
    left.lineVisibility.vwap === right.lineVisibility.vwap &&
    left.lineVisibility.ma5 === right.lineVisibility.ma5 &&
    left.lineVisibility.ma10 === right.lineVisibility.ma10 &&
    left.lineVisibility.ma20 === right.lineVisibility.ma20 &&
    left.lineVisibility.ma30 === right.lineVisibility.ma30
  );
}

export default function StockTradingWorkspace({ data }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { row, liveTicker, technicals, fundamentals, initialPrice, initialChangePct } = data;
  const ticker = liveTicker.toLowerCase();
  const resolvedTicker = normalizeTicker(liveTicker);
  const isMobilePreview = searchParams.get("mobilePreview") === "1";
  const normalizedConviction = convictionToPct(row.conviction) ?? 60;
  const { watchlistTickerSet } = useStoredWatchlistTickers();
  const [portfolioTickers, setPortfolioTickers] = useState<string[]>([]);
  const [workspaceConfig, setWorkspaceConfig] = useState<WorkspaceConfig>(
    DEFAULT_WORKSPACE_CONFIG
  );
  const [workspaceChartSyncKey, setWorkspaceChartSyncKey] = useState(0);
  const [customPresets, setCustomPresets] = useState<WorkspaceCustomPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  function buildPreviewHref(href: string) {
    if (!isMobilePreview) {
      return href;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("mobilePreview", "1");
    const nextQuery = nextParams.toString();
    return nextQuery ? `${href}?${nextQuery}` : href;
  }

  useEffect(() => {
    const sync = () => setPortfolioTickers(readPortfolioTickers());

    sync();

    const onStorage = () => sync();
    const onFocus = () => sync();
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    const onPortfolioUpdated = () => sync();

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("signalos:portfolio-updated", onPortfolioUpdated);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("signalos:portfolio-updated", onPortfolioUpdated);
    };
  }, []);

  useEffect(() => {
    setWorkspaceConfig(readWorkspaceConfig(resolvedTicker));
    setCustomPresets(readWorkspaceCustomPresets(resolvedTicker));
    setWorkspaceChartSyncKey((current) => current + 1);
    setSelectedPresetId(null);
  }, [resolvedTicker]);

  useEffect(() => {
    writeWorkspaceConfig(resolvedTicker, workspaceConfig);
  }, [resolvedTicker, workspaceConfig]);

  const workspaceMode = workspaceConfig.mode;
  const activeLayout = isMobilePreview
    ? {
        ...WORKSPACE_LAYOUT_META["chart-full"],
        chartMinHeightClassName: "min-h-[340px]",
        chartInnerMinHeightClassName: "min-h-[320px]",
      }
    : WORKSPACE_LAYOUT_META[workspaceConfig.layout];
  const modeMeta = WORKSPACE_MODE_META[workspaceMode];

  const executionModel = buildExecutionModel({
    livePrice: initialPrice,
    tier: row.tier,
    conviction: normalizedConviction,
    dbEntryLow: row.entry_low,
    dbEntryHigh: row.entry_high,
  });

  const targetModel = buildTargetEngine({
    livePrice: initialPrice,
    tier: row.tier,
    conviction: normalizedConviction,
    entryLow: executionModel.entryLow,
    entryHigh: executionModel.entryHigh,
    atrPct: technicals.atrPct,
    momentumBias:
      normalizedConviction >= 85
        ? "bullish"
        : normalizedConviction <= 50
          ? "bearish"
          : "neutral",
    nearestResistance: technicals.resistance20,
    nearestLiquidity: technicals.support20,
  });

  const entryLow = executionModel.entryLow ?? row.entry_low ?? null;
  const entryHigh = executionModel.entryHigh ?? row.entry_high ?? null;
  const target = targetModel.target ?? row.target_price ?? null;
  const stop = executionModel.stop ?? targetModel.stop ?? row.stop_loss ?? null;
  const upside = targetModel.upsidePct;
  const heroBackgroundMode = deriveWorkspaceBackgroundMode({
    conviction: normalizedConviction,
    tier: row.tier,
    trend: technicals.trend,
    catalysts: row.catalysts,
  });
  const effectiveHeroBackgroundMode = withModeBackground(
    heroBackgroundMode,
    workspaceMode
  );
  const heroBackgroundAsset = getSigiBackground(effectiveHeroBackgroundMode);
  const heroAccentLabel = backgroundAccentLabel(effectiveHeroBackgroundMode);
  const inWatchlist = watchlistTickerSet.has(resolvedTicker);
  const inPortfolio = useMemo(
    () => new Set(portfolioTickers.map((item) => normalizeTicker(item))).has(resolvedTicker),
    [portfolioTickers, resolvedTicker]
  );
  const activeCustomPreset = useMemo(
    () => customPresets.find((preset) => preset.id === selectedPresetId) ?? null,
    [customPresets, selectedPresetId]
  );

  useEffect(() => {
    if (!selectedPresetId) return;

    const selectedPreset = customPresets.find((preset) => preset.id === selectedPresetId);
    if (!selectedPreset) {
      setSelectedPresetId(null);
      return;
    }

    if (!workspaceConfigsEqual(selectedPreset.config, workspaceConfig)) {
      setSelectedPresetId(null);
    }
  }, [customPresets, selectedPresetId, workspaceConfig]);

  const rewardRisk =
    initialPrice != null &&
    target != null &&
    stop != null &&
    Number.isFinite(initialPrice) &&
    Number.isFinite(target) &&
    Number.isFinite(stop) &&
    initialPrice > stop
      ? (target - initialPrice) / (initialPrice - stop)
      : null;

  function handleAnalyzeWithSigi() {
    router.push(buildPreviewHref(`/today?ticker=${encodeURIComponent(resolvedTicker)}`));
  }

  function handleAddWatchlist() {
    addToWatchlist(resolvedTicker, {
      ticker: resolvedTicker,
      name: row.company_name,
      sector: row.sector,
      conviction: normalizedConviction,
      target,
      currentPrice: initialPrice,
      changePercent: initialChangePct,
      thesis: row.thesis,
    });
  }

  function handleAddTrade() {
    addPendingPortfolioHolding({
      ticker: resolvedTicker,
      name: row.company_name,
      livePrice: initialPrice,
      targetPrice: target,
      stopPrice: stop,
      conviction: normalizedConviction,
      thesis: row.thesis,
    });
    setPortfolioTickers((current) =>
      current.includes(resolvedTicker) ? current : [resolvedTicker, ...current]
    );
  }

  function applyWorkspaceMode(mode: WorkspaceMode) {
    setWorkspaceConfig((current) => ({
      ...buildWorkspaceConfig(mode),
      chart: current.chart,
    }));
  }

  function refreshCustomPresets() {
    setCustomPresets(readWorkspaceCustomPresets(resolvedTicker));
  }

  function updateWorkspaceLayout(layout: WorkspaceLayout) {
    setWorkspaceConfig((current) => ({ ...current, layout }));
  }

  function toggleWorkspacePanel(panel: keyof WorkspaceConfig["panels"]) {
    setWorkspaceConfig((current) => ({
      ...current,
      panels: {
        ...current.panels,
        [panel]: !current.panels[panel],
      },
    }));
  }

  function moveWorkspacePanel(panel: WorkspacePanelKey, direction: -1 | 1) {
    setWorkspaceConfig((current) => {
      const fromIndex = current.panelOrder.indexOf(panel);
      const toIndex = fromIndex + direction;

      if (fromIndex === -1 || toIndex < 0 || toIndex >= current.panelOrder.length) {
        return current;
      }

      const nextPanelOrder = [...current.panelOrder];
      const [movedPanel] = nextPanelOrder.splice(fromIndex, 1);
      nextPanelOrder.splice(toIndex, 0, movedPanel);

      return {
        ...current,
        panelOrder: nextPanelOrder,
      };
    });
  }

  function handleSaveCustomPreset() {
    const trimmedName = presetName.trim();
    if (!trimmedName) return;

    saveWorkspaceCustomPreset(resolvedTicker, {
      name: trimmedName,
      scope: "ticker",
      config: workspaceConfig,
    });
    setPresetName("");
    refreshCustomPresets();
  }

  function handleWorkspaceAutoFollowChange(enabled: boolean) {
    setWorkspaceConfig((current) => ({
      ...current,
      chart: {
        ...current.chart,
        autoFollowEnabled: enabled,
        autoFollowLockOff: false,
      },
    }));
    setWorkspaceChartSyncKey((current) => current + 1);
  }

  function handleApplyCustomPreset(preset: WorkspaceCustomPreset) {
    setWorkspaceConfig(preset.config);
    setWorkspaceChartSyncKey((current) => current + 1);
    setSelectedPresetId(preset.id);
  }

  function handleDeleteCustomPreset(preset: WorkspaceCustomPreset) {
    deleteWorkspaceCustomPreset(resolvedTicker, preset.id, preset.scope);
    if (selectedPresetId === preset.id) {
      setSelectedPresetId(null);
    }
    refreshCustomPresets();
  }

  const workspaceModeCard = (
    <WorkspacePanel key="workspace-mode" title="Workspace Mode">
      <div className="grid gap-2">
        {(Object.entries(WORKSPACE_MODE_META) as Array<
          [WorkspaceMode, (typeof WORKSPACE_MODE_META)[WorkspaceMode]]
        >).map(([mode, meta]) => {
          const active = workspaceMode === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => applyWorkspaceMode(mode)}
              className={`rounded-2xl border px-3 py-3 text-left transition ${
                active
                  ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.08)]"
                  : "border-white/10 bg-white/4 text-white/70 hover:border-white/20 hover:bg-white/8 hover:text-white"
              }`}
            >
              <div className="text-sm font-semibold">{meta.label}</div>
              <div className="mt-1 text-xs leading-5 text-white/50">{meta.description}</div>
            </button>
          );
        })}
      </div>
    </WorkspacePanel>
  );

  const layoutCard = (
    <WorkspacePanel key="workspace-layout" title="Layout">
      <div className="grid gap-2">
        {(Object.entries(WORKSPACE_LAYOUT_META) as Array<
          [WorkspaceLayout, (typeof WORKSPACE_LAYOUT_META)[WorkspaceLayout]]
        >).map(([layout, config]) => {
          const active = workspaceConfig.layout === layout;

          return (
            <button
              key={layout}
              type="button"
              onClick={() => updateWorkspaceLayout(layout)}
              className={`rounded-2xl border px-3 py-3 text-left transition ${
                active
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.08)]"
                  : "border-white/10 bg-white/4 text-white/70 hover:border-white/20 hover:bg-white/8 hover:text-white"
              }`}
            >
              <div className="text-sm font-semibold">{config.label}</div>
              <div className="mt-1 text-xs leading-5 text-white/50">{config.description}</div>
            </button>
          );
        })}
      </div>
    </WorkspacePanel>
  );

  const panelToggleCard = (
    <WorkspacePanel key="workspace-panels" title="Panels">
      <div className="space-y-2">
        {workspaceConfig.panelOrder.map((panelKey, index) => {
          const active = workspaceConfig.panels[panelKey];
          const accentClassName =
            panelKey === "sigi"
              ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
              : panelKey === "risk"
                ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
                : panelKey === "catalysts"
                  ? "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200"
                  : "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";

          return (
            <div
              key={panelKey}
              className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/4 px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white/80">
                  {WORKSPACE_PANEL_META[panelKey].label}
                </div>
                <ToggleChip
                  active={active}
                  label={active ? "On" : "Off"}
                  onClick={() => toggleWorkspacePanel(panelKey)}
                  activeClassName={accentClassName}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => moveWorkspacePanel(panelKey, -1)}
                  disabled={index === 0}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65 transition hover:border-white/20 hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Move Up
                </button>
                <button
                  type="button"
                  onClick={() => moveWorkspacePanel(panelKey, 1)}
                  disabled={index === workspaceConfig.panelOrder.length - 1}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65 transition hover:border-white/20 hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Move Down
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs leading-5 text-white/45">
        Mode switches reset layout and panel visibility to the saved preset. You can then override any surface here.
      </div>
    </WorkspacePanel>
  );

  const customPresetCard = (
    <WorkspacePanel key="workspace-custom-presets" title="Custom Screen Save">
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            type="text"
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="Type custom title"
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/30 focus:bg-white/8"
          />
          <button
            type="button"
            onClick={handleSaveCustomPreset}
            disabled={!presetName.trim()}
            className="inline-flex items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save Screen
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/4 px-3 py-3 text-sm leading-6 text-white/55">
          Save the current chart view, layout, and visible panels for {resolvedTicker}. Give it a title, then switch between saved screens with Apply.
        </div>

        <div className="flex flex-wrap gap-2">
          <ToggleChip
            active={workspaceConfig.chart.autoFollowEnabled}
            label="Auto-follow On"
            onClick={() => handleWorkspaceAutoFollowChange(true)}
            activeClassName="border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
          />
          <ToggleChip
            active={!workspaceConfig.chart.autoFollowEnabled}
            label="Auto-follow Off"
            onClick={() => handleWorkspaceAutoFollowChange(false)}
            activeClassName="border-white/20 bg-white/10 text-white"
          />
        </div>

        {customPresets.length > 0 ? (
          <div className="space-y-2">
            {customPresets.map((preset) => {
              const isActivePreset = activeCustomPreset?.id === preset.id;

              return (
                <div
                  key={preset.id}
                  className={`rounded-2xl border px-3 py-3 ${
                    isActivePreset
                      ? "border-emerald-400/25 bg-emerald-400/10"
                      : "border-white/10 bg-white/4"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-white/82">{preset.name}</div>
                        {isActivePreset ? (
                          <div className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                            Active
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/40">
                        {resolvedTicker}
                      </div>
                      <div className="mt-2 text-xs leading-5 text-white/45">
                        {WORKSPACE_MODE_META[preset.config.mode].label} • {WORKSPACE_LAYOUT_META[preset.config.layout].label} • {preset.config.panelOrder.join(" / ")}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-white/45">
                        Auto-follow {preset.config.chart.autoFollowEnabled ? "On" : "Off"}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyCustomPreset(preset)}
                        disabled={isActivePreset}
                        className="inline-flex items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomPreset(preset)}
                        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65 transition hover:border-rose-300/30 hover:bg-rose-400/10 hover:text-rose-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 px-3 py-4 text-sm text-white/45">
            No saved screens yet. Type a title above to save the current workspace view for this ticker.
          </div>
        )}
      </div>
    </WorkspacePanel>
  );

  const executionLevelsCard = (
    <WorkspacePanel key="execution-levels" title="Execution Levels">
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between rounded-2xl bg-white/4 px-3 py-3">
          <span className="text-white/50">Entry</span>
          <span className="font-semibold text-white">
            {money(entryLow)} - {money(entryHigh)}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-white/4 px-3 py-3">
          <span className="text-white/50">Stop</span>
          <span className="font-semibold text-rose-200">{money(stop)}</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-white/4 px-3 py-3">
          <span className="text-white/50">Target</span>
          <span className="font-semibold text-cyan-200">{money(target)}</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-white/4 px-3 py-3">
          <span className="text-white/50">Reward / Risk</span>
          <span className="font-semibold text-emerald-300">{ratioLabel(rewardRisk)}</span>
        </div>
      </div>
    </WorkspacePanel>
  );

  const leftRailCards = [executionLevelsCard];

  const panelMap: Record<WorkspacePanelKey, ReactNode> = {
    sigi: <WorkspaceSigiPanel thesis={row.thesis} />,
    risk: (
      <WorkspaceRiskPanel
        upsideLabel={formatUpside(upside)}
        supportLabel={money(technicals.support20)}
        resistanceLabel={money(technicals.resistance20)}
        avgVolumeLabel={compactNumber(fundamentals.avgVolume)}
        risks={row.risks}
      />
    ),
    catalysts: <WorkspaceCatalystPanel catalysts={row.catalysts} />,
    trade: (
      <WorkspaceTradePanel
        ticker={ticker}
        inWatchlist={inWatchlist}
        inPortfolio={inPortfolio}
        openChartHref={buildPreviewHref(`/stocks/${ticker}`)}
        onAnalyzeWithSigi={handleAnalyzeWithSigi}
        onAddWatchlist={handleAddWatchlist}
        onAddTrade={handleAddTrade}
      />
    ),
  };

  const orderedPanels = workspaceConfig.panelOrder.map((panelKey) =>
    workspaceConfig.panels[panelKey] ? <div key={panelKey}>{panelMap[panelKey]}</div> : null
  );

  const rightRailCards = isMobilePreview
    ? [executionLevelsCard, ...orderedPanels]
    : [workspaceModeCard, layoutCard, panelToggleCard, customPresetCard, ...orderedPanels];

  const secondaryIntelligenceCards =
    workspaceMode === "analysis"
      ? [
          <FundamentalIntelligenceCard
            key="fundamentals"
            pe={fundamentals.pe}
            peg={fundamentals.peg}
            marketCap={fundamentals.marketCap}
            cash={fundamentals.cash}
            debt={fundamentals.debt}
            dividendYield={fundamentals.dividendYield}
            volume={fundamentals.volume}
            avgVolume={fundamentals.avgVolume}
          />,
          <TechnicalIntelligenceCard
            key="technicals"
            price={initialPrice}
            sma20={technicals.sma20}
            sma50={technicals.sma50}
            atrPct={technicals.atrPct}
            rsi14={technicals.rsi14}
            support20={technicals.support20}
            resistance20={technicals.resistance20}
            structure={technicals.structure}
          />,
        ]
      : [
          <TechnicalIntelligenceCard
            key="technicals"
            price={initialPrice}
            sma20={technicals.sma20}
            sma50={technicals.sma50}
            atrPct={technicals.atrPct}
            rsi14={technicals.rsi14}
            support20={technicals.support20}
            resistance20={technicals.resistance20}
            structure={technicals.structure}
          />,
          <FundamentalIntelligenceCard
            key="fundamentals"
            pe={fundamentals.pe}
            peg={fundamentals.peg}
            marketCap={fundamentals.marketCap}
            cash={fundamentals.cash}
            debt={fundamentals.debt}
            dividendYield={fundamentals.dividendYield}
            volume={fundamentals.volume}
            avgVolume={fundamentals.avgVolume}
          />,
        ];

  return (
    <div className="space-y-5">
      <section
        className={`relative overflow-hidden rounded-3xl border border-white/10 bg-[#07111f] ${
          isMobilePreview ? "p-5" : "p-6 md:p-8"
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: `url('${heroBackgroundAsset}')`,
            backgroundSize: "cover",
            backgroundPosition: "right center",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#07111f] via-[#07111f]/85 to-[#07111f]/35" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-cyan-400/30 via-cyan-400/10 to-transparent" />

        <div className="relative z-10">
          <div
            className={`flex flex-col gap-5 ${
              isMobilePreview ? "" : "xl:flex-row xl:items-end xl:justify-between"
            }`}
          >
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                SigiOS Workspace
              </div>
              <h1
                className={`mt-2 font-semibold tracking-tight text-white ${
                  isMobilePreview ? "text-2xl" : "text-3xl md:text-5xl"
                }`}
              >
                {liveTicker} Trading Workspace
              </h1>
              <p
                className={`mt-2 max-w-3xl leading-6 text-white/60 ${
                  isMobilePreview ? "text-sm" : "text-sm md:text-base"
                }`}
              >
                {row.company_name ?? liveTicker} • {row.sector ?? "Sector pending"} •
                Execution mode with live chart context, decision levels, and trade-ready signal framing.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  {heroAccentLabel}
                </div>
                <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                  {modeMeta.label} mode
                </div>
                <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
                  {activeLayout.label} layout
                </div>
                {activeCustomPreset ? (
                  <div className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                    Preset: {activeCustomPreset.name}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={buildPreviewHref(`/stocks/${ticker}`)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/75 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
              >
                Back to Summary
              </Link>
              <Link
                href={buildPreviewHref(`/stocks/${ticker}`)}
                className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/15 hover:text-white"
              >
                Open Chart
              </Link>
            </div>
          </div>

          <div
            className={`mt-6 grid gap-3 ${
              isMobilePreview ? "grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4"
            }`}
          >
            <WorkspaceMetric label="Price" value={money(initialPrice)} />
            <WorkspaceMetric
              label="Day Change"
              value={formatSignedPercent(initialChangePct)}
              toneClassName={percentTone(initialChangePct)}
            />
            <WorkspaceMetric label="Conviction" value={`${normalizedConviction}%`} />
            <WorkspaceMetric label="Signal Tier" value={row.tier ?? "Signal"} />
          </div>

          <div className="mt-4 text-sm text-white/48">{modeMeta.description}</div>
        </div>
      </section>

      <section className={`grid gap-5 ${activeLayout.layoutClassName}`}>
        {activeLayout.showLeftRail ? <div className="space-y-5">{leftRailCards}</div> : null}

        <div className="space-y-5">
          <section
            className={`rounded-[28px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top,rgba(0,160,255,0.08),transparent_28%),linear-gradient(180deg,rgba(5,10,20,0.96),rgba(0,0,0,0.98))] shadow-[0_0_45px_rgba(0,145,255,0.08)] ${
              isMobilePreview ? "p-3" : "p-4"
            }`}
          >
            <div
              className={`flex flex-col gap-3 border-b border-white/8 pb-4 ${
                isMobilePreview ? "" : "lg:flex-row lg:items-end lg:justify-between"
              }`}
            >
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/75">
                  Chart Stage
                </div>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                  {liveTicker} Execution Chart
                </h2>
                <p className="mt-1 text-sm text-white/55">
                  Use the live intraday chart as the primary surface. Entry, stop, target, and signal context stay in view.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-cyan-200">
                  Live Chart
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/65">
                  Signal Overlay Ready
                </div>
              </div>
            </div>

            <div className={`mt-4 overflow-hidden rounded-3xl border border-cyan-400/12 bg-black/70 p-2 shadow-[inset_0_0_25px_rgba(0,140,255,0.08)] md:p-3 ${activeLayout.chartMinHeightClassName}`}>
              <div className={`w-full overflow-hidden rounded-[20px] ${activeLayout.chartInnerMinHeightClassName}`}>
                <LiveStockChart
                  ticker={liveTicker}
                  expanded
                  showSignalRail={false}
                  signals={[]}
                  currentPrice={initialPrice}
                  workspaceChartState={workspaceConfig.chart}
                  workspaceChartSyncKey={workspaceChartSyncKey}
                  onWorkspaceChartStateChange={(chart) =>
                    setWorkspaceConfig((current) =>
                      workspaceChartConfigsEqual(current.chart, chart)
                        ? current
                        : { ...current, chart }
                    )
                  }
                />
              </div>
            </div>
          </section>

          <div className="grid gap-5 2xl:grid-cols-2">
            {secondaryIntelligenceCards}
          </div>

          {activeLayout.rightRailBelowCenter ? (
            <div className="space-y-5">{rightRailCards}</div>
          ) : null}
        </div>

        {!activeLayout.rightRailBelowCenter ? <div className="space-y-5">{rightRailCards}</div> : null}
      </section>
    </div>
  );
}