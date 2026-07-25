import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  SupabaseAMSAPulseRepository,
  type AMSAPulseEntityType,
  type AMSAPulseSnapshot,
  type AMSAPulseSnapshotWrite,
} from "@/lib/amsa";

export const dynamic = "force-dynamic";

type RecordPayload = {
  snapshot?: AMSAPulseSnapshotWrite;
  snapshots?: AMSAPulseSnapshotWrite[];
};

export async function POST(
  request: NextRequest,
) {
  const expectedSecret = process.env.AMSA_INTERNAL_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      {
        error: "AMSA_INTERNAL_SECRET is not configured.",
      },
      {
        status: 500,
      },
    );
  }

  const providedSecret = getProvidedSecret(request);

  if (providedSecret !== expectedSecret) {
    return NextResponse.json(
      {
        error: "Unauthorized.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const payload =
      (await request.json()) as RecordPayload;

    const snapshots = normalizePayload(payload);

    if (!snapshots.length) {
      return NextResponse.json(
        {
          error: "No valid snapshots were provided.",
        },
        {
          status: 400,
        },
      );
    }

    const repository = new SupabaseAMSAPulseRepository();
    const recorded = await Promise.all(
      snapshots.map((snapshot) =>
        repository.saveSnapshot(snapshot),
      ),
    );

    return NextResponse.json({
      success: true,
      recordedCount: recorded.length,
      snapshots: recorded,
    });
  } catch (error) {
    console.error(
      "AMSA evolution record route error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AMSA snapshots could not be recorded.",
      },
      {
        status: 500,
      },
    );
  }
}

function getProvidedSecret(
  request: NextRequest,
): string | null {
  const headerSecret = request.headers.get(
    "x-amsa-internal-secret",
  );

  if (headerSecret) {
    return headerSecret;
  }

  const authorization = request.headers.get(
    "authorization",
  );

  if (!authorization) {
    return null;
  }

  const match = authorization.match(
    /^Bearer\s+(.+)$/i,
  );

  return match?.[1] ?? null;
}

function normalizePayload(
  payload: RecordPayload,
) : AMSAPulseSnapshot[] {
  const rawSnapshots = Array.isArray(payload.snapshots)
    ? payload.snapshots
    : payload.snapshot
      ? [payload.snapshot]
      : [];

  return rawSnapshots
    .map(normalizeSnapshot)
    .filter(
      (
        snapshot,
      ): snapshot is AMSAPulseSnapshot => snapshot !== null,
    );
}

function normalizeSnapshot(
  snapshot: AMSAPulseSnapshotWrite,
): AMSAPulseSnapshot | null {
  if (
    !snapshot ||
    !isAMSAPulseEntityType(snapshot.entityType) ||
    typeof snapshot.entityKey !== "string" ||
    !snapshot.entityKey.trim() ||
    typeof snapshot.calculatedAt !== "string" ||
    !snapshot.calculatedAt.trim()
  ) {
    return null;
  }

  return {
    ...snapshot,
    id: snapshot.id,
    entityKey: normalizeEntityKey(snapshot.entityKey),
    entityName: snapshot.entityName ?? null,
    score:
      typeof snapshot.score === "number"
        ? snapshot.score
        : null,
    confidence:
      typeof snapshot.confidence === "number"
        ? snapshot.confidence
        : null,
    state: snapshot.state ?? null,
    direction: snapshot.direction ?? null,
    status: snapshot.status ?? null,
    components: snapshot.components ?? [],
    reasons: snapshot.reasons ?? [],
    warnings: snapshot.warnings ?? [],
    metadata: snapshot.metadata ?? {},
    sourceUpdatedAt:
      snapshot.sourceUpdatedAt ?? null,
    recordedAt:
      snapshot.recordedAt ?? null,
    frequency:
      snapshot.frequency ?? "manual",
  };
}

const AMSA_PULSE_ENTITY_TYPES: AMSAPulseEntityType[] = [
  "market",
  "sector",
  "industry",
  "stock",
  "portfolio",
  "crypto",
];

function isAMSAPulseEntityType(
  value: string,
): value is AMSAPulseEntityType {
  return AMSA_PULSE_ENTITY_TYPES.includes(
    value as AMSAPulseEntityType,
  );
}

function normalizeEntityKey(
  value: string,
): string {
  return value
    .trim()
    .toUpperCase()
    .slice(0, 100);
}