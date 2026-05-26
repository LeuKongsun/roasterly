# Node Auth

A Node.js authentication API project using JWT.

## Current Status

Phase 1 scaffold:

- TypeScript
- Express
- environment config
- health route
- central error handling
- auth rate limiting
- safe request logging
- Vitest and Supertest
- ESLint

## Commands

```bash
npm install
npm run dev
npm test
npm run lint
npm run typecheck
npm run db:generate
npm run db:migrate
```

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

## Database

This project uses PostgreSQL through Prisma.

Set `DATABASE_URL` in `.env`, then run:

```bash
npm run db:generate
npm run db:migrate
```

For production deployment notes, see [docs/PRODUCTION.md](docs/PRODUCTION.md).
