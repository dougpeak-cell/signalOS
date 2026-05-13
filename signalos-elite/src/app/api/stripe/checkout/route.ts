import { NextResponse } from "next/server";
import { SIGI_PRICING } from "@/lib/billing/pricing";
import { coercePaidSigiTier } from "@/lib/billing/tiers";
import {
  getStripeCheckoutCancelUrl,
  getStripeCheckoutSuccessUrl,
  stripe,
} from "@/lib/stripe/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CheckoutRequestBody = {
  plan?: "smart" | "pro";
  tier?: string;
};

type ProfileBillingRow = {
  id: string;
  stripe_customer_id?: string | null;
};

type CheckoutSessionResult = {
  url: string;
  plan: "smart" | "pro";
};

async function persistStripeCustomerId(userId: string, customerId: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
}

async function findStripeCustomerIdByEmail(email: string): Promise<string | null> {
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

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  await persistStripeCustomerId(userId, customer.id);
  return customer.id;
}

async function createCheckoutSessionForPlan(planValue: string | undefined): Promise<CheckoutSessionResult> {
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
    .select("id, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = await getOrCreateStripeCustomerId({
    userId: user.id,
    email: user.email,
    existingCustomerId: (profile as ProfileBillingRow | null)?.stripe_customer_id ?? null,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: getStripeCheckoutSuccessUrl(),
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
  try {
    const { searchParams } = new URL(request.url);
    const plan = searchParams.get("plan") ?? searchParams.get("tier") ?? undefined;
    const session = await createCheckoutSessionForPlan(plan);
    return NextResponse.redirect(session.url);
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

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutRequestBody;
    const session = await createCheckoutSessionForPlan(body.plan ?? body.tier);
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