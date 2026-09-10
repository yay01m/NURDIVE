-- Run after security-hardening.sql. All test changes roll back.
begin;
do $tests$
declare r jsonb; t uuid; t2 uuid; u text:='sec_'||substr(replace(gen_random_uuid()::text,'-',''),1,12);
p jsonb:='{"xp":15,"answered":1,"correct":1,"stats":{},"bookmarks":[],"achievements":[],"dailyLastCorrect":true}'; rejected boolean:=false;
begin
 begin perform public.recare_login(u,null,null); exception when others then rejected:=true; end;
 if not rejected then raise exception 'NULL authentication accepted'; end if;
 if public.recare_valid_profile(null) or public.recare_valid_profile('{"xp":"<img>"}') or not public.recare_valid_profile(p) then raise exception 'Profile validation failed'; end if;
 r:=public.recare_login(u,'4826',u); t:=(r->>'session_token')::uuid;
 if t is null then raise exception 'Registration failed'; end if;
 if public.recare_save(u,gen_random_uuid(),p) then raise exception 'Wrong token accepted'; end if;
 if not public.recare_save(u,t,p) then raise exception 'Valid save failed'; end if;
 rejected:=false; begin perform public.recare_admin_dashboard(u,t); exception when others then rejected:=true; end;
 if not rejected then raise exception 'Nonadmin access accepted'; end if;
 r:=public.recare_update_account(u,t,u,'7329'); t2:=(r->>'session_token')::uuid;
 if t2 is null or t2=t or public.recare_save(u,t,p) then raise exception 'Credential change did not revoke token'; end if;
 perform public.recare_logout(u,t2); if public.recare_save(u,t2,p) then raise exception 'Logout did not revoke token'; end if;
end $tests$;
select 'PASS: null rejection, profile validation, registration, ownership, admin denial, token rotation, logout' as security_tests;
rollback;
