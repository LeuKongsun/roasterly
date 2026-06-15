# Roster API

A Node.js and TypeScript API for a simple roster setup app for small shift-based businesses.

The project started as a JWT auth boilerplate. It is now being extended into a roster backend where managers can create a business, add staff, assign weekly shifts, and staff can view their roster.

## Current Status

Auth foundation:

- TypeScript
- Express
- environment config
- health route
- central error handling
- auth rate limiting
- safe request logging
- JWT access tokens
- refresh token rotation
- protected routes
- Vitest and Supertest
- ESLint

Roster planning is documented in [docs/ROSTER_APP_PLAN.md](docs/ROSTER_APP_PLAN.md).
API examples are documented in [docs/API.md](docs/API.md).
Frontend notes are documented in [docs/FRONTEND.md](docs/FRONTEND.md).

## Commands

```bash
npm install
npm run dev
npm run dev:api
npm run dev:web
npm test
npm run lint
npm run typecheck
npm run build:web
npm run db:generate
npm run db:migrate
```

Run the API and frontend together during local development:

```bash
npm run dev
```

Use `npm run dev:api` or `npm run dev:web` when you only want one side.

## First Endpoint

```http
GET /health
```

Returns basic service status.

## Auth Endpoints

```http
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET /auth/me
```

`/auth/me` expects an access token in the `Authorization: Bearer <token>` header.
`/auth/refresh` and `/auth/logout` expect a JSON body with `refreshToken`.

## Planned Roster Endpoints

```http
POST /businesses
GET /businesses
GET /businesses/:businessId

POST /businesses/:businessId/members
GET /businesses/:businessId/members
PATCH /businesses/:businessId/members/:memberId
DELETE /businesses/:businessId/members/:memberId

POST /businesses/:businessId/invitations
GET /businesses/:businessId/invitations
POST /invitations/accept

POST /businesses/:businessId/rosters/publish
GET /businesses/:businessId/rosters/publication?weekStart=2026-06-08
POST /businesses/:businessId/rosters/:publicationId/acknowledge

POST /businesses/:businessId/shifts
GET /businesses/:businessId/shifts?weekStart=2026-06-08
PATCH /businesses/:businessId/shifts/:shiftId
DELETE /businesses/:businessId/shifts/:shiftId
GET /me/shifts?from=2026-06-08&to=2026-06-15
```

## Database

This project uses PostgreSQL through Prisma.

Set `DATABASE_URL` in `.env`, then run:

```bash
npm run db:generate
npm run db:migrate
```

For production deployment notes, see [docs/PRODUCTION.md](docs/PRODUCTION.md).
