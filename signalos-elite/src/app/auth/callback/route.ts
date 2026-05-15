import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_AUTH_REDIRECT = "/settings/sigi#profile";

type UpgradePlan = "smart" | "pro";

function getSafePlan(value: string | null): UpgradePlan | null {
  return value === "smart" || value === "pro" ? value : null;
}

function getCheckoutPathForPlan(plan: UpgradePlan): string {
  return `/api/stripe/checkout?plan=${plan}`;
}

function getSafeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return value;
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

function buildRetryUrl(requestUrl: URL, nextPath: string, plan: UpgradePlan | null, error: string) {
  const retryUrl = new URL(plan ? "/auth/upgrade" : "/auth", requestUrl.origin);

  if (plan) {
    retryUrl.searchParams.set("plan", plan);
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
  const nextPath = getSafeNextPath(
    requestUrl.searchParams.get("next") ?? (plan ? getCheckoutPathForPlan(plan) : null)
  );
  const returnedError =
    requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");

  if (returnedError) {
    return NextResponse.redirect(buildRetryUrl(requestUrl, nextPath, plan, returnedError));
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

  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (tokenHash && otpType) {
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    error = result.error;
  } else {
    return NextResponse.redirect(
      buildRetryUrl(requestUrl, nextPath, plan, "Missing sign-in token.")
    );
  }

  if (error) {
    return NextResponse.redirect(buildRetryUrl(requestUrl, nextPath, plan, error.message));
  }

  return response;
}