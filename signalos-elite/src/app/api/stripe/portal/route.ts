import { NextResponse } from "next/server";
import { getStripePortalReturnUrl, getStripeServer } from "@/lib/stripe/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthenticatedUser = {
  id: string;
};

type ProfileBillingRow = {
  stripe_customer_id?: string | null;
};

async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return { id: user.id };
}

async function getUserBillingProfile(userId: string): Promise<ProfileBillingRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  return (data as ProfileBillingRow | null) ?? null;
}

export async function POST() {
  try {
    const stripe = getStripeServer();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserBillingProfile(user.id);
    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing profile found" }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: getStripePortalReturnUrl(),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("stripe portal error", error);
    return NextResponse.json({ error: "Unable to create portal session" }, { status: 500 });
  }
}