import type {
  CoverageRow,
  ExpertActionTone,
  ExpertPosition,
  ExpertProfileResponse,
  UpstreamExpertCoverageItem,
  UpstreamExpertProfileResponse,
} from "@/lib/experts/types";

const ACTION_TONE_PRIORITY: Record<ExpertActionTone, number> = {
  fresh: 0,
  today: 1,
  recent: 2,
  stale: 3,
};

export function getActionPriority(tone: ExpertActionTone): number {
  return ACTION_TONE_PRIORITY[tone] ?? 99;
}

export function parseDateToMs(value: string | null | undefined): number {
  if (!value) return 0;

  const direct = Date.parse(value);
  if (!Number.isNaN(direct)) return direct;

  const parts = value.split("/");
  if (parts.length === 3) {
    const [month, day, year] = parts;
    const fullYear = Number(year) < 100 ? 2000 + Number(year) : Number(year);
    const date = new Date(fullYear, Number(month) - 1, Number(day));
    const ms = date.getTime();
    if (!Number.isNaN(ms)) return ms;
  }

  return 0;
}

export function getActionToneFromDate(
  actionDate: string | null | undefined,
  now = new Date()
): ExpertActionTone {
  const actionMs = parseDateToMs(actionDate);
  if (!actionMs) return "stale";

  const diffMs = Math.max(0, now.getTime() - actionMs);
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours <= 2) return "fresh";

  const actionDateObj = new Date(actionMs);
  const sameUtcDay =
    now.getUTCFullYear() === actionDateObj.getUTCFullYear() &&
    now.getUTCMonth() === actionDateObj.getUTCMonth() &&
    now.getUTCDate() === actionDateObj.getUTCDate();

  if (sameUtcDay) return "today";
  if (diffHours <= 72) return "recent";
  return "stale";
}

export function getActionLabel(
  tone: ExpertActionTone,
  actionDate: string | null | undefined,
  now = new Date()
): string {
  if (tone === "fresh") return "Just Updated";
  if (tone === "today") return "Today";

  const actionMs = parseDateToMs(actionDate);
  if (!actionMs) return "Older";

  const diffMs = Math.max(0, now.getTime() - actionMs);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;
  return "1w+ ago";
}

export function normalizePosition(value: string | null | undefined): ExpertPosition {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (["buy", "strong buy", "outperform", "overweight", "accumulate"].includes(normalized)) {
    return "Buy";
  }

  if (["sell", "strong sell", "underperform", "underweight", "reduce"].includes(normalized)) {
    return "Sell";
  }

  return "Hold";
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function calcUpsidePct(
  currentPrice: number | null,
  priceTarget: number | null
): number | null {
  if (
    currentPrice === null ||
    priceTarget === null ||
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(priceTarget) ||
    currentPrice <= 0
  ) {
    return null;
  }

  return Number((((priceTarget - currentPrice) / currentPrice) * 100).toFixed(1));
}

export function normalizeSpark(raw: number[] | null | undefined): number[] {
  if (!Array.isArray(raw) || raw.length === 0) return [40, 50, 55, 52, 58];

  const cleaned = raw
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.max(5, Math.min(100, Math.round(n))));

  if (cleaned.length === 0) return [40, 50, 55, 52, 58];
  if (cleaned.length >= 5) return cleaned.slice(0, 5);

  const padded = [...cleaned];
  while (padded.length < 5) {
    padded.push(padded[padded.length - 1] ?? 50);
  }
  return padded;
}

export function compareCoverageRows(a: CoverageRow, b: CoverageRow): number {
  const toneDiff = getActionPriority(a.actionTone) - getActionPriority(b.actionTone);
  if (toneDiff !== 0) return toneDiff;

  const dateDiff = parseDateToMs(b.actionDate) - parseDateToMs(a.actionDate);
  if (dateDiff !== 0) return dateDiff;

  const upsideA = Math.abs(a.upsidePct ?? 0);
  const upsideB = Math.abs(b.upsidePct ?? 0);
  if (upsideB !== upsideA) return upsideB - upsideA;

  return a.ticker.localeCompare(b.ticker);
}

export function sortCoverage(rows: CoverageRow[]): CoverageRow[] {
  return [...rows].sort(compareCoverageRows);
}

export function getTopMove(rows: CoverageRow[]): CoverageRow | null {
  return sortCoverage(rows)[0] ?? null;
}

export function normalizeCoverageRow(
  item: UpstreamExpertCoverageItem,
  now = new Date()
): CoverageRow | null {
  const ticker = String(item.ticker ?? "").trim().toUpperCase();
  const company = String(item.company ?? "").trim();

  if (!ticker || !company) return null;

  const currentPrice = toNumber(item.currentPrice);
  const priceTarget = toNumber(item.priceTarget);
  const actionDate = item.actionDate ?? null;
  const actionTone = getActionToneFromDate(actionDate, now);
  const upsidePct = calcUpsidePct(currentPrice, priceTarget);

  const sourceTypeRaw = String(item.sourceType ?? "analyst").trim().toLowerCase();
  const sourceType =
    sourceTypeRaw === "insider" || sourceTypeRaw === "fund" ? sourceTypeRaw : "analyst";

  return {
    ticker,
    company,
    position: normalizePosition(item.rating),
    priceTarget,
    currentPrice,
    upsidePct,
    actionDate,
    actionLabel: getActionLabel(actionTone, actionDate, now),
    actionTone,
    note: item.note ?? undefined,
    rationale: item.rationale ?? undefined,
    spark: normalizeSpark(item.spark),
    sourceType,
    sourceName: item.sourceName ?? undefined,
    sourceFirm: item.sourceFirm ?? undefined,
  };
}

export function normalizeExpertProfileResponse(
  upstream: UpstreamExpertProfileResponse,
  slug: string,
  now = new Date()
): ExpertProfileResponse {
  const analyst = upstream.analyst ?? {};
  const coverage = Array.isArray(upstream.coverage) ? upstream.coverage : [];

  const normalizedCoverage = coverage
    .map((item) => normalizeCoverageRow(item, now))
    .filter((item): item is CoverageRow => item !== null);

  return {
    analyst: {
      slug: String(analyst.slug ?? slug),
      name: String(analyst.name ?? "Unknown Analyst"),
      firm: String(analyst.firm ?? "Unknown Firm"),
      rank: analyst.rank ?? null,
      stars: analyst.stars ?? null,
      successRate: analyst.successRate ?? null,
      averageReturn: analyst.averageReturn ?? null,
      sectors: analyst.sectors ?? [],
      regions: analyst.regions ?? [],
    },
    coverage: sortCoverage(normalizedCoverage),
    updatedAt: upstream.updatedAt ?? now.toISOString(),
  };
}