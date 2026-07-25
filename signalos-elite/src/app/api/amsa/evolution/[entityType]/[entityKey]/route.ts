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

    const requestedFrequency =
      frequency === "intraday" ||
      frequency === "manual" ||
      frequency === "daily"
        ? frequency
        : null;

    const repository = new SupabaseAMSAPulseRepository();
    const snapshots =
      await repository.getSnapshots({
        entityType,
        entityKey,
        limit,

        frequency:
          requestedFrequency ?? undefined,
      });

    const evolution =
      calculatePulseEvolution(
        snapshots,
      );

    return NextResponse.json(
      snapshots.length
        ? {
            success: true,
            entityType,
            entityKey,
            frequency:
              requestedFrequency,
            snapshots,
            evolution,
          }
        : {
            success: true,
            entityType,
            entityKey,
            frequency:
              requestedFrequency,
            snapshots: [],
            evolution: null,
          },
    );
  } catch (error) {
    console.error(
      "Pulse Evolution retrieval failed",
      {
        entityType:
          (await context.params)
            .entityType,
        entityKey:
          (await context.params)
            .entityKey,
        frequency:
          request.nextUrl.searchParams.get(
            "frequency",
          ),
        limit:
          request.nextUrl.searchParams.get(
            "limit",
          ),
        error,
      },
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
