import { NextResponse } from "next/server";

type TodayIntelligenceRequest = {
  marketPulse?: {
    spy?: number | null;
    qqq?: number | null;
    iwm?: number | null;
    dia?: number | null;
    vix?: number | null;
  };
  topSetups?: Array<{
    ticker: string;
    signal?: string;
    changePct?: number | null;
    score?: number | null;
    sector?: string | null;
  }>;
  news?: Array<{
    headline: string;
    source?: string;
    tone?: string;
    tickers?: string[];
    category?: string;
  }>;
  watchlist?: string[];
};

function pct(value?: number | null) {
  if (!Number.isFinite(value ?? NaN)) return "flat/unknown";
  const n = Number(value);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function summarizeToday(data: TodayIntelligenceRequest) {
  const pulse = data.marketPulse ?? {};
  const setups = data.topSetups ?? [];
  const news = data.news ?? [];

  const bullish = setups.filter((s) =>
    String(s.signal ?? "").toLowerCase().includes("bull")
  );
  const bearish = setups.filter((s) =>
    String(s.signal ?? "").toLowerCase().includes("bear")
  );

  const best = [...setups].sort(
    (a, b) => Number(b.score ?? 0) - Number(a.score ?? 0)
  )[0];

  const negativeNews = news.filter((n) =>
    String(n.tone ?? "").toLowerCase().includes("negative")
  );

  const aiNews = news.filter((n) =>
    `${n.headline} ${n.category ?? ""}`.toLowerCase().includes("ai")
  );

  const marketStructure =
    `SPY is ${pct(pulse.spy)}, QQQ is ${pct(pulse.qqq)}, IWM is ${pct(pulse.iwm)}, and DIA is ${pct(pulse.dia)}. ` +
    (bullish.length > bearish.length
      ? `Bullish setups currently lead bearish setups ${bullish.length}-${bearish.length}, but confirmation should be checked against breadth and news.`
      : bearish.length > bullish.length
        ? `Bearish setups currently lead bullish setups ${bearish.length}-${bullish.length}, so risk control matters.`
        : `Bullish and bearish setups are balanced, so the tape looks selective rather than broad.`);

  const bestOpportunity = best
    ? `${best.ticker} is the highest-ranked active setup right now with a ${best.signal ?? "current"} signal${best.score ? ` and score ${best.score}` : ""}. Treat it as the first name to investigate, not an automatic buy.`
    : `No single high-conviction setup is clearly leading from the active scan yet. Wait for cleaner confirmation.`;

  const mainRisk =
    negativeNews.length > 0
      ? `The main risk is headline pressure. ${negativeNews[0]?.headline} is a negative catalyst that may weigh on sentiment.`
      : aiNews.length > 0
        ? `The main risk is AI/tech sensitivity. AI-related headlines are active, so QQQ and large-cap tech may react quickly.`
        : `The main risk is weak follow-through. If buyers do not confirm the move, the tape can rotate faster than the headline story implies.`;

  return {
    marketStructure,
    bestOpportunity,
    mainRisk,
    sourceSummary: {
      setupCount: setups.length,
      newsCount: news.length,
      bullishCount: bullish.length,
      bearishCount: bearish.length,
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TodayIntelligenceRequest;

    const result = summarizeToday(body);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to generate intelligence",
      },
      { status: 500 }
    );
  }
}