-- Admin Analytics SQL Functions
-- Run this in Supabase SQL Editor to enable comprehensive admin analytics

-- Get system-wide transaction totals (all users)
create or replace function public.admin_get_system_totals()
returns table (
  total_income numeric,
  total_expense numeric,
  total_profit numeric,
  total_transactions bigint,
  total_users bigint,
  active_users_30d bigint,
  new_users_30d bigint
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_email text;
begin
  select u.email::text into caller_email
  from auth.users u
  where u.id = auth.uid();

  if caller_email <> 'retey.ay@hotmail.com' then
    raise exception 'not authorized';
  end if;

  return query
  select
    coalesce(sum(case when t.type = 'income' then t.amount else 0 end), 0) as total_income,
    coalesce(sum(case when t.type = 'expense' then t.amount else 0 end), 0) as total_expense,
    coalesce(sum(case when t.type = 'income' then t.amount else -t.amount end), 0) as total_profit,
    count(t.id) as total_transactions,
    (select count(*) from auth.users) as total_users,
    (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days') as active_users_30d,
    (select count(*) from auth.users where created_at > now() - interval '30 days') as new_users_30d
  from transactions t;
end;
$$;

revoke all on function public.admin_get_system_totals() from public;
grant execute on function public.admin_get_system_totals() to authenticated;


-- Get top users by activity (transactions count and volume)
create or replace function public.admin_get_top_users(p_limit int default 10)
returns table (
  user_id uuid,
  email text,
  profile_name text,
  transaction_count bigint,
  total_income numeric,
  total_expense numeric,
  net_balance numeric,
  last_active timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_email text;
begin
  select u.email::text into caller_email
  from auth.users u
  where u.id = auth.uid();

  if caller_email <> 'retey.ay@hotmail.com' then
    raise exception 'not authorized';
  end if;

  return query
  select
    au.id as user_id,
    au.email::text,
    coalesce(p.name, 'No Profile')::text as profile_name,
    count(t.id) as transaction_count,
    coalesce(sum(case when t.type = 'income' then t.amount else 0 end), 0) as total_income,
    coalesce(sum(case when t.type = 'expense' then t.amount else 0 end), 0) as total_expense,
    coalesce(sum(case when t.type = 'income' then t.amount else -t.amount end), 0) as net_balance,
    max(t.transaction_date) as last_active
  from auth.users au
  left join profiles p on p.id = au.id
  left join transactions t on t.profile_id = au.id
  group by au.id, au.email, p.name
  order by count(t.id) desc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
end;
$$;

revoke all on function public.admin_get_top_users(int) from public;
grant execute on function public.admin_get_top_users(int) to authenticated;


-- Get daily signup and activity stats
create or replace function public.admin_get_daily_stats(p_days int default 30)
returns table (
  date date,
  new_users bigint,
  active_users bigint,
  transactions_count bigint,
  total_income numeric,
  total_expense numeric
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_email text;
begin
  select u.email::text into caller_email
  from auth.users u
  where u.id = auth.uid();

  if caller_email <> 'retey.ay@hotmail.com' then
    raise exception 'not authorized';
  end if;

  return query
  with date_range as (
    select generate_series(
      current_date - (greatest(1, least(coalesce(p_days, 30), 90)) || ' days')::interval,
      current_date,
      '1 day'::interval
    )::date as dt
  )
  select
    dr.dt as date,
    count(distinct u.id) filter (where u.created_at::date = dr.dt) as new_users,
    count(distinct u.id) filter (where u.last_sign_in_at::date = dr.dt) as active_users,
    count(t.id) as transactions_count,
    coalesce(sum(t.amount) filter (where t.type = 'income'), 0) as total_income,
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as total_expense
  from date_range dr
  left join auth.users u on u.created_at::date = dr.dt or u.last_sign_in_at::date = dr.dt
  left join transactions t on t.transaction_date = dr.dt
  group by dr.dt
  order by dr.dt desc;
end;
$$;

revoke all on function public.admin_get_daily_stats(int) from public;
grant execute on function public.admin_get_daily_stats(int) to authenticated;


-- Get profile statistics breakdown
create or replace function public.admin_get_profile_stats()
returns table (
  total_profiles bigint,
  profiles_with_transactions bigint,
  avg_transactions_per_profile numeric,
  top_profile_type text,
  top_profile_count bigint
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_email text;
begin
  select u.email::text into caller_email
  from auth.users u
  where u.id = auth.uid();

  if caller_email <> 'retey.ay@hotmail.com' then
    raise exception 'not authorized';
  end if;

  return query
  with profile_tx as (
    select
      p.id,
      p.name,
      count(t.id) as tx_count
    from profiles p
    left join transactions t on t.profile_id = p.id
    group by p.id, p.name
  )
  select
    (select count(*) from profiles) as total_profiles,
    count(*) filter (where pt.tx_count > 0) as profiles_with_transactions,
    round(avg(pt.tx_count), 2) as avg_transactions_per_profile,
    (select p.name from profile_tx p order by p.tx_count desc limit 1)::text as top_profile_type,
    (select count(*) from profile_tx where tx_count > 0) as top_profile_count
  from profile_tx pt;
end;
$$;

revoke all on function public.admin_get_profile_stats() from public;
grant execute on function public.admin_get_profile_stats() to authenticated;


-- Get user transaction details for a specific user
create or replace function public.admin_get_user_transactions(p_user_id uuid, p_limit int default 50)
returns table (
  id uuid,
  transaction_date date,
  description text,
  amount numeric,
  type text,
  category_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_email text;
begin
  select u.email::text into caller_email
  from auth.users u
  where u.id = auth.uid();

  if caller_email <> 'retey.ay@hotmail.com' then
    raise exception 'not authorized';
  end if;

  return query
  select
    t.id,
    t.transaction_date,
    t.description::text,
    t.amount,
    t.type::text,
    c.name::text as category_name,
    t.created_at
  from transactions t
  left join categories c on c.id = t.category_id
  where t.profile_id = p_user_id
  order by t.transaction_date desc, t.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;

revoke all on function public.admin_get_user_transactions(uuid, int) from public;
grant execute on function public.admin_get_user_transactions(uuid, int) to authenticated;
