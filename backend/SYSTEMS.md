# Systems and asset custody

A System is a PC/workstation record with a unique system tag, name, notes, an
optional employee, and a set of component assets. An asset has one active target:
either an employee directly or a System. Components do not get duplicate employee
assignments; their effective employee is the System's employee.

## Enable on an existing installation

The backend uses Sequelize with automatic schema synchronization disabled. Apply
the additive migration before starting the updated backend:

```sh
cd backend
npm run migrate:systems
npm run build
npm run start:prod
```

The migration reads `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME`
from the environment (or `backend/.env`). It creates `systems`, adds the nullable
`asset_assignments.system_id` foreign key, makes `employee_id` nullable, and
reconciles assignment counters. Existing employee assignments and history remain
intact. It can be rerun after interruption. Run with application writes stopped;
MySQL DDL is not transactionally rolled back. Take your normal database backup
before schema changes. The Docker image includes the migration script; run
`npm run migrate:systems` inside the updated image with the same DB environment.

This migration extends an existing database; it is not an initial schema setup.
Do not roll back to the old application while System assignments exist, because
the old code assumes every assignment has an employee.

## Use

1. Open **Systems**, create a PC, and give it a unique tag such as `PC-001`.
2. Select **Add asset** to choose available assets. Existing employee-owned assets
   must be returned before adding them to a System.
3. Select **Assign system** to assign the PC and its components to an employee.
4. **Transfer system** changes its employee while retaining all its components.
5. **Return** clears the System's employee and keeps the PC assembled.
6. **Remove** returns an individual component to the available pool. Damaged,
   lost, retired, or repair statuses are preserved instead of becoming available.
7. Continue using Asset Manager for direct employee assignments.

Employee cards/details show assigned Systems and their components. Inventory,
asset details, global search, and assigned-inventory reports identify System
ownership. Employee exit releases direct assets and unassigns whole Systems.
Asset history records component membership and System custody changes; audit logs
also record System creation, edits, assignment, and return.

The existing one-active-assignment-per-asset-record behavior is retained. This
feature does not introduce splitting pooled stock between multiple owners.

## API

| Method | Endpoint | Body / purpose |
| --- | --- | --- |
| GET | `/systems` | Optional `search` and `employeeId` filters |
| GET | `/systems/:id` | System, employee, and active components |
| POST | `/systems` | `{ "systemTag": "PC-001", "name": "Design PC", "notes": "..." }` |
| PATCH | `/systems/:id` | Name, tag, or notes |
| POST | `/systems/:id/assign` | `{ "employeeId": "uuid" }`; also transfers an assigned System |
| POST | `/systems/:id/return` | Clear employee; retain components |
| POST | `/assets/:id/assign` | Exactly one of `employeeId` or `systemId`, plus optional notes |
| POST | `/assets/:id/return` | Close the current employee or System assignment |

Endpoints use the application's existing authentication guards and API prefix.
Assignment/return operations lock asset rows and commit history/audit changes in
the same transaction. Systems can be assigned to active employees or employees
on leave. Component transfer to a direct employee requires returning it first.

## Verify

```sh
cd backend
npm run test:systems
cd ../frontend
npm run build
```

The regression suite checks model associations, target exclusivity, direct
assignment compatibility, unavailable assets, returns, System transfers, and
employee release. It uses service doubles and does not require or mutate a live
database. Validate the migration on a copy of your MySQL database before rollout.
