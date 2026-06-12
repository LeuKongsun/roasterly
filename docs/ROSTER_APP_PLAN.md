# Roster App Plan

## Product Direction

Build a simple roster setup app for small shift-based businesses such as shops, restaurants, salons, clinics, cleaning teams, and local service businesses.

The first version should help a manager create a team, add staff, assign weekly shifts, and let staff see their own roster. It should avoid payroll, award interpretation, timesheets, HR workflows, and other heavy workforce-management features until the core roster workflow is useful.

## Positioning

The first competitor is not Deputy or Tanda. The first competitor is:

```text
spreadsheet + screenshot + group chat
```

The product should feel like the easiest next step for a business that already creates rosters manually and only needs a clearer way to publish and view shifts.

## MVP Scope

### Manager Can

- Register and log in.
- Create a business.
- View businesses they belong to.
- Add staff members to a business.
- Assign a member role: `manager` or `staff`.
- Create shifts for a selected week.
- Edit shifts.
- Delete shifts.
- View the full weekly roster for a business.

### Staff Can

- Log in.
- View businesses they belong to.
- View their assigned shifts.
- View the weekly roster for their business if allowed.

### Out Of Scope For MVP

- Payroll.
- Award calculations.
- Time clock / clock in and out.
- Leave requests.
- Shift swaps.
- Availability collection.
- SMS or email notifications.
- Spreadsheet import.
- Roster image OCR.
- Multi-location hierarchy.
- Public marketplace or job-board features.

These can be added after the basic roster workflow is stable.

## Existing Foundation

The current repository is a good base:

- Express app wiring in `src/app.ts`.
- TypeScript configuration and linting.
- Prisma/PostgreSQL data layer.
- Zod request validation.
- Central error handling.
- Auth middleware.
- JWT access tokens.
- Refresh token rotation and logout revocation.
- Vitest/Supertest tests.

Keep the existing auth module and add roster-specific modules beside it.

## Suggested Module Structure

```text
src/
  modules/
    auth/
    businesses/
      business.routes.ts
      business.schemas.ts
      business.service.ts
      business.test.ts
    members/
      member.routes.ts
      member.schemas.ts
      member.service.ts
      member.test.ts
    shifts/
      shift.routes.ts
      shift.schemas.ts
      shift.service.ts
      shift.test.ts
```

Keep route handlers thin. Put business rules in services. Use Prisma directly in services at first; add repositories only if the query logic becomes noisy or repeated.

## Data Model

### User

Already exists.

Add optional profile fields later if needed:

- `name`
- `phone`

For the first backend pass, email is enough.

### Business

Represents a workplace or team.

Fields:

- `id`
- `name`
- `createdAt`
- `updatedAt`

Relationships:

- has many `BusinessMember`
- has many `Shift`

### BusinessMember

Connects a user to a business with a role.

Fields:

- `id`
- `businessId`
- `userId`
- `role`: `manager` or `staff`
- `displayName`
- `createdAt`
- `updatedAt`

Rules:

- A user can be a member of many businesses.
- A business can have many members.
- A user should only have one membership per business.
- The user who creates a business becomes a `manager`.

### Shift

Represents one scheduled work period.

Fields:

- `id`
- `businessId`
- `memberId`
- `startsAt`
- `endsAt`
- `roleName`
- `notes`
- `createdAt`
- `updatedAt`

Rules:

- `endsAt` must be after `startsAt`.
- The assigned member must belong to the same business.
- Managers can create, edit, and delete shifts for their business.
- Staff can read their own shifts.

## First API Routes

### Businesses

```http
POST /businesses
GET /businesses
GET /businesses/:businessId
```

### Members

```http
POST /businesses/:businessId/members
GET /businesses/:businessId/members
PATCH /businesses/:businessId/members/:memberId
DELETE /businesses/:businessId/members/:memberId
```

For the first version, adding a staff member can require an existing user email. Invitations can come later.

### Shifts

```http
POST /businesses/:businessId/shifts
GET /businesses/:businessId/shifts?weekStart=2026-06-08
PATCH /businesses/:businessId/shifts/:shiftId
DELETE /businesses/:businessId/shifts/:shiftId
GET /me/shifts?from=2026-06-08&to=2026-06-15
```

## Authorization Rules

Use the existing `authenticate` middleware first, then module-level service checks.

Minimum rules:

- A request must be authenticated to access roster routes.
- A user can only access businesses where they are a member.
- Only a `manager` can add members.
- Only a `manager` can create, update, or delete shifts.
- A `staff` member can view their own shifts.
- A `staff` member can view the full roster only if we choose to allow team roster visibility in MVP.

For MVP, allow all business members to view the weekly roster. This matches how roster screenshots are usually shared with the whole team.

## Validation Rules

Use Zod schemas for:

- business name length.
- member role enum.
- member display name length.
- shift start and end date-time values.
- `weekStart`, `from`, and `to` query parameters.

Prefer ISO date-time strings in API requests:

```json
{
  "memberId": "cm...",
  "startsAt": "2026-06-15T09:00:00.000Z",
  "endsAt": "2026-06-15T17:00:00.000Z",
  "roleName": "Front counter",
  "notes": "Opening shift"
}
```

## Error Codes

Use `HttpError` with stable error codes.

Suggested new codes:

- `BUSINESS_NOT_FOUND`
- `MEMBERSHIP_REQUIRED`
- `MANAGER_ROLE_REQUIRED`
- `MEMBER_NOT_FOUND`
- `MEMBER_EMAIL_NOT_FOUND`
- `MEMBER_ALREADY_EXISTS`
- `SHIFT_NOT_FOUND`
- `INVALID_SHIFT_TIME`
- `SHIFT_MEMBER_BUSINESS_MISMATCH`

## Testing Plan

Add focused integration tests with Supertest.

### Businesses

- Authenticated user can create a business.
- Creator becomes manager.
- Unauthenticated requests are rejected.
- User can list only their businesses.

### Members

- Manager can add an existing user as staff.
- Staff cannot add another member.
- Duplicate membership is rejected.
- Non-member cannot list business members.

### Shifts

- Manager can create a shift.
- Shift end must be after start.
- Assigned member must belong to the business.
- Staff cannot create shifts.
- Business members can view weekly roster.
- Staff can view their own shifts through `/me/shifts`.
- Non-member cannot view shifts.

## Implementation Phases

### Phase 1: Rebrand And Domain Setup

- Update README and docs from generic auth boilerplate to roster app.
- Add Prisma models: `Business`, `BusinessMember`, `Shift`.
- Generate Prisma client and create migration.

### Phase 2: Business Module

- Add business schemas, service, routes, and tests.
- Register routes in `src/app.ts`.
- Ensure business creator becomes manager.

### Phase 3: Member Module

- Add member schemas, service, routes, and tests.
- Allow managers to add existing users by email.
- Enforce membership and manager permissions.

### Phase 4: Shift Module

- Add shift schemas, service, routes, and tests.
- Implement weekly roster query.
- Implement current-user shifts query.

### Phase 5: Polish

- Update API documentation.
- Add example requests.
- Review error messages and error codes.
- Run `npm run typecheck`, `npm run lint`, and `npm test`.

## Future Ideas

Only consider these after MVP:

- Staff invitations by email.
- Publish/unpublish roster.
- Roster acknowledgement.
- Availability submission.
- Shift swap requests.
- Email notifications.
- Spreadsheet import.
- CSV export.
- Mobile frontend.
- Multi-location businesses.
- Audit log for roster changes.
