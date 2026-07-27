export type PortfolioPulseStatus =
  | "ready"
  | "awaiting_first_snapshot"
  | "stale"
  | "unsupported"
  | "error";

export type PortfolioPulseSnapshotRow = {
  entity_key: string;
  score: number | null;
  state: string | null;
  direction: string | null;
  status: string | null;
  calculated_at: string;
};

export type PortfolioHoldingPulse = {
  symbol: string;
  pulseScore: number | null;
  pulseDirection: "improving" | "weakening" | "stable" | null;
  pulseDelta: number | null;
  snapshotAt: string | null;
  pulseStatus: PortfolioPulseStatus;
};

const STALE_AFTER_MS = 120 * 60 * 60 * 1000;
const SUPPORTED_STOCK_SYMBOL = /^[A-Z][A-Z0-9.-]{0,14}$/;

export function normalizePortfolioSymbol(value: string): string {
  return String(value ?? "").trim().toUpperCase();
}

export function isSupportedPortfolioSymbol(symbol: string): boolean {
  return SUPPORTED_STOCK_SYMBOL.test(normalizePortfolioSymbol(symbol));
}

function isVerifiedSnapshot(
  row: PortfolioPulseSnapshotRow,
): boolean {
  const status = row.status?.trim().toLowerCase();

  return (
    Number.isFinite(row.score) &&
    Number.isFinite(Date.parse(row.calculated_at)) &&
    status !== "error" &&
    status !== "unsupported"
  );
}

function directionFromDelta(
  delta: number | null,
): PortfolioHoldingPulse["pulseDirection"] {
  if (delta == null) return null;
  if (delta > 0) return "improving";
  if (delta < 0) return "weakening";
  return "stable";
}

function normalizeDirection(
  value: string | null,
): PortfolioHoldingPulse["pulseDirection"] {
  const direction = value?.trim().toLowerCase();

  if (direction === "improving" || direction === "rising") {
    return "improving";
  }
  if (direction === "weakening" || direction === "falling") {
    return "weakening";
  }
  if (direction === "stable") return "stable";
  return null;
}

export function resolvePortfolioHoldingPulses(
  symbols: string[],
  rows: PortfolioPulseSnapshotRow[],
  now = new Date(),
  queryFailed = false,
): Map<string, PortfolioHoldingPulse> {
  const normalizedSymbols = Array.from(
    new Set(symbols.map(normalizePortfolioSymbol).filter(Boolean)),
  );
  const rowsBySymbol = new Map<string, PortfolioPulseSnapshotRow[]>();

  for (const row of rows) {
    const symbol = normalizePortfolioSymbol(row.entity_key);

    if (!normalizedSymbols.includes(symbol) || !isVerifiedSnapshot(row)) {
      continue;
    }

    const current = rowsBySymbol.get(symbol) ?? [];
    current.push(row);
    rowsBySymbol.set(symbol, current);
  }

  const result = new Map<string, PortfolioHoldingPulse>();

  for (const symbol of normalizedSymbols) {
    if (!isSupportedPortfolioSymbol(symbol)) {
      result.set(symbol, {
        symbol,
        pulseScore: null,
        pulseDirection: null,
        pulseDelta: null,
        snapshotAt: null,
        pulseStatus: "unsupported",
      });
      continue;
    }

    if (queryFailed) {
      result.set(symbol, {
        symbol,
        pulseScore: null,
        pulseDirection: null,
        pulseDelta: null,
        snapshotAt: null,
        pulseStatus: "error",
      });
      continue;
    }

    const snapshots = (rowsBySymbol.get(symbol) ?? []).sort(
      (left, right) =>
        Date.parse(right.calculated_at) - Date.parse(left.calculated_at),
    );
    const latest = snapshots[0];

    if (!latest) {
      result.set(symbol, {
        symbol,
        pulseScore: null,
        pulseDirection: null,
        pulseDelta: null,
        snapshotAt: null,
        pulseStatus: "awaiting_first_snapshot",
      });
      continue;
    }

    const previous = snapshots[1];
    const pulseDelta = previous
      ? Number((Number(latest.score) - Number(previous.score)).toFixed(2))
      : null;
    const stale =
      now.getTime() - Date.parse(latest.calculated_at) > STALE_AFTER_MS;

    result.set(symbol, {
      symbol,
      pulseScore: Number(latest.score),
      pulseDirection:
        directionFromDelta(pulseDelta) ?? normalizeDirection(latest.direction),
      pulseDelta,
      snapshotAt: latest.calculated_at,
      pulseStatus: stale ? "stale" : "ready",
    });
  }

  return result;
}