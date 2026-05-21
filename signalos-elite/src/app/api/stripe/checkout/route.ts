import { NextResponse } from "next/server";
import { createCheckoutSessionForPlan, getSafeReturnTo } from "@/lib/billing/checkout";
import { coercePaidSigiTier } from "@/lib/billing/tiers";

type CheckoutRequestBody = {
  plan?: "smart" | "pro";
  tier?: string;
  returnTo?: string;
};

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