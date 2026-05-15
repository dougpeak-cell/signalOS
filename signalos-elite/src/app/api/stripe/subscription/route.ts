import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripePriceIdForTier, getTierFromStripeSubscription, isStripeSubscriptionActive } from "@/lib/billing/tiers";
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

function getPrimarySubscriptionItem(subscription: Stripe.Subscription): Stripe.SubscriptionItem | null {
  return subscription.items.data[0] ?? null;
}

function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription): number | null {
  const value = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  return typeof value === "number" ? value : null;
}

function getSubscriptionCurrentPeriodStart(subscription: Stripe.Subscription): number | null {
  const value = (subscription as Stripe.Subscription & { current_period_start?: number }).current_period_start;
  return typeof value === "number" ? value : null;
}

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

    const currentItem = getPrimarySubscriptionItem(subscription);
    if (!currentItem?.price?.id) {
      return NextResponse.json({ error: "The current Stripe subscription is missing a billable item." }, { status: 500 });
    }

    const currentPeriodEnd = getSubscriptionCurrentPeriodEnd(subscription);
    const currentPeriodStart = getSubscriptionCurrentPeriodStart(subscription);

    if (!currentPeriodEnd || !currentPeriodStart) {
      return NextResponse.json({ error: "The current Stripe subscription is missing billing period dates." }, { status: 500 });
    }

    const smartPriceId = getStripePriceIdForTier("smart");
    let schedule =
      typeof subscription.schedule === "string"
        ? await stripe.subscriptionSchedules.retrieve(subscription.schedule)
        : subscription.schedule;

    if (!schedule) {
      schedule = await stripe.subscriptionSchedules.create({
        from_subscription: subscription.id,
      });
    }

    const scheduleStart = schedule.current_phase?.start_date ?? currentPeriodStart;
    const quantity = currentItem.quantity ?? 1;

    const updatedSchedule = await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: "release",
      phases: [
        {
          start_date: scheduleStart,
          end_date: currentPeriodEnd,
          items: [
            {
              price: currentItem.price.id,
              quantity,
            },
          ],
        },
        {
          start_date: currentPeriodEnd,
          items: [
            {
              price: smartPriceId,
              quantity,
            },
          ],
        },
      ],
      metadata: {
        ...schedule.metadata,
        supabase_user_id: user.id,
        pending_sigi_tier: "smart",
      },
    });

    const { error: updateError } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        stripe_customer_id: billingProfile.stripe_customer_id ?? null,
        stripe_subscription_id: subscription.id,
        stripe_subscription_status: subscription.status,
        stripe_subscription_schedule_id: updatedSchedule.id,
        pending_sigi_tier: "smart",
        pending_sigi_tier_effective_at: new Date(currentPeriodEnd * 1000).toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

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