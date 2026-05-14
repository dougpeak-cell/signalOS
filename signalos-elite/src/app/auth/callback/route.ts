import { createServerClient } from "@supabase/ssr";
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

  if (!code) {
    return NextResponse.redirect(
      buildRetryUrl(requestUrl, nextPath, plan, "Missing sign-in code.")
    );
  }

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(buildRetryUrl(requestUrl, nextPath, plan, error.message));
  }

  return response;
}