import { NextResponse } from "next/server";
import { scheduleSubscriptionDowngrade } from "@/lib/billing/checkout";
import { getTierFromStripeSubscription, isStripeSubscriptionActive } from "@/lib/billing/tiers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeServer } from "@/lib/stripe/server";

type SubscriptionActionRequest = {
  action?: "schedule_downgrade";
  tier?: "smart";
};

type SubscriptionProfileRow = {
  sigi_tier?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_subscription_schedule_id?: string | null;
  pending_sigi_tier?: string | null;
  pending_sigi_tier_effective_at?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubscriptionActionRequest;

    if (body.action !== "schedule_downgrade" || body.tier !== "smart") {
      return NextResponse.json({ error: "Unsupported subscription action." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("sigi_tier, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_subscription_schedule_id, pending_sigi_tier, pending_sigi_tier_effective_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    const billingProfile = (profile as SubscriptionProfileRow | null) ?? null;

    if (billingProfile?.sigi_tier !== "pro") {
      return NextResponse.json({ error: "Only Pro subscriptions can be scheduled to downgrade to Smart." }, { status: 400 });
    }

    if (!billingProfile?.stripe_subscription_id) {
      return NextResponse.json({ error: "No active Stripe subscription was found for this account." }, { status: 400 });
    }

    const stripe = getStripeServer();
    const subscription = await stripe.subscriptions.retrieve(billingProfile.stripe_subscription_id, {
      expand: ["items.data.price", "schedule"],
    });

    if (!isStripeSubscriptionActive(subscription.status)) {
      return NextResponse.json({ error: "Your current subscription is not active enough to schedule a downgrade." }, { status: 400 });
    }

    if (getTierFromStripeSubscription(subscription) !== "pro") {
      return NextResponse.json({ error: "This subscription is not currently on Pro." }, { status: 400 });
    }

    await scheduleSubscriptionDowngrade({
      userId: user.id,
      subscription,
      tier: "smart",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("stripe subscription action error", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update subscription.",
      },
      { status: 500 }
    );
  }
}