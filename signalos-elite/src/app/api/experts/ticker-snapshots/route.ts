import { NextResponse } from "next/server";
import {
  EXPERT_TICKER_SNAPSHOTS_REVALIDATE_SECONDS,
  getExpertTickerSnapshots,
} from "@/lib/experts/tickerSnapshots";

export async function GET() {
  try {
    const snapshots = await getExpertTickerSnapshots();

    return NextResponse.json(
      {
        snapshots,
        count: Object.keys(snapshots).length,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load expert ticker snapshots.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}