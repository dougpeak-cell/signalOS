import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  WorkspacePulseRadar,
  WorkspacePulseRadarItem,
} from "@/types/workspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PulseSnapshotRow = {
  entity_key: string;
  score: unknown;
  status: string | null;
  metadata: unknown;
  calculated_at: string;
  snapshot_date: string;
};

type VerifiedSnapshot = {
  symbol: string;
  score: number;
  snapshotDate: string;
};

function toSnapshot(row: PulseSnapshotRow): VerifiedSnapshot | null {
  const metadata = row.metadata;
  const verified = Boolean(
    metadata &&
      typeof metadata === "object" &&
      !Array.isArray(metadata) &&
      (metadata as Record<string, unknown>).verified === true
  );
  const symbol = String(row.entity_key ?? "").trim().toUpperCase();
  const score = Number(row.score);

  if (
    !verified ||
    !symbol ||
    !row.snapshot_date ||
    !Number.isFinite(score) ||
    (row.status !== null && row.status !== "ready")
  ) {
    return null;
  }

  return { symbol, score, snapshotDate: row.snapshot_date };
}

function radarItem(symbol: string, value: number): WorkspacePulseRadarItem {
  return { symbol, value: Math.round(value * 100) / 100 };
}

function buildPulseRadar(rows: PulseSnapshotRow[]): WorkspacePulseRadar {
  const snapshots = rows
    .map(toSnapshot)
    .filter((snapshot): snapshot is VerifiedSnapshot => snapshot !== null);
  const asOf = snapshots.map((snapshot) => snapshot.snapshotDate).sort().at(-1) ?? null;

  if (!asOf) {
    return { highest: [], improved: [], warnings: [], asOf: null };
  }

  const bySymbol = new Map<string, VerifiedSnapshot[]>();

  for (const snapshot of snapshots) {
    const history = bySymbol.get(snapshot.symbol) ?? [];

    if (!history.some((item) => item.snapshotDate === snapshot.snapshotDate)) {
      history.push(snapshot);
      history.sort((left, right) => right.snapshotDate.localeCompare(left.snapshotDate));
      bySymbol.set(snapshot.symbol, history.slice(0, 2));
    }
  }

  const current = Array.from(bySymbol.values())
    .filter((history) => history[0]?.snapshotDate === asOf);
  const highest = current
    .map((history) => radarItem(history[0].symbol, history[0].score))
    .sort((left, right) => right.value - left.value)
    .slice(0, 3);
  const changes = current
    .filter((history) => history.length === 2)
    .map((history) => radarItem(
      history[0].symbol,
      history[0].score - history[1].score
    ));
  const improved = changes
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, 3);
  const warnings = changes
    .filter((item) => item.value < 0)
    .sort((left, right) => left.value - right.value)
    .slice(0, 3);

  return { highest, improved, warnings, asOf };
}

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("amsa_pulse_snapshots")
      .select("entity_key, score, status, metadata, calculated_at, snapshot_date")
      .eq("entity_type", "stock")
      .eq("frequency", "daily")
      .order("snapshot_date", { ascending: false })
      .order("calculated_at", { ascending: false })
      .limit(1000);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      { success: true, ...buildPulseRadar((data ?? []) as PulseSnapshotRow[]) },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Pulse Radar error:", error);

    return NextResponse.json(
      {
        success: false,
        highest: [],
        improved: [],
        warnings: [],
        asOf: null,
        error: "Pulse Radar is temporarily unavailable.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}