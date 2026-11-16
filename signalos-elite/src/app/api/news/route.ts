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
        headline: "Market news unavailable",
        summary: "FMP news could not be loaded. Please retry.",
        image: null,
        source: "FMP",
        timestamp: null,
        ticker: null,
        whyItMatters: "",
        items: [],
        stage: "market-brief",
        watchlist: [],
        leadStory: null,
        liveStream: [],
        updatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown news error",
      },
      { status: 502 }
    );
  }
}
