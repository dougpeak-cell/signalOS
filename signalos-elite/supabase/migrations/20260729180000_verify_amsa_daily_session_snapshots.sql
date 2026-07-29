with ranked_daily_snapshots as (
  select
    id,
    row_number() over (
      partition by
        entity_type,
        entity_key,
        frequency,
        coalesce((source_updated_at at time zone 'UTC')::date, snapshot_date)
      order by recorded_at desc, id desc
    ) as duplicate_rank
  from public.amsa_pulse_snapshots
  where frequency = 'daily'
)
delete from public.amsa_pulse_snapshots snapshots
using ranked_daily_snapshots ranked
where snapshots.id = ranked.id
  and ranked.duplicate_rank > 1;

drop index if exists public.amsa_pulse_snapshots_daily_unique_idx;

update public.amsa_pulse_snapshots
set
  calculated_at = case
    when source_updated_at is not null
      then date_trunc('day', source_updated_at) + interval '21 hours'
    else calculated_at
  end,
  metadata = jsonb_set(
    jsonb_set(
      coalesce(metadata, '{}'::jsonb),
      '{verified}',
      'true'::jsonb,
      true
    ),
    '{sessionDate}',
    to_jsonb(coalesce(
      (source_updated_at at time zone 'UTC')::date,
      snapshot_date
    )::text),
    true
  )
where frequency = 'daily';

create unique index amsa_pulse_snapshots_daily_unique_idx
on public.amsa_pulse_snapshots (
  entity_type,
  entity_key,
  frequency,
  snapshot_date
)
where frequency = 'daily';