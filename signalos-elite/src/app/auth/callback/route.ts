import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_AUTH_REDIRECT = "/settings/sigi#profile";

type UpgradePlan = "smart" | "pro";

function getSafePlan(value: string | null): UpgradePlan | null {
  return value === "smart" || value === "pro" ? value : null;
}

function getSafeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

function getCheckoutPathForPlan(plan: UpgradePlan, returnTo: string | null): string {
  const checkoutParams = new URLSearchParams({ plan });

  if (returnTo) {
    checkoutParams.set("returnTo", returnTo);
  }

  return `/api/stripe/checkout?${checkoutParams.toString()}`;
}

function getSafeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return value;
}

function getSafeRedirectTo(value: string | null, requestUrl: URL): string | null {
  if (!value) {
    return null;
  }

  if (value.startsWith("/")) {
    return value.startsWith("//") ? null : value;
  }

  try {
    const redirectUrl = new URL(value);

    if (redirectUrl.origin !== requestUrl.origin) {
      return null;
    }

    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
  } catch {
    return null;
  }
}

function mergeCheckoutRedirectPath(
  redirectPath: string | null,
  plan: UpgradePlan | null,
  returnTo: string | null
): string | null {
  if (!redirectPath?.startsWith("/welcome")) {
    return redirectPath;
  }

  const nextUrl = new URL(redirectPath, "http://localhost");

  if (plan && !nextUrl.searchParams.get("plan")) {
    nextUrl.searchParams.set("plan", plan);
  }

  if (returnTo && !nextUrl.searchParams.get("returnTo")) {
    nextUrl.searchParams.set("returnTo", returnTo);
  }

  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
}

function getSafeOtpType(value: string | null): EmailOtpType | null {
  switch (value) {
    case "signup":
    case "invite":
    case "magiclink":
    case "recovery":
    case "email_change":
    case "email":
      return value;
    default:
      return null;
  }
}

function buildRetryUrl(
  requestUrl: URL,
  nextPath: string,
  plan: UpgradePlan | null,
  returnTo: string | null,
  error: string
) {
  const retryUrl = new URL(plan ? "/auth/upgrade" : "/auth", requestUrl.origin);

  if (plan) {
    retryUrl.searchParams.set("plan", plan);
    if (returnTo) {
      retryUrl.searchParams.set("returnTo", returnTo);
    }
  }

  if (!plan && nextPath !== DEFAULT_AUTH_REDIRECT) {
    retryUrl.searchParams.set("next", nextPath);
  }

  retryUrl.searchParams.set("error", error);
  return retryUrl;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const plan = getSafePlan(requestUrl.searchParams.get("plan"));
  const returnTo = getSafeReturnTo(requestUrl.searchParams.get("returnTo"));
  const redirectTo = mergeCheckoutRedirectPath(
    getSafeRedirectTo(requestUrl.searchParams.get("redirect_to"), requestUrl),
    plan,
    returnTo
  );
  const nextPath = getSafeNextPath(
    redirectTo ?? requestUrl.searchParams.get("next") ?? (plan ? getCheckoutPathForPlan(plan, returnTo) : null)
  );
  const returnedError =
    requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");

  if (returnedError) {
    return NextResponse.redirect(buildRetryUrl(requestUrl, nextPath, plan, returnTo, returnedError));
  }

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = getSafeOtpType(requestUrl.searchParams.get("type"));

  const redirectUrl = new URL(nextPath, requestUrl.origin);
  const response = NextResponse.redirect(redirectUrl);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let error: Error | null = null;

  if (tokenHash && otpType) {
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    error = result.error;
  } else if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else {
    return NextResponse.redirect(
      buildRetryUrl(requestUrl, nextPath, plan, returnTo, "Missing sign-in token.")
    );
  }

  if (error) {
    return NextResponse.redirect(buildRetryUrl(requestUrl, nextPath, plan, returnTo, error.message));
  }

  return response;
}