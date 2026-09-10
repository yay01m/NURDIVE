-- Apply after supabase-schema.sql and any optional feature setup scripts.
-- Transactional security upgrade; never changes users' passwords or deletes profiles.
begin;
alter table public.recare_users add column if not exists is_admin boolean not null default false;
alter table public.recare_users add column if not exists credential_strength integer not null default 0;
-- Preserve only the pre-existing administrator's role; reserve the name in registration/rename.
update public.recare_users set is_admin=true where username='test';
create or replace function public.recare_login(p_username text,p_pin text,p_display_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u public.recare_users; clean_name text; new_token uuid:=gen_random_uuid(); created boolean:=false; attempts integer;
begin
  clean_name:=lower(trim(p_username));
  if clean_name is null or p_pin is null or clean_name !~ '^[[:alnum:]_\-]{2,20}$' or octet_length(p_pin)>72 or not (p_pin ~ '^[0-9]{4}$' or char_length(p_pin)>=12) then raise exception '入力形式が正しくありません'; end if;
  select * into u from public.recare_users where username=clean_name for update;
  if not found then
    if p_display_name is null then return jsonb_build_object('error','ユーザーネームまたはパスワードが違います'); end if;
    if clean_name='test' or p_pin !~ '^[0-9]{4}$' then return jsonb_build_object('error','新規登録には4桁の数字が必要です'); end if;
    insert into public.recare_users(username,display_name,pin_hash,session_token,token_expires_at,credential_strength)
    values(clean_name,left(trim(p_display_name),20),extensions.crypt(p_pin,extensions.gen_salt('bf',10)),new_token,now()+interval '7 days',char_length(p_pin)) returning * into u;
    created:=true;
  else
    if p_display_name is not null then return jsonb_build_object('error','この名前は登録済みです'); end if;
    if u.locked_until is not null and u.locked_until>now() then return jsonb_build_object('error','試行回数が多すぎます。10分後にお試しください'); end if;
    if u.pin_hash is distinct from extensions.crypt(p_pin,u.pin_hash) then
      attempts:=case when u.locked_until<=now() then 1 else u.failed_attempts+1 end;
      update public.recare_users set failed_attempts=attempts,locked_until=case when attempts>=5 then now()+interval '10 minutes' else null end where username=clean_name;
      return jsonb_build_object('error','ユーザーネームまたは4桁コードが違います');
    end if;
    update public.recare_users set credential_strength=char_length(p_pin),session_token=new_token,token_expires_at=now()+interval '7 days',failed_attempts=0,locked_until=null,updated_at=now() where username=clean_name returning * into u;
  end if;
  return jsonb_build_object('username',u.username,'display_name',u.display_name,'session_token',new_token,'profile',u.profile,'is_new',created,'is_admin',u.is_admin);
end $$;
create or replace function public.recare_update_account(p_username text,p_session_token uuid,p_new_username text,p_new_pin text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare clean_old text:=lower(trim(p_username)); clean_new text:=lower(trim(p_new_username)); u public.recare_users;
begin
  if clean_new is null or char_length(clean_new)<2 or char_length(clean_new)>20 or clean_new !~ '^[[:alnum:]_\-]+$' then return jsonb_build_object('error','ユーザーネームの形式が正しくありません'); end if;
  if p_new_pin is not null and p_new_pin !~ '^[0-9]{4}$' then return jsonb_build_object('error','新しいコードは4桁の数字で入力してください'); end if;
  select * into u from public.recare_users where username=clean_old and session_token=p_session_token and token_expires_at>now() for update;
  if not found then return jsonb_build_object('error','セッションの有効期限が切れています'); end if;
  if clean_new='test' and clean_old<>'test' then return jsonb_build_object('error','この名前は使用できません'); end if;
  if clean_new<>clean_old and exists(select 1 from public.recare_users where username=clean_new) then return jsonb_build_object('error','そのユーザーネームは使用されています'); end if;
  update public.recare_users set username=clean_new,display_name=trim(p_new_username),pin_hash=case when p_new_pin is null then pin_hash else extensions.crypt(p_new_pin,extensions.gen_salt('bf',10)) end,credential_strength=case when p_new_pin is null then credential_strength else char_length(p_new_pin) end,session_token=case when p_new_pin is null then session_token else gen_random_uuid() end,updated_at=now() where username=clean_old returning * into u;
  return jsonb_build_object('username',u.username,'display_name',u.display_name,'session_token',u.session_token,'is_admin',u.is_admin);
end $$;
create or replace function public.recare_admin_dashboard(p_username text,p_session_token uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not exists(select 1 from public.recare_users where username=lower(trim(p_username)) and is_admin and session_token=p_session_token and token_expires_at>now()) then raise exception '管理者権限がありません'; end if;
  select jsonb_build_object(
    'users',coalesce((select jsonb_agg(jsonb_build_object('username',u.username,'displayName',u.display_name,'xp',coalesce(u.profile->>'xp','0'),'answered',coalesce(u.profile->>'answered','0'),'correct',coalesce(u.profile->>'correct','0'),'updatedAt',u.updated_at) order by u.updated_at desc) from public.recare_users u),'[]'::jsonb),
    'answers',coalesce((select jsonb_agg(a.item order by a.answered_at desc) from (select jsonb_build_object('username',u.username,'displayName',u.display_name,'at',h->>'at','questionId',h->>'id','category',h->>'category','question',h->>'question','selected',h->>'selected','correctAnswer',h->>'correctAnswer','correct',coalesce((h->>'correct')::boolean,false)) item,coalesce((h->>'at')::timestamptz,to_timestamp(0)) answered_at from public.recare_users u cross join lateral jsonb_array_elements(coalesce(u.profile->'history','[]'::jsonb)) h order by answered_at desc limit 500) a),'[]'::jsonb)
  ) into result; return result;
end $$;
-- Included by build_security_migration.cjs. Internal validator, not a public RPC.
create or replace function public.recare_valid_profile(p jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare k text; item jsonb; n numeric;
begin
 if p is null or jsonb_typeof(p)<>'object' or octet_length(p::text)>1048576 then return false; end if;
 foreach k in array array['xp','answered','correct','hardStreak','bestHardStreak','dailyStreak','requiredAnswered','requiredCorrect'] loop
  if p ? k then
   if jsonb_typeof(p->k)<>'number' or (p->>k) !~ '^[0-9]{1,9}$' then return false; end if;
  end if;
 end loop;
 if p ? 'dailyLastCorrect' and jsonb_typeof(p->'dailyLastCorrect')<>'boolean' then return false; end if;
 if not(p ?& array['xp','answered','correct','stats','bookmarks','achievements']) then return false; end if;
 if (p->>'correct')::numeric>(p->>'answered')::numeric then return false; end if;
 if jsonb_typeof(p->'stats')<>'object' then return false; end if;
 if (select count(*) from jsonb_object_keys(p->'stats'))>10000 then return false; end if;
 for k,item in select * from jsonb_each(p->'stats') loop
  if char_length(k)>100 or jsonb_typeof(item)<>'object' or not(item ?& array['seen','correct']) then return false; end if;
  if coalesce(item->>'seen','') !~ '^[0-9]{1,9}$' or coalesce(item->>'correct','') !~ '^[0-9]{1,9}$' then return false; end if;
  if (item->>'correct')::numeric>(item->>'seen')::numeric then return false; end if;
 end loop;
 foreach k in array array['bookmarks','achievements','history'] loop
  if p ? k then
   if jsonb_typeof(p->k)<>'array' then return false; end if;
   if jsonb_array_length(p->k)>(case when k='history' then 200 else 10000 end) then return false; end if;
   for item in select value from jsonb_array_elements(p->k) loop
    if k<>'history' and (jsonb_typeof(item)<>'string' or char_length(item#>>'{}')>100) then return false; end if;
    if k='history' then
     if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'correct') is distinct from 'boolean' or char_length(item->>'id')>100 then return false; end if;
     if coalesce(item->>'at','') !~ '^\d{4}-\d{2}-\d{2}T' then return false; end if;
     perform (item->>'at')::timestamptz;
    end if;
   end loop;
  end if;
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function public.recare_valid_profile(jsonb) from public,anon,authenticated;

create or replace function public.recare_save(p_username text,p_session_token uuid,p_profile jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.recare_users where username=lower(trim(p_username)) and session_token=p_session_token and token_expires_at>now()) then return false; end if;
 if not public.recare_valid_profile(p_profile) then raise exception using errcode='22023',message='学習記録の形式またはサイズを確認してください'; end if;
 update public.recare_users set profile=p_profile,updated_at=now()
 where username=lower(trim(p_username)) and session_token=p_session_token and token_expires_at>now();
 return found;
end $$;
revoke all on function public.recare_save(text,uuid,jsonb) from public,authenticated;
grant execute on function public.recare_save(text,uuid,jsonb) to anon;

create or replace function public.recare_logout(p_username text,p_session_token uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.recare_users set token_expires_at=now()
 where username=lower(trim(p_username)) and session_token=p_session_token;
 return true;
end $$;
revoke all on function public.recare_logout(text,uuid) from public,authenticated;
grant execute on function public.recare_logout(text,uuid) to anon;

notify pgrst, 'reload schema';
commit;
