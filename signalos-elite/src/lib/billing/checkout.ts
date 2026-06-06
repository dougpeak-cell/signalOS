import type Stripe from "stripe";
import { SIGI_PRICING, type PlanKey } from "@/lib/billing/pricing";
import {
  coercePaidSigiTier,
  getStripePriceIdForTier,
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

type ProfileBillingRow = {
  user_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_price_id?: string | null;
};

export type CheckoutSessionResult = {
  url: string;
  plan: PlanKey;
};

export function getSafeReturnTo(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  return trimmed;
}

export async function reconcileStripeSubscriptionStateForCurrentUser(
  expectedTier?: PlanKey | null
): Promise<PlanKey | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_price_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const billingProfile = (profile as ProfileBillingRow | null) ?? null;
  const customerId = billingProfile?.stripe_customer_id ?? null;

  if (!customerId) {
    return null;
  }

  const stripe = getStripeServer();
  let subscription: Stripe.Subscription | null = null;

  if (billingProfile?.stripe_subscription_id) {
    try {
      const existingSubscription = await stripe.subscriptions.retrieve(
        billingProfile.stripe_subscription_id,
        { expand: ["items.data.price", "schedule"] }
      );

      if (isStripeSubscriptionActive(existingSubscription.status)) {
        subscription = existingSubscription;
      }
    } catch (error) {
      console.warn("Unable to retrieve Stripe subscription during welcome reconciliation", error);
    }
  }

  if (!subscription) {
    subscription = await findExistingActiveSubscription(customerId);
  }

  if (!subscription || !isStripeSubscriptionActive(subscription.status)) {
    return null;
  }

  const resolvedTier = coercePaidSigiTier(getTierFromStripeSubscription(subscription));

  if (!resolvedTier) {
    return null;
  }

  await persistStripeSubscriptionState({
    userId: user.id,
    customerId,
    subscription,
    tier: resolvedTier,
    clearPending: expectedTier == null || resolvedTier === expectedTier,
  });

  return resolvedTier;
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
  tier: PlanKey;
  clearPending?: boolean;
  scheduleId?: string | null;
}) {
  const { userId, customerId, subscription, tier, clearPending = false, scheduleId } = args;
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
      stripe_subscription_schedule_id: scheduleId ?? getSubscriptionScheduleId(subscription),
      stripe_subscription_status: subscription.status,
      stripe_price_id: subscriptionItem?.price?.id ?? null,
      stripe_current_period_end: periodEnd,
      stripe_cancel_at_period_end: cancelAtPeriodEnd,
      billing_status: cancelAtPeriodEnd ? "canceling" : "ok",
      ...(clearPending
        ? {
            pending_sigi_tier: null,
            pending_sigi_tier_effective_at: null,
          }
        : {}),
    },
    { onConflict: "user_id" }
  );
}

function getSubscriptionCurrentPeriodEndTimestamp(subscription: Stripe.Subscription): number | null {
  const value = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  return typeof value === "number" ? value : null;
}

function getSubscriptionCurrentPeriodStartTimestamp(subscription: Stripe.Subscription): number | null {
  const value = (subscription as Stripe.Subscription & { current_period_start?: number }).current_period_start;
  return typeof value === "number" ? value : null;
}

function getSubscriptionScheduleId(subscription: Stripe.Subscription): string | null {
  const schedule = subscription.schedule;
  if (!schedule) return null;
  return typeof schedule === "string" ? schedule : schedule.id;
}

async function persistScheduledDowngrade(args: {
  userId: string;
  customerId: string;
  subscription: Stripe.Subscription;
  currentTier: PlanKey;
  scheduleId: string;
  pendingTier: Extract<PlanKey, "smart">;
  effectiveAtIso: string;
}) {
  const { userId, customerId, subscription, currentTier, scheduleId, pendingTier, effectiveAtIso } = args;
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
      sigi_tier: currentTier,
      subscription_tier: currentTier,
      plan: currentTier,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_subscription_schedule_id: scheduleId,
      stripe_subscription_status: subscription.status,
      stripe_price_id: subscriptionItem?.price?.id ?? null,
      stripe_current_period_end: periodEnd,
      stripe_cancel_at_period_end: cancelAtPeriodEnd,
      billing_status: cancelAtPeriodEnd ? "canceling" : "ok",
      pending_sigi_tier: pendingTier,
      pending_sigi_tier_effective_at: effectiveAtIso,
    },
    { onConflict: "user_id" }
  );
}

function getTierRank(tier: "free" | PlanKey): number {
  if (tier === "pro") return 2;
  if (tier === "smart") return 1;
  return 0;
}

function getPrimarySubscriptionItem(subscription: Stripe.Subscription): Stripe.SubscriptionItem | null {
  return subscription.items.data[0] ?? null;
}

function getSubscriptionCustomerId(subscription: Stripe.Subscription): string | null {
  return typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null;
}

async function releaseSubscriptionScheduleIfPresent(subscription: Stripe.Subscription): Promise<void> {
  const scheduleId = getSubscriptionScheduleId(subscription);
  if (!scheduleId) {
    return;
  }

  const stripe = getStripeServer();
  await stripe.subscriptionSchedules.release(scheduleId);
}

export async function scheduleSubscriptionDowngrade(args: {
  userId: string;
  subscription: Stripe.Subscription;
  tier: Extract<PlanKey, "smart">;
}): Promise<void> {
  const { userId, subscription, tier } = args;
  const customerId = getSubscriptionCustomerId(subscription);

  if (!customerId) {
    throw new Error("The current Stripe subscription is missing a customer.");
  }

  if (!isStripeSubscriptionActive(subscription.status)) {
    throw new Error("Your current subscription is not active enough to schedule a downgrade.");
  }

  const currentTier = getTierFromStripeSubscription(subscription);
  if (currentTier !== "pro") {
    throw new Error("Only Pro subscriptions can be scheduled to downgrade to Smart.");
  }

  const currentItem = getPrimarySubscriptionItem(subscription);
  if (!currentItem?.price?.id) {
    throw new Error("The current Stripe subscription is missing a billable item.");
  }

  const currentPeriodEnd = getSubscriptionCurrentPeriodEndTimestamp(subscription);
  const currentPeriodStart = getSubscriptionCurrentPeriodStartTimestamp(subscription);

  if (!currentPeriodEnd || !currentPeriodStart) {
    throw new Error("The current Stripe subscription is missing billing period dates.");
  }

  const stripe = getStripeServer();
  const nextPriceId = getStripePriceIdForTier(tier);
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
            price: nextPriceId,
            quantity,
          },
        ],
      },
    ],
    metadata: {
      ...schedule.metadata,
      supabase_user_id: userId,
      pending_sigi_tier: tier,
    },
  });

  await persistScheduledDowngrade({
    userId,
    customerId,
    subscription,
    currentTier,
    scheduleId: updatedSchedule.id,
    pendingTier: tier,
    effectiveAtIso: new Date(currentPeriodEnd * 1000).toISOString(),
  });
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

export async function createCheckoutSessionForPlan(
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
      { expand: ["items.data.price", "schedule"] }
    );

    if (isStripeSubscriptionActive(existingSubscription.status)) {
      const currentTier = getTierFromStripeSubscription(existingSubscription);

      if (currentTier === tier) {
        return {
          url: getStripeCheckoutSuccessUrl({ returnTo: getSafeReturnTo(returnTo), plan: tier }),
          plan: tier,
        };
      }

      if (getTierRank(tier) > getTierRank(currentTier)) {
        const currentItem = getPrimarySubscriptionItem(existingSubscription);

        if (!currentItem?.id) {
          throw new Error("Existing Stripe subscription is missing a billable item.");
        }

        await releaseSubscriptionScheduleIfPresent(existingSubscription);

        const updatedSubscription = await stripe.subscriptions.update(existingSubscription.id, {
          cancel_at_period_end: false,
          proration_behavior: "always_invoice",
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
          clearPending: true,
          scheduleId: null,
        });

        return {
          url: getStripeCheckoutSuccessUrl({ returnTo: getSafeReturnTo(returnTo), plan: tier }),
          plan: tier,
        };
      }

      if (getTierRank(tier) < getTierRank(currentTier)) {
        if (tier !== "smart") {
          throw new Error("Only Pro subscriptions can be scheduled to downgrade to Smart.");
        }

        await scheduleSubscriptionDowngrade({
          userId: user.id,
          subscription: existingSubscription,
          tier,
        });

        return {
          url: getStripeCheckoutSuccessUrl({ returnTo: getSafeReturnTo(returnTo), plan: tier }),
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
    success_url: getStripeCheckoutSuccessUrl({ returnTo: getSafeReturnTo(returnTo), plan: tier }),
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