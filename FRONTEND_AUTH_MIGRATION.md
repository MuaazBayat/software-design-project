# Frontend Authentication Migration Guide

## Status: 🟡 IN PROGRESS

This document tracks the migration of all frontend API calls to include Clerk JWT authentication tokens.

## Completed ✅

### API Clients
- ✅ **lib/authFetch.ts** - Created utility functions for authenticated fetch
- ✅ **lib/MessagingApiClient.ts** - Added `getToken` parameter and auth headers
- ✅ **lib/moderationApiClient.ts** - Added `getToken` parameter and auth headers

### Pages
- ✅ **app/settings/page.tsx** - Updated apiGetProfile and apiUpdateProfile
- ✅ **app/matchmaking/page.tsx** - Updated all 5 fetch calls

## Remaining 🔴

### Pages That Need Updates

#### 1. app/preference-profile/page.tsx
**Fetch calls to update:**
```bash
grep -n "fetch(" app/preference-profile/page.tsx
```

**Pattern to apply:**
```typescript
// Add import
import { useAuth } from "@clerk/nextjs";

// In component
const { getToken } = useAuth();

// In fetch call
const token = await getToken();
const response = await fetch(url, {
  headers: {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  },
});
```

#### 2. app/cultural-explorer/page.tsx
**Fetch calls to update:**
```bash
grep -n "fetch(" app/cultural-explorer/page.tsx
```

**Same pattern as above**

#### 3. app/compose-letter/[user_id]/page.tsx
**Fetch calls to update:**
```bash
grep -n "fetch(" app/compose-letter/[user_id]/page.tsx
```

**Pattern:** Update MessagingApiClient instantiation:
```typescript
import { useAuth } from "@clerk/nextjs";

const { getToken } = useAuth();
const client = new MessagingApiClient({ getToken });
```

#### 4. app/compose-letter/components/MainContent.tsx
**Fetch calls to update:**
```bash
grep -n "fetch(" app/compose-letter/components/MainContent.tsx
```

**Pattern:** Same as above

#### 5. app/inbox/page.tsx (if exists)
**Check if this page has fetch calls**

## Migration Pattern Summary

### For Direct Fetch Calls

**Before:**
```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
```

**After:**
```typescript
import { useAuth } from "@clerk/nextjs";

// In component
const { getToken } = useAuth();

// In fetch call
const token = await getToken();
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  },
  body: JSON.stringify(data),
});
```

### For API Client Classes

**Before:**
```typescript
const client = new MessagingApiClient();
await client.sendLetter(data);
```

**After:**
```typescript
import { useAuth } from "@clerk/nextjs";

const { getToken } = useAuth();
const client = new MessagingApiClient({ getToken });
await client.sendLetter(data);
```

### For Callback Functions

**Before:**
```typescript
const fetchData = useCallback(async () => {
  const response = await fetch(url);
  // ...
}, [user]);
```

**After:**
```typescript
const fetchData = useCallback(async () => {
  const token = await getToken();
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });
  // ...
}, [user, getToken]);  // Add getToken to dependencies
```

## Testing After Migration

### 1. Local Testing (Auth Disabled)
```bash
# In .env
ENABLE_AUTH=false

# Should work without tokens
npm run dev
```

### 2. Production Testing (Auth Enabled)
```bash
# In .env
ENABLE_AUTH=true

# Should pass Clerk tokens
npm run dev
# Log in and test all features
```

### 3. Verification Checklist
- [ ] Settings page - profile CRUD operations
- [ ] Matchmaking page - suggestions, matches, pass
- [ ] Preference profile page - profile selection
- [ ] Cultural explorer page - content loading
- [ ] Compose letter page - message sending, image upload
- [ ] Inbox page - message loading

## Quick Find & Replace Commands

### Find all fetch calls in app directory
```bash
cd services/frontend/app
grep -r "await fetch" . --include="*.tsx" --include="*.ts" | grep -v node_modules
```

### Find files missing useAuth import
```bash
cd services/frontend/app
grep -l "fetch(" *.tsx */**.tsx | xargs grep -L "useAuth"
```

### Find MessagingApiClient instantiations
```bash
cd services/frontend/app
grep -r "new MessagingApiClient" . --include="*.tsx"
```

### Find ModerationApiClient usage
```bash
cd services/frontend/app
grep -r "moderationApi\." . --include="*.tsx"
grep -r "new ModerationApiClient" . --include="*.tsx"
```

## Common Issues & Solutions

### Issue: "getToken is not a function"
**Solution:** Make sure you've imported and called `useAuth()`:
```typescript
import { useAuth } from "@clerk/nextjs";
const { getToken } = useAuth();
```

### Issue: "Cannot use useAuth outside of ClerkProvider"
**Solution:** Check that your layout.tsx wraps components with ClerkProvider

### Issue: Callback dependencies warning
**Solution:** Add `getToken` to the dependency array:
```typescript
useCallback(async () => {
  // ...
}, [user, getToken]);  // Include getToken
```

### Issue: 403 Forbidden in production
**Solution:** Token not being passed. Check:
1. `useAuth()` is called
2. Token is awaited: `await getToken()`
3. Header is set: `'Authorization': \`Bearer ${token}\``

### Issue: API client not using auth
**Solution:** Pass getToken when creating instance:
```typescript
const client = new MessagingApiClient({ getToken });
```

## Files Reference

### API Clients
- `lib/authFetch.ts` - Utility functions
- `lib/MessagingApiClient.ts` - Messaging service client
- `lib/moderationApiClient.ts` - Moderation service client

### Environment Variables
```bash
# .env.local or .env
NEXT_PUBLIC_CORE_URL=http://localhost:8000
NEXT_PUBLIC_MESSAGING_URL=http://localhost:9000
NEXT_PUBLIC_MATCHMAKING_URL=http://localhost:8001
NEXT_PUBLIC_MODERATION_URL=http://localhost:8002
```

### Backend Services
All backend services require auth when `ENABLE_AUTH=true`:
- Core: `http://localhost:8000`
- Messaging: `http://localhost:9000`
- Matchmaking: `http://localhost:8001`
- Moderation: `http://localhost:8002`

## Next Steps

1. **Complete remaining pages** - Follow pattern above for each file
2. **Test locally** - With `ENABLE_AUTH=false`
3. **Test with auth** - Set `ENABLE_AUTH=true` and verify all flows
4. **Document** - Update this file as you complete each page
5. **Deploy** - Once all pages work with auth enabled

## Support

For issues or questions:
- Check backend auth docs: `docs/setup/authentication.md`
- Check auth utility: `lib/authFetch.ts`
- Test token generation: `scripts/generate_clerk_token.py`