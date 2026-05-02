import { NextResponse } from "next/server";
import { SIGI_PRICING } from "@/lib/billing/pricing";
import { coercePaidSigiTier } from "@/lib/billing/tiers";
import {
  getStripeCheckoutCancelUrl,
  getStripeCheckoutSuccessUrl,
  getStripeServer,
} from "@/lib/stripe/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type SigiTier } from "@/lib/sigi/gates";

type UpgradeTier = Exclude<SigiTier, "free">;

type UpgradeRequestBody = {
  tier?: string;
  complete?: boolean;
};

type ProfileBillingRow = {
  stripe_customer_id?: string | null;
};

function parseUpgradeTier(value: string | null | undefined): UpgradeTier | null {
  return coercePaidSigiTier(value);
}

async function findStripeCustomerIdByEmail(email: string): Promise<string | null> {
  const stripe = getStripeServer();
  const customers = await stripe.customers.list({ email, limit: 10 });
  const match = customers.data.find((customer) => customer.email?.toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpgradeRequestBody;
    const tier = parseUpgradeTier(body.tier);
    if (!tier) {
      return NextResponse.json({ error: "A paid Sigi tier is required." }, { status: 400 });
    }

    const priceId = SIGI_PRICING[tier].priceId?.trim();
    if (!priceId) {
      return NextResponse.json({ error: "Stripe price is not configured for this tier." }, { status: 500 });
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

    if (!user.email) {
      return NextResponse.json(
        { error: "Your account needs an email address before billing can be started." },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = (profile as ProfileBillingRow | null)?.stripe_customer_id ?? null;

    if (!customerId) {
      customerId = await findStripeCustomerIdByEmail(user.email);
    }

    if (!customerId) {
      const stripe = getStripeServer();
      customerId = (
        await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id },
        })
      ).id;
    }

    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);

    const stripe = getStripeServer();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: getStripeCheckoutSuccessUrl(),
      cancel_url: getStripeCheckoutCancelUrl(),
      metadata: {
        userId: user.id,
        tier,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier,
        },
      },
    });

    if (!session.url) {
      throw new Error("Stripe checkout session did not return a URL.");
    }

    return NextResponse.json({ mode: "redirect", url: session.url, tier });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to start Sigi upgrade.",
      },
      { status: 500 }
    );
  }
}