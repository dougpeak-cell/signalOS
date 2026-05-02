create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.entitlements (user_id, is_pro, limits)
  values (new.id, false, '{}'::jsonb)
  on conflict (user_id) do nothing;

  return new;
end;
$function$;