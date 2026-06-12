# Roadmap

## Completed Auth Foundation

### Phase 1: Scaffold

- Initialize Node.js and TypeScript.
- Add the web framework.
- Add linting, formatting, and tests.
- Add environment config loading.
- Add a health route.

### Phase 2: Database

- Add PostgreSQL connection. Done.
- Create user model. Done.
- Create refresh token/session model. Done.
- Add migration workflow.

### Phase 3: Auth Core

- Register endpoint. Done.
- Login endpoint. Done.
- Access token creation. Done.
- Refresh token creation and storage. Done.
- Protected route middleware. Done.

### Phase 4: Token Lifecycle

- Refresh endpoint with rotation. Done.
- Logout endpoint. Done.
- Refresh token revocation. Done.
- Tests for reuse and expired token cases.

### Phase 5: Hardening

- Rate limiting for login. Done.
- Secure HTTP headers. Done.
- Request logging without secrets. Done.
- Central error handling. Done.
- Production deployment notes. Done.

## Roster App Roadmap

See [ROSTER_APP_PLAN.md](ROSTER_APP_PLAN.md) for the full product and technical plan.

### Phase 1: Rebrand And Domain Setup

- Update README and docs from generic auth boilerplate to roster app. Done.
- Add Prisma models: `Business`, `BusinessMember`, `Shift`. Done.
- Generate Prisma client and create migration. Done.

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

- Update API documentation. Done.
- Add example requests. Done.
- Review error messages and error codes.
- Run `npm run typecheck`, `npm run lint`, and `npm test`.

### Phase 6: Minimal Web App

- Add Vite/React frontend under `web/`. Done.
- Add login/register screen. Done.
- Add business selector and create-business form. Done.
- Add staff list and add-staff form. Done.
- Add weekly roster view. Done.
- Add create-shift form. Done.
- Add current-user shifts view. Done.
- Verify frontend build.

### Phase 7: Staff Invitations

- Add business invitation model and migration. Done.
- Store only hashed invitation tokens. Done.
- Add manager endpoint to create invitations. Done.
- Add manager endpoint to list invitations. Done.
- Add authenticated endpoint to accept invitations. Done.
- Require invitation email to match the logged-in user. Done.
- Add frontend create-invite and accept-invite forms. Done.
- Add invitation tests. Done.

### Phase 8: Roster Publishing

- Add roster publication model and migration. Done.
- Add publish roster endpoint. Done.
- Add publication status endpoint. Done.
- Add staff acknowledgement endpoint. Done.
- Reset acknowledgements on republish. Done.
- Add frontend publish, republish, acknowledge, and acknowledgement status controls. Done.

### Phase 9: Shift Editing UX

- Add edit shift form. Done.
- Add delete shift action. Done.
- Make roster shift cards selectable. Done.
- Add clearer empty states for businesses without staff.
