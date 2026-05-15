import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { SIGI_PRICING } from "@/lib/billing/pricing";
import {
  coercePaidSigiTier,
  getHighestTierFromStripeSubscriptions,
  getTierFromStripeSubscription,
  isStripeSubscriptionActive,
} from "@/lib/billing/tiers";
import {
  getStripeCheckoutCancelUrl,
  getStripeCheckoutSuccessUrl,
  getStripeServer,
} from "@/lib/stripe/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CheckoutRequestBody = {
  plan?: "smart" | "pro";
  tier?: string;
  returnTo?: string;
};

type ProfileBillingRow = {
  user_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_price_id?: string | null;
};

type CheckoutSessionResult = {
  url: string;
  plan: "smart" | "pro";
};

function getSafeReturnTo(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  return trimmed;
}

function buildUpgradeAuthRedirect(
  request: Request,
  planValue: string | undefined,
  returnTo: string | null
): NextResponse {
  const authUrl = new URL("/auth/upgrade", request.url);
  const tier = coercePaidSigiTier(planValue);
  const safeReturnTo = getSafeReturnTo(returnTo);

  if (tier) {
    authUrl.searchParams.set("plan", tier);
  } else if (planValue) {
    const nextUrl = new URL("/api/stripe/checkout", request.url);
    nextUrl.searchParams.set("plan", planValue);

    if (safeReturnTo) {
      nextUrl.searchParams.set("returnTo", safeReturnTo);
    }

    authUrl.searchParams.set("next", `${nextUrl.pathname}${nextUrl.search}`);
  }

  if (safeReturnTo) {
    authUrl.searchParams.set("returnTo", safeReturnTo);
  }

  return NextResponse.redirect(authUrl);
}

async function persistStripeCustomerId(userId: string, customerId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("profiles").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
    },
    { onConflict: "user_id" }
  );
}

async function persistStripeSubscriptionState(args: {
  userId: string;
  customerId: string;
  subscription: Stripe.Subscription;
  tier: "smart" | "pro";
}) {
  const { userId, customerId, subscription, tier } = args;
  const subscriptionItem = subscription.items.data[0];
  const periodEnd =
    typeof (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end === "number"
      ? new Date((subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end! * 1000).toISOString()
      : null;
  const cancelAtPeriodEnd =
    (subscription as Stripe.Subscription & { cancel_at_period_end?: boolean }).cancel_at_period_end === true;

  const supabase = await createSupabaseServerClient();
  await supabase.from("profiles").upsert(
    {
      user_id: userId,
      sigi_tier: tier,
      subscription_tier: tier,
      plan: tier,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_subscription_status: subscription.status,
      stripe_price_id: subscriptionItem?.price?.id ?? null,
      stripe_current_period_end: periodEnd,
      stripe_cancel_at_period_end: cancelAtPeriodEnd,
      billing_status: cancelAtPeriodEnd ? "canceling" : "ok",
    },
    { onConflict: "user_id" }
  );
}

function getTierRank(tier: "free" | "smart" | "pro"): number {
  if (tier === "pro") return 2;
  if (tier === "smart") return 1;
  return 0;
}

function getPrimarySubscriptionItem(subscription: Stripe.Subscription): Stripe.SubscriptionItem | null {
  return subscription.items.data[0] ?? null;
}

async function findStripeCustomerIdByEmail(email: string): Promise<string | null> {
  const stripe = getStripeServer();
  const customers = await stripe.customers.list({ email, limit: 10 });
  const match = customers.data.find((customer) => customer.email?.toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}

async function getOrCreateStripeCustomerId(args: {
  userId: string;
  email: string;
  existingCustomerId: string | null;
}): Promise<string> {
  const { userId, email, existingCustomerId } = args;
  if (existingCustomerId) return existingCustomerId;

  const existingByEmail = await findStripeCustomerIdByEmail(email);
  if (existingByEmail) {
    await persistStripeCustomerId(userId, existingByEmail);
    return existingByEmail;
  }

  const stripe = getStripeServer();
  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  await persistStripeCustomerId(userId, customer.id);
  return customer.id;
}

async function findExistingActiveSubscription(customerId: string): Promise<Stripe.Subscription | null> {
  const stripe = getStripeServer();
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
    expand: ["data.items.data.price"],
  });

  const activeSubscriptions = subscriptions.data.filter((subscription) =>
    isStripeSubscriptionActive(subscription.status)
  );

  return getHighestTierFromStripeSubscriptions(activeSubscriptions);
}

async function createCheckoutSessionForPlan(
  planValue: string | undefined,
  returnTo: string | null
): Promise<CheckoutSessionResult> {
  const stripe = getStripeServer();
  const tier = coercePaidSigiTier(planValue);
  if (!tier) {
    throw new Error("Invalid plan");
  }

  const priceId = SIGI_PRICING[tier].priceId?.trim();
  if (!priceId) {
    throw new Error("Stripe price is not configured for this plan.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to upgrade.");
  }

  if (!user.email) {
    throw new Error("Your account needs an email address before billing can be started.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_price_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const billingProfile = (profile as ProfileBillingRow | null) ?? null;
  const customerId = await getOrCreateStripeCustomerId({
    userId: user.id,
    email: user.email,
    existingCustomerId: billingProfile?.stripe_customer_id ?? null,
  });

  const fallbackSubscription =
    !billingProfile?.stripe_subscription_id && customerId
      ? await findExistingActiveSubscription(customerId)
      : null;

  if (fallbackSubscription && isStripeSubscriptionActive(fallbackSubscription.status)) {
    await persistStripeSubscriptionState({
      userId: user.id,
      customerId,
      subscription: fallbackSubscription,
      tier: coercePaidSigiTier(getTierFromStripeSubscription(fallbackSubscription)) ?? "smart",
    });
  }

  const effectiveSubscriptionId =
    billingProfile?.stripe_subscription_id ?? fallbackSubscription?.id ?? null;

  if (effectiveSubscriptionId) {
    const existingSubscription = await stripe.subscriptions.retrieve(
      effectiveSubscriptionId,
      { expand: ["items.data.price"] }
    );

    if (isStripeSubscriptionActive(existingSubscription.status)) {
      const currentTier = getTierFromStripeSubscription(existingSubscription);

      if (currentTier === tier) {
        return {
          url: getStripeCheckoutSuccessUrl(getSafeReturnTo(returnTo)),
          plan: tier,
        };
      }

      if (getTierRank(tier) > getTierRank(currentTier)) {
        const currentItem = getPrimarySubscriptionItem(existingSubscription);

        if (!currentItem?.id) {
          throw new Error("Existing Stripe subscription is missing a billable item.");
        }

        const updatedSubscription = await stripe.subscriptions.update(existingSubscription.id, {
          cancel_at_period_end: false,
          proration_behavior: "create_prorations",
          items: [{
            id: currentItem.id,
            price: priceId,
          }],
          metadata: {
            ...existingSubscription.metadata,
            supabase_user_id: user.id,
            sigi_plan: tier,
          },
        });

        await persistStripeSubscriptionState({
          userId: user.id,
          customerId,
          subscription: updatedSubscription,
          tier,
        });

        return {
          url: getStripeCheckoutSuccessUrl(getSafeReturnTo(returnTo)),
          plan: tier,
        };
      }
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: getStripeCheckoutSuccessUrl(getSafeReturnTo(returnTo)),
    cancel_url: getStripeCheckoutCancelUrl(),
    metadata: {
      supabase_user_id: user.id,
      sigi_plan: tier,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        sigi_plan: tier,
      },
    },
  });

  if (!session.url) {
    throw new Error("Stripe checkout session did not return a URL.");
  }

  return { url: session.url, plan: tier };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const plan = searchParams.get("plan") ?? searchParams.get("tier") ?? undefined;
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));

  try {
    const session = await createCheckoutSessionForPlan(plan, returnTo);
    return NextResponse.redirect(session.url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create checkout session";
    if (message === "You must be signed in to upgrade.") {
      return buildUpgradeAuthRedirect(request, plan, returnTo);
    }

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutRequestBody;
    const session = await createCheckoutSessionForPlan(
      body.plan ?? body.tier,
      getSafeReturnTo(body.returnTo)
    );
    return NextResponse.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create checkout session";
    const status =
      message === "Invalid plan"
        ? 400
        : message === "You must be signed in to upgrade."
          ? 401
          : message === "Your account needs an email address before billing can be started."
            ? 400
            : 500;

    console.error("stripe checkout error", error);
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}