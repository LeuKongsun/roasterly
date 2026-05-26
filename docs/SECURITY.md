# Auth Security Notes

## JWT Access Tokens

Access tokens should be short lived, for example 5 to 15 minutes.
They should contain only the claims needed by the API, such as user id and token id.

Do not store sensitive personal data in JWT payloads.

## Refresh Tokens

Refresh tokens should be treated like long-lived credentials.

Recommended behavior:

- Generate a high-entropy random token.
- Store only a hash of the refresh token in the database.
- Associate it with a user, expiry, and token family/session id.
- Rotate it every time it is used.
- Revoke the old refresh token after successful rotation.
- Revoke the active token on logout.

## Passwords

- Minimum length should be enforced.
- Hash passwords with bcrypt or argon2.
- Never log passwords.
- Never return password hashes from API responses.

## Error Responses

Login failures should use a generic message such as `Invalid email or password`.
Validation errors can be specific, but authentication errors should avoid confirming whether an email exists.

## Environment Variables

Expected variables once implementation begins:

```text
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=30
PORT=3000
NODE_ENV=development
```

