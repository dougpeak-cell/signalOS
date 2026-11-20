alter table public.pullback_watches add column notify_since timestamptz;
update public.pullback_watches set notify_since = now() where notify;

create function public.set_pullback_notification_start()
returns trigger language plpgsql set search_path = public as $$
begin
  if not new.notify then
    new.notify_since := null;
  elsif tg_op = 'INSERT' then
    new.notify_since := now();
  elsif not old.notify then
    new.notify_since := now();
  else
    new.notify_since := old.notify_since;
  end if;
  return new;
end;
$$;
create trigger pullback_notification_start
  before insert or update on public.pullback_watches
  for each row execute function public.set_pullback_notification_start();
revoke all on function public.set_pullback_notification_start() from public, anon, authenticated;

alter table public.pullback_events drop constraint pullback_events_stage_check;
alter table public.pullback_events add constraint pullback_events_stage_check
  check (stage in ('early', 'analyst', 'price-volume'));

create or replace function public.record_pullback_evaluation(p_user uuid, p_symbol text, p_snapshot jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
  watched public.pullback_watches%rowtype;
  episode text;
  supported boolean;
  early_signal jsonb;
  published timestamptz;
begin
  select * into watched from public.pullback_watches
    where user_id = p_user and symbol = p_symbol for update;
  if not found then return; end if;
  if p_snapshot->'trustedFirms' <> to_jsonb(watched.trusted_firms) then return; end if;
  if watched.snapshot is not null and
    (watched.snapshot->'evaluation'->>'evaluatedAt')::timestamptz >
    (p_snapshot->'evaluation'->>'evaluatedAt')::timestamptz then return; end if;
  -- A pause/re-enable during evaluation invalidates the old opt-in generation.
  if watched.notify and (
    (p_snapshot->'early'->>'since')::timestamptz is distinct from watched.notify_since or
    (p_snapshot->'evaluation'->>'evaluatedAt')::timestamptz < watched.notify_since
  ) then return; end if;
  update public.pullback_watches set snapshot = p_snapshot, updated_at = now()
    where user_id = p_user and symbol = p_symbol;
  if not watched.notify or watched.notify_since is null then return; end if;
  for early_signal in select value from jsonb_array_elements(coalesce(p_snapshot->'early'->'signals', '[]'::jsonb))
  loop
    if early_signal->>'id' is null or early_signal->>'kind' is null or
       early_signal->>'publishedAt' is null or early_signal->>'dateOnly' is null or
       early_signal->>'id' !~ '^[a-f0-9]{64}$' or
       early_signal->>'kind' not in ('analyst-upgrade', 'hedge-fund', 'senator', 'insider') then continue; end if;
    if (early_signal->>'dateOnly')::boolean then
      if (early_signal->>'publishedAt')::date <= (watched.notify_since at time zone 'America/New_York')::date or
         (early_signal->>'publishedAt')::date > ((p_snapshot->'evaluation'->>'evaluatedAt')::timestamptz at time zone 'America/New_York')::date
      then continue; end if;
    else
      published := (early_signal->>'publishedAt')::timestamptz;
      if published <= watched.notify_since or published > (p_snapshot->'evaluation'->>'evaluatedAt')::timestamptz
      then continue; end if;
    end if;
    insert into public.pullback_events(user_id, symbol, pullback_id, stage, evidence)
      values (p_user, p_symbol, 'early:' || (early_signal->>'id'), 'early',
        jsonb_set(p_snapshot, '{early,signals}', jsonb_build_array(early_signal)))
      on conflict (user_id, symbol, pullback_id, stage) do nothing;
  end loop;
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
