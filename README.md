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

Early stage. The stack below is decided; no application code exists yet.

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
