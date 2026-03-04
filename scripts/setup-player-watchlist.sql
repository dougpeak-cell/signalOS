-- Create player watchlist table
create table if not exists watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, player_id)
);

-- Enable RLS
alter table watchlist enable row level security;

-- Drop existing policy if it exists
drop policy if exists "Users manage their watchlist" on watchlist;

-- Policy: users can only manage their own watchlist items
create policy "Users manage their watchlist"
on watchlist
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
