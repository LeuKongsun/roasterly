# Project Brief

## Purpose

This project is a learning-friendly but realistic Node.js backend for a simple roster setup app.

It should help small shift-based businesses move from spreadsheet screenshots and group-chat messages to a clean roster workflow. The backend should stay simple enough to understand end to end, while still showing production-minded habits around auth, validation, permissions, error handling, and tests.

## First Version Scope

- Register and log in with email and password.
- Issue short-lived JWT access tokens.
- Issue and rotate refresh tokens.
- Create a business.
- Add existing users as business members.
- Support `manager` and `staff` roles.
- Let managers create, edit, and delete shifts.
- Let business members view the weekly roster.
- Let staff view their own shifts.
- Include automated tests for auth, membership, permission, and roster flows.

## Out Of Scope For Version 1

- OAuth and social login
- Email verification
- Password reset
- Multi-factor authentication
- Payroll
- Award calculations
- Time clock / clock in and out
- Leave requests
- Shift swaps
- Availability collection
- Staff invitations by email
- Spreadsheet import
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
      auth.service.ts
      auth.schemas.ts
      auth.test.ts
    businesses/
    members/
    shifts/
  middleware/
  errors/
```

## Key Decisions To Make Early

- Whether staff can view the full team roster in MVP.
- Whether members are added by existing user email first, with invitations later.
- Whether roster dates are stored and queried in UTC only.
- Whether to keep business/member/shift persistence directly in services first or introduce repositories immediately.

If unsure, choose the simpler option first and document why.

See [ROSTER_APP_PLAN.md](ROSTER_APP_PLAN.md) for the full implementation plan.
