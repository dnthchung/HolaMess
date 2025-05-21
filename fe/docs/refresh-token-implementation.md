# Frontend Refresh Token Implementation

This document describes how refresh tokens are implemented in the frontend of HolaMess application.

## Implementation Overview

The frontend implementation follows enterprise-level best practices for token management:

1. **In-memory Token Storage**: Access tokens are stored in memory (not localStorage) to prevent XSS attacks
2. **Token Refresh Logic**: Automatic token refresh before expiration
3. **Axios Interceptors**: Handles expired tokens and refreshes automatically
4. **Error Handling**: Graceful handling of refresh failures

## Key Components

### 1. Token Service (`tokenService.ts`)

- Manages access tokens in memory
- Tracks token expiration
- Provides helper functions for token operations
- Logs token operations to console

```typescript
// Key functions
getToken(): string | null
setToken(token: string, expiresIn: number): void
clearToken(): void
isTokenExpired(): boolean
hasValidToken(): boolean
getRemainingTime(): number
getTokenAge(): number
```

### 2. API Service (`apiService.ts`)

- Configures Axios with interceptors
- Handles token refresh when 401 with TOKEN_EXPIRED code is received
- Implements queue system for multiple requests during refresh
- Logs refresh token operations to console

```typescript
// Key features
- Request interceptor to add Authorization header
- Response interceptor for token refresh
- Centralized API endpoints
- Automatic retry of failed requests after token refresh
```

### 3. User Context (`UserContext.tsx`)

- Provides user authentication state
- Manages tokens as part of user state
- Implements token refresh timer (at 80% of token lifetime)
- Provides login, signup, logout functions
- Logs authentication operations to console

## Token Refresh Flow

1. **Automatic Refresh**: Tokens are automatically refreshed when:
   - Token is 80% through its lifetime
   - Application starts with a nearly expired token
   - HTTP request receives 401 with TOKEN_EXPIRED code

2. **Refresh Process**:
   - A POST request is sent to `/api/auth/refresh-token`
   - The refresh token is sent automatically via HTTP-only cookie
   - If successful, the new access token is stored in memory
   - All pending requests are retried with the new token
   - Console logs the refresh operation

3. **Error Handling**:
   - If token refresh fails, user is logged out
   - Pending requests are rejected
   - Console logs the error

## Console Logging

All token operations are logged to the console:

- `🔄 Refreshing access token...` - When starting a token refresh
- `✅ Token refreshed successfully. New expiration: X seconds` - On successful refresh
- `❌ Token refresh failed: [error]` - When refresh fails
- `Setting new access token with expiration: X seconds` - When setting a new token
- `Token refresh scheduled for [time] (Xs from now)` - When scheduling automatic refresh
- `Token refresh timer triggered` - When the refresh timer fires

## Security Considerations

1. **Access Token Storage**: Stored only in memory, not in localStorage or cookies
2. **Refresh Token**: Stored in HTTP-only, secure cookies (managed by the backend)
3. **Token Expiration**: Short-lived access tokens (30s by default)
4. **Automatic Logout**: On refresh token expiration/invalidation

## Integration with Backend

The frontend expects the backend to:

1. Issue a new access token and refresh token on login/signup
2. Accept refresh tokens via HTTP-only cookies
3. Return 401 with code: 'TOKEN_EXPIRED' when access tokens expire
4. Issue new tokens on the /api/auth/refresh-token endpoint
