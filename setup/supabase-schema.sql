create extension if not exists pgcrypto;

create table if not exists public.recare_users (
  username text primary key,
  display_name text not null,
  pin_hash text not null,
  profile jsonb not null default '{"xp":0,"answered":0,"correct":0,"stats":{},"bookmarks":[],"achievements":[]}'::jsonb,
  session_token uuid,
  token_expires_at timestamptz,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recare_users enable row level security;
revoke all on table public.recare_users from anon, authenticated;

create or replace function public.recare_login(p_username text,p_pin text,p_display_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u public.recare_users; clean_name text; new_token uuid:=gen_random_uuid(); created boolean:=false;
begin
  clean_name:=lower(trim(p_username));
  if clean_name !~ '^[[:alnum:]_\-]{2,20}$' or p_pin !~ '^[0-9]{4}$' then raise exception '入力形式が正しくありません'; end if;
  select * into u from public.recare_users where username=clean_name for update;
  if not found then
    insert into public.recare_users(username,display_name,pin_hash,session_token,token_expires_at)
    values(clean_name,left(trim(p_display_name),20),extensions.crypt(p_pin,extensions.gen_salt('bf')),new_token,now()+interval '90 days') returning * into u;
    created:=true;
  else
    if u.locked_until is not null and u.locked_until>now() then return jsonb_build_object('error','試行回数が多すぎます。10分後にお試しください'); end if;
    if u.pin_hash<>extensions.crypt(p_pin,u.pin_hash) then
      update public.recare_users set failed_attempts=failed_attempts+1,locked_until=case when failed_attempts+1>=5 then now()+interval '10 minutes' else null end where username=clean_name;
      return jsonb_build_object('error','ユーザーネームまたは4桁コードが違います');
    end if;
    update public.recare_users set session_token=new_token,token_expires_at=now()+interval '90 days',failed_attempts=0,locked_until=null,updated_at=now() where username=clean_name returning * into u;
  end if;
  return jsonb_build_object('username',u.username,'display_name',u.display_name,'session_token',new_token,'profile',u.profile,'is_new',created);
end $$;

create or replace function public.recare_save(p_username text,p_session_token uuid,p_profile jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.recare_users set profile=p_profile,updated_at=now()
  where username=lower(trim(p_username)) and session_token=p_session_token and token_expires_at>now();
  return found;
end $$;

revoke execute on function public.recare_login(text,text,text) from public;
revoke execute on function public.recare_save(text,uuid,jsonb) from public;
grant execute on function public.recare_login(text,text,text) to anon;
grant execute on function public.recare_save(text,uuid,jsonb) to anon;

create or replace function public.recare_update_account(p_username text,p_session_token uuid,p_new_username text,p_new_pin text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare clean_old text:=lower(trim(p_username)); clean_new text:=lower(trim(p_new_username)); u public.recare_users;
begin
  if char_length(clean_new)<2 or char_length(clean_new)>20 or clean_new !~ '^[[:alnum:]_\-]+$' then return jsonb_build_object('error','ユーザーネームの形式が正しくありません'); end if;
  if p_new_pin is not null and p_new_pin !~ '^[0-9]{4}$' then return jsonb_build_object('error','新しいコードは4桁の数字で入力してください'); end if;
  select * into u from public.recare_users where username=clean_old and session_token=p_session_token and token_expires_at>now() for update;
  if not found then return jsonb_build_object('error','セッションの有効期限が切れています'); end if;
  if clean_new<>clean_old and exists(select 1 from public.recare_users where username=clean_new) then return jsonb_build_object('error','そのユーザーネームは使用されています'); end if;
  update public.recare_users set username=clean_new,display_name=trim(p_new_username),pin_hash=case when p_new_pin is null then pin_hash else extensions.crypt(p_new_pin,extensions.gen_salt('bf')) end,updated_at=now() where username=clean_old returning * into u;
  return jsonb_build_object('username',u.username,'display_name',u.display_name);
end $$;

create or replace function public.recare_delete_account(p_username text,p_session_token uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  delete from public.recare_users where username=lower(trim(p_username)) and session_token=p_session_token and token_expires_at>now();
  return found;
end $$;

revoke execute on function public.recare_update_account(text,uuid,text,text) from public;
revoke execute on function public.recare_delete_account(text,uuid) from public;
grant execute on function public.recare_update_account(text,uuid,text,text) to anon;
grant execute on function public.recare_delete_account(text,uuid) to anon;

-- ランキングには公開してよい成績だけを返し、PIN・トークン・回答履歴は返さない。
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

create or replace function public.recare_admin_dashboard(p_username text,p_session_token uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if lower(trim(p_username)) <> 'test' or not exists(select 1 from public.recare_users where username='test' and session_token=p_session_token and token_expires_at>now()) then raise exception '管理者権限がありません'; end if;
  select jsonb_build_object(
    'users',coalesce((select jsonb_agg(jsonb_build_object('username',u.username,'displayName',u.display_name,'xp',coalesce(u.profile->>'xp','0'),'answered',coalesce(u.profile->>'answered','0'),'correct',coalesce(u.profile->>'correct','0'),'updatedAt',u.updated_at) order by u.updated_at desc) from public.recare_users u),'[]'::jsonb),
    'answers',coalesce((select jsonb_agg(a.item order by a.answered_at desc) from (select jsonb_build_object('username',u.username,'displayName',u.display_name,'at',h->>'at','questionId',h->>'id','category',h->>'category','question',h->>'question','selected',h->>'selected','correctAnswer',h->>'correctAnswer','correct',coalesce((h->>'correct')::boolean,false)) item,coalesce((h->>'at')::timestamptz,to_timestamp(0)) answered_at from public.recare_users u cross join lateral jsonb_array_elements(coalesce(u.profile->'history','[]'::jsonb)) h order by answered_at desc limit 500) a),'[]'::jsonb)
  ) into result; return result;
end $$;
revoke execute on function public.recare_admin_dashboard(text,uuid) from public;
grant execute on function public.recare_admin_dashboard(text,uuid) to anon;
notify pgrst, 'reload schema';
