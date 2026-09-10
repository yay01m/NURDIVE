-- NOT EXECUTED. Requires explicit approval: logs out all currently active accounts.
-- Profiles and passwords are unchanged; users must sign in again.
begin;
update public.recare_users set token_expires_at=now() where token_expires_at>now();
commit;
