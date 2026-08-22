-- ============================================================
-- SIGIOS TALENT PORTFOLIO
-- Optional simulated trading system.
-- 1 Talent = $1 of simulated buying power.
-- Completely separate from the user's real/manual portfolio.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- TALENT ACCOUNTS
-- ------------------------------------------------------------

create table if not exists public.talent_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  starting_talents numeric(18, 2) not null default 100000.00,
  cash_talents numeric(18, 2) not null default 100000.00,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint talent_accounts_user_unique unique (user_id),
  constraint talent_accounts_starting_positive
    check (starting_talents >= 0),
  constraint talent_accounts_cash_nonnegative
    check (cash_talents >= 0)
);

-- ------------------------------------------------------------
-- TALENT POSITIONS
-- ------------------------------------------------------------

create table if not exists public.talent_positions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.talent_accounts(id) on delete cascade,

  symbol text not null,
  quantity numeric(18, 6) not null default 0,
  average_price numeric(18, 6) not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint talent_positions_unique_symbol
    unique (account_id, symbol),

  constraint talent_positions_quantity_nonnegative
    check (quantity >= 0),

  constraint talent_positions_average_price_nonnegative
    check (average_price >= 0)
);

-- ------------------------------------------------------------
-- TALENT TRADES
-- ------------------------------------------------------------

create table if not exists public.talent_trades (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.talent_accounts(id) on delete cascade,

  symbol text not null,
  side text not null check (side in ('buy', 'sell')),

  quantity numeric(18, 6) not null,
  execution_price numeric(18, 6) not null,
  talent_amount numeric(18, 2) not null,

  created_at timestamptz not null default now(),

  constraint talent_trades_quantity_positive
    check (quantity > 0),

  constraint talent_trades_price_positive
    check (execution_price > 0),

  constraint talent_trades_amount_positive
    check (talent_amount > 0)
);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

create index if not exists talent_positions_user_idx
  on public.talent_positions(user_id);

create index if not exists talent_positions_account_idx
  on public.talent_positions(account_id);

create index if not exists talent_trades_user_time_idx
  on public.talent_trades(user_id, created_at desc);

create index if not exists talent_trades_account_time_idx
  on public.talent_trades(account_id, created_at desc);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.talent_accounts enable row level security;
alter table public.talent_positions enable row level security;
alter table public.talent_trades enable row level security;

drop policy if exists "Users can read own talent account"
  on public.talent_accounts;

create policy "Users can read own talent account"
  on public.talent_accounts
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own talent account"
  on public.talent_accounts;

create policy "Users can insert own talent account"
  on public.talent_accounts
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own talent account"
  on public.talent_accounts;

create policy "Users can update own talent account"
  on public.talent_accounts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own talent positions"
  on public.talent_positions;

create policy "Users can read own talent positions"
  on public.talent_positions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own talent positions"
  on public.talent_positions;

create policy "Users can insert own talent positions"
  on public.talent_positions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own talent positions"
  on public.talent_positions;

create policy "Users can update own talent positions"
  on public.talent_positions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own talent positions"
  on public.talent_positions;

create policy "Users can delete own talent positions"
  on public.talent_positions
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own talent trades"
  on public.talent_trades;

create policy "Users can read own talent trades"
  on public.talent_trades
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own talent trades"
  on public.talent_trades;

create policy "Users can insert own talent trades"
  on public.talent_trades
  for insert
  with check (auth.uid() = user_id);
