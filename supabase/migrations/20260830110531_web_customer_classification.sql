-- Keep one Google identity while separating website/store customers from desktop app users.

create table if not exists public.web_customer_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.web_customer_accounts enable row level security;
revoke all on table public.web_customer_accounts from public, anon, authenticated;

create or replace function public.register_web_customer()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not logged in');
  end if;

  insert into public.web_customer_accounts (user_id)
  values (v_user_id)
  on conflict (user_id) do update set last_seen_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.register_web_customer() from public, anon;
grant execute on function public.register_web_customer() to authenticated;

create or replace function public.get_admin_web_customer_ids()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Admin only');
  end if;

  return jsonb_build_object(
    'ok', true,
    'user_ids', coalesce(
      (select jsonb_agg(w.user_id order by w.last_seen_at desc) from public.web_customer_accounts w),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.get_admin_web_customer_ids() from public, anon;
grant execute on function public.get_admin_web_customer_ids() to authenticated;

-- Identity creation no longer starts the desktop trial. The app claims it after device activation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    avatar_url,
    plan,
    last_login_at
  ) values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    'free',
    now()
  ) on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.claim_app_trial(p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_ends_at timestamptz := now() + interval '10 days';
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not logged in');
  end if;
  if nullif(trim(coalesce(p_device_id, '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Device is required');
  end if;
  if not exists (
    select 1 from public.devices d
    where d.user_id = v_user_id
      and d.device_id = p_device_id
      and d.active is true
      and d.revoked_at is null
  ) then
    return jsonb_build_object('ok', false, 'error', 'Active device required');
  end if;

  -- Serialize first-trial claims for this identity so concurrent app starts cannot duplicate it.
  perform 1 from public.profiles p where p.id = v_user_id for update;

  if exists (select 1 from public.profiles p where p.id = v_user_id and p.disabled_at is not null) then
    return jsonb_build_object('ok', false, 'error', 'Account disabled');
  end if;

  if exists (
    select 1 from public.subscriptions s
    where s.user_id = v_user_id
      and s.active is true
      and s.ends_at > v_now
      and s.source <> 'trial'
  ) then
    return jsonb_build_object('ok', true, 'claimed', false, 'reason', 'active_access');
  end if;

  if exists (select 1 from public.subscriptions s where s.user_id = v_user_id and s.source = 'trial')
     or exists (select 1 from public.profiles p where p.id = v_user_id and p.trial_started_at is not null) then
    return jsonb_build_object('ok', true, 'claimed', false, 'reason', 'already_claimed');
  end if;

  insert into public.subscriptions (user_id, plan, source, starts_at, ends_at, active)
  values (v_user_id, 'trial', 'trial', v_now, v_ends_at, true);

  update public.profiles
  set plan = 'trial', trial_started_at = v_now, trial_ends_at = v_ends_at, last_login_at = v_now
  where id = v_user_id;

  return jsonb_build_object('ok', true, 'claimed', true, 'starts_at', v_now, 'ends_at', v_ends_at);
end;
$$;

revoke all on function public.claim_app_trial(text) from public, anon;
grant execute on function public.claim_app_trial(text) to authenticated;

notify pgrst, 'reload schema';
