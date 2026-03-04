import { NextRequest, NextResponse } from "next/server";

/**
 * Only proxy API routes.
 * This guarantees Next can serve /public assets normally:
 *  - /hello.txt
 *  - /headshots/test.png
 *  - /team-logos/*.png
 */
export function proxy(_req: NextRequest) {
  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: ["/api/:path*"],
};
