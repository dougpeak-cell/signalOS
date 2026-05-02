import { unstable_cache } from "next/cache";
import {
  getSeededExpertTickerSnapshots,
  type SeededExpertTickerSnapshot,
} from "@/lib/experts/data";
import {
  compareCoverageRows,
  normalizeExpertProfileResponse,
} from "@/lib/experts/ranking";
import type { CoverageRow, ExpertProfileResponse, UpstreamExpertProfileResponse } from "@/lib/experts/types";

export const EXPERT_TICKER_SNAPSHOTS_REVALIDATE_SECONDS = 300;

function parseSlugList(value: string | undefined) {
  return Array.from(
    new Set(
      String(value ?? "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function toSnapshot(row: CoverageRow): SeededExpertTickerSnapshot {
  const sourceName = row.sourceName ?? null;
  const sourceFirm = row.sourceFirm ?? null;
  const note = row.note ?? row.rationale ?? null;

  let conviction = 60;
  if (row.position === "Buy") conviction = 78;
  if (row.position === "Sell") conviction = 34;

  if (row.actionTone === "fresh") conviction += 6;
  else if (row.actionTone === "today") conviction += 4;
  else if (row.actionTone === "recent") conviction += 2;

  conviction = Math.max(0, Math.min(100, conviction));

  return {
    ticker: row.ticker,
    company: row.company,
    conviction,
    priceTarget: row.priceTarget,
    upsidePct: row.upsidePct,
    note,
    sourceName,
    sourceFirm,
    actionTone: row.actionTone,
    position: row.position,
  };
}

function mergeCoverageRows(rows: CoverageRow[]) {
  const snapshots = new Map<string, SeededExpertTickerSnapshot>();

  for (const row of rows) {
    const ticker = row.ticker.trim().toUpperCase();
    if (!ticker) continue;

    const existing = snapshots.get(ticker);
    const candidate = toSnapshot({ ...row, ticker });

    if (!existing) {
      snapshots.set(ticker, candidate);
      continue;
    }

    const existingRow: CoverageRow = {
      ticker: existing.ticker,
      company: existing.company,
      position: existing.position,
      priceTarget: existing.priceTarget,
      currentPrice: null,
      upsidePct: existing.upsidePct,
      actionDate: null,
      actionLabel: "",
      actionTone: existing.actionTone,
      note: existing.note ?? undefined,
      rationale: existing.note ?? undefined,
      spark: [],
      sourceType: "analyst",
      sourceName: existing.sourceName ?? undefined,
      sourceFirm: existing.sourceFirm ?? undefined,
    };

    if (compareCoverageRows(row, existingRow) < 0) {
      continue;
    }

    snapshots.set(ticker, candidate);
  }

  return Object.fromEntries(snapshots.entries());
}

async function fetchUpstreamProfile(baseUrl: string, slug: string): Promise<ExpertProfileResponse | null> {
  try {
    const upstreamUrl = new URL(baseUrl);
    upstreamUrl.searchParams.set("slug", slug);

    const response = await fetch(upstreamUrl.toString(), {
      next: { revalidate: EXPERT_TICKER_SNAPSHOTS_REVALIDATE_SECONDS },
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as UpstreamExpertProfileResponse;
    return normalizeExpertProfileResponse(json, slug);
  } catch {
    return null;
  }
}

async function getExpertTickerSnapshotsUncached(): Promise<
  Record<string, SeededExpertTickerSnapshot>
> {
  const seededSnapshots = getSeededExpertTickerSnapshots();
  const upstreamBaseUrl = process.env.EXPERTS_UPSTREAM_URL;
  const upstreamSlugs = parseSlugList(process.env.EXPERTS_UPSTREAM_SLUGS);

  if (!upstreamBaseUrl || upstreamSlugs.length === 0) {
    return seededSnapshots;
  }

  const profiles = await Promise.all(
    upstreamSlugs.map((slug) => fetchUpstreamProfile(upstreamBaseUrl, slug))
  );

  const upstreamRows = profiles.flatMap((profile) => profile?.coverage ?? []);

  if (upstreamRows.length === 0) {
    return seededSnapshots;
  }

  return {
    ...seededSnapshots,
    ...mergeCoverageRows(upstreamRows),
  };
}

const getCachedExpertTickerSnapshots = unstable_cache(
  async () => getExpertTickerSnapshotsUncached(),
  ["expert-ticker-snapshots-v1"],
  {
    revalidate: EXPERT_TICKER_SNAPSHOTS_REVALIDATE_SECONDS,
    tags: ["experts", "expert-ticker-snapshots"],
  }
);

export async function getExpertTickerSnapshots(): Promise<
  Record<string, SeededExpertTickerSnapshot>
> {
  return getCachedExpertTickerSnapshots();
}