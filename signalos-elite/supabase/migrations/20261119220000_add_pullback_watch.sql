create table public.pullback_watches (
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null check (symbol ~ '^[A-Z][A-Z0-9.-]{0,11}$'),
  trusted_firms text[] not null default array['Schwab','Morningstar','CFRA','Argus'],
  notify boolean not null default false,
  snapshot jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, symbol),
  check (cardinality(trusted_firms) between 1 and 4 and trusted_firms <@ array['Schwab','Morningstar','CFRA','Argus'])
);
create table public.pullback_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  pullback_id text not null,
  stage text not null check (stage in ('analyst','price-volume')),
  evidence jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, symbol, pullback_id, stage)
);
create index pullback_events_inbox on public.pullback_events (user_id, created_at desc);
alter table public.pullback_watches enable row level security;
alter table public.pullback_events enable row level security;
create policy pullback_watches_read on public.pullback_watches for select to authenticated using (auth.uid() = user_id);
create policy pullback_events_read on public.pullback_events for select to authenticated using (auth.uid() = user_id);
grant select on public.pullback_watches, public.pullback_events to authenticated;
grant all on public.pullback_watches, public.pullback_events to service_role;

-- Only the trusted server evaluates evidence. Locking the watch serializes workers;
-- the event unique key remains the final idempotency boundary.
create function public.record_pullback_evaluation(p_user uuid, p_symbol text, p_snapshot jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
  watched public.pullback_watches%rowtype;
  episode text;
  supported boolean;
begin
  select * into watched from public.pullback_watches
    where user_id = p_user and symbol = p_symbol for update;
  if not found then return; end if;
  if p_snapshot->'trustedFirms' <> to_jsonb(watched.trusted_firms) then return; end if;
  if watched.snapshot is not null and
    (watched.snapshot->'evaluation'->>'evaluatedAt')::timestamptz >
    (p_snapshot->'evaluation'->>'evaluatedAt')::timestamptz then return; end if;
  update public.pullback_watches set snapshot = p_snapshot, updated_at = now()
    where user_id = p_user and symbol = p_symbol;
  if not watched.notify then return; end if;
  episode := p_snapshot->'evaluation'->'episode'->>'id';
  supported := p_snapshot->'evaluation'->>'analystAt' is not null;
  if episode is null or not supported then return; end if;
  insert into public.pullback_events(user_id, symbol, pullback_id, stage, evidence)
    values (p_user, p_symbol, episode, 'analyst', p_snapshot)
    on conflict (user_id, symbol, pullback_id, stage) do nothing;
  if p_snapshot->'evaluation'->>'priceVolume' is not null then
    insert into public.pullback_events(user_id, symbol, pullback_id, stage, evidence)
      values (p_user, p_symbol, episode, 'price-volume', p_snapshot)
      on conflict (user_id, symbol, pullback_id, stage) do nothing;
  end if;
end;
$$;
revoke all on function public.record_pullback_evaluation(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_pullback_evaluation(uuid, text, jsonb) to service_role;
