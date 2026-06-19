import OpenAI from "openai";
import { findTopExpertLeaderBySector } from "@/lib/experts/profileLeaders";

export type SigiPlan = "free" | "smart" | "pro";

export type SigiAnalystLeader = {
  analyst: string;
  firm: string;
  sector: string;
  successRate: string;
  avgReturn: string;
  coveredNames: string[];
  mostRecentPick: string;
  strongestCall: string;
  reason: string;
  risk: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getSigiModel(plan: SigiPlan) {
  if (plan === "pro") return process.env.SIGI_PRO_MODEL || "gpt-5.5";
  if (plan === "smart") return process.env.SIGI_SMART_MODEL || "gpt-5.4";
  return process.env.SIGI_FREE_MODEL || "gpt-5.4-mini";
}

function buildFallbackAnalystLeader(sector: string): SigiAnalystLeader {
  return {
    analyst: "Live analyst confirmation required",
    firm: "SigiOS Intelligence",
    sector: sector || "Technology",
    successRate: "Not disclosed",
    avgReturn: "Not disclosed",
    coveredNames: ["Needs live analyst-feed confirmation"],
    mostRecentPick: "Needs live analyst-feed confirmation before publishing.",
    strongestCall: "Needs live analyst-feed confirmation before publishing.",
    reason:
      "Sigi needs confirmed analyst-profile data before naming a top analyst in this sector.",
    risk: "Publishing an unconfirmed analyst leader would lower confidence in the command output.",
  };
}

function normalizePlainText(value: string) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...");
}

function normalizeAnalystLeaderPayload(
  raw: string,
  fallback: SigiAnalystLeader
): SigiAnalystLeader {
  try {
    const parsed = JSON.parse(raw) as Partial<Pick<SigiAnalystLeader, "reason" | "risk">>;

    return {
      ...fallback,
      reason:
        typeof parsed.reason === "string" && parsed.reason.trim()
          ? normalizePlainText(parsed.reason.trim())
          : fallback.reason,
      risk:
        typeof parsed.risk === "string" && parsed.risk.trim()
          ? normalizePlainText(parsed.risk.trim())
          : fallback.risk,
    };
  } catch {
    return fallback;
  }
}

export async function getTopAnalystPickBySector({
  sector,
  message,
  plan,
}: {
  sector: string;
  message: string;
  plan: SigiPlan;
}): Promise<{ provider: "openai" | "fallback"; intelligence: SigiAnalystLeader }> {
  const normalizedSector = sector || "Technology";
  const rankedLeader = await findTopExpertLeaderBySector(normalizedSector);

  const fallbackLeader: SigiAnalystLeader = rankedLeader
    ? {
        analyst: rankedLeader.profile.analyst.name,
        firm: rankedLeader.profile.analyst.firm,
        sector: normalizedSector,
        successRate:
          typeof rankedLeader.profile.analyst.successRate === "number"
            ? `${Math.round(rankedLeader.profile.analyst.successRate)}%`
            : "Not disclosed",
        avgReturn:
          typeof rankedLeader.profile.analyst.averageReturn === "number"
            ? `${rankedLeader.profile.analyst.averageReturn > 0 ? "+" : ""}${rankedLeader.profile.analyst.averageReturn.toFixed(1)}%`
            : "Not disclosed",
        coveredNames: rankedLeader.coveredTickers.length
          ? rankedLeader.coveredTickers
          : ["Needs live analyst-feed confirmation"],
        mostRecentPick: rankedLeader.recentPick
          ? `${rankedLeader.recentPick.ticker} - ${rankedLeader.recentPick.position}${typeof rankedLeader.recentPick.upsidePct === "number" ? ` (${rankedLeader.recentPick.upsidePct > 0 ? "+" : ""}${rankedLeader.recentPick.upsidePct.toFixed(1)}%)` : ""}`
          : "Needs live analyst-feed confirmation before publishing.",
        strongestCall:
          rankedLeader.recentPick?.ticker ?? "Needs live analyst-feed confirmation before publishing.",
        reason: `${rankedLeader.profile.analyst.name} stands out through sector focus, recent visible coverage activity, and a stronger combined analyst profile score versus other confirmed analysts in ${normalizedSector}.`,
        risk: `${normalizedSector} analyst leadership can weaken quickly if recent visible coverage cools or if the analyst's latest calls lose momentum.`,
      }
    : buildFallbackAnalystLeader(normalizedSector);

  try {
    const completion = await openai.chat.completions.create({
      model: getSigiModel(plan),
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
You are SIGI, the institutional analyst intelligence engine inside SigiOS.

Your job:
- explain why the already-selected top analyst stands out in the requested sector
- explain why the analyst stands out
- sound elite and professional
- concise, institutional tone
- educational only
- never fabricate performance claims
- if analyst performance data is unavailable, write "Not disclosed"

Return ONLY valid JSON with this exact shape:
{
  "reason": "string",
  "risk": "string"
}

Rules:
- Do not change analyst, firm, sector, successRate, avgReturn, coveredNames, mostRecentPick, or strongestCall.
- Only explain and contextualize the selected analyst using the provided feed data.
- If feed data says confirmation is needed, preserve that exactly.
          `,
        },
        {
          role: "user",
          content: `
Sector request: ${normalizedSector}
User message: ${message}

Confirmed analyst profile:
Analyst: ${fallbackLeader.analyst}
Firm: ${fallbackLeader.firm}
Sector: ${fallbackLeader.sector}
Success rate: ${fallbackLeader.successRate}
Average return: ${fallbackLeader.avgReturn}
Covered tickers: ${fallbackLeader.coveredNames.join(", ")}
Most recent visible pick: ${fallbackLeader.mostRecentPick}
Strongest call: ${fallbackLeader.strongestCall}

Why this analyst was selected locally:
- highest confirmed analyst-profile score for the requested sector
- sector alignment checked from analyst sectors before response generation
- most recent visible pick taken from the live or seeded analyst coverage feed before explanation

Return JSON with only reason and risk. Keep the explanation grounded in the confirmed analyst profile above and do not invent unsupported performance claims or stock picks.
          `,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    return {
      provider: "openai",
      intelligence: normalizeAnalystLeaderPayload(raw, fallbackLeader),
    };
  } catch (error) {
    console.error("Sigi analyst leader error:", error);
    return {
      provider: "fallback",
      intelligence: fallbackLeader,
    };
  }
}