import { NextResponse, type NextRequest } from "next/server";
import { DEV_PREVIEW_PLAN_COOKIE } from "@/lib/sigi/devPreview";

const VALID_PREVIEW_PLANS = new Set(["free", "smart", "pro"]);

export function middleware(request: NextRequest) {
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
