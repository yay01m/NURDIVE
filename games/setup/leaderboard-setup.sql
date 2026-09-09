-- Supabase SQL Editorで一度だけ実行してください。
create or replace function public.recare_leaderboard(p_limit integer default 50)
returns table(rank bigint,username text,display_name text,xp integer,answered integer,correct integer,accuracy integer,level integer)
language sql stable security definer set search_path = '' as $$
  with scores as (
    select u.username,u.display_name,
      case when coalesce(u.profile->>'xp','') ~ '^[0-9]+$' then (u.profile->>'xp')::integer else 0 end as xp,
      case when coalesce(u.profile->>'answered','') ~ '^[0-9]+$' then (u.profile->>'answered')::integer else 0 end as answered,
      case when coalesce(u.profile->>'correct','') ~ '^[0-9]+$' then (u.profile->>'correct')::integer else 0 end as correct,
      u.updated_at from public.recare_users u
  ), ranked as (
    select dense_rank() over(order by xp desc,correct desc,updated_at asc) as rank,* from scores where answered>0 and username<>'test'
  )
  select rank,username,display_name,xp,answered,correct,
    case when answered>0 then round(correct*100.0/answered)::integer else 0 end,
    floor(xp/250.0)::integer+1
  from ranked order by rank,username limit least(greatest(coalesce(p_limit,50),1),100)
$$;
revoke execute on function public.recare_leaderboard(integer) from public;
grant execute on function public.recare_leaderboard(integer) to anon;
notify pgrst, 'reload schema';
