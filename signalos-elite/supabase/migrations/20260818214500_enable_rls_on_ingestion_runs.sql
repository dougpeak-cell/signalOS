alter table if exists public.ingestion_runs enable row level security;
alter table if exists public.data_freshness enable row level security;
alter table if exists public.signals enable row level security;

drop policy if exists "Market signals are publicly readable" on public.signals;
create policy "Market signals are publicly readable"
	on public.signals
	for select
	to anon, authenticated
	using (true);

alter table if exists public.portfolio_holdings
	add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists portfolio_holdings_user_id_idx
	on public.portfolio_holdings (user_id);

alter table if exists public.portfolio_holdings enable row level security;

drop policy if exists "Users can manage their own portfolio holdings" on public.portfolio_holdings;
create policy "Users can manage their own portfolio holdings"
	on public.portfolio_holdings
	for all
	to authenticated
	using (auth.uid() = user_id)
	with check (auth.uid() = user_id);