import { NextResponse } from "next/server";
import { loadInstitutionalActivity } from "@/lib/experts/fmpInstitutionalActivity";
import { getSigiSettingsViewForCurrentUser } from "@/lib/sigi/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request): Promise<NextResponse> {
  const symbol = new URL(request.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol)) {
    return NextResponse.json({ ok: false, error: "Enter a valid stock ticker." }, { status: 400 });
  }
  try {
    const settings = await getSigiSettingsViewForCurrentUser();
    if (!settings.hasProFeatures) {
      return NextResponse.json({ ok: false, error: "Sigi Pro is required for institutional activity." }, { status: 403 });
    }
    const activity = await loadInstitutionalActivity(symbol);
    const available = activity.quarters.some((quarter) => quarter.comparedFunds > 0);
    return NextResponse.json({
      ok: available, activity,
      ...(!available ? { error: "No consecutive-quarter comparisons could be verified. See source coverage below." } : {}),
    }, { status: available ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Institutional activity request failed; no unverified activity was returned.");
    return NextResponse.json({ ok: false, error: "Institutional activity is unavailable. Please retry." }, { status: 500 });
  }
}
