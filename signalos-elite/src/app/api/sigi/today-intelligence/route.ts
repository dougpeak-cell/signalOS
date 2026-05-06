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

  const indexChanges = [
    { ticker: "SPY", value: pulse.spy ?? null },
    { ticker: "QQQ", value: pulse.qqq ?? null },
    { ticker: "IWM", value: pulse.iwm ?? null },
    { ticker: "DIA", value: pulse.dia ?? null },
  ].filter((item) => Number.isFinite(item.value ?? NaN));

  const strongestIndex = [...indexChanges].sort(
    (a, b) => Number(b.value ?? 0) - Number(a.value ?? 0)
  )[0];

  const weakestIndex = [...indexChanges].sort(
    (a, b) => Number(a.value ?? 0) - Number(b.value ?? 0)
  )[0];

  const vixTone = Number.isFinite(pulse.vix ?? NaN)
    ? (pulse.vix ?? 0) > 2
      ? "Volatility is expanding, so upside follow-through needs more proof."
      : (pulse.vix ?? 0) < -2
        ? "Volatility is easing, which is more supportive for continuation setups."
        : "Volatility is steady, so leadership matters more than panic or relief."
    : null;

  const setupBreadthText =
    setups.length === 0
      ? "No qualified setups are active yet, so SIGI is reading price structure more than the scan."
      : bullish.length > bearish.length
        ? `Bullish setups lead ${bullish.length}-${bearish.length}, so buyers have the cleaner early edge.`
        : bearish.length > bullish.length
          ? `Bearish setups lead ${bearish.length}-${bullish.length}, so risk control still matters.`
          : `Bullish and bearish setups are balanced at ${bullish.length}-${bearish.length}, so the tape looks selective rather than broad.`;

  const marketStructure =
    `SPY is ${pct(pulse.spy)}, QQQ is ${pct(pulse.qqq)}, IWM is ${pct(pulse.iwm)}, and DIA is ${pct(pulse.dia)}. ` +
    (strongestIndex && weakestIndex && strongestIndex.ticker !== weakestIndex.ticker
      ? `${strongestIndex.ticker} is leading while ${weakestIndex.ticker} is lagging, which points to ${strongestIndex.value === weakestIndex.value ? "an even tape" : "uneven participation"}. `
      : "Participation across the major indexes is still forming. ") +
    `${setupBreadthText}${vixTone ? ` ${vixTone}` : ""}`;

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