-- Applied after explicit user approval on 2026-09-10. Restores four-digit registration/change, including admin.
-- Existing longer passwords remain valid for login until their owners change them.
-- NULL rejection, protected admin role, attempt lockout, hashing, token rotation,
-- logout revocation, profile validation and CSP remain in place.
begin;
do $patch$
declare d text;
begin
 select pg_get_functiondef('public.recare_login(text,text,text)'::regprocedure) into d;
 if position('p_pin is null' in d)=0 or position('char_length(p_pin)<12' in d)=0 then raise exception 'Unexpected login definition'; end if;
 d:=replace(d,'char_length(p_pin)<12', $$p_pin !~ '^[0-9]{4}$'$$);
 d:=replace(d,'新規登録には12文字以上のパスワードが必要です','新規登録には4桁の数字が必要です');
 d:=replace(d,'u.is_admin and u.credential_strength>=12','u.is_admin');
 execute d;
 select pg_get_functiondef('public.recare_update_account(text,uuid,text,text)'::regprocedure) into d;
 if position('(char_length(p_new_pin)<12 or octet_length(p_new_pin)>72)' in d)=0 then raise exception 'Unexpected account-update definition'; end if;
 d:=replace(d,'(char_length(p_new_pin)<12 or octet_length(p_new_pin)>72)', $$p_new_pin !~ '^[0-9]{4}$'$$);
 d:=replace(d,'新しいパスワードは12文字以上・72バイト以内で入力してください','新しいコードは4桁の数字で入力してください');
 d:=replace(d,'u.is_admin and u.credential_strength>=12','u.is_admin');
 execute d;
 select pg_get_functiondef('public.recare_admin_dashboard(text,uuid)'::regprocedure) into d;
 if position('credential_strength>=12' in d)=0 then raise exception 'Unexpected admin definition'; end if;
 d:=replace(d,' and credential_strength>=12','');
 execute d;
end $patch$;
notify pgrst, 'reload schema';
commit;
