-- Supabase SQL Editorで一度だけ実行してください。
create or replace function public.recare_challenge_leaderboard(p_kind text,p_limit integer default 50)
returns table(rank bigint,username text,display_name text,score integer,detail integer)
language sql stable security definer set search_path = '' as $$
  with scores as (
    select u.username,u.display_name,
      case p_kind
        when 'hard' then case when coalesce(u.profile->>'bestHardStreak','')~'^[0-9]+$' then (u.profile->>'bestHardStreak')::integer else 0 end
        when 'daily' then case when coalesce(u.profile->>'dailyStreak','')~'^[0-9]+$' then (u.profile->>'dailyStreak')::integer else 0 end
        when 'required' then case when coalesce(u.profile->>'requiredAnswered','')~'^[0-9]+$' and (u.profile->>'requiredAnswered')::integer>0 then round((u.profile->>'requiredCorrect')::integer*100.0/(u.profile->>'requiredAnswered')::integer)::integer else 0 end
        else 0 end score,
      case when p_kind='required' and coalesce(u.profile->>'requiredAnswered','')~'^[0-9]+$' then (u.profile->>'requiredAnswered')::integer else 0 end detail,
      u.updated_at
    from public.recare_users u where u.username<>'test'
  ), ranked as (
    select dense_rank() over(order by score desc,detail desc,updated_at asc) rank,* from scores where score>0
  )
  select rank,username,display_name,score,detail from ranked order by rank,username limit least(greatest(coalesce(p_limit,50),1),100)
$$;
revoke execute on function public.recare_challenge_leaderboard(text,integer) from public;
grant execute on function public.recare_challenge_leaderboard(text,integer) to anon;
notify pgrst, 'reload schema';
