import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PulseSnapshotRow = {
  entity_key: string;
  snapshot_date: string;
  score: number | null;
  confidence: number | null;
  state: string | null;
  direction: string | null;
  status: string | null;
  metadata: unknown;
  recorded_at: string;
};

export type PreviousPulseLeader = {
  date: string;
  symbol: string;
  pulse: number;
  opportunity: number | null;
  confidence: number | null;
  rvol: number | null;
  regime: string | null;
  direction: string | null;
  qualified: boolean;
};

const DEFAULT_LIMIT = 7;
const MAXIMUM_LIMIT = 30;
const MINIMUM_PULSE_SCORE = 60;
const MINIMUM_OPPORTUNITY_SCORE = 65;
const MINIMUM_CONFIDENCE = 65;
const MINIMUM_RVOL = 1.5;

function asFiniteNumber(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeSymbol(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function asMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getMetadataNumber(
  metadata: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = asFiniteNumber(metadata[key]);
    if (value !== null) return value;
  }

  return null;
}

function getChicagoDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isRegularSessionComplete(date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  if (values.weekday === "Sat" || values.weekday === "Sun") return false;

  return Number(values.hour) * 60 + Number(values.minute) >= 15 * 60;
}

function getRequestedLimit(request: Request): number {
  const requestedLimit = Number(new URL(request.url).searchParams.get("limit"));

  if (!Number.isFinite(requestedLimit)) return DEFAULT_LIMIT;

  return Math.min(
    Math.max(Math.trunc(requestedLimit || DEFAULT_LIMIT), 1),
    MAXIMUM_LIMIT,
  );
}

function getOpportunity(row: PulseSnapshotRow): number | null {
  return getMetadataNumber(asMetadata(row.metadata), [
    "opportunityScore",
    "opportunity_score",
    "opportunity",
  ]);
}

function getRelativeVolume(row: PulseSnapshotRow): number | null {
  return getMetadataNumber(asMetadata(row.metadata), [
    "relativeVolume",
    "relative_volume",
    "rvol",
  ]);
}

function isQualified(row: PulseSnapshotRow): boolean {
  const symbol = normalizeSymbol(row.entity_key);
  const pulse = asFiniteNumber(row.score);
  const confidence = asFiniteNumber(row.confidence);
  const opportunity = getOpportunity(row);
  const rvol = getRelativeVolume(row);

  return Boolean(
    symbol &&
    row.snapshot_date &&
    pulse !== null &&
    pulse >= MINIMUM_PULSE_SCORE &&
    confidence !== null &&
    confidence >= MINIMUM_CONFIDENCE &&
    (opportunity === null || opportunity >= MINIMUM_OPPORTUNITY_SCORE) &&
    (rvol === null || rvol >= MINIMUM_RVOL),
  );
}

function isDisplayable(row: PulseSnapshotRow): boolean {
  return Boolean(
    normalizeSymbol(row.entity_key) &&
    row.snapshot_date &&
    asFiniteNumber(row.score) !== null &&
    (row.status === null || row.status === "ready"),
  );
}

function compareRows(left: PulseSnapshotRow, right: PulseSnapshotRow): number {
  return (
    Number(isQualified(right)) - Number(isQualified(left)) ||
    (getOpportunity(right) ?? -1) - (getOpportunity(left) ?? -1) ||
    (asFiniteNumber(right.score) ?? -1) - (asFiniteNumber(left.score) ?? -1) ||
    (asFiniteNumber(right.confidence) ?? -1) -
      (asFiniteNumber(left.confidence) ?? -1) ||
    (getRelativeVolume(right) ?? -1) - (getRelativeVolume(left) ?? -1) ||
    right.recorded_at.localeCompare(left.recorded_at)
  );
}

export function selectPreviousPulseLeaders(
  rows: PulseSnapshotRow[],
  limit: number,
): PreviousPulseLeader[] {
  const leadersByDate = new Map<string, PulseSnapshotRow>();
  const displayableRows = rows.filter(isDisplayable);
  const latestPersistedDate = displayableRows
    .map((row) => row.snapshot_date)
    .sort()
    .at(-1);
  const latestQualifiedDate = displayableRows
    .filter(isQualified)
    .map((row) => row.snapshot_date)
    .sort()
    .at(-1);

  for (const row of displayableRows.filter(
    (row) =>
      isQualified(row) ||
      (latestQualifiedDate
        ? row.snapshot_date > latestQualifiedDate
        : row.snapshot_date === latestPersistedDate),
  )) {
    const currentLeader = leadersByDate.get(row.snapshot_date);

    if (!currentLeader || compareRows(row, currentLeader) < 0) {
      leadersByDate.set(row.snapshot_date, row);
    }
  }

  return Array.from(leadersByDate.entries())
    .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
    .slice(0, limit)
    .map(([date, leader]) => {
      const metadata = asMetadata(leader.metadata);
      const opportunity = getOpportunity(leader);
      const confidence = asFiniteNumber(leader.confidence);

      return {
        date,
        symbol: normalizeSymbol(leader.entity_key),
        pulse: Math.round(asFiniteNumber(leader.score) ?? 0),
        opportunity: opportunity === null ? null : Math.round(opportunity),
        confidence: confidence === null ? null : Math.round(confidence),
        rvol: getRelativeVolume(leader),
        regime:
          typeof metadata.regime === "string"
            ? metadata.regime
            : typeof metadata.marketRegime === "string"
              ? metadata.marketRegime
              : leader.state,
        direction: leader.direction,
        qualified: isQualified(leader),
      };
    });
}

export async function GET(request: Request) {
  try {
    const limit = getRequestedLimit(request);
    const supabase = createSupabaseAdminClient();
    let query = supabase
      .from("amsa_pulse_snapshots")
      .select(
        "entity_key, snapshot_date, score, confidence, state, direction, status, metadata, recorded_at",
      )
      .eq("entity_type", "stock")
      .eq("metadata->>frequency", "daily")
      .order("snapshot_date", { ascending: false })
      .order("score", { ascending: false })
      .order("recorded_at", { ascending: false });

    query = isRegularSessionComplete()
      ? query.lte("snapshot_date", getChicagoDate())
      : query.lt("snapshot_date", getChicagoDate());

    const { data, error } = await query.limit(500);

    if (error) {
      console.error("[pulse-leaders] Supabase error:", error);
      return NextResponse.json(
        { ok: false, leaders: [], error: "Unable to load previous Pulse leaders." },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    const leaders = selectPreviousPulseLeaders(
      (data ?? []) as PulseSnapshotRow[],
      limit,
    );

    return NextResponse.json(
      { ok: true, leaders, count: leaders.length },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("[pulse-leaders] Unexpected error:", error);
    return NextResponse.json(
      {
        ok: false,
        leaders: [],
        error: "Previous Pulse leaders are temporarily unavailable.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}