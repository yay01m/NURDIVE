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
