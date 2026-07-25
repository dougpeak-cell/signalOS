create table if not exists public.amsa_pulse_snapshots (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null check (
    entity_type in (
      'market',
      'sector',
      'industry',
      'stock',
      'portfolio',
      'crypto'
    )
  ),

  entity_key text not null,
  entity_name text,

  score numeric(6, 2),
  confidence numeric(6, 2),

  state text,
  direction text,
  status text,

  components jsonb not null default '[]'::jsonb,
  reasons jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  source_updated_at timestamptz,
  calculated_at timestamptz not null,
  recorded_at timestamptz not null default now(),

  snapshot_date date generated always as (
    (calculated_at at time zone 'America/Chicago')::date
  ) stored
);

create index if not exists amsa_pulse_snapshots_entity_time_idx
on public.amsa_pulse_snapshots (
  entity_type,
  entity_key,
  calculated_at desc
);

create index if not exists amsa_pulse_snapshots_date_idx
on public.amsa_pulse_snapshots (
  snapshot_date desc
);

create index if not exists amsa_pulse_snapshots_score_idx
on public.amsa_pulse_snapshots (
  entity_type,
  score desc
);

create unique index if not exists amsa_pulse_snapshots_daily_unique_idx
on public.amsa_pulse_snapshots (
  entity_type,
  entity_key,
  snapshot_date
)
where metadata->>'frequency' = 'daily';

alter table public.amsa_pulse_snapshots enable row level security;