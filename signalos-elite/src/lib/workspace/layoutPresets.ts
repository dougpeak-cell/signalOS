export type WorkspaceMode = "focus" | "execution" | "analysis";

export type WorkspaceLayout = "chart-left" | "chart-full" | "split";

export type WorkspacePanelKey = "sigi" | "risk" | "catalysts" | "trade";

export type WorkspacePanels = Record<WorkspacePanelKey, boolean>;

export type WorkspacePresetScope = "global" | "ticker";

export type WorkspaceChartRange = "1D" | "5D" | "1M" | "6M" | "1Y" | "5Y";

export type WorkspaceChartInterval =
  | "1m"
  | "2m"
  | "3m"
  | "5m"
  | "10m"
  | "15m"
  | "1h"
  | "1d"
  | "1w";

export type WorkspaceCandleDensityMode = "more" | "standard" | "fewer";

export type WorkspacePriceScaleMode = "compressed" | "standard" | "expanded";

export type WorkspaceVwapAnchorMode =
  | "day-open"
  | "session-high"
  | "session-low"
  | "custom";

export type WorkspaceChartLineKey = "vwap" | "ma5" | "ma10" | "ma20" | "ma30";

export type WorkspaceChartLineVisibility = Record<WorkspaceChartLineKey, boolean>;

export type WorkspaceChartConfig = {
  range: WorkspaceChartRange;
  interval: WorkspaceChartInterval;
  autoFollowEnabled: boolean;
  autoFollowLockOff: boolean;
  candleDensityMode: WorkspaceCandleDensityMode;
  priceScaleMode: WorkspacePriceScaleMode;
  vwapAnchorMode: WorkspaceVwapAnchorMode;
  customAnchorTime: number | null;
  visibleRangeSpan: number | null;
  lineVisibility: WorkspaceChartLineVisibility;
};

export type WorkspaceConfig = {
  mode: WorkspaceMode;
  layout: WorkspaceLayout;
  panelOrder: WorkspacePanelKey[];
  panels: WorkspacePanels;
  chart: WorkspaceChartConfig;
};

export type WorkspaceCustomPreset = {
  id: string;
  name: string;
  config: WorkspaceConfig;
  scope: WorkspacePresetScope;
};

type WorkspaceLayoutConfig = {
  label: string;
  description: string;
  layoutClassName: string;
  showLeftRail: boolean;
  rightRailBelowCenter: boolean;
  chartMinHeightClassName: string;
  chartInnerMinHeightClassName: string;
};

export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  mode: "execution",
  layout: "split",
  panelOrder: ["sigi", "risk", "catalysts", "trade"],
  panels: {
    sigi: true,
    risk: true,
    catalysts: false,
    trade: true,
  },
  chart: {
    range: "1D",
    interval: "1m",
    autoFollowEnabled: false,
    autoFollowLockOff: false,
    candleDensityMode: "standard",
    priceScaleMode: "standard",
    vwapAnchorMode: "day-open",
    customAnchorTime: null,
    visibleRangeSpan: null,
    lineVisibility: {
      vwap: true,
      ma5: true,
      ma10: true,
      ma20: true,
      ma30: true,
    },
  },
};

export const WORKSPACE_PANEL_META: Record<WorkspacePanelKey, { label: string }> = {
  sigi: { label: "Sigi" },
  risk: { label: "Risk" },
  catalysts: { label: "Catalysts" },
  trade: { label: "Trade" },
};

const WORKSPACE_PRESET_GLOBAL_KEY = "signalos.workspace.custom-presets.global.v1";

export const WORKSPACE_MODE_META: Record<
  WorkspaceMode,
  { label: string; description: string }
> = {
  focus: {
    label: "Focus",
    description: "Strip the workspace down to the chart surface and primary decision flow.",
  },
  execution: {
    label: "Execution",
    description: "Keep active trade controls and risk context visible while the chart stays central.",
  },
  analysis: {
    label: "Analysis",
    description: "Open up the full intelligence stack with Sigi, risk, and catalyst context.",
  },
};

export const WORKSPACE_MODE_PRESETS: Record<
  WorkspaceMode,
  Omit<WorkspaceConfig, "mode" | "chart">
> = {
  focus: {
    layout: "chart-full",
    panelOrder: ["sigi", "risk", "catalysts", "trade"],
    panels: {
      sigi: false,
      risk: false,
      catalysts: false,
      trade: false,
    },
  },
  execution: {
    layout: "split",
    panelOrder: ["trade", "risk", "sigi", "catalysts"],
    panels: {
      sigi: true,
      risk: true,
      catalysts: false,
      trade: true,
    },
  },
  analysis: {
    layout: "split",
    panelOrder: ["sigi", "risk", "catalysts", "trade"],
    panels: {
      sigi: true,
      risk: true,
      catalysts: true,
      trade: true,
    },
  },
};

export const WORKSPACE_LAYOUT_META: Record<
  WorkspaceLayout,
  WorkspaceLayoutConfig
> = {
  "chart-left": {
    label: "Chart Left",
    description: "Keep the tactical rail open with a dedicated chart center and side intelligence.",
    layoutClassName: "xl:grid-cols-[240px_minmax(0,1fr)_320px]",
    showLeftRail: true,
    rightRailBelowCenter: false,
    chartMinHeightClassName: "min-h-[540px]",
    chartInnerMinHeightClassName: "min-h-[520px]",
  },
  "chart-full": {
    label: "Chart Full",
    description: "Collapse side rails and move configuration below the chart stack.",
    layoutClassName: "grid-cols-1",
    showLeftRail: false,
    rightRailBelowCenter: true,
    chartMinHeightClassName: "min-h-[640px]",
    chartInnerMinHeightClassName: "min-h-[620px]",
  },
  split: {
    label: "Split",
    description: "Balance the chart with a persistent intelligence rail.",
    layoutClassName: "xl:grid-cols-[minmax(0,1fr)_320px]",
    showLeftRail: false,
    rightRailBelowCenter: false,
    chartMinHeightClassName: "min-h-[560px]",
    chartInnerMinHeightClassName: "min-h-[540px]",
  },
};

function normalizeTickerKey(ticker: string): string {
  return String(ticker ?? "").trim().toUpperCase();
}

function isWorkspaceMode(value: unknown): value is WorkspaceMode {
  return value === "focus" || value === "execution" || value === "analysis";
}

function isWorkspaceLayout(value: unknown): value is WorkspaceLayout {
  return value === "chart-left" || value === "chart-full" || value === "split";
}

function isWorkspacePanels(value: unknown): value is WorkspacePanels {
  if (!value || typeof value !== "object") return false;

  const panels = value as Record<string, unknown>;
  return (
    typeof panels.sigi === "boolean" &&
    typeof panels.risk === "boolean" &&
    typeof panels.catalysts === "boolean" &&
    typeof panels.trade === "boolean"
  );
}

function isWorkspaceChartRange(value: unknown): value is WorkspaceChartRange {
  return value === "1D" || value === "5D" || value === "1M" || value === "6M" || value === "1Y" || value === "5Y";
}

function isWorkspaceChartInterval(value: unknown): value is WorkspaceChartInterval {
  return (
    value === "1m" ||
    value === "2m" ||
    value === "3m" ||
    value === "5m" ||
    value === "10m" ||
    value === "15m" ||
    value === "1h" ||
    value === "1d" ||
    value === "1w"
  );
}

function isWorkspaceCandleDensityMode(value: unknown): value is WorkspaceCandleDensityMode {
  return value === "more" || value === "standard" || value === "fewer";
}

function isWorkspacePriceScaleMode(value: unknown): value is WorkspacePriceScaleMode {
  return value === "compressed" || value === "standard" || value === "expanded";
}

function isWorkspaceVwapAnchorMode(value: unknown): value is WorkspaceVwapAnchorMode {
  return (
    value === "day-open" ||
    value === "session-high" ||
    value === "session-low" ||
    value === "custom"
  );
}

function isWorkspaceChartLineVisibility(value: unknown): value is WorkspaceChartLineVisibility {
  if (!value || typeof value !== "object") return false;

  const lines = value as Record<string, unknown>;
  return (
    typeof lines.vwap === "boolean" &&
    typeof lines.ma5 === "boolean" &&
    typeof lines.ma10 === "boolean" &&
    typeof lines.ma20 === "boolean" &&
    typeof lines.ma30 === "boolean"
  );
}

function isWorkspaceChartConfig(value: unknown): value is WorkspaceChartConfig {
  if (!value || typeof value !== "object") return false;

  const chart = value as Record<string, unknown>;
  return (
    isWorkspaceChartRange(chart.range) &&
    isWorkspaceChartInterval(chart.interval) &&
    typeof chart.autoFollowEnabled === "boolean" &&
    typeof chart.autoFollowLockOff === "boolean" &&
    isWorkspaceCandleDensityMode(chart.candleDensityMode) &&
    isWorkspacePriceScaleMode(chart.priceScaleMode) &&
    isWorkspaceVwapAnchorMode(chart.vwapAnchorMode) &&
    (chart.customAnchorTime == null || typeof chart.customAnchorTime === "number") &&
    (chart.visibleRangeSpan == null || typeof chart.visibleRangeSpan === "number") &&
    isWorkspaceChartLineVisibility(chart.lineVisibility)
  );
}

function isWorkspacePanelKey(value: unknown): value is WorkspacePanelKey {
  return value === "sigi" || value === "risk" || value === "catalysts" || value === "trade";
}

function isWorkspacePanelOrder(value: unknown): value is WorkspacePanelKey[] {
  if (!Array.isArray(value) || value.length !== 4) return false;

  const uniqueKeys = new Set(value);
  return uniqueKeys.size === 4 && value.every((item) => isWorkspacePanelKey(item));
}

function isWorkspaceConfig(value: unknown): value is WorkspaceConfig {
  if (!value || typeof value !== "object") return false;

  const config = value as Record<string, unknown>;
  return (
    isWorkspaceMode(config.mode) &&
    isWorkspaceLayout(config.layout) &&
    isWorkspacePanelOrder(config.panelOrder) &&
    isWorkspacePanels(config.panels) &&
    isWorkspaceChartConfig(config.chart)
  );
}

function isWorkspacePresetScope(value: unknown): value is WorkspacePresetScope {
  return value === "global" || value === "ticker";
}

function isWorkspaceCustomPreset(value: unknown): value is WorkspaceCustomPreset {
  if (!value || typeof value !== "object") return false;

  const preset = value as Record<string, unknown>;
  return (
    typeof preset.id === "string" &&
    typeof preset.name === "string" &&
    preset.name.trim().length > 0 &&
    isWorkspacePresetScope(preset.scope) &&
    isWorkspaceConfig(preset.config)
  );
}

export function buildWorkspaceConfig(mode: WorkspaceMode): WorkspaceConfig {
  const preset = WORKSPACE_MODE_PRESETS[mode];
  return {
    mode,
    layout: preset.layout,
    panelOrder: [...preset.panelOrder],
    panels: { ...preset.panels },
    chart: { ...DEFAULT_WORKSPACE_CONFIG.chart },
  };
}

function storageKeyForTicker(ticker: string): string {
  return `workspace:${normalizeTickerKey(ticker)}`;
}

function presetStorageKeyForScope(ticker: string, scope: WorkspacePresetScope): string {
  if (scope === "global") return WORKSPACE_PRESET_GLOBAL_KEY;
  return `signalos.workspace.custom-presets.${normalizeTickerKey(ticker)}.v1`;
}

function cloneWorkspaceConfig(config: WorkspaceConfig): WorkspaceConfig {
  return {
    mode: config.mode,
    layout: config.layout,
    panelOrder: [...config.panelOrder],
    panels: { ...config.panels },
    chart: {
      ...config.chart,
      lineVisibility: { ...config.chart.lineVisibility },
    },
  };
}

function readPresetBucket(ticker: string, scope: WorkspacePresetScope): WorkspaceCustomPreset[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(presetStorageKeyForScope(ticker, scope));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((value) => {
      if (!isWorkspaceCustomPreset(value) || value.scope !== scope) return [];
      return [
        {
          id: value.id,
          name: value.name.trim(),
          scope: value.scope,
          config: cloneWorkspaceConfig(value.config),
        },
      ];
    });
  } catch {
    return [];
  }
}

function writePresetBucket(
  ticker: string,
  scope: WorkspacePresetScope,
  presets: WorkspaceCustomPreset[]
) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    presetStorageKeyForScope(ticker, scope),
    JSON.stringify(
      presets.map((preset) => ({
        id: preset.id,
        name: preset.name,
        scope: preset.scope,
        config: cloneWorkspaceConfig(preset.config),
      }))
    )
  );
}

export function readWorkspaceConfig(ticker: string): WorkspaceConfig {
  if (typeof window === "undefined") return DEFAULT_WORKSPACE_CONFIG;

  try {
    const raw = window.localStorage.getItem(storageKeyForTicker(ticker));
    if (!raw) return DEFAULT_WORKSPACE_CONFIG;

    const parsed = JSON.parse(raw) as {
      mode?: unknown;
      layout?: unknown;
      panelOrder?: unknown;
      panels?: unknown;
      chart?: unknown;
    };

    if (
      !parsed ||
      !isWorkspaceMode(parsed.mode) ||
      !isWorkspaceLayout(parsed.layout) ||
      !isWorkspacePanelOrder(parsed.panelOrder) ||
      !isWorkspacePanels(parsed.panels) ||
      !isWorkspaceChartConfig(parsed.chart)
    ) {
      return DEFAULT_WORKSPACE_CONFIG;
    }

    return {
      mode: parsed.mode,
      layout: parsed.layout,
      panelOrder: [...parsed.panelOrder],
      panels: { ...parsed.panels },
      chart: {
        ...parsed.chart,
        lineVisibility: { ...parsed.chart.lineVisibility },
      },
    };
  } catch {
    return DEFAULT_WORKSPACE_CONFIG;
  }
}

export function writeWorkspaceConfig(ticker: string, config: WorkspaceConfig) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(storageKeyForTicker(ticker), JSON.stringify(config));
}

export function readWorkspaceCustomPresets(ticker: string): WorkspaceCustomPreset[] {
  return [
    ...readPresetBucket(ticker, "ticker"),
    ...readPresetBucket(ticker, "global"),
  ];
}

export function saveWorkspaceCustomPreset(
  ticker: string,
  preset: Omit<WorkspaceCustomPreset, "id">
): WorkspaceCustomPreset {
  const nextPreset: WorkspaceCustomPreset = {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: preset.name.trim(),
    scope: preset.scope,
    config: cloneWorkspaceConfig(preset.config),
  };

  const current = readPresetBucket(ticker, preset.scope);
  writePresetBucket(ticker, preset.scope, [nextPreset, ...current]);
  return nextPreset;
}

export function updateWorkspaceCustomPreset(
  ticker: string,
  presetId: string,
  scope: WorkspacePresetScope,
  updates: Partial<Pick<WorkspaceCustomPreset, "name" | "config">>
): WorkspaceCustomPreset | null {
  const current = readPresetBucket(ticker, scope);
  const presetIndex = current.findIndex((preset) => preset.id === presetId);

  if (presetIndex === -1) {
    return null;
  }

  const targetPreset = current[presetIndex];
  const nextPreset: WorkspaceCustomPreset = {
    ...targetPreset,
    name: updates.name != null ? updates.name.trim() : targetPreset.name,
    config: updates.config ? cloneWorkspaceConfig(updates.config) : targetPreset.config,
  };

  if (!nextPreset.name.trim()) {
    return null;
  }

  const nextPresets = [...current];
  nextPresets[presetIndex] = nextPreset;

  writePresetBucket(ticker, scope, nextPresets);
  return nextPreset;
}

export function deleteWorkspaceCustomPreset(
  ticker: string,
  presetId: string,
  scope: WorkspacePresetScope
) {
  const current = readPresetBucket(ticker, scope);
  writePresetBucket(
    ticker,
    scope,
    current.filter((preset) => preset.id !== presetId)
  );
}