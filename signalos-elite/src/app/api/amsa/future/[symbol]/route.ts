import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  calculateLiveFutureMap,
  type AMSAFutureMapHorizon,
} from "@/lib/amsa";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type RouteContext = {
  params: Promise<{
    symbol: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const {
      symbol: rawSymbol,
    } = await context.params;

    const symbol =
      decodeURIComponent(
        rawSymbol,
      )
        .trim()
        .toUpperCase();

    if (
      !/^[A-Z0-9.^:-]{1,20}$/.test(
        symbol,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Invalid stock symbol.",
        },
        {
          status: 400,
        },
      );
    }

    const horizon =
      parseHorizon(
        request.nextUrl
          .searchParams
          .get("horizon"),
      );

    const recordSnapshot =
      request.nextUrl
        .searchParams
        .get("record") !== "false";

    const result =
      await calculateLiveFutureMap({
        origin:
          request.nextUrl.origin,

        symbol,
        horizon,
        recordSnapshot,
      });

    if (
      !result.futureMap
    ) {
      return NextResponse.json(
        {
          ...result,

          error:
            "FutureMap could not be calculated because sufficient stock history was unavailable.",
        },
        {
          status: 422,
        },
      );
    }

    return NextResponse.json(
      result,
      {
        status: 200,

        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error(
      "Live FutureMap route error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "FutureMap could not complete the calculation.",
      },
      {
        status: 500,
      },
    );
  }
}

function parseHorizon(
  value: string | null,
): AMSAFutureMapHorizon {
  if (
    value === "intraday" ||
    value === "position"
  ) {
    return value;
  }

  return "swing";
}