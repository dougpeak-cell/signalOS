insert into public.subscriptions (user_id, plan, status, current_period_end)
values ('YOUR_USER_UUID_HERE', 'pro', 'active', now() + interval '7 days')
on conflict (user_id)
do update set plan='pro', status='active', current_period_end=excluded.current_period_end;