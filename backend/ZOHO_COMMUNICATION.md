# Zoho integration and employee communication

## Existing architecture and implementation choices

The backend is NestJS 10 / TypeScript, Sequelize 6 (`sequelize-typescript`) and MySQL.
The top-level README's Prisma instructions are historical. `AppModule` disables schema
synchronization, registers global JWT, permission and throttling guards, and uses `/api`
(no `/v1`). JWT authentication reloads an active user's role permissions from the DB.
Existing privileged roles are ADMIN and DEVELOPER; migration 011 also recognizes
SUPER_ADMIN / SUPER ADMIN if present. Other roles must be explicitly granted permissions
using the existing role management API. No role-name bypass was added to the guard.

The existing `employees` table has one `name`, an optional unique email, organization,
department, designation, ACTIVE/ON_LEAVE/INACTIVE/EXITED status and soft deletion. Employee
creation remains the existing workflow. After it returns an employee ID, the administrator
can preview/assign a communication plan and explicitly start provisioning. This avoids
unrequested external account creation during ordinary employee creation/imports. The
company email is stored in `employee_communication_accounts`; the employee's existing
contact email is preserved.

There is no active scheduler, queue, Redis or worker infrastructure. The new orchestration
is request-driven, with durable MySQL step checkpoints and explicit retry endpoints.
It does not start untracked fire-and-forget promises. Start with small onboarding batches;
allow sufficient reverse-proxy request duration. A future worker can invoke the same
service with a granted service identity and should use these same locks/checkpoints.
Reads have bounded transient retries; creation requests are never blindly replayed.

Modules:

* `src/modules/zoho-auth`: data-center allowlist, OAuth state, code exchange, encrypted
  access/refresh tokens, expiry, distributed refresh locking, revocation, safe error filter.
* `src/modules/connectors`: typed provider registry, shared Zoho HTTP adapter, Mail and
  Cliq providers, connector health, lifecycle and capability discovery. Communication
  never reads tokens or constructs Zoho API requests.
* `src/modules/communication`: validated DTOs, naming/domain policy, profile/channel
  management, employee plan snapshots, provisioning, verification, retries and audit trail.

`IntegrationStore` uses the injected existing Sequelize connection and parameterized SQL.
The new tables deliberately use an explicit repository instead of duplicate employee
models or schema-sync behavior. JSON channel sets are validated against the channel
directory in services. Employee, account, plan, workflow and assignment links have SQL
foreign keys and uniqueness constraints. SQL logging is disabled for this repository;
storage errors are replaced with safe messages because database errors may echo values.
The existing AES-256-GCM `CredentialCrypto` is reused with a distinct integration key
and authenticated `zoho:access` / `zoho:refresh` contexts.

## Official sources and verified API behavior

Reviewed November 13, 2026:

* [OAuth server applications](https://www.zoho.com/developer/oauth/web-server-apps/overview.html)
* [OAuth token revocation](https://www.zoho.com/developer/oauth/revoke-oauth-token.html)
* [OAuth data centers](https://www.zoho.com/developer/oauth/multi-dc-support.html)
* [Mail API data centers](https://www.zoho.com/mail/help/api/getting-started-with-api.html)
* [Mail account creation](https://www.zoho.com/mail/help/api/post-add-user-to-org.html)
* [Mail identity lookup](https://www.zoho.com/mail/help/api/get-single-user.html)
* [Authenticated Mail accounts](https://www.zoho.com/mail/help/api/get-all-users-accounts.html)
* [Cliq v2 Users and Channels](https://www.zoho.com/cliq/help/restapi/v2/)

The adapter intentionally uses the documented v2 Cliq API requested in the brief;
Zoho also publishes v3. Mail uses `/api/organization/{zoid}/accounts`, with an independent
Mail account ID and Zoho user ID. Cliq uses `/api/v2/users/{email}` to resolve its user ID,
and `/api/v2/users` for optional invitations. Mail creation does not prove Cliq eligibility.
Cliq supports channel/team IDs during invitation, but this implementation assigns channels
separately, after resolving an active identity in the configured organization. Membership
calls use `/api/v2/channels/{channel_id}/members` and stable `user_ids`, never channel names.
Channel and membership lists follow `has_more`/`next_token` when supplied.

Scopes (no `.ALL` grants requested):

| Scope | Purpose |
| --- | --- |
| `ZohoMail.organization.accounts.READ` | Availability checks, account verification and organization access test |
| `ZohoMail.organization.accounts.CREATE` | Create a company Mail account |
| `ZohoMail.accounts.READ` | Read the connected administrator's own Mail identity for status |
| `ZohoCliq.Users.READ` | Resolve an employee's separate Cliq identity and activation status |
| `ZohoCliq.Users.CREATE` | Optional Cliq invitation / provisioning |
| `ZohoCliq.Channels.READ` | Channel directory and membership verification |
| `ZohoCliq.Channels.UPDATE` | Add or explicitly remove channel members |

`ZOHO_ADDITIONAL_SCOPES` appends future comma-separated scopes. Reconnect after adding scopes.
The status response reports required, granted and missing scopes. If an OAuth exchange
omits its scope field, the exact consent request is retained. Scope possession alone
does not prove organization privileges: connection tests and real operations enforce
remote authorization and update connector health. Organization ID is configured explicitly;
organization name is nullable because partner organization access is not requested.
Connected account email is populated by a successful Mail connection test.

## Setup and configuration

1. Use a MySQL database containing the application's existing schema and migrations.
   Back up the DB before schema changes. The runner discovers `employees.id` collation
   and requires matching `users.id` collation. Tables use InnoDB and additive DDL.
2. In the Zoho API Console for your organization's data center, create a **Server-based
   Application**. Set the homepage to the app's URL and register exactly
   `https://YOUR_API_HOST/api/integrations/zoho/auth/callback` as the authorized redirect.
   Local development permits `http://localhost:4000/api/integrations/zoho/auth/callback`.
3. Store the client ID/secret and configuration in backend environment variables or the
   deployment secret manager. The client secret must belong to the configured DC. Enable
   the corresponding DC in the console if using a client registered in another DC.
4. Generate a separate 32-byte key using the command below. Back it up securely alongside
   encrypted database backups. Do not change it without re-encrypting or reconnecting.
5. Fill `COMMUNICATION_COMPANY_DOMAINS` with your actual verified Zoho Mail domains;
   the task's sample domain is not hardcoded. Choose a naming template.
6. Run the migration and start the backend from `backend/`:

```powershell
npm ci
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run migrate:communication
npm run build
npm run start:prod
# For development instead:
npm run start:dev
```

The migration requires CREATE TABLE, REFERENCES, INDEX and DML privileges. It is
restartable but MySQL DDL is not transactionally rolled back. Do not execute its SQL
file directly: the runner replaces `${COLLATION}`. No existing employee data is changed.
The migration was supplied but has not been executed against your real database.

| Variable | Meaning |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Existing MySQL configuration; available to migration and backend |
| `JWT_SECRET`, `PORT` | Existing authentication secret and server port |
| `ZOHO_DATA_CENTER` | `in` default; `us`, `eu`, `au`, `jp`, `ca`, `sa`, `cn` also supported |
| `ZOHO_ACCOUNTS_BASE_URL` | Optional Accounts origin matching the selected DC |
| `ZOHO_API_BASE_URL` | Optional Mail origin matching the selected DC (not `zohoapis`) |
| `ZOHO_CLIQ_BASE_URL` | Optional Cliq origin matching the selected DC |
| `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET` | Server application credentials |
| `ZOHO_REDIRECT_URI` | Exact registered backend callback URL |
| `ZOHO_ORGANIZATION_ID` | Numeric Zoho Mail organization ID (`zoid`), not an internal organization UUID |
| `ZOHO_TOKEN_ENCRYPTION_KEY` | 64 hex characters from 32 random bytes |
| `ZOHO_ADDITIONAL_SCOPES` | Optional additional officially supported OAuth scopes |
| `ZOHO_CLIQ_ALLOW_CREATE` | Set `true` only when admin API invitations are approved; default false |
| `COMMUNICATION_COMPANY_DOMAINS` | Comma-separated company domains, first is default |
| `COMMUNICATION_EMAIL_PATTERN` | Default `{first}.{last}`; supports `{first}`, `{last}`, `{initial}` and literal valid local-part characters |

India origins are `https://accounts.zoho.in`, `https://mail.zoho.in`,
`https://cliq.zoho.in`. Canada uses `accounts.zohocloud.ca`, `mail.zohocloud.ca`,
`cliq.zohocloud.ca`. Other supported DCs use their documented `zoho` domain.
Remove explicit URL overrides when changing DC; arbitrary origins are rejected to prevent
credential exfiltration. Callback-supplied `accounts-server` is never used as an HTTP target.
Changing the configured organization/DC while communication mappings exist is rejected
when starting authorization. An organization migration requires explicit reconciliation.

## API contract

All paths below are relative to `/api`. Except the state-protected OAuth callback,
routes require the existing Bearer JWT. DTOs reject unknown body fields through the
global ValidationPipe. Permission metadata is enforced by the existing global RolesGuard.
IDs in paths are internal UUIDs; external Zoho IDs are stored separately.

| Method/path | Permission | Request / response |
| --- | --- | --- |
| GET `integrations/zoho/auth/url` | `integrations:manage` | `{authorizationUrl,expiresIn}`; navigate browser to URL |
| GET `integrations/zoho/auth/callback` | Single-use state and initiating admin's current grant | Zoho sends `state`, `code` or `error`; returns safe status JSON |
| GET `integrations/zoho/status` | `integrations:read` | Organization, account email, DC, token health/expiry, timestamps and scopes |
| POST `integrations/zoho/reconnect` | `integrations:manage` | New consent URL |
| POST `integrations/zoho/disconnect` | `integrations:manage` | Revoke refresh token and clear stored tokens; preserve employee records |
| POST `integrations/zoho/test-connection` | `integrations:manage` | `{items:[{provider,healthy}]}`; inspect per-provider status for errors |
| GET `connectors` | `integrations:read` | `{items:[...]}` with capabilities, health, enabled state, connection metadata |
| GET `connectors/:provider/status` | `integrations:read` | Safe connector and OAuth state |
| POST `connectors/:provider/test` | `integrations:manage` | Verified provider health or safe error |
| PATCH `connectors/:provider/toggle` | `integrations:manage` | `{enabled:boolean}`; affects subsequent requests |
| GET `communication/profiles` | `communication:read` | `{items:[...]}` |
| POST `communication/profiles` | `communication:profiles:manage` | Profile body below |
| GET `communication/profiles/:id` | `communication:read` | Profile |
| PATCH `communication/profiles/:id` | `communication:profiles:manage` | Partial profile body |
| DELETE `communication/profiles/:id` | `communication:profiles:manage` | Reject if assigned to employee plans |
| GET `communication/channels` | `communication:read` | Local channel mappings |
| POST `communication/channels/sync` | `communication:channels:manage` | Import accessible channels, mark absent mappings inactive |
| GET `communication/channels/:id` | `communication:read` | Remote channel details |
| GET `communication/channels/:id/members` | `communication:read` | `{items:[...]}` from Zoho |
| POST `communication/employees/:employeeId/preview` | `communication:read` | Assignment body below; resolves desired channels without writes |
| POST `communication/employees/:employeeId/assign-profile` | `communication:employees:manage` | Save assignment snapshot and reset channel task |
| POST `communication/employees/:employeeId/provision-email` | `communication:employees:provision` | Provision body; run through Mail verification |
| POST `communication/employees/:employeeId/provision-cliq` | `communication:employees:provision` | Provision body; run through active Cliq verification |
| POST `communication/employees/:employeeId/onboard` | `communication:employees:provision` | Provision body; run all steps |
| POST `communication/employees/:employeeId/sync-channels` | `communication:employees:manage` | Provision body; reverify channel memberships; requires Mail/Cliq tasks complete |
| POST `communication/employees/:employeeId/retry` | `communication:employees:provision` | Provision body plus optional `step`: MAIL / CLIQ / CHANNELS / ACTIVATION |
| GET `communication/employees/:employeeId/status` | `communication:read` | Account, workflow, tasks, plan and assignments |
| GET `communication/employees/:employeeId/logs` | `communication:read` | Last 200 safe audit events |
| DELETE `communication/employees/:employeeId/channels/:channelId` | `communication:employees:manage` | Explicit verified removal; first remove channel from employee's plan |
| POST `communication/employees/:employeeId/confirm-activation` | `communication:employees:manage` | `{confirmation:"Completed our approved secure activation process"}` |

Profile body (use real internal channel UUIDs returned by channel sync):

```json
{
  "name": "Backend developer",
  "code": "BACKEND_DEVELOPER",
  "description": "Approved engineering channel membership",
  "isActive": true,
  "channelIds": ["11111111-1111-4111-8111-111111111111"]
}
```

Assignment/preview body:

```json
{
  "profileId": "22222222-2222-4222-8222-222222222222",
  "addChannelIds": [],
  "removeChannelIds": []
}
```

Omit `profileId` to use only individual additions. Removal overrides win. Each assignment
is a snapshot; changing a reusable profile does not silently change employees' access.
Reassign the profile to update the snapshot. Membership synchronization adds/verifies the
desired set; it does not automatically remove other remote memberships. Explicit removal
is separately authorized. Preview describes the desired managed set, not every remote
channel an employee may have joined independently.

Provision body:

```json
{
  "idempotencyKey": "onboarding-employee-001",
  "domain": "company.example"
}
```

Optionally send an authorized `email` override and request-only `temporaryPassword`
(12–128 characters meeting your Zoho password policy). Submit secrets over HTTPS from
a secure UI/client, never via URL, shared examples, command history or debug logging.
Initial create needs the temporary password; retrying verified accounts does not.
Neither secret is stored in the workflow, idempotency request, logs or response.

State response shape (fields shown selectively):

```json
{
  "employeeId": "33333333-3333-4333-8333-333333333333",
  "account": {
    "email": "rahul.sharma@company.example",
    "mailAccountId": "123000001",
    "mailUserId": "12345",
    "cliqUserId": "12345",
    "activationStatus": "REQUIRES_MANUAL_ACTION"
  },
  "workflow": { "status": "REQUIRES_MANUAL_ACTION" },
  "tasks": [
    { "taskType": "MAIL", "status": "COMPLETED", "attemptCount": 1 },
    { "taskType": "CLIQ", "status": "COMPLETED", "attemptCount": 1 },
    { "taskType": "CHANNELS", "status": "COMPLETED", "attemptCount": 2 },
    { "taskType": "ACTIVATION", "status": "REQUIRES_MANUAL_ACTION", "lastError": "ADMIN_SECURE_ACTIVATION_REQUIRED" }
  ],
  "assignments": [],
  "plan": { "channelIds": [] }
}
```

Step failures return persisted workflow state so the frontend can show successful and
failed steps together; HTTP success does **not** mean provisioning is complete. Inspect
`workflow.status` and each task. Only all four verified/attested steps produce COMPLETED.
Input/auth errors use existing Nest HTTP exceptions; connector failures return
`{statusCode,message,retryable}` without remote response bodies. No token values are ever
returned. Integration SQL and HTTP errors never expose submitted credentials.

## Security, retry and operational limits

OAuth state is random, hashed at rest, expires after ten minutes, single use and tied
to an active administrator with a current `integrations:manage` permission. Callback
is the only public route. Expired/reused/forged states fail before code exchange. Secret
responses and the callback have `Cache-Control: no-store`; callback has no-referrer.
Configure proxy/APM access logging to redact callback query strings and provisioning
bodies. The application does not log these values itself.

Refresh and OAuth lifecycle operations serialize through a MySQL named lock held on
one dedicated transaction connection. Employee workflows have a separate lock plus
global address allocation serialization. This avoids expiring leases during a Zoho
request. Pool capacity should leave headroom for three workflow locks, one token lock
and one ordinary query; default Sequelize capacity is sufficient for one serialized
workflow but increase the pool before enabling parallel workers. MySQL named locks
require a single primary database; do not route lock statements across replica connections.

Idempotency keys identify the employee, requested email/domain, operation and optional
retry step. Reusing a key for different intent returns 409. Successful tasks are retained;
retrying a failed channel step never recreates Mail/Cliq users. Use a new key when invoking
a different endpoint or changing the desired operation. Explicit channel sync rechecks
completed memberships. Lock contention returns 409; retry with bounded backoff.

A reserved email and durable create-attempt flag are written before the external create.
If a timeout/process crash occurs, retry looks up the reserved address. If an account
is found, it verifies and resumes. If absent after a prior create attempt, the workflow
requires administrator reconciliation instead of risking a second create. Check Zoho
Admin Console, create the reserved identity there if definitively absent, then retry.
The same principle prevents repeated Cliq invitations after uncertain results.

Mail creation sets `oneTimePassword=true`. The operator must follow the organization's
approved secure activation/reset process in Zoho Admin Console. The app does not send
passwords, invent an activation link, store a recoverable initial password or claim it
can verify an employee's first-login password change through these APIs. Activation is
an explicit administrator attestation, separately audited. Until then the activation
step remains manual. Do not enter passwords or activation tokens in confirmation text.

Cliq creation can return accepted invitations or partial failures; an invitation alone
is not treated as an active user. Accept invitations in Zoho first, then retry. The
connected user must have appropriate Mail organization and Cliq admin/channel rights.
OAuth scopes do not override those rights, license limits, channel permissions, SSO or
Zoho One/Directory-managed user policies. If People integration requires additional
scopes, add only the documented scopes required by your organization. No live tenant
plan or entitlement was assumed or verified here.

GET requests retry up to twice for 429/5xx with a bounded delay. Mutation failures are
checkpointed for explicit retry. Cliq documents separate operation quotas (including
5 user-create requests/minute and 10 add-members requests/minute); large profiles can
hit limits and should resume after the quota window. Logs contain operation, actor,
employee/provider identity, status and safe error codes, never arbitrary API bodies.

Disconnect revokes the remote refresh token before erasing local tokens. If revocation
fails, credentials remain encrypted so it can be retried. An already in-flight API call
may finish; disabling a connector prevents subsequent calls. Disconnect does not delete
employees or remote accounts/channels. Protect DB backups and retain audit history under
your organization's retention policy. Periodically remove expired/used OAuth states;
do not delete active states or audit/idempotency records during running workflows.

## Automated and real-organization verification

```powershell
npm run test:communication
node --test test/*.test.cjs
```

The integration test file uses mocked Zoho HTTP and storage; ordinary tests require no
live credentials. It covers URL/state/callback, encryption, refresh concurrency, revoked
tokens, current revocation transport, connector registration, email collision handling,
Mail creation/verification, separate Cliq identities, membership deduplication,
pagination, partial failure/retry, ambiguous creation recovery, DTO validation and RBAC.
It does not replace a real MySQL migration or real-tenant acceptance test.

Local verification results: `npm run test:communication` built successfully and passed
all **25** integration tests. The complete backend suite reported **120 tests: 111 passed,
9 failed**. The failures are in unchanged `component-transfer.test.cjs` (one) and
`systems.test.cjs` (eight), involving existing asset/system mocks (including outdated
constructor arguments, missing `sequelize.transaction` and model mock methods). These
unrelated services/tests were not modified. No live database migration or Zoho API call
was executed. The full working-tree whitespace check also detects unrelated changes in
the existing root `db.sql`; those changes were left untouched.

Manual acceptance:

1. Configure a test Zoho organization, verified company domain and available licenses.
   Use a test employee and a small set of approved test channels, not production staff.
2. Apply migration 011. Verify the new permission grants with the existing roles API.
   Confirm an ordinary employee JWT receives 403 for connection and provisioning routes.
3. Request the authorization URL using an authorized administrator JWT. Open it in that
   administrator's browser, consent with the correct organization's Zoho admin account,
   and confirm the callback reports CONNECTED without token values.
4. Test both connectors. Confirm connected account email, DC and health; verify the
   organization ID and administrator identity in Zoho Console. Test scope/privilege
   failures before enabling invitations.
5. Sync the channel directory, create a profile using returned local mapping UUIDs,
   preview and assign it to the existing test employee. Confirm the chosen channels.
6. Start onboarding with a new idempotency key and a securely supplied temporary password.
   Check Mail account ID and Zoho user ID, then separately check the active Cliq identity.
   If an invitation is pending, accept it and retry with the same intended operation.
7. Verify memberships in both the API and Cliq UI. Confirm membership writes use external
   channel/user IDs and a repeated onboard request creates no extra account or membership.
8. Complete the approved secure first-login/reset process. Call confirm-activation with
   an administrator confirmation, and verify the full workflow becomes COMPLETED.
9. Simulate a channel permission failure or disable the Cliq connector after Mail
   completes. Inspect step/error/attempt records, restore access and retry. Confirm the
   Mail ID stays unchanged. Test a channel-only retry and an explicit membership sync.
10. Create another test employee with the same name. Confirm a numeric email suffix.
    Check that an outside-domain override is rejected and an occupied override conflicts.
11. In a test DB only, expire `tokenExpiresAt`, make concurrent provider requests and
    verify one refresh across application processes. Inspect only health/ciphertext,
    never decrypted token values. Revoke access in Zoho and verify reconnect behavior.
12. Remove a channel from the plan, explicitly remove membership and verify absence.
    Reconnect, test safe disconnect, and confirm encrypted tokens are cleared only
    after remote revocation. Confirm audit history and successful task checkpoints remain.

## Changed files

New: the three module directories above, migration
`migrations/011_zoho_communication.sql`, runner `scripts/migrate-communication.cjs`,
`test/communication.test.cjs` and this guide.

Modified: `src/app.module.ts` (module and safe error filter registration), `package.json`
(migration/test commands), `.env.example` (configuration). Existing employee/auth/RBAC
implementations and frontend were reused without redesign.
