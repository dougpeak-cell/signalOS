import { NextResponse } from "next/server";
import { createCheckoutSessionForPlan } from "@/lib/billing/checkout";
import { coercePaidSigiTier } from "@/lib/billing/tiers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type SigiTier } from "@/lib/sigi/gates";

type UpgradeTier = Exclude<SigiTier, "free">;

type UpgradeRequestBody = {
  tier?: string;
  complete?: boolean;
};

function parseUpgradeTier(value: string | null | undefined): UpgradeTier | null {
  return coercePaidSigiTier(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpgradeRequestBody;
    const tier = parseUpgradeTier(body.tier);
    if (!tier) {
      return NextResponse.json({ error: "A paid Sigi tier is required." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be signed in to upgrade." }, { status: 401 });
    }

    if (body.complete) {
      return NextResponse.json({ error: "Stripe webhooks now complete Sigi upgrades." }, { status: 409 });
    }

    const session = await createCheckoutSessionForPlan(tier, null);
    return NextResponse.json({ mode: "redirect", url: session.url, tier: session.plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start Sigi upgrade.";
    const status =
      message === "Invalid plan"
        ? 400
        : message === "You must be signed in to upgrade."
          ? 401
          : message === "Your account needs an email address before billing can be started."
            ? 400
            : 500;

    return NextResponse.json({ error: message }, { status });
  }
}