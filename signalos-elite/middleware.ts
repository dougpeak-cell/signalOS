import { NextResponse, type NextRequest } from "next/server";
import { DEV_PREVIEW_PLAN_COOKIE } from "@/lib/sigi/devPreview";

const VALID_PREVIEW_PLANS = new Set(["free", "smart", "pro"]);

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.next();
  }

  const previewPlan = request.nextUrl.searchParams.get("previewPlan")?.trim().toLowerCase();

  if (!previewPlan) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  if (previewPlan === "off" || previewPlan === "clear") {
    response.cookies.set(DEV_PREVIEW_PLAN_COOKIE, "", {
      path: "/",
      expires: new Date(0),
    });
    return response;
  }

  if (VALID_PREVIEW_PLANS.has(previewPlan)) {
    response.cookies.set(DEV_PREVIEW_PLAN_COOKIE, previewPlan, {
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
