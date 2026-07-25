import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import {
  calculatePulseEvolution,
} from "./evolution";

import type {
  AMSAPulseEntityType,
  AMSAPulseMover,
  AMSAPulseSnapshot,
} from "../types";

import type {
  AMSAPulseRepository,
  MoverQuery,
  SnapshotQuery,
} from "./repository";

/* =========================================================
   SUPABASE PULSE REPOSITORY

   Server-side only.
========================================================= */

type SnapshotRow = {
  id: string;

  entity_type: AMSAPulseEntityType;
  entity_key: string;
  entity_name: string | null;

  score: number | null;
  confidence: number | null;

  state: string | null;
  direction: string | null;
  status: string | null;

  components: unknown;
  reasons: unknown;
  warnings: unknown;
  metadata: unknown;

  source_updated_at: string | null;
  calculated_at: string;
  recorded_at: string;
};

let cachedClient:
  | SupabaseClient
  | null = null;

export function getAMSASupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase AMSA environment variables are missing.",
    );
  }

  cachedClient = createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  return cachedClient;
}

export class SupabaseAMSAPulseRepository
  implements AMSAPulseRepository
{
  constructor(
    private readonly supabase =
      getAMSASupabaseClient(),
  ) {}

  async saveSnapshot(
    snapshot: AMSAPulseSnapshot,
  ): Promise<AMSAPulseSnapshot> {
    const payload = {
      entity_type:
        snapshot.entityType,

      entity_key:
        normalizeEntityKey(
          snapshot.entityKey,
        ),

      entity_name:
        snapshot.entityName ?? null,

      score:
        snapshot.score,

      confidence:
        snapshot.confidence,

      state:
        snapshot.state ?? null,

      direction:
        snapshot.direction ?? null,

      status:
        snapshot.status ?? null,

      components:
        snapshot.components ?? [],

      reasons:
        snapshot.reasons ?? [],

      warnings:
        snapshot.warnings ?? [],

      metadata: {
        ...(snapshot.metadata ?? {}),
        frequency:
          snapshot.frequency,
      },

      source_updated_at:
        snapshot.sourceUpdatedAt ?? null,

      calculated_at:
        snapshot.calculatedAt,
    };

    const query = this.supabase
      .from(
        "amsa_pulse_snapshots",
      )
      .insert(payload)
      .select("*")
      .single();

    /*
     * Daily snapshots use a unique index.
     * If you prefer daily upserts instead, use the helper route
     * below, which checks for an existing snapshot first.
     */

    const {
      data,
      error,
    } = await query;

    if (error) {
      throw new Error(
        `AMSA snapshot save failed: ${error.message}`,
      );
    }

    return mapRow(
      data as SnapshotRow,
    );
  }

  async getSnapshots(
    query: SnapshotQuery,
  ): Promise<AMSAPulseSnapshot[]> {
    const limit = Math.min(
      Math.max(
        query.limit ?? 30,
        1,
      ),
      365,
    );

    let request = this.supabase
      .from(
        "amsa_pulse_snapshots",
      )
      .select("*")
      .eq(
        "entity_type",
        query.entityType,
      )
      .eq(
        "entity_key",
        normalizeEntityKey(
          query.entityKey,
        ),
      )
      .order(
        "calculated_at",
        {
          ascending: false,
        },
      )
      .limit(
        query.frequency
          ? 365
          : limit,
      );

    if (query.dateFrom) {
      request = request.gte(
        "calculated_at",
        query.dateFrom,
      );
    }

    if (query.dateTo) {
      request = request.lte(
        "calculated_at",
        query.dateTo,
      );
    }

    const {
      data,
      error,
    } = await request;

    if (error) {
      throw new Error(
        `AMSA snapshot read failed: ${error.message}`,
      );
    }

    const snapshots = (
      (data ?? []) as SnapshotRow[]
    ).map(mapRow);

    const filteredSnapshots =
      query.frequency
        ? snapshots.filter(
            (snapshot) =>
              snapshot.frequency ===
              query.frequency,
          )
        : snapshots;

    return filteredSnapshots
      .slice(0, limit)
      .reverse();
  }

  async getLatestSnapshot(
    entityType: AMSAPulseEntityType,
    entityKey: string,
  ): Promise<AMSAPulseSnapshot | null> {
    const {
      data,
      error,
    } = await this.supabase
      .from(
        "amsa_pulse_snapshots",
      )
      .select("*")
      .eq(
        "entity_type",
        entityType,
      )
      .eq(
        "entity_key",
        normalizeEntityKey(
          entityKey,
        ),
      )
      .order(
        "calculated_at",
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Latest AMSA snapshot read failed: ${error.message}`,
      );
    }

    return data
      ? mapRow(
          data as SnapshotRow,
        )
      : null;
  }

  async getPreviousSnapshot(
    entityType: AMSAPulseEntityType,
    entityKey: string,
    beforeDate: string,
  ): Promise<AMSAPulseSnapshot | null> {
    const {
      data,
      error,
    } = await this.supabase
      .from(
        "amsa_pulse_snapshots",
      )
      .select("*")
      .eq(
        "entity_type",
        entityType,
      )
      .eq(
        "entity_key",
        normalizeEntityKey(
          entityKey,
        ),
      )
      .lt(
        "calculated_at",
        beforeDate,
      )
      .order(
        "calculated_at",
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Previous AMSA snapshot read failed: ${error.message}`,
      );
    }

    return data
      ? mapRow(
          data as SnapshotRow,
        )
      : null;
  }

  async getMovers(
    query: MoverQuery,
  ): Promise<AMSAPulseMover[]> {
    const limit = Math.min(
      Math.max(
        query.limit ?? 20,
        1,
      ),
      100,
    );

    const entityKeys =
      query.entityKeys
        ?.map(normalizeEntityKey)
        .filter(Boolean);

    let latestRequest =
      this.supabase
        .from(
          "amsa_pulse_snapshots",
        )
        .select("*")
        .order(
          "calculated_at",
          {
            ascending: false,
          },
        )
        .limit(500);

    if (query.entityType) {
      latestRequest =
        latestRequest.eq(
          "entity_type",
          query.entityType,
        );
    }

    if (
      entityKeys &&
      entityKeys.length
    ) {
      latestRequest =
        latestRequest.in(
          "entity_key",
          entityKeys,
        );
    }

    const {
      data,
      error,
    } = await latestRequest;

    if (error) {
      throw new Error(
        `AMSA movers read failed: ${error.message}`,
      );
    }

    const rows =
      (data ?? []) as SnapshotRow[];

    const grouped = new Map<
      string,
      AMSAPulseSnapshot[]
    >();

    for (const row of rows) {
      const snapshot =
        mapRow(row);

      if (
        query.frequency &&
        snapshot.frequency !==
          query.frequency
      ) {
        continue;
      }

      const key =
        `${snapshot.entityType}:${snapshot.entityKey}`;

      const existing =
        grouped.get(key) ?? [];

      if (existing.length < 10) {
        existing.push(
          snapshot,
        );

        grouped.set(
          key,
          existing,
        );
      }
    }

    const minimumChange =
      Math.abs(
        query.minimumChange ?? 2,
      );

    const movers: AMSAPulseMover[] = [];

    for (
      const snapshots of grouped.values()
    ) {
      const evolution =
        calculatePulseEvolution(
          [...snapshots].reverse(),
        );

      if (
        evolution.currentSnapshot &&
        evolution.change !== null &&
        Math.abs(
          evolution.change,
        ) >= minimumChange
      ) {
        movers.push({
          entityType:
            evolution.entityType,

          entityKey:
            evolution.entityKey,

          entityName:
            evolution.entityName,

          score:
            evolution.currentScore,

          previousScore:
            evolution.previousScore,

          change:
            evolution.change,

          velocity:
            evolution.velocity,

          state:
            evolution.currentSnapshot.state,

          direction:
            evolution.currentSnapshot.direction,

          confidence:
            evolution.currentSnapshot.confidence,

          primaryReason:
            evolution.events.at(0)?.message ??
            evolution.currentSnapshot.reasons.at(0) ??
            null,

          updatedAt:
            evolution.currentSnapshot.calculatedAt,
        });
      }
    }

    return movers
      .sort(
        (first, second) =>
          Math.abs(
            second.change ?? 0,
          ) -
          Math.abs(
            first.change ?? 0,
          ),
      )
      .slice(0, limit);
  }
}

export function createAMSASupabaseRepository(): AMSAPulseRepository {
  return new SupabaseAMSAPulseRepository();
}

function mapRow(
  row: SnapshotRow,
): AMSAPulseSnapshot {
  const metadata =
    isObject(row.metadata)
      ? row.metadata
      : {};

  const frequency =
    metadata.frequency ===
      "intraday" ||
    metadata.frequency ===
      "manual"
      ? metadata.frequency
      : "daily";

  return {
    id: row.id,

    entityType:
      row.entity_type,

    entityKey:
      row.entity_key,

    entityName:
      row.entity_name,

    score:
      numberOrNull(
        row.score,
      ),

    confidence:
      numberOrNull(
        row.confidence,
      ),

    state:
      row.state,

    direction:
      row.direction,

    status:
      row.status,

    components:
      Array.isArray(
        row.components,
      )
        ? row.components as AMSAPulseSnapshot["components"]
        : [],

    reasons:
      stringArray(
        row.reasons,
      ),

    warnings:
      stringArray(
        row.warnings,
      ),

    metadata,

    sourceUpdatedAt:
      row.source_updated_at,

    calculatedAt:
      row.calculated_at,

    recordedAt:
      row.recorded_at,

    frequency,
  };
}

function normalizeEntityKey(
  value: string,
): string {
  return value
    .trim()
    .toUpperCase()
    .slice(0, 100);
}

function numberOrNull(
  value: unknown,
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string"
  ) {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function stringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      item,
    ): item is string =>
      typeof item === "string",
  );
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}