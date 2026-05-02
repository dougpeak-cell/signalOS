create table if not exists public.user_market_contexts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  watchlist jsonb not null default '[]'::jsonb,
  portfolio jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_market_contexts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_market_contexts' and policyname = 'Users can manage their own market contexts'
  ) then
    create policy "Users can manage their own market contexts"
      on public.user_market_contexts
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.set_user_market_contexts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_market_contexts_set_updated_at on public.user_market_contexts;

create trigger user_market_contexts_set_updated_at
before update on public.user_market_contexts
for each row execute function public.set_user_market_contexts_updated_at();