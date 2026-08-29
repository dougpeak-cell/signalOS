import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_AUTH_REDIRECT = "/settings/sigi#profile";

type UpgradePlan = "smart" | "pro";

function normalizeCallbackUrl(requestUrl: URL): URL {
  const hasParsedAuthValue =
    requestUrl.searchParams.has("code") ||
    requestUrl.searchParams.has("token_hash") ||
    requestUrl.searchParams.has("error") ||
    requestUrl.searchParams.has("error_description");

  if (hasParsedAuthValue || !requestUrl.search) {
    return requestUrl;
  }

  try {
    const entries = Array.from(requestUrl.searchParams.entries());
    const encodedParameterKey =
      entries.length === 1 && entries[0][1] === "" ? entries[0][0] : null;
    const decodedQuery = encodedParameterKey ?? decodeURIComponent(requestUrl.search.slice(1));
    const decodedParams = new URLSearchParams(decodedQuery);
    const hasDecodedAuthValue =
      decodedParams.has("code") ||
      decodedParams.has("token_hash") ||
      decodedParams.has("error") ||
      decodedParams.has("error_description");

    if (!hasDecodedAuthValue) {
      return requestUrl;
    }

    const normalizedUrl = new URL(requestUrl);
    normalizedUrl.search = decodedParams.toString();
    return normalizedUrl;
  } catch {
    return requestUrl;
  }
}

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

function mergeRedirectPathQuery(
  redirectPath: string | null,
  requestUrl: URL,
  plan: UpgradePlan | null,
  returnTo: string | null
): string | null {
  if (!redirectPath?.startsWith("/")) {
    return redirectPath;
  }

  const nextUrl = new URL(redirectPath, "http://localhost");

  if (plan && !nextUrl.searchParams.get("plan")) {
    nextUrl.searchParams.set("plan", plan);
  }

  if (returnTo && !nextUrl.searchParams.get("returnTo")) {
    nextUrl.searchParams.set("returnTo", returnTo);
  }

  for (const [key, value] of requestUrl.searchParams.entries()) {
    if (
      key === "code" ||
      key === "token_hash" ||
      key === "type" ||
      key === "redirect_to" ||
      key === "error" ||
      key === "error_description" ||
      key === "plan" ||
      key === "returnTo" ||
      key === "next"
    ) {
      continue;
    }

    if (!nextUrl.searchParams.has(key)) {
      nextUrl.searchParams.set(key, value);
    }
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
  const requestUrl = normalizeCallbackUrl(new URL(request.url));
  const plan = getSafePlan(requestUrl.searchParams.get("plan"));
  const returnTo = getSafeReturnTo(requestUrl.searchParams.get("returnTo"));
  const redirectTo = mergeRedirectPathQuery(
    getSafeRedirectTo(requestUrl.searchParams.get("redirect_to"), requestUrl),
    requestUrl,
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

  if ((!tokenHash || !otpType) && !code) {
    return NextResponse.redirect(
      buildRetryUrl(requestUrl, nextPath, plan, returnTo, "Missing sign-in token.")
    );
  }

  const confirmUrl = new URL("/auth/confirm", requestUrl.origin);
  confirmUrl.searchParams.set("next", nextPath);

  if (tokenHash && otpType) {
    confirmUrl.searchParams.set("token_hash", tokenHash);
    confirmUrl.searchParams.set("type", otpType);
  } else if (code) {
    confirmUrl.searchParams.set("code", code);
  }

  return NextResponse.redirect(confirmUrl);
}