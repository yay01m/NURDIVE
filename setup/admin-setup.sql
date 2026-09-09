-- Supabase SQL Editorで一度だけ実行してください。
-- 管理者は username が test で、有効なセッションを持つ本人だけです。
create or replace function public.recare_admin_dashboard(p_username text,p_session_token uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if lower(trim(p_username)) <> 'test' or not exists(
    select 1 from public.recare_users
    where username='test' and session_token=p_session_token and token_expires_at>now()
  ) then raise exception '管理者権限がありません'; end if;

  select jsonb_build_object(
    'users',coalesce((
      select jsonb_agg(jsonb_build_object(
        'username',u.username,'displayName',u.display_name,
        'xp',coalesce(u.profile->>'xp','0'),'answered',coalesce(u.profile->>'answered','0'),
        'correct',coalesce(u.profile->>'correct','0'),'updatedAt',u.updated_at
      ) order by u.updated_at desc) from public.recare_users u
    ),'[]'::jsonb),
    'answers',coalesce((
      select jsonb_agg(a.item order by a.answered_at desc) from (
        select jsonb_build_object(
          'username',u.username,'displayName',u.display_name,'at',h->>'at',
          'questionId',h->>'id','category',h->>'category','question',h->>'question',
          'selected',h->>'selected','correctAnswer',h->>'correctAnswer',
          'correct',coalesce((h->>'correct')::boolean,false)
        ) item,coalesce((h->>'at')::timestamptz,to_timestamp(0)) answered_at
        from public.recare_users u cross join lateral jsonb_array_elements(coalesce(u.profile->'history','[]'::jsonb)) h
        order by answered_at desc limit 500
      ) a
    ),'[]'::jsonb)
  ) into result;
  return result;
end $$;
revoke execute on function public.recare_admin_dashboard(text,uuid) from public;
grant execute on function public.recare_admin_dashboard(text,uuid) to anon;
notify pgrst, 'reload schema';
