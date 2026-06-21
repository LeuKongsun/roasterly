# Production Notes

## Required Environment

Production requires:

```text
NODE_ENV=production
DATABASE_URL=
JWT_ACCESS_SECRET=
CLIENT_ORIGIN=
RESEND_API_KEY=
ROSTER_EMAIL_FROM="Roster API <rosters@yourdomain.com>"
```

`JWT_ACCESS_SECRET` must be at least 32 characters in production.
`ROSTER_EMAIL_FROM` must use a verified Resend sender domain.
Development can skip Resend test-mode recipient errors, but production should use a verified domain and sender address.

## Database Migrations

Use checked-in migrations for deployment:

```bash
npm run db:generate
npx prisma migrate deploy
```

`prisma migrate dev` is for local development and may require permission to create a shadow database.

## Logging

Request logging records method, path, status code, duration, and IP address.
It does not log request bodies, passwords, access tokens, or refresh tokens.

## Rate Limits

Auth mutation endpoints are rate limited:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`

Tune with:

```text
AUTH_RATE_LIMIT_WINDOW_MS=
AUTH_RATE_LIMIT_MAX=
```
