import { NextResponse } from "next/server";
import { getSigiPlanSummaryForCurrentUser } from "@/lib/sigi/settings";

export async function GET() {
  try {
    const summary = await getSigiPlanSummaryForCurrentUser();
    return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load Sigi plan.",
      },
      { status: 500 }
    );
  }
}