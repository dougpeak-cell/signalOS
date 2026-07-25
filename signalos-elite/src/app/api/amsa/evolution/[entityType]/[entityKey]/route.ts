import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  assertEntityType,
  calculatePulseEvolution,
  SupabaseAMSAPulseRepository,
} from "@/lib/amsa";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    entityType: string;
    entityKey: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const {
      entityType:
        rawEntityType,

      entityKey:
        rawEntityKey,
    } = await context.params;

    const entityType =
      assertEntityType(
        rawEntityType,
      );

    if (!entityType) {
      return NextResponse.json(
        {
          error:
            "Invalid Pulse entity type.",
        },
        {
          status: 400,
        },
      );
    }

    const entityKey =
      decodeURIComponent(
        rawEntityKey,
      )
        .trim()
        .toUpperCase();

    if (
      !entityKey ||
      entityKey.length > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid Pulse entity key.",
        },
        {
          status: 400,
        },
      );
    }

    const requestedLimit =
      Number(
        request.nextUrl.searchParams.get(
          "limit",
        ) ?? 30,
      );

    const limit =
      Number.isFinite(
        requestedLimit,
      )
        ? Math.min(
            Math.max(
              requestedLimit,
              2,
            ),
            365,
          )
        : 30;

    const frequency =
      request.nextUrl.searchParams.get(
        "frequency",
      );

    const repository = new SupabaseAMSAPulseRepository();
    const snapshots =
      await repository.getSnapshots({
        entityType,
        entityKey,
        limit,

        frequency:
          frequency === "intraday" ||
          frequency === "manual" ||
          frequency === "daily"
            ? frequency
            : undefined,
      });

    const evolution =
      calculatePulseEvolution(
        snapshots,
      );

    return NextResponse.json({
      success: true,
      evolution,
    });
  } catch (error) {
    console.error(
      "AMSA evolution route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Pulse Evolution could not be retrieved.",
      },
      {
        status: 500,
      },
    );
  }
}
