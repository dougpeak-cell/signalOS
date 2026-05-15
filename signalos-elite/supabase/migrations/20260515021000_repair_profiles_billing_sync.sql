alter table if exists public.profiles
add column if not exists sigi_tier text not null default 'free' check (sigi_tier in ('free', 'smart', 'pro'));

alter table if exists public.profiles
add column if not exists subscription_tier text;

alter table if exists public.profiles
add column if not exists plan text;

alter table if exists public.profiles
add column if not exists stripe_customer_id text;

alter table if exists public.profiles
add column if not exists stripe_subscription_id text;

alter table if exists public.profiles
add column if not exists stripe_price_id text;

alter table if exists public.profiles
add column if not exists stripe_subscription_status text;

alter table if exists public.profiles
add column if not exists stripe_current_period_end timestamptz;

alter table if exists public.profiles
add column if not exists stripe_cancel_at_period_end boolean not null default false;

alter table if exists public.profiles
add column if not exists billing_status text not null default 'ok';

alter table if exists public.profiles
add column if not exists sigi_provider_enabled boolean;

alter table if exists public.profiles
add column if not exists sigi_provider_base_url text;

alter table if exists public.profiles
add column if not exists sigi_provider_model text;

alter table if exists public.profiles
add column if not exists sigi_provider_label text;

alter table if exists public.profiles
add column if not exists sigi_provider_api_key_encrypted text;

alter table if exists public.profiles
add column if not exists sigi_provider_failure_count integer not null default 0;

alter table if exists public.profiles
add column if not exists sigi_provider_last_error text;

alter table if exists public.profiles
add column if not exists sigi_usage_count integer not null default 0;

alter table if exists public.profiles
add column if not exists sigi_last_used_at timestamptz;

create unique index if not exists profiles_stripe_customer_id_unique
on public.profiles (stripe_customer_id)
where stripe_customer_id is not null;

create unique index if not exists profiles_stripe_subscription_id_unique
on public.profiles (stripe_subscription_id)
where stripe_subscription_id is not null;

insert into public.profiles (user_id)
select users.id
from auth.users as users
where not exists (
  select 1
  from public.profiles as profiles
  where profiles.user_id = users.id
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.entitlements (user_id, is_pro, limits)
  values (new.id, false, '{}'::jsonb)
  on conflict (user_id) do nothing;

  return new;
end;
$function$;