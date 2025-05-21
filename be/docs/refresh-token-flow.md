# Refresh Token Implementation

This document describes the refresh token flow implemented in the HolaMess application.

## Configuration

Add the following environment variables to your `.env` file:

```
# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=30s

# Refresh Token
REFRESH_TOKEN_SECRET=your_refresh_token_secret_key
REFRESH_TOKEN_EXPIRES_IN=7d

# Cookies
COOKIE_SECRET=your_cookie_secret_key
```

## How it Works

1. **Authentication Flow**:
   - When a user logs in, they receive an access token (JWT) and a refresh token
   - The access token expires quickly (30 seconds by default)
   - The refresh token has a longer lifespan (7 days by default)
   - The refresh token is stored in an HTTP-only cookie for security

2. **Token Usage**:
   - The access token is sent with each API request in the Authorization header
   - When the access token expires, the client needs to get a new one using the refresh token

3. **Refresh Process**:
   - Client calls `/api/auth/refresh-token` with the refresh token (automatically sent via cookie)
   - If the refresh token is valid, a new access token and refresh token are issued
   - The old refresh token is revoked immediately (one-time use only)
   - This implements a secure sliding window refresh token mechanism

4. **Security Features**:
   - Refresh tokens are stored in the database with an `isRevoked` flag
   - Each refresh token is tied to a specific device and IP address
   - MongoDB TTL index automatically removes expired tokens
   - One-time use refresh tokens prevent replay attacks
   - HTTP-only cookies prevent JavaScript access to refresh tokens

## API Endpoints

- `POST /api/auth/login`: Authenticates user and issues tokens
- `POST /api/auth/refresh-token`: Issues new tokens using a refresh token
- `POST /api/auth/logout`: Revokes tokens
- `POST /api/auth/revoke-all`: Revokes all refresh tokens for the current user
- `GET /api/auth/sessions`: Gets all active sessions and refresh tokens

## Client Implementation

The client should:

1. Store the access token in memory (not localStorage)
2. Use the access token for all API calls
3. When a 401 response with `code: 'TOKEN_EXPIRED'` is received:
   - Call `/api/auth/refresh-token` to get a new access token
   - Update the stored access token
   - Retry the original request

## Error Handling

- If refresh token is invalid or expired: Redirect to login
- If refresh token is used more than once: Potential security issue, log out all sessions

## Socket.IO Integration

Socket connections are validated at:
1. Connection time with the current token
2. Every 5 minutes via periodic check
3. Before each socket operation

When a token expires, the socket is disconnected with a `token_expired` event.
