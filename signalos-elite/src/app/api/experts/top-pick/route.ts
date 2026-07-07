import { NextRequest, NextResponse } from "next/server";

import { loadFmpExpertsFeed, type FmpExpertPickRow } from "@/lib/experts/fmpLeaders";
import { findTopExpertLeaderBySector } from "@/lib/experts/profileLeaders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TopPickApiResponse = {
  sector: string;
  ticker: string;
  company: string;
  analyst: string;
  firm: string;
  analystAvgReturn: number;
  successRate: number;
  currentPrice: number;
  targetPrice: number;
  upside: number;
  convictionScore: number;
  targetUpdated: string;
  trend: string;
  sigiReason: string;
};

function normalizeFirmName(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(inc|llc|ltd|limited|corp|corporation|company|co|lp|llp|plc|holdings|group)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firmsMatch(left: string | null | undefined, right: string | null | undefined) {
  const normalizedLeft = normalizeFirmName(left);
  const normalizedRight = normalizeFirmName(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getRecencyBonus(row: FmpExpertPickRow) {
  if (row.recencyBucket === "today") return 16;
  if (row.recencyBucket === "week") return 8;
  if (row.recencyBucket === "twoWeeks") return 3;
  return 0;
}

function getGradeBonus(row: FmpExpertPickRow) {
  const grade = String(row.currentGrade ?? row.lastGrade ?? "").toLowerCase();

  if (grade.includes("strong buy")) return 14;
  if (grade.includes("buy")) return 11;
  if (grade.includes("outperform")) return 10;
  if (grade.includes("overweight")) return 9;
  if (grade.includes("hold") || grade.includes("neutral")) return 4;
  if (grade.includes("sell") || grade.includes("underperform") || grade.includes("underweight")) {
    return -8;
  }

  return 0;
}

function getTransitionBonus(row: FmpExpertPickRow) {
  if (row.ratingTransition === "upgrade") return 6;
  if (row.ratingTransition === "reiterate") return 3;
  if (row.ratingTransition === "downgrade") return -6;
  return 0;
}

function buildConvictionScore(
  row: FmpExpertPickRow,
  successRate: number,
  averageReturn: number
) {
  const upsideBonus = clamp((row.upsidePercent ?? 0) / 2, -6, 14);
  const successBonus = clamp((successRate - 55) / 3, -4, 7);
  const returnBonus = clamp(averageReturn / 4, -3, 6);

  return Math.round(
    clamp(
      58 +
        getRecencyBonus(row) +
        getGradeBonus(row) +
        getTransitionBonus(row) +
        upsideBonus +
        successBonus +
        returnBonus,
      0,
      100
    )
  );
}

function buildTrend(row: FmpExpertPickRow) {
  const grade = String(row.currentGrade ?? row.lastGrade ?? "").toLowerCase();

  if (row.ratingTransition === "upgrade") return "Bullish";
  if (row.ratingTransition === "downgrade") return "Cautious";
  if (grade.includes("strong buy") || grade.includes("buy") || grade.includes("outperform")) {
    return "Bullish";
  }
  if (grade.includes("hold") || grade.includes("neutral")) {
    return "Neutral";
  }
  if (grade.includes("sell") || grade.includes("underperform") || grade.includes("underweight")) {
    return "Defensive";
  }

  return "Constructive";
}

function buildReason(
  sector: string,
  row: FmpExpertPickRow,
  analystName: string,
  firm: string
) {
  const catalysts: string[] = [];

  if (row.ratingTransition === "upgrade") {
    catalysts.push("a fresh analyst upgrade");
  } else if (row.ratingTransition === "reiterate") {
    catalysts.push("continued analyst support");
  }

  if (typeof row.upsidePercent === "number" && row.upsidePercent > 0) {
    catalysts.push(`${row.upsidePercent.toFixed(1)}% implied upside to consensus target`);
  }

  if (row.recencyBucket === "today") {
    catalysts.push("same-week target activity");
  } else if (row.recencyBucket === "week") {
    catalysts.push("recent analyst target activity");
  }

  if (row.lastGrade) {
    catalysts.push(`${row.lastGrade} conviction`);
  }

  const reasonBody = catalysts.length > 0
    ? catalysts.slice(0, 3).join(", ")
    : "recent analyst activity and sector-relative setup strength";

  return `${row.symbol} stands out in ${sector} through ${reasonBody}. ${analystName} and ${firm} strengthen the signal with sector-specific analyst leadership.`;
}

function buildUnavailableResponse(sector: string): TopPickApiResponse {
  return {
    sector,
    ticker: "—",
    company: "Live top pick unavailable",
    analyst: "Sigi Analyst Desk",
    firm: "SigiOS Intelligence",
    analystAvgReturn: 0,
    successRate: 0,
    currentPrice: 0,
    targetPrice: 0,
    upside: 0,
    convictionScore: 0,
    targetUpdated: "",
    trend: "Awaiting data",
    sigiReason:
      "Sigi is waiting for a live sector-ranked analyst target update before publishing the top pick.",
  };
}

export async function GET(req: NextRequest) {
  const sector = req.nextUrl.searchParams.get("sector") || "Technology";

  try {
    const [feed, rankedLeader] = await Promise.all([
      loadFmpExpertsFeed(),
      findTopExpertLeaderBySector(sector),
    ]);

    const livePick =
      feed.sectorRows[sector]?.[0] ??
      feed.rows.find((row) => row.sector === sector) ??
      null;

    if (!livePick) {
      return NextResponse.json(buildUnavailableResponse(sector));
    }

    const analystFirm = rankedLeader?.profile.analyst.firm ?? null;
    const liveFirm = livePick.firm ?? null;
    const matchedLeader = firmsMatch(liveFirm, analystFirm) ? rankedLeader : null;
    const analystName = matchedLeader?.profile.analyst.name ?? "Sigi Sector Leader";
    const firm = liveFirm ?? analystFirm ?? "Live analyst feed";
    const analystAvgReturn = matchedLeader?.profile.analyst.averageReturn ?? 0;
    const successRate = matchedLeader?.profile.analyst.successRate ?? 0;
    const targetUpdated =
      livePick.publishedDate ?? matchedLeader?.recentPick?.actionDate ?? matchedLeader?.profile.updatedAt ?? "";

    return NextResponse.json({
      sector,
      ticker: livePick.symbol,
      company: livePick.companyName ?? livePick.symbol,
      analyst: analystName,
      firm,
      analystAvgReturn,
      successRate,
      currentPrice: livePick.price ?? 0,
      targetPrice: livePick.targetConsensus ?? 0,
      upside: livePick.upsidePercent ?? 0,
      convictionScore: buildConvictionScore(livePick, successRate, analystAvgReturn),
      targetUpdated,
      trend: buildTrend(livePick),
      sigiReason: buildReason(sector, livePick, analystName, firm),
    } satisfies TopPickApiResponse);
  } catch (error) {
    console.error("Experts top pick route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "Missing FMP_API_KEY"
            ? "Missing FMP_API_KEY"
            : "Failed to load live top analyst pick",
      },
      { status: 500 }
    );
  }
}