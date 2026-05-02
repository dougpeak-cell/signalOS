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
  if (days <= 1) return "today";
  if (days <= 7) return "week";
  if (days <= 14) return "twoWeeks";
  return null;
}

function recencyBucketScore(bucket: "today" | "week" | "twoWeeks" | null) {
  if (bucket === "today") return 60;
  if (bucket === "week") return 18;
  if (bucket === "twoWeeks") return 8;
  return 0;
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

export async function GET() {
  if (!FMP_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Missing FMP_API_KEY", rows: [] },
      { status: 500 }
    );
  }

  try {
    const sectorCandidates = await Promise.all(
      SECTOR_BUCKETS.map(async (sector) => {
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
          symbol: item.symbol,
          companyName: item.companyName ?? item.company ?? null,
          sector,
          price: typeof item.price === "number" ? item.price : null,
        }));
      })
    );

    const candidates = sectorCandidates.flat();

    const enriched = await Promise.all(
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

    const bySector = new Map<string, PickRow[]>();

    for (const row of enriched) {
      if (!row.targetConsensus || !row.lastGrade) continue;

      const ageInDays = getAgeInDays(row.publishedDate);
      if (ageInDays != null && ageInDays > ANALYST_LOOKBACK_DAYS) continue;

      const list = bySector.get(row.sector) ?? [];
      list.push(row);
      bySector.set(row.sector, list);
    }

    const diversified: PickRow[] = [];

    for (const sector of SECTOR_BUCKETS) {
      const picks = (bySector.get(sector) ?? [])
        .sort((a, b) => b.score - a.score)
        .slice(0, 1);

      diversified.push(...picks);
    }

    const rows = diversified
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    return NextResponse.json({
      ok: true,
      source: "fmp_diversified_analyst_picks",
      rows,
    });
  } catch (error) {
    console.error("FMP diversified experts error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load diversified analyst picks", rows: [] },
      { status: 500 }
    );
  }
}
