alter table if exists public.profiles
add column if not exists smart_preview_started_at timestamptz;
