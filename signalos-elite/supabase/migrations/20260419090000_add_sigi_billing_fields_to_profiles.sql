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

create unique index if not exists profiles_stripe_customer_id_unique
on public.profiles (stripe_customer_id)
where stripe_customer_id is not null;

create unique index if not exists profiles_stripe_subscription_id_unique
on public.profiles (stripe_subscription_id)
where stripe_subscription_id is not null;