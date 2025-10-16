# Authentication Implementation Guide

## Overview

Clerk JWT authentication has been implemented to protect backend service endpoints. All frontend requests are authenticated using JWT tokens issued by Clerk. Authentication can be enabled/disabled via environment variables, making it flexible for development and production environments.

## Architecture

```
Frontend (with Clerk session) → [JWT Token] → Backend Services
                                                ↓
                                          Verify Clerk JWT
                                                ↓
                                          Extract clerk_id
```

## Authentication Method

- **Local Development**: `ENABLE_AUTH=false` - No authentication required
- **Production**: `ENABLE_AUTH=true` - Clerk JWT verification required

## Configuration

### Environment Variables

**Local Development (`.env`):**
```bash
# Disable auth for local development/testing (default)
export ENABLE_AUTH='false'

# Clerk secret key (already configured above in .env)
export CLERK_SECRET_KEY='sk_test_...'
```

**Production:**
```bash
# Enable authentication
export ENABLE_AUTH='true'

# Clerk secret key from dashboard
export CLERK_SECRET_KEY='sk_live_...'
```

### Getting Your Clerk Secret Key

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **API Keys**
4. Copy the **Secret Key** (starts with `sk_test_` or `sk_live_`)

## Protected Services

All four backend services use Clerk JWT authentication:

### ✅ Core Service
**Protected endpoints:**
- `POST /profiles`
- `GET /profiles/{clerk_id}`
- `PUT /profiles/{clerk_id}`

**Unprotected:**
- `GET /health`

### ✅ Messaging Service
**Protected endpoints:**
- `POST /messages`
- `POST /messages/page`
- `POST /search`
- `POST /messages/mark-read`
- `POST /upload-image`
- `GET /get-image`

**Unprotected:**
- `GET /health`

### ✅ Moderation Service
**Protected endpoints:**
- All moderation API endpoints (`/api/v1/*`)

**Unprotected:**
- `GET /health`

### ✅ Matchmaking Service
**Protected endpoints:**
- `GET /user/profile/{clerk_id}`
- `GET /user/stats/{clerk_id}`
- `POST /profiles/pass`
- `GET /profiles/suggestions/{clerk_id}`
- `POST /matches/find`
- `POST /preferences/select`
- `GET /preferences/profiles/{clerk_id}`

**Unprotected:**
- `GET /health`

## Frontend Integration

### Using Clerk in React

```javascript
import { useAuth } from '@clerk/clerk-react';

function ProfileComponent() {
  const { getToken } = useAuth();

  const fetchProfile = async (userId) => {
    // Get the Clerk session token
    const token = await getToken();

    // Make authenticated request
    const response = await fetch(`${CORE_URL}/profiles/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.json();
  };
}
```

### API Call Pattern

```javascript
// Generic authenticated fetch wrapper
async function authenticatedFetch(url, options = {}) {
  const { getToken } = useAuth();
  const token = await getToken();

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}

// Usage
const response = await authenticatedFetch(`${MESSAGING_URL}/messages`, {
  method: 'POST',
  body: JSON.stringify(messageData)
});
```

## Testing

### Local Testing (No Auth)

```bash
# Source environment variables
source .env

# Run any service tests
pytest tests/core -v
pytest tests/messaging -v
pytest tests/moderation -v
pytest tests/matchmaking -v
```

Tests work without authentication because `ENABLE_AUTH=false` by default.

### Testing with Auth Enabled

If you want to test with authentication enabled:

```bash
# Enable auth temporarily
export ENABLE_AUTH='true'

# Get a real Clerk token from your frontend
# (Open browser DevTools → Application → Cookies → __session)

# Test an endpoint
curl -H "Authorization: Bearer <clerk_token>" \
  http://localhost:8000/profiles/user_123
```

## Implementation Details

### Shared Auth Module

**File:** `services/shared/auth.py`

```python
from clerk_backend_api.jwks_helpers import verify_token as clerk_verify_token

def verify_token(credentials):
    # If auth disabled, allow all requests
    if not AUTH_ENABLED:
        return "no-auth"

    # Verify Clerk JWT token
    verified_token = clerk_verify_token(token, CLERK_SECRET_KEY)

    # Extract and return clerk_id
    return verified_token.get("sub")
```

### Service Integration

Each service imports the shared auth module:

```python
import sys, os
from fastapi import Depends
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from shared.auth import verify_token

@app.get("/profiles/{clerk_id}")
async def get_profile(
    clerk_id: str,
    token: str = Depends(verify_token)  # Adds auth
):
    # token contains the verified clerk_id
    # or "no-auth" if auth is disabled
    pass
```

## Production Deployment

### Docker/Cloud Run Configuration

Add environment variables to your deployment:

```yaml
env:
  - name: ENABLE_AUTH
    value: "true"
  - name: CLERK_SECRET_KEY
    valueFrom:
      secretKeyRef:
        name: clerk-secret
        key: secret_key
```

### Security Checklist

- [x] ✅ Clerk secret key stored in environment variables
- [x] ✅ Never commit secret keys to version control
- [x] ✅ `ENABLE_AUTH=false` for local development only
- [x] ✅ `ENABLE_AUTH=true` in production environments
- [x] ✅ Use Clerk's secret key rotation features
- [x] ✅ Health endpoints remain unprotected for monitoring

## Troubleshooting

### "Authentication required" (403)

**Cause:** No `Authorization` header sent
**Fix:** Include Clerk token in request headers

### "Invalid authentication credentials" (401)

**Cause:** Invalid or expired JWT token
**Fix:** Refresh the Clerk session and get a new token

### "Server authentication not configured" (500)

**Cause:** `CLERK_SECRET_KEY` not set
**Fix:** Add `CLERK_SECRET_KEY` to environment variables

### Tests failing with auth errors

**Cause:** `ENABLE_AUTH=true` in local environment
**Fix:** Set `ENABLE_AUTH=false` in `.env` for local testing

## Benefits of This Approach

1. **User Identity**: Backend knows which user is making each request
2. **Automatic Expiration**: JWT tokens expire automatically
3. **No Exposed Secrets**: Frontend never sees secret keys
4. **Standard Pattern**: Industry-standard JWT authentication
5. **Easy Development**: Auth disabled locally with single flag
6. **Clerk Integration**: Leverages existing Clerk authentication