alter table if exists public.profiles
add column if not exists sigi_provider_failure_count integer not null default 0;

alter table if exists public.profiles
add column if not exists sigi_provider_last_error text;