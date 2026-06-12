# API Guide

This guide shows the first roster workflow: register, create a business, add staff, create a shift, and view roster data.

Set a token variable after registering or logging in:

```bash
export ACCESS_TOKEN="paste-access-token-here"
```

## Auth

### Register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "content-type: application/json" \
  -d '{
    "email": "manager@example.com",
    "password": "correct-password"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "content-type: application/json" \
  -d '{
    "email": "manager@example.com",
    "password": "correct-password"
  }'
```

### Current User

```bash
curl http://localhost:3000/auth/me \
  -H "authorization: Bearer $ACCESS_TOKEN"
```

## Businesses

### Create A Business

The creator automatically becomes a `manager`.

```bash
curl -X POST http://localhost:3000/businesses \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "name": "Smith Street Store"
  }'
```

### List My Businesses

```bash
curl http://localhost:3000/businesses \
  -H "authorization: Bearer $ACCESS_TOKEN"
```

## Members

For MVP, a staff user must already have an account before a manager can add them by email.

### Add Staff

```bash
curl -X POST http://localhost:3000/businesses/{businessId}/members \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "email": "staff@example.com",
    "role": "staff",
    "displayName": "Alex"
  }'
```

### List Members

```bash
curl http://localhost:3000/businesses/{businessId}/members \
  -H "authorization: Bearer $ACCESS_TOKEN"
```

## Invitations

Invitations are token-based for now. Email delivery can be added later.

### Create An Invitation

Only managers can create invitations. The raw `inviteToken` is only returned in this response; the database stores a hash.

```bash
curl -X POST http://localhost:3000/businesses/{businessId}/invitations \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "email": "staff@example.com",
    "role": "staff",
    "displayName": "Alex"
  }'
```

### List Invitations

```bash
curl http://localhost:3000/businesses/{businessId}/invitations \
  -H "authorization: Bearer $ACCESS_TOKEN"
```

### Accept An Invitation

The logged-in user's email must match the invitation email.

```bash
curl -X POST http://localhost:3000/invitations/accept \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "token": "paste-invite-token-here"
  }'
```

## Shifts

Use ISO date-time strings. The API stores dates as UTC.

### Create A Shift

Only managers can create shifts.

```bash
curl -X POST http://localhost:3000/businesses/{businessId}/shifts \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "memberId": "{memberId}",
    "startsAt": "2026-06-15T09:00:00.000Z",
    "endsAt": "2026-06-15T17:00:00.000Z",
    "roleName": "Front counter",
    "notes": "Opening shift"
  }'
```

### View Weekly Roster

All business members can view the weekly roster.

```bash
curl "http://localhost:3000/businesses/{businessId}/shifts?weekStart=2026-06-15" \
  -H "authorization: Bearer $ACCESS_TOKEN"
```

### View My Shifts

```bash
curl "http://localhost:3000/me/shifts?from=2026-06-15&to=2026-06-22" \
  -H "authorization: Bearer $ACCESS_TOKEN"
```

### Update A Shift

Only managers can update shifts.

```bash
curl -X PATCH http://localhost:3000/businesses/{businessId}/shifts/{shiftId} \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "startsAt": "2026-06-15T10:00:00.000Z",
    "endsAt": "2026-06-15T18:00:00.000Z",
    "roleName": "Close"
  }'
```

### Delete A Shift

```bash
curl -X DELETE http://localhost:3000/businesses/{businessId}/shifts/{shiftId} \
  -H "authorization: Bearer $ACCESS_TOKEN"
```

## Roster Publishing

Managers can publish a weekly roster. Republishing the same week resets acknowledgements.

### Publish A Roster Week

```bash
curl -X POST http://localhost:3000/businesses/{businessId}/rosters/publish \
  -H "authorization: Bearer $ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "weekStart": "2026-06-15"
  }'
```

### Get Publication Status

```bash
curl "http://localhost:3000/businesses/{businessId}/rosters/publication?weekStart=2026-06-15" \
  -H "authorization: Bearer $ACCESS_TOKEN"
```

### Acknowledge A Published Roster

```bash
curl -X POST http://localhost:3000/businesses/{businessId}/rosters/{publicationId}/acknowledge \
  -H "authorization: Bearer $ACCESS_TOKEN"
```
