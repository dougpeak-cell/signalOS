import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { priceIdToTier } from "@/lib/billing/tiers";
import { getStripeServer, getStripeWebhookSecret } from "@/lib/stripe/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BillingProfileUpdate = {
  sigi_tier: "free" | "smart" | "pro";
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_subscription_status: string;
  stripe_current_period_end: string | null;
  stripe_cancel_at_period_end: boolean;
  billing_status: string;
};

function toCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const value = (invoice as unknown as { subscription?: unknown }).subscription;
  return typeof value === "string" ? value : null;
}

function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription): string | null {
  const value = (subscription as unknown as { current_period_end?: unknown }).current_period_end;
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function getSubscriptionCancelAtPeriodEnd(subscription: Stripe.Subscription): boolean {
  const value = (subscription as unknown as { cancel_at_period_end?: unknown }).cancel_at_period_end;
  return value === true;
}

async function saveStripeCustomerId(userId: string, customerId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("id", userId);

  if (error) throw error;
}

async function updateProfileFromStripeCustomer(
  customerId: string,
  updates: BillingProfileUpdate
) {
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ stripe_customer_id: customerId, ...updates })
    .eq("stripe_customer_id", customerId);

  if (error) throw error;
}

async function syncSubscriptionToProfile(
  subscription: Stripe.Subscription,
  options?: { paymentFailed?: boolean }
) {
  const customerId = toCustomerId(subscription.customer);
  if (!customerId) return;

  const item = subscription.items.data[0];
  const priceId = item?.price?.id ?? null;
  const cancelAtPeriodEnd = getSubscriptionCancelAtPeriodEnd(subscription);
  const tier =
    subscription.status === "active" || subscription.status === "trialing"
      ? priceIdToTier(priceId)
      : "free";

  await updateProfileFromStripeCustomer(customerId, {
    sigi_tier: tier,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_price_id: priceId,
    stripe_current_period_end: getSubscriptionCurrentPeriodEnd(subscription),
    stripe_cancel_at_period_end: cancelAtPeriodEnd,
    billing_status: options?.paymentFailed ? "past_due" : cancelAtPeriodEnd ? "canceling" : "ok",
  });
}

async function markSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = toCustomerId(subscription.customer);
  if (!customerId) return;

  await updateProfileFromStripeCustomer(customerId, {
    sigi_tier: "free",
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_price_id: null,
    stripe_current_period_end: getSubscriptionCurrentPeriodEnd(subscription),
    stripe_cancel_at_period_end: false,
    billing_status: "canceled",
  });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = typeof session.customer === "string" ? session.customer : null;
  const userId = session.client_reference_id ?? session.metadata?.supabase_user_id ?? null;

  if (!customerId || !userId) {
    return;
  }

  await saveStripeCustomerId(userId, customerId);
}

export async function POST(request: Request) {
  const stripe = getStripeServer();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook config" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret || getStripeWebhookSecret());
  } catch (error) {
    console.error("stripe signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionToProfile(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await markSubscriptionCanceled(subscription);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["items.data.price"],
          });
          await syncSubscriptionToProfile(subscription);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["items.data.price"],
          });
          await syncSubscriptionToProfile(subscription, { paymentFailed: true });
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("stripe webhook handling error", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}