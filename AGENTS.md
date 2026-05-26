# Agent Instructions

This repository is a Node.js authentication API project using JWT.

## Project Goal

Build a small, production-minded authentication service that demonstrates:

- user registration and login
- password hashing
- JWT access tokens
- refresh token rotation
- protected routes
- validation, error handling, and tests

Prefer clear, boring, maintainable code over clever abstractions.

## Expected Stack

Use these defaults unless the user asks otherwise:

- Node.js with TypeScript
- Express or Fastify
- PostgreSQL for persistent users and refresh tokens
- Prisma or Drizzle for database access
- Zod or a similar schema validator for request validation
- bcrypt or argon2 for password hashing
- Vitest or Jest with Supertest for API tests

If the repository already contains a chosen framework or library, follow the existing choice.

## Security Defaults

- Never store plain-text passwords.
- Hash passwords with a slow password hashing algorithm.
- Keep access tokens short lived.
- Store refresh tokens server-side as hashed values.
- Rotate refresh tokens on use.
- Revoke refresh tokens on logout.
- Read secrets from environment variables.
- Do not commit real secrets, private keys, database URLs, or tokens.
- Return generic login errors so user enumeration is harder.

## Coding Style

- Keep route handlers thin.
- Put business rules in services.
- Put persistence logic behind repository or database modules when useful.
- Validate request bodies before calling service logic.
- Prefer typed errors or a central error handler over scattered response logic.
- Add focused tests for auth behavior and security-sensitive edge cases.

## Before Making Changes

When asked to implement a feature:

1. Inspect existing files and package scripts first.
2. Follow the current structure if one exists.
3. Update or add tests for changed auth behavior.
4. Run the most relevant test or lint command available.

## Useful Commands

These commands may not exist yet. Once the project is scaffolded, keep this section current.

```bash
npm run dev
npm test
npm run lint
npm run typecheck
```

