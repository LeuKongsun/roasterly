# Node Auth

A Node.js authentication API project using JWT.

## Current Status

Phase 1 scaffold:

- TypeScript
- Express
- environment config
- health route
- central error handling
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

## Database

This project uses PostgreSQL through Prisma.

Set `DATABASE_URL` in `.env`, then run:

```bash
npm run db:generate
npm run db:migrate
```
