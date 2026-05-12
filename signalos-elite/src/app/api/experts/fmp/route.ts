import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FMP_API_KEY = process.env.FMP_API_KEY;

const SECTOR_BUCKETS = [
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

const BROAD_CANDIDATE_LIMIT = 30;

type PickRow = {
  symbol: string;
  companyName: string | null;
  sector: string;
  price: number | null;
  targetConsensus: number | null;
  targetHigh: number | null;
  targetLow: number | null;
  lastGrade: string | null;
  firm: string | null;
  publishedDate: string | null;
  recencyBucket: "today" | "week" | "twoWeeks" | null;
  upsidePercent: number | null;
  score: number;
};

type GradeRow = {
  newGrade?: string | null;
  grade?: string | null;
  gradingCompany?: string | null;
  firm?: string | null;
  publishedDate?: string | null;
  date?: string | null;
};

type CandidateRow = {
  symbol: string;
  companyName: string | null;
  sector: string;
  price: number | null;
  consensusScore?: number;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ANALYST_LOOKBACK_DAYS = 14;

function gradeScore(grade: string | null) {
  const g = (grade ?? "").toLowerCase();

  if (g.includes("strong buy")) return 30;
  if (g.includes("buy")) return 26;
  if (g.includes("outperform")) return 24;
  if (g.includes("overweight")) return 22;
  if (g.includes("neutral") || g.includes("hold")) return 10;
  if (g.includes("sell") || g.includes("underperform") || g.includes("underweight")) return -20;

  return 0;
}

function recencyScore(date: string | null) {
  return recencyBucketScore(getRecencyBucket(date));
}

function getAgeInDays(date: string | null) {
  if (!date) return null;

  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return null;

  return (Date.now() - timestamp) / ONE_DAY_MS;
}

function getRecencyBucket(date: string | null) {
  const days = getAgeInDays(date);
  if (days == null) return null;
  if (days <= 2) return "today";
  if (days <= 7) return "week";
  if (days <= 14) return "twoWeeks";
  return null;
}

function getPublishedDateValue(value: unknown): number {
  if (typeof value !== "string" || !value.trim()) return 0;

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function recencyBucketScore(bucket: "today" | "week" | "twoWeeks" | null) {
  if (bucket === "today") return 140;
  if (bucket === "week") return 28;
  if (bucket === "twoWeeks") return 10;
  return 0;
}

function compareRankedRows(left: PickRow, right: PickRow) {
  const recencyDelta =
    recencyBucketScore(right.recencyBucket) - recencyBucketScore(left.recencyBucket);
  if (recencyDelta !== 0) return recencyDelta;

  if (right.score !== left.score) return right.score - left.score;

  const upsideDelta = (right.upsidePercent ?? -999) - (left.upsidePercent ?? -999);
  if (upsideDelta !== 0) return upsideDelta;

  return getPublishedDateValue(right.publishedDate) - getPublishedDateValue(left.publishedDate);
}

function pickBestRecentGrade(grades: GradeRow[]) {
  const recent = grades
    .map((grade) => {
      const publishedDate = grade.publishedDate ?? grade.date ?? null;
      const recencyBucket = getRecencyBucket(publishedDate);

      return {
        ...grade,
        publishedDate,
        recencyBucket,
        recency: recencyBucketScore(recencyBucket),
        sentiment: gradeScore(grade.newGrade ?? grade.grade ?? null),
      };
    })
    .filter((grade) => grade.recencyBucket !== null);

  if (recent.length > 0) {
    recent.sort((left, right) => {
      if (right.sentiment !== left.sentiment) return right.sentiment - left.sentiment;
      if (right.recency !== left.recency) return right.recency - left.recency;
      return String(right.publishedDate ?? "").localeCompare(String(left.publishedDate ?? ""));
    });

    return recent[0];
  }

  const fallback = grades
    .map((grade) => {
      const publishedDate = grade.publishedDate ?? grade.date ?? null;
      return {
        ...grade,
        publishedDate,
        recencyBucket: getRecencyBucket(publishedDate),
        recency: recencyScore(publishedDate),
        sentiment: gradeScore(grade.newGrade ?? grade.grade ?? null),
      };
    })
    .filter((grade) => grade.publishedDate);

  fallback.sort((left, right) => {
    if (right.sentiment !== left.sentiment) return right.sentiment - left.sentiment;
    if (right.recency !== left.recency) return right.recency - left.recency;
    return String(right.publishedDate ?? "").localeCompare(String(left.publishedDate ?? ""));
  });

  return fallback[0] ?? null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  return res.json();
}

async function fetchText(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  return res.text();
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsvRecords(csvText: string) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [] as Array<Record<string, string>>;

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = values[index] ?? "";
      return record;
    }, {});
  });
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string" || value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSector(value: string | null | undefined) {
  const sector = value?.trim();
  return sector && sector.length > 0 ? sector : "Other";
}

function isBroadMarketTicker(symbol: string) {
  return /^[A-Z]{1,5}$/.test(symbol);
}

async function getBroadConsensusCandidates() {
  const csvText = await fetchText(
    `https://financialmodelingprep.com/stable/upgrades-downgrades-consensus-bulk?apikey=${FMP_API_KEY}`
  );

  const records = parseCsvRecords(csvText);

  return records
    .map((record) => {
      const symbol = String(record.symbol ?? "").trim().toUpperCase();
      const strongBuy = toFiniteNumber(record.strongBuy) ?? 0;
      const buy = toFiniteNumber(record.buy) ?? 0;
      const hold = toFiniteNumber(record.hold) ?? 0;
      const sell = toFiniteNumber(record.sell) ?? 0;
      const strongSell = toFiniteNumber(record.strongSell) ?? 0;
      const consensus = String(record.consensus ?? "").trim();

      return {
        symbol,
        consensus,
        consensusScore:
          strongBuy * 5 +
          buy * 2 -
          hold -
          sell * 4 -
          strongSell * 6,
      };
    })
    .filter(
      (record) =>
        isBroadMarketTicker(record.symbol) &&
        (record.consensus === "Buy" || record.consensus === "Strong Buy")
    )
    .sort((left, right) => right.consensusScore - left.consensusScore)
    .slice(0, BROAD_CANDIDATE_LIMIT);
}

async function getSectorCandidates(sectors: string[]) {
  const sectorCandidates = await Promise.all(
    sectors.map(async (sector) => {
      const url =
        `https://financialmodelingprep.com/stable/company-screener` +
        `?sector=${encodeURIComponent(sector)}` +
        `&marketCapMoreThan=2000000000` +
        `&volumeMoreThan=500000` +
        `&priceMoreThan=5` +
        `&isActivelyTrading=true` +
        `&limit=6` +
        `&apikey=${FMP_API_KEY}`;

      const json = await fetchJson(url);
      const rows = Array.isArray(json) ? json : [];

      return rows.slice(0, 4).map((item: any) => ({
        symbol: String(item.symbol ?? "").trim().toUpperCase(),
        companyName: item.companyName ?? item.company ?? null,
        sector,
        price: typeof item.price === "number" ? item.price : null,
      })) satisfies CandidateRow[];
    })
  );

  return sectorCandidates.flat();
}

async function getFallbackSectorCandidates() {
  return getSectorCandidates(SECTOR_BUCKETS);
}

async function enrichCandidateRows(candidates: Array<{ symbol: string; consensusScore?: number }>) {
  const enriched = await Promise.all(
    candidates.map(async (candidate) => {
      const profileJson = await fetchJson(
        `https://financialmodelingprep.com/stable/profile?symbol=${candidate.symbol}&apikey=${FMP_API_KEY}`
      );

      const profile = Array.isArray(profileJson) ? profileJson[0] : profileJson;

      return {
        symbol: candidate.symbol,
        companyName:
          typeof profile?.companyName === "string" ? profile.companyName : candidate.symbol,
        sector: normalizeSector(typeof profile?.sector === "string" ? profile.sector : null),
        price: toFiniteNumber(profile?.price),
        consensusScore: candidate.consensusScore,
      } satisfies CandidateRow;
    })
  );

  return enriched.filter((candidate) => candidate.price != null);
}

async function scoreCandidateRows(candidates: CandidateRow[]) {
  return Promise.all(
    candidates.map(async (candidate) => {
      const [targetJson, gradesJson] = await Promise.all([
        fetchJson(
          `https://financialmodelingprep.com/stable/price-target-consensus?symbol=${candidate.symbol}&apikey=${FMP_API_KEY}`
        ),
        fetchJson(
          `https://financialmodelingprep.com/stable/grades?symbol=${candidate.symbol}&apikey=${FMP_API_KEY}`
        ),
      ]);

      const target = Array.isArray(targetJson) ? targetJson[0] : targetJson;
      const grades = Array.isArray(gradesJson)
        ? gradesJson
        : gradesJson
          ? [gradesJson]
          : [];
      const grade = pickBestRecentGrade(grades);
      const publishedDate = grade?.publishedDate ?? grade?.date ?? null;
      const recencyBucket = getRecencyBucket(publishedDate);

      const targetConsensus =
        typeof target?.targetConsensus === "number"
          ? target.targetConsensus
          : typeof target?.targetPrice === "number"
            ? target.targetPrice
            : null;

      const price = candidate.price;

      const upsidePercent =
        price && targetConsensus
          ? ((targetConsensus - price) / price) * 100
          : null;

      const score =
        clamp(upsidePercent ?? 0, -25, 50) +
        gradeScore(grade?.newGrade ?? grade?.grade ?? null) +
        recencyBucketScore(recencyBucket);

      return {
        symbol: candidate.symbol,
        companyName: candidate.companyName,
        sector: candidate.sector,
        price,
        targetConsensus,
        targetHigh: target?.targetHigh ?? null,
        targetLow: target?.targetLow ?? null,
        lastGrade: grade?.newGrade ?? grade?.grade ?? null,
        firm: grade?.gradingCompany ?? grade?.firm ?? null,
        publishedDate,
        recencyBucket,
        upsidePercent,
        score,
      } satisfies PickRow;
    })
  );
}

function addQualifiedRows(bySector: Map<string, PickRow[]>, rows: PickRow[]) {
  for (const row of rows) {
    if (!row.targetConsensus || !row.lastGrade) continue;

    const ageInDays = getAgeInDays(row.publishedDate);
    if (ageInDays != null && ageInDays > ANALYST_LOOKBACK_DAYS) continue;

    const list = bySector.get(row.sector) ?? [];
    list.push(row);
    bySector.set(row.sector, list);
  }
}

async function buildCandidateRows() {
  try {
    const broadCandidates = await getBroadConsensusCandidates();

    const valid = await enrichCandidateRows(broadCandidates);
    if (valid.length > 0) return valid;
  } catch (error) {
    console.error("FMP broad analyst universe error:", error);
  }

  return getFallbackSectorCandidates();
}

export async function GET() {
  if (!FMP_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Missing FMP_API_KEY", rows: [] },
      { status: 500 }
    );
  }

  try {
    const candidates = await buildCandidateRows();
    const enriched = await scoreCandidateRows(candidates);

    const bySector = new Map<string, PickRow[]>();
    addQualifiedRows(bySector, enriched);

    const missingSectors = SECTOR_BUCKETS.filter((sector) => (bySector.get(sector) ?? []).length === 0);

    if (missingSectors.length > 0) {
      const seenSymbols = new Set(candidates.map((candidate) => candidate.symbol));
      const backfillCandidates = (await getSectorCandidates(missingSectors)).filter(
        (candidate) => !seenSymbols.has(candidate.symbol)
      );

      if (backfillCandidates.length > 0) {
        const backfillRows = await scoreCandidateRows(backfillCandidates);
        addQualifiedRows(bySector, backfillRows);
      }
    }

    const sectorRows = Object.fromEntries(
      SECTOR_BUCKETS.map((sector) => [
        sector,
        [...(bySector.get(sector) ?? [])].sort(compareRankedRows).slice(0, 10),
      ])
    );

    const diversified: PickRow[] = [];
    const selectedSymbols = new Set<string>();

    for (const sector of SECTOR_BUCKETS) {
      const picks = (bySector.get(sector) ?? [])
        .sort(compareRankedRows)
        .slice(0, 1);

      diversified.push(...picks);
      picks.forEach((pick) => selectedSymbols.add(pick.symbol));
    }

    const remaining = enriched
      .filter((row) => !selectedSymbols.has(row.symbol))
      .sort(compareRankedRows);

    for (const row of remaining) {
      if (diversified.length >= 12) break;
      diversified.push(row);
    }

    const strictRows = diversified
      .sort(compareRankedRows)
      .slice(0, 12);

    const fallbackRows = [...enriched]
      .filter((row) => Boolean(row.publishedDate))
      .sort(compareRankedRows)
      .slice(0, 10);

    const rows = strictRows.length > 0 ? strictRows : fallbackRows;

    return NextResponse.json({
      ok: true,
      source: strictRows.length > 0 ? "fmp_diversified_analyst_picks" : "fmp_latest_analyst_picks_fallback",
      rows,
      sectorRows,
    });
  } catch (error) {
    console.error("FMP diversified experts error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load diversified analyst picks", rows: [] },
      { status: 500 }
    );
  }
}
