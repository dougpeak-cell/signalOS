import { NextResponse } from "next/server";
import { fetchTopMarketNews, fetchNewsForWatchlist } from "@/lib/news";

const WATCHLIST = ["NVDA", "MSFT", "AAPL", "AMZN", "META", "TSLA"];

export async function GET() {
  try {
    const [marketNews, watchlistNews] = await Promise.all([
      fetchTopMarketNews({ limit: 18, lookbackHours: 24 }),
      fetchNewsForWatchlist(WATCHLIST, { limit: 12, lookbackHours: 24 }),
    ]);

    const leadStory = marketNews[0] ?? null;
    const liveStream = marketNews.slice(0, 8);

    return NextResponse.json({
      items: marketNews,
      watchlist: watchlistNews,
      leadStory,
      liveStream,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("News API error:", error);

    return NextResponse.json(
      {
        items: [],
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
