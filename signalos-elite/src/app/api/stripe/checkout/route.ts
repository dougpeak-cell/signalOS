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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutRequestBody;
    const plan = body.plan ?? body.tier;
    const tier = coercePaidSigiTier(plan);
    if (!tier) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const priceId = SIGI_PRICING[tier].priceId?.trim();
    if (!priceId) {
      return NextResponse.json({ error: "Stripe price is not configured for this plan." }, { status: 500 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be signed in to upgrade." }, { status: 401 });
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "Your account needs an email address before billing can be started." },
        { status: 400 }
      );
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

    return NextResponse.json({ url: session.url, plan: tier });
  } catch (error) {
    console.error("stripe checkout error", error);
    return NextResponse.json(
      {
        error: "Unable to create checkout session",
      },
      { status: 500 }
    );
  }
}