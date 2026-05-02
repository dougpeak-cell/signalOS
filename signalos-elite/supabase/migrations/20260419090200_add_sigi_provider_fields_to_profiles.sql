alter table if exists public.profiles
add column if not exists sigi_provider_enabled boolean not null default false;

alter table if exists public.profiles
add column if not exists sigi_provider_base_url text;

alter table if exists public.profiles
add column if not exists sigi_provider_model text;

alter table if exists public.profiles
add column if not exists sigi_provider_label text;

alter table if exists public.profiles
add column if not exists sigi_provider_api_key_encrypted text;