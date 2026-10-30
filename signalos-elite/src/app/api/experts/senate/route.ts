import { NextResponse } from "next/server";
import { FmpDataError } from "@/lib/experts/fmpClient";
import { SENATE_PERIODS, type SenatePeriod } from "@/lib/experts/senatePurchases";
import { loadSenatePurchases } from "@/lib/experts/fmpSenate";
import { getSigiSettingsViewForCurrentUser } from "@/lib/sigi/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const period = params.get("period") ?? "week";
  const basis = params.get("basis") ?? "disclosure";
  if (!SENATE_PERIODS.some((item) => item.value === period) || !["disclosure", "purchase"].includes(basis)) {
    return NextResponse.json({ ok: false, error: "Choose a valid period and date basis." }, { status: 400 });
  }
  try {
    const settings = await getSigiSettingsViewForCurrentUser();
    if (!settings.hasProFeatures) {
      return NextResponse.json({ ok: false, error: "Sigi Pro is required for Senate purchases." }, { status: 403 });
    }
    const feed = await loadSenatePurchases(period as SenatePeriod, basis === "purchase" ? "purchase" : "disclosure");
    return NextResponse.json({ ok: true, ...feed });
  } catch (error) {
    const message = error instanceof FmpDataError ? error.message : "Senate purchases are unavailable. Please retry.";
    console.error("Senate disclosure feed failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: error instanceof FmpDataError ? error.status : 500 });
  }
}
