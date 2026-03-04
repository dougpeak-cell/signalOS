create table if not exists public.watchlist_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, game_id)
);

alter table public.watchlist_games enable row level security;

-- user can see their own
create policy "select own watchlist"
on public.watchlist_games
for select
to authenticated
using (auth.uid() = user_id);

-- user can insert their own
create policy "insert own watchlist"
on public.watchlist_games
for insert
to authenticated
with check (auth.uid() = user_id);

-- user can delete their own
create policy "delete own watchlist"
on public.watchlist_games
for delete
to authenticated
using (auth.uid() = user_id);
