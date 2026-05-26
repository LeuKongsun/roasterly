# Roadmap

## Phase 1: Scaffold

- Initialize Node.js and TypeScript.
- Add the web framework.
- Add linting, formatting, and tests.
- Add environment config loading.
- Add a health route.

## Phase 2: Database

- Add PostgreSQL connection. Done.
- Create user model. Done.
- Create refresh token/session model. Done.
- Add migration workflow.

## Phase 3: Auth Core

- Register endpoint. Done.
- Login endpoint. Done.
- Access token creation. Done.
- Refresh token creation and storage. Done.
- Protected route middleware. Done.

## Phase 4: Token Lifecycle

- Refresh endpoint with rotation. Done.
- Logout endpoint. Done.
- Refresh token revocation. Done.
- Tests for reuse and expired token cases.

## Phase 5: Hardening

- Rate limiting for login. Done.
- Secure HTTP headers. Done.
- Request logging without secrets. Done.
- Central error handling. Done.
- Production deployment notes. Done.
