# Project Brief

## Purpose

This project is a learning-friendly but realistic Node.js authentication API using JWT.
It should be simple enough to understand end to end, while still showing the habits that matter in real auth systems.

## First Version Scope

- Register a user with email and password.
- Log in with email and password.
- Issue a short-lived JWT access token.
- Issue a refresh token.
- Refresh the access token using refresh token rotation.
- Log out by revoking the active refresh token.
- Protect at least one example route.
- Include automated tests for the core flows.

## Out Of Scope For Version 1

- OAuth and social login
- Email verification
- Password reset
- Multi-factor authentication
- Admin roles and permissions
- Frontend UI

These can be added later after the core auth flow is solid.

## Suggested Architecture

```text
src/
  app.ts
  server.ts
  config/
  db/
  modules/
    auth/
      auth.routes.ts
      auth.controller.ts
      auth.service.ts
      auth.schemas.ts
      auth.test.ts
    users/
  middleware/
  errors/
```

## Key Decisions To Make Early

- Express or Fastify
- PostgreSQL ORM: Prisma or Drizzle
- Password hashing: bcrypt or argon2
- JWT signing: shared secret or asymmetric key pair
- Refresh token storage strategy

If unsure, choose the simpler option first and document why.

