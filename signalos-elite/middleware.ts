import { NextResponse, type NextRequest } from "next/server";
import { PENDING_CHECKOUT_PLAN_COOKIE, parsePendingCheckoutCookie } from "@/lib/billing/pendingCheckout";
import { DEV_PREVIEW_PLAN_COOKIE } from "@/lib/sigi/devPreview";

const VALID_PREVIEW_PLANS = new Set(["free", "smart", "pro"]);
const LEGACY_PRODUCTION_HOST = "signalos-live.vercel.app";
const CANONICAL_PRODUCTION_HOST = "sigios.com";

export function middleware(request: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    request.nextUrl.hostname === LEGACY_PRODUCTION_HOST
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.hostname = CANONICAL_PRODUCTION_HOST;
    redirectUrl.port = "";
    redirectUrl.protocol = "https:";
    return NextResponse.redirect(redirectUrl);
  }

  const pendingCheckoutPlan = parsePendingCheckoutCookie(
    request.cookies.get(PENDING_CHECKOUT_PLAN_COOKIE)?.value
  );

  if (pendingCheckoutPlan) {
    if (request.nextUrl.pathname === "/today" || request.nextUrl.pathname === "/") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/welcome";
      redirectUrl.search = "";
      redirectUrl.searchParams.set("checkout", "success");
      redirectUrl.searchParams.set("plan", pendingCheckoutPlan);

      const response = NextResponse.redirect(redirectUrl);
      response.cookies.set(PENDING_CHECKOUT_PLAN_COOKIE, "", {
        path: "/",
        expires: new Date(0),
      });
      return response;
    }

    if (request.nextUrl.pathname === "/welcome") {
      const response = NextResponse.next();
      response.cookies.set(PENDING_CHECKOUT_PLAN_COOKIE, "", {
        path: "/",
        expires: new Date(0),
      });
      return response;
    }
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.next();
  }

  const previewPlan = request.nextUrl.searchParams.get("previewPlan")?.trim().toLowerCase();
  const requestHeaders = new Headers(request.headers);

  if (!previewPlan) {
    return NextResponse.next();
  }

  if (previewPlan === "off" || previewPlan === "clear") {
    requestHeaders.set("x-signalos-preview-plan", "off");
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    response.cookies.set(DEV_PREVIEW_PLAN_COOKIE, "", {
      path: "/",
      expires: new Date(0),
    });
    return response;
  }

  if (VALID_PREVIEW_PLANS.has(previewPlan)) {
    requestHeaders.set("x-signalos-preview-plan", previewPlan);
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    response.cookies.set(DEV_PREVIEW_PLAN_COOKIE, previewPlan, {
      path: "/",
      sameSite: "lax",
    });

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
