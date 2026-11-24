# Food_Stack

A restaurant platform that replaces the paper order slip. Instead of a waiter
writing down an order and walking it to the kitchen, the waiter records the
table's items on their phone and the order shows up instantly on the cook's
screen.

## The problem

In a traditional restaurant flow, orders travel on paper:

- Waiters spend time walking between tables and the kitchen.
- Handwriting is misread and orders get lost or mixed up.
- The kitchen has no clear view of what is pending, in progress or ready.
- Closing a table's bill depends on reconciling handwritten notes.

## The solution

Food_Stack digitizes the whole order flow, from table to kitchen to bill.

1. The waiter selects a table on their phone and adds the items ordered.
2. The order is sent in real time to the kitchen screen.
3. The cook sees incoming orders, prepares them and marks them as ready.
4. The waiter is notified and delivers the order to the table.
5. The cashier closes the table's bill from the recorded orders.

## User roles

| Role | Responsibility |
| --- | --- |
| Waiter | Records table orders from a mobile device and tracks their status. |
| Cook | Views incoming orders on the kitchen screen and updates their preparation status. |
| Cashier | Reviews a table's consumed items and closes the bill. |
| Manager / Admin | Manages the menu, tables and users. |

## Order lifecycle

`Placed` → `In preparation` → `Ready` → `Delivered` → `Paid`

## Status

Early stage. Waiters, the kitchen and the control screen already talk to each
other in real time through the API (REST + Socket.IO) backed by PostgreSQL.
Access is controlled by session login with three roles (waiter, cook and
manager). Every client still operates on a single default restaurant.

### Progress

```text
Overall  [██████████████░░░░░░]  68%  (13 of 19 milestones)
```

Update the bar and the counts whenever a milestone is checked off.

**Foundation** (5/6)

- [x] Product vision documented
- [x] Tech stack decided
- [x] Project guidelines (`CLAUDE.md`)
- [x] Monorepo scaffold (pnpm workspaces + shared schemas package)
- [x] Local environment (Docker + PostgreSQL)
- [ ] CI (lint, type check, tests)

**Data and access** (3/3)

- [x] Multi-tenant Prisma schema (`restaurant_id` on every record)
- [x] Cookie-based session authentication
- [x] Role-based permissions (waiter, cook, manager; cashier arrives with billing)

**Order flow** (5/5)

- [x] Menu management
- [x] Table management
- [x] Waiter order entry
- [x] Real-time kitchen screen
- [x] "Ready" notification to the waiter

**Billing** (0/2)

- [ ] Table bill closing by the cashier
- [ ] Billing model prepared for NFC-e and Pix

**Offline and release** (0/3)

- [ ] Offline order queue and resend on reconnect
- [ ] End-to-end tests (Playwright)
- [ ] Production deploy

## Getting started

Requires Node 22+, pnpm and Docker.

```bash
pnpm install
cp .env.example .env        # never commit .env
                            # set SEED_MANAGER_EMAIL / SEED_MANAGER_PASSWORD (10+ chars)
                            # to create the first manager on the first run
pnpm db:up                  # PostgreSQL via Docker
pnpm --filter @food-stack/shared build
pnpm --filter @food-stack/api exec prisma migrate deploy
pnpm dev:api                # http://localhost:3000/api/health
pnpm dev:web                # http://localhost:5173 (proxies /api and /socket.io to the API)
```

Other commands: `pnpm test`, `pnpm typecheck`, `pnpm build`.

Layout: `apps/api` (NestJS), `apps/web` (React PWA) and `packages/shared`
(Zod schemas and derived types).

## Tech stack

A modular monolith written entirely in TypeScript, built as a PWA so it runs on
any phone or kitchen screen without an app store.

| Layer | Choice |
| --- | --- |
| Language | TypeScript |
| Monorepo | pnpm workspaces, with a shared package for schemas and types |
| Frontend | React + Vite, delivered as a PWA |
| Styling | Tailwind CSS |
| Backend | NestJS, organized in modules per domain (orders, tables, menu, billing) |
| Real time | WebSocket (Socket.IO) |
| Database | PostgreSQL + Prisma |
| Validation | Zod, with TypeScript types derived from the schemas |
| Tests | Vitest (unit and integration) + Playwright (end to end) |
| Infrastructure | Docker + managed PostgreSQL |

## Architecture notes

- **Offline tolerance:** restaurant Wi-Fi is unreliable. The PWA queues orders
  locally when the connection drops and resends them once it is back, so an
  order is never lost.
- **Multi-tenant from day one:** every record belongs to a restaurant
  (`restaurant_id`), so the platform can serve several restaurants.
- **Role-based access:** waiter, cook, cashier and manager/admin permissions,
  with cookie-based sessions (`HttpOnly`).
- **Boundary validation:** every external input (HTTP, WebSocket, environment
  variables) is validated at runtime with Zod.
- **Out of scope for the MVP:** fiscal documents (NFC-e) and Pix payments. The
  billing model is designed so they can be added later.
