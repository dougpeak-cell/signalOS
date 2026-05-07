import { NextResponse } from "next/server";
import { getHeroStoryPayload } from "@/lib/news/heroStory";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ticker =
      searchParams.get("ticker")?.trim().toUpperCase() ??
      searchParams.get("symbol")?.trim().toUpperCase() ??
      "";

    return NextResponse.json(await getHeroStoryPayload(ticker));
  } catch (error) {
    console.error("News API error:", error);

    return NextResponse.json(
      {
        headline: "Markets steady as traders assess positioning",
        summary:
          "Markets are digesting macro headlines, leadership rotation, and evolving trader positioning.",
        image: null,
        source: "Benzinga",
        timestamp: null,
        ticker: null,
        whyItMatters: "This catalyst may affect market sentiment, sector leadership, and near-term price behavior.",
        items: [],
        stage: "market-brief",
        watchlist: [],
        leadStory: null,
        liveStream: [],
        updatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown news error",
      },
      { status: 200 }
    );
  }
}
