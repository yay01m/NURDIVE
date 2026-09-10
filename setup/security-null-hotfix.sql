-- Immediate, transactional fix. Does not change any stored credential or profile.
begin;
do $patch$
declare definition text;
begin
 select pg_get_functiondef('public.recare_login(text,text,text)'::regprocedure) into definition;
 if position('if clean_name !~' in definition)=0 then raise exception 'Unexpected login definition; inspect before applying'; end if;
 definition:=replace(definition,'if clean_name !~','if clean_name is null or p_pin is null or clean_name !~');
 definition:=replace(definition,'if u.pin_hash<>extensions.crypt(p_pin,u.pin_hash) then','if u.pin_hash is distinct from extensions.crypt(p_pin,u.pin_hash) then');
 execute definition;
end $patch$;
notify pgrst, 'reload schema';
commit;
