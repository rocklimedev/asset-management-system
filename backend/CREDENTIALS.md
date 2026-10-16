# Employee credential vault

Open an employee profile to use **Encrypted credentials**. Save a login name,
system/application/address, category (suggested or custom), purpose, username,
and password. Filter by category, edit, delete, or reveal a password for 30 seconds.
Blank passwords on edit preserve the saved password. Closing the profile clears
its credential state; changing browser tabs hides revealed passwords.

## Enable on the server

1. Generate a key with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
2. Set `CREDENTIAL_ENCRYPTION_KEY` in the server environment to that 64-character
   hexadecimal key. Keep it separate from the database and out of source control.
3. From `backend`, run `node scripts/migrate-credentials.cjs "EXACT TRUSTED ROLE NAME"`.
   Replace the argument with an existing administrator role you trust with all
   employee credentials. The migration adds the table and permissions, preserving
   existing records and role permissions. Without an argument it grants no access.
4. Restart the backend. Serve the app and API through HTTPS in production.

Permissions: `credentials.read` lists metadata and usernames;
`credentials.manage` creates/edits/deletes and also requires read;
`credentials.reveal` reveals passwords and also requires read. Access spans all
employees, so assign these permissions only to trusted credential administrators.
The setup role also receives `users.manage` and `roles.manage`: existing user
administration and permission changes now enforce those checks to prevent users
from granting themselves credential access. Additional grants can use the existing
`PATCH /api/roles/:id/permissions` API with the complete desired permission ID list.

Usernames and passwords use AES-256-GCM with fresh random nonces and authenticated
record/field context. Passwords and ciphertext are omitted from list/create/edit
responses. Reveal uses a separate audited POST. Vault responses use `no-store`;
secrets are not persisted in browser storage or audit metadata. Metadata (category,
purpose, system label, login title) remains readable in the database: do not put
passwords in those fields.

Back up the key securely alongside the recovery plan, separately from database
backups. Losing or replacing it makes existing secrets unreadable. Automatic key
rotation is not implemented; decrypt/re-encrypt existing records before retiring a
key. Missing/invalid keys disable vault operations rather than storing plaintext.

Verification: `npm run build`, then `node --test test/credentials.test.cjs`.

## SQL role-permission migration

`migrations/002_credential_role_permissions.sql` registers the six currently enforced permissions and
grants every registered permission to the existing `DEVELOPER` and `ADMIN` roles
(case insensitive, ignoring surrounding spaces). Both roles must exist. Other
roles receive only additional grants explicitly selected in the editable matrix.
The supplied policy grants `assets:write` to `manager`, `site_supervisor`, and
`inventory_manager`; `designer`, `accounts`, and `employee` receive no new grants.
All eight supplied roles must exist. The six keys are the three credential keys,
`users.manage`, `roles.manage`, and `assets:write`. Vault access and account/role
administration are limited to `developer` and `admin` on a fresh database.
Rerun to grant newly registered permissions to the two privileged
roles. Missing roles
and manage/reveal grants without read access fail before permission data changes.
Run the whole file against the application database in a MySQL client supporting
`DELIMITER`. The final query shows actual grants. This migration preserves existing
grants and does not create the credential table or configure the encryption key;
the server setup above is still required.

This is a permission bootstrap, not complete application authorization:
`assets:write` currently guards CDN image upload/deletion. Most asset, employee,
report, and organisation endpoints do not yet declare required permissions, so
an empty permission list does not block access to those endpoints. Adding more
permission rows alone will not restrict routes without server-side checks.

## Frontend permissions workspace

Open **Users & Roles → Roles & Permissions**. Users with `roles.manage` can create
roles with a name, description, and initial permissions, or configure existing
roles using grouped checkboxes. New roles appear in the user role-assignment
dropdown. Assigning a role to a user requires `users.manage`.

Permission lists unwrap Sequelize role-permission associations so saved grants
are checked correctly. Selecting credential manage/reveal selects read access;
removing read clears those dependent grants. Saves replace the role's permission
set atomically with an audit record. Unknown IDs and duplicate role names return
validation errors. Admin/developer must retain all registered permissions, and
users cannot remove `roles.manage` from their own role. No schema migration is
needed for the workspace; run the permission bootstrap first if tables are empty.

The catalog lists permissions implemented by the backend; creating arbitrary
permission keys is intentionally not offered because keys alone do not enforce
access. Current access is refreshed after saves and every 30 seconds on this page;
backend permission checks resolve current grants on every request.
