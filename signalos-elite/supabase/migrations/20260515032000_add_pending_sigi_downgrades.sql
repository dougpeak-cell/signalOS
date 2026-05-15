alter table if exists public.profiles
add column if not exists pending_sigi_tier text check (pending_sigi_tier in ('free', 'smart', 'pro'));

alter table if exists public.profiles
add column if not exists pending_sigi_tier_effective_at timestamptz;

alter table if exists public.profiles
add column if not exists stripe_subscription_schedule_id text;

create unique index if not exists profiles_stripe_subscription_schedule_id_unique
on public.profiles (stripe_subscription_schedule_id)
where stripe_subscription_schedule_id is not null;