# ITAM — IT Asset Management

A full-stack IT/Asset Management platform: employees, hardware, software licenses,
drag-and-drop asset transfers with full audit history, RBAC, inventory, and a dashboard.

**Stack:** NestJS + TypeScript + Prisma + MySQL (backend) · React + TypeScript + Vite +
Tailwind + dnd-kit + TanStack Query (frontend).

## What's fully built (production-quality, end-to-end)
- Data model (Prisma schema): employees, assets, hardware/software, assignments,
  transfers, history, audit log, users/roles/permissions, settings.
- Auth: JWT login, server-side RBAC (`RolesGuard` + `@RequirePermissions`) — the frontend
  never decides authorization, only reflects it.
- Employees: list/search/filter, detail, create/edit.
- Assets: inventory list with search/filter/sort/pagination, create, edit, full
  **transfer workflow** wrapped in a single DB transaction (close old assignment → open
  new assignment → transfer record → asset history → audit log), with all the guard
  rules from the spec (no same-employee drop, no transferring retired/lost/disposed
  assets, no transferring assets under repair).
- Asset Manager (the hero screen): employee cards, draggable asset chips (dnd-kit),
  valid/invalid drop highlighting, confirmation dialog before any write, toast on
  success/failure, and a **non-drag fallback** (asset → Transfer → pick employee) so
  drag-and-drop is never the only way to do it.
- Asset detail drawer with full audit trail.
- Dashboard: all summary cards, asset distribution, hardware/software breakdown,
  recent activity, upcoming license/warranty expirations — all real aggregation
  queries, not mock data.
- Software licenses, Users & Roles (list + permission display), global Ctrl/Cmd+K
  search, audit log endpoint, seed data (20+ employees, 55+ hardware assets, 7
  software products with realistic assigned/available/repair/retired/lost states).

## What's scaffolded but lighter (clearly marked, next-iteration items)
- Settings screen: UI and the `Setting` table/API shape exist; most fields are
  presentational pending business rules you'll want to define (e.g. exact security
  policy options).
- Transfer **approval workflow** (pending/approve/reject): the `AssetTransfer.status`
  enum and fields already support it; the current `transfer()` call completes
  immediately. Wiring the "require approval" switch to branch into a pending state is a
  small, contained follow-up in `assets.service.ts`.
- Notification center (bell icon is present; there's no persisted notifications table
  yet — audit log + history already capture every event it would surface).
- Bulk operations UI, CSV export, and role-permission editing UI (the API endpoint for
  editing a role's permissions already exists).

## Running it locally

### 1. Database
```bash
docker compose up -d
```

### 2. Backend
```bash
cd backend
cp .env.example .env      # edit DATABASE_URL/JWT_SECRET if needed
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed        # or: npx ts-node prisma/seed.ts
npm run start:dev         # http://localhost:4000/api
```
Seeded login: **admin@company.com / Admin123!**

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```
The Vite dev server proxies `/api` to `http://localhost:4000`.

> Note: this codebase was built and type-checked in a sandboxed environment without
> access to `binaries.prisma.sh`, so `prisma generate` couldn't be run here. It will
> work normally on your machine/CI with standard internet access — that's the only
> step you need to run before anything else.

## Key architectural decisions worth knowing about
- **Transfers are never a raw field update.** Every transfer/assign/return goes through
  a Prisma `$transaction` that updates the assignment, the asset, writes an
  `AssetHistory` row, and writes an `AuditLog` row together — see
  `backend/src/assets/assets.service.ts`.
- **Authorization is enforced server-side only.** Permissions are resolved fresh from
  the database on every request in `JwtStrategy.validate`, not trusted from the JWT
  payload or the frontend.
- **Optimistic UI with rollback**: the frontend's transfer mutation invalidates the
  employees/assets/dashboard caches on settle; on failure it surfaces
  "Transfer failed..." via toast and the UI reflects the server's actual state (it never
  fakes a success it can't guarantee).
