alter table public.amsa_pulse_snapshots
add column if not exists frequency text;

update public.amsa_pulse_snapshots
set frequency = coalesce(metadata->>'frequency', 'daily')
where frequency is null;

alter table public.amsa_pulse_snapshots
alter column frequency set default 'daily';

alter table public.amsa_pulse_snapshots
alter column frequency set not null;

alter table public.amsa_pulse_snapshots
drop constraint if exists amsa_pulse_snapshots_frequency_check;

alter table public.amsa_pulse_snapshots
add constraint amsa_pulse_snapshots_frequency_check
check (frequency in ('five_minute', 'daily', 'manual'));

alter table public.amsa_pulse_snapshots
add column if not exists interval_bucket timestamptz;

drop index if exists public.amsa_pulse_snapshots_daily_unique_idx;

create unique index if not exists amsa_pulse_snapshots_daily_unique_idx
on public.amsa_pulse_snapshots (
  entity_type,
  entity_key,
  frequency,
  snapshot_date
)
where frequency = 'daily';

create unique index if not exists amsa_pulse_snapshots_interval_unique_idx
on public.amsa_pulse_snapshots (
  entity_type,
  entity_key,
  frequency,
  interval_bucket
)
where frequency = 'five_minute';

create index if not exists amsa_pulse_snapshots_frequency_time_idx
on public.amsa_pulse_snapshots (
  entity_type,
  entity_key,
  frequency,
  calculated_at desc
);