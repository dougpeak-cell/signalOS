import { NextResponse } from "next/server";
import { loadResearchAlignment } from "@/lib/experts/loadResearchAlignment";
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
      return NextResponse.json({ ok: false, error: "Sigi Pro is required for Research Alignment." }, { status: 403 });
    }
    const feed = await loadResearchAlignment(symbol);
    const hasEvidence = [feed.analysts, feed.institutions, feed.amsa].some((item) => item.status === "available");
    return NextResponse.json({
      ok: hasEvidence, ...feed,
      ...(!hasEvidence ? { error: "No research source could be verified for this stock. Please retry." } : {}),
    }, { status: hasEvidence ? 200 : 503 });
  } catch {
    console.error("Research Alignment request failed; no unverified research was returned.");
    return NextResponse.json({ ok: false, error: "Research Alignment is unavailable. Please retry." }, { status: 500 });
  }
}
