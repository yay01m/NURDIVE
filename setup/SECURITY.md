# Security changes — 2026-09-10

## Applied to the production Supabase project

Project: `mjkecekrkjzfkqhbuizq`. No user profiles were deleted or rewritten.

- NULL credentials fail closed. Password comparison uses `IS DISTINCT FROM`.
- User explicitly approved four-digit PINs on 2026-09-10. Registration and changes now require exactly four digits, including administrators. Previously established longer passwords remain login-compatible; no stored credential was rewritten.
- Five unsuccessful password checks lock an account for ten minutes. The counter restarts after the lock expires. This is per-account protection, not an IP rate limiter.
- New sessions expire after seven days. Password changes rotate the session token; the logout RPC revokes it.
- Registration attempts for existing accounts no longer rotate their sessions.
- Administrator authorization uses a protected database column, not a renameable username. Existing `test` role was preserved. The user-approved four-digit policy applies to administrators too; protected role and session checks remain enforced.
- Saving requires the matching account/session and a validated profile: bounded numeric values, array/object types, history timestamps, lengths, and a 1 MiB size limit.
- The profile validator has no public API execution privilege.

The upgrade was tested in a rolled-back transaction with a generated test account: NULL rejection, legitimate registration/save, wrong-token rejection, non-admin denial, credential rotation and logout revocation. Existing profile validation returned zero incompatible records. Tests did not retain test accounts or print credentials/tokens.

`security-hardening.sql` is the canonical migration for existing installations. `supabase-schema.sql` and `admin-setup.sql` now contain the hardened definitions. `security-null-hotfix.sql` records the initial emergency patch; do not rerun it after the full migration.

## Application files

Version 78: password UI, logout RPC, explicit invalid-profile state, escaped profile values, no new cloud-password hashes in local storage, truthful admin UI, API request deadlines. Inline and third-party scripts are blocked by the HTML CSP. `_headers` adds anti-framing and other headers on hosting providers that support this format; applying those HTTP headers on any other hosting provider requires its configuration. Production web hosting was not identified or deployed during this change; local files and production Supabase are distinct.

Run `node scripts/test_cloud_sync.cjs`, `node scripts/test_cloud_sync_browser.cjs`, and `node scripts/test_security_browser.cjs`. Browser tests mock all remote RPCs and use isolated storage.

## Remaining actions / limits

- Global revocation of pre-upgrade sessions was rejected by automatic approval review because it would log out all active users. It has NOT been applied. Obtain specific user approval before running `revoke-pre-upgrade-sessions.sql`. Existing sessions retain their previous expiry until revoked or replaced by login.
- Administrator access still requires the protected database role; renaming an account never grants that role.
- Four-digit PINs are weaker than longer passwords. This usability tradeoff was explicitly accepted by the user; attempt lockout does not make PINs equivalent to strong passwords.
- Session tokens and unsynced learning records are stored in the browser. CSP reduces script injection risk; it does not protect against a compromised device or extension. A server-backed HttpOnly session design and MFA would require a larger authentication migration.
- Client-reported solo scores are not authoritative or cheat-proof. Validation prevents malformed data, not fabrication of plausible scores. Battle answer/timing checks run on the server, but the public question bank contains answers. Do not use either for prizes or high-stakes ranking without redesign.
- Signup/IP abuse controls, administrator MFA, monitoring, backup policy, and host-level response headers need deployment-level work. Supabase's “no advisor issues” is not a full application security audit.

## PIN policy confirmation

`restore-four-digit-pin.sql` was applied after explicit user approval. Tests verified four-digit registration/change/login, duplicate rejection after whitespace/case normalization, preservation of the existing session on duplicate registration, NULL rejection and no privilege escalation. Test records were rolled back to a savepoint before committing the function changes. UI files are version 79; the security browser test passed. No global session revocation was performed.
