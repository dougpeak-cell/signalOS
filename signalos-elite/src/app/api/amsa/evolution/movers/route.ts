import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  assertEntityType,
  SupabaseAMSAPulseRepository,
} from "@/lib/amsa";

export const dynamic =
  "force-dynamic";

export async function GET(
  request: NextRequest,
) {
  try {
    const typeParameter =
      request.nextUrl.searchParams.get(
        "type",
      );

    const entityType =
      typeParameter
        ? assertEntityType(
            typeParameter,
          )
        : undefined;

    if (
      typeParameter &&
      !entityType
    ) {
      return NextResponse.json(
        {
          error: "Invalid entity type.",
        },
        {
          status: 400,
        },
      );
    }

    const symbols =
      request.nextUrl.searchParams
        .get("symbols")
        ?.split(",")
        .map(
          (symbol) =>
            symbol
              .trim()
              .toUpperCase(),
        )
        .filter(Boolean);

    const requestedLimit =
      Number(
        request.nextUrl.searchParams.get(
          "limit",
        ) ?? 20,
      );

    const requestedMinimumChange =
      Number(
        request.nextUrl.searchParams.get(
          "minimumChange",
        ) ?? 2,
      );

    const repository = new SupabaseAMSAPulseRepository();
    const movers = await repository.getMovers({
      entityType:
        entityType ?? undefined,
      entityKeys:
        symbols,

      limit:
        Number.isFinite(
          requestedLimit,
        )
          ? requestedLimit
          : 20,

      minimumChange:
        Number.isFinite(
          requestedMinimumChange,
        )
          ? requestedMinimumChange
          : 2,

      frequency:
        "daily",
    });

    return NextResponse.json({
      success: true,
      movers,
      calculatedAt:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "AMSA movers route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Pulse movers could not be retrieved.",
      },
      {
        status: 500,
      },
    );
  }
}