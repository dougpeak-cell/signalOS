create table if not exists public.watchlist (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,

  player_id bigint references public.players(id) on delete cascade,
  game_id bigint references public.games(id) on delete cascade,

  created_at timestamptz default now(),

  -- must be either player OR game (not both, not neither)
  constraint watchlist_one_target check (
    (player_id is not null and game_id is null)
    or
    (player_id is null and game_id is not null)
  )
);

-- prevent duplicate saves
create unique index if not exists watchlist_user_player_unique
  on public.watchlist(user_id, player_id)
  where player_id is not null;

create unique index if not exists watchlist_user_game_unique
  on public.watchlist(user_id, game_id)
  where game_id is not null;

create index if not exists watchlist_user_idx on public.watchlist(user_id);
create index if not exists watchlist_created_idx on public.watchlist(created_at);

alter table public.watchlist enable row level security;

-- read your own
create policy "watchlist_select_own"
on public.watchlist
for select
to authenticated
using (auth.uid() = user_id);

-- insert your own
create policy "watchlist_insert_own"
on public.watchlist
for insert
to authenticated
with check (auth.uid() = user_id);

-- delete your own
create policy "watchlist_delete_own"
on public.watchlist
for delete
to authenticated
using (auth.uid() = user_id);
