import { NextResponse } from "next/server";

type UpgradeReason = "depth" | "memory" | "research" | "proactive" | "automation";
type UpgradePromptSource = "rail_inline" | "rail_modal" | "rail_preview";

type SigiUpgradeAnalyticsPayload = {
  event: "sigi_upgrade_trigger_shown" | "sigi_upgrade_clicked" | "sigi_upgrade_dismissed";
  tierTarget: "smart" | "pro";
  reason: UpgradeReason;
  source?: UpgradePromptSource;
};

function isValidPayload(payload: unknown): payload is SigiUpgradeAnalyticsPayload {
  if (!payload || typeof payload !== "object") return false;

  const candidate = payload as Partial<SigiUpgradeAnalyticsPayload>;
  return (
    (candidate.event === "sigi_upgrade_trigger_shown" ||
      candidate.event === "sigi_upgrade_clicked" ||
      candidate.event === "sigi_upgrade_dismissed") &&
    (candidate.tierTarget === "smart" || candidate.tierTarget === "pro") &&
    (candidate.reason === "depth" ||
      candidate.reason === "memory" ||
      candidate.reason === "research" ||
      candidate.reason === "proactive" ||
      candidate.reason === "automation") &&
    (candidate.source === undefined ||
      candidate.source === "rail_inline" ||
      candidate.source === "rail_modal" ||
      candidate.source === "rail_preview")
  );
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as unknown;
    if (!isValidPayload(payload)) {
      return NextResponse.json({ error: "Invalid analytics payload." }, { status: 400 });
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[sigi-upgrade-analytics]", payload);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}