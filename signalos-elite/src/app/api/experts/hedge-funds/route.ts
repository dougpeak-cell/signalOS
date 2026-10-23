import { NextResponse } from "next/server";
import { HedgeFundDataError, loadFmpHedgeFundInvestments } from "@/lib/experts/fmpHedgeFunds";
import { getSigiSettingsViewForCurrentUser } from "@/lib/sigi/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(): Promise<NextResponse> {
  try {
    const settings = await getSigiSettingsViewForCurrentUser();
    if (!settings.hasProFeatures) {
      return NextResponse.json({ ok: false, error: "Sigi Pro is required for hedge-fund rankings." }, { status: 403 });
    }
    const feed = await loadFmpHedgeFundInvestments();
    return NextResponse.json({ ok: true, ...feed });
  } catch (error) {
    // Never log a provider fetch error object: its URL can contain the API key.
    console.error("Hedge-fund investments feed failed:", error instanceof HedgeFundDataError ? error.message : "Unexpected server error");
    return NextResponse.json({
      ok: false,
      error: error instanceof HedgeFundDataError ? error.message : "Hedge-fund investments are unavailable. Please retry.",
    }, { status: error instanceof HedgeFundDataError ? error.status : 500 });
  }
}
