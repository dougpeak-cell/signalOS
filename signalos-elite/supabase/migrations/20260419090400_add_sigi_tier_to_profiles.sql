alter table if exists public.profiles
add column if not exists sigi_tier text not null default 'free' check (sigi_tier in ('free', 'smart', 'pro'));

alter table if exists public.profiles
add column if not exists sigi_usage_count integer not null default 0;

alter table if exists public.profiles
add column if not exists sigi_last_used_at timestamptz;

update public.profiles as profiles
set sigi_tier = settings.plan_tier
from public.sigi_user_settings as settings
where settings.user_id = profiles.id
  and settings.plan_tier in ('free', 'smart', 'pro')
  and coalesce(profiles.sigi_tier, 'free') = 'free';