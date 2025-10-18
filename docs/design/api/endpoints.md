# GlobeTalk — API Endpoint Tables (All Services)


---

## Core — Profiles Service

**Base:** `/` (service host for Core)

| Method   | Path                   | Purpose                                   | Auth | Request Body    | Success                                    |
| -------- | ---------------------- | ----------------------------------------- | ---- | --------------- | ------------------------------------------ |
| **POST** | `/profiles`            | Create profile (idempotent by `clerk_id`) | ✔️   | `ProfileCreate` | **201** `Profile` (or **200** existing)    |
| **GET**  | `/profiles/{clerk_id}` | Get profile by Clerk ID                   | ✔️   | —               | **200** `Profile` (404 if missing)         |
| **PUT**  | `/profiles/{clerk_id}` | Upsert/update profile                     | ✔️   | `ProfileUpdate` | **200** `Profile` (409 on unique‑conflict) |

**Notes**

* `POST /profiles` returns **200** with the existing row if profile already exists.
* `PUT` uses upsert on `clerk_id`; may return **409** if another unique (e.g., handle) collides.

---

## Matchmaking Service

**Base:** `/`

| Method   | Path                               | Purpose                                                               | Auth | Request Body / Query                                                                                        | Success                                                                      |
| -------- | ---------------------------------- | --------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **GET**  | `/health`                          | Liveness                                                              | —    | —                                                                                                           | **200** `{ status, timestamp, version }`                                     |
| **GET**  | `/user/profile/{clerk_id}`         | Fetch user’s profile (by Clerk ID)                                    | ✔️   | —                                                                                                           | **200** `{ profile }`                                                        |
| **GET**  | `/user/stats/{clerk_id}`           | Daily match usage stats                                               | ✔️   | —                                                                                                           | **200** `{ matches_used, matches_remaining, total_daily_limit, reset_time }` |
| **POST** | `/profiles/pass`                   | Record that user passed on a profile                                  | ✔️   | `{ clerk_id, passed_user_id }`                                                                              | **200** `{ success: true }`                                                  |
| **GET**  | `/profiles/suggestions/{clerk_id}` | Preview suggestions (does **not** consume daily limit)                | ✔️   | Query: `limit≤50`, `languages`, `age_ranges`, `interests`, `match_type` (`one-time`\|`long-term`\|`either`) | **200** `UserProfile[]` (404 if none)                                        |
| **POST** | `/matches/find`                    | Accept/Reject a suggested match and (if accepted) create match/thread | ✔️   | `MatchDecisionRequest` (`{ clerk_id, accept, suggested_user_id?, preferences? }`)                           | **200** `MatchResponse` (400 if daily limit exceeded; 404 if none)           |
| **POST** | `/preferences/select`              | Store the user’s preference profile (real or fake)                    | ✔️   | `PreferenceSelection`                                                                                       | **200** `{ success: true }`                                                  |
| **GET**  | `/preferences/profiles/{clerk_id}` | Get a small set of profiles (real/fake) to choose preference from     | ✔️   | —                                                                                                           | **200** `PreferenceProfile[]`                                                |

**Notes**

* Suggestions/matching consider language, interests, age range, country, TZ overlap, previous matches, and passed users.
* `matches.find` (accept=true) writes to `match_records` and returns `{ match_id, thread_id, compatibility_score }`.

---

## Messaging Service (Letters)

**Base:** `/api/v1`

| Method    | Path                                      | Purpose                                                                  | Auth | Request Body / Query                                                                                           | Success                                                      |
| --------- | ----------------------------------------- | ------------------------------------------------------------------------ | ---- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **POST**  | `/messages`                               | Send a message (scheduled delivery, SA time) with optional file upload  | ✔️   | `MessageCreate` or multipart/form-data                                                                         | **200** inserted `message` row                               |
| **GET**   | `/messages/page`                          | Page conversation messages (visible ≤ now SA)                           | ✔️   | Query: `conversation_thread_id`, `viewer_user_id`, `page_size?`, `last_message_id?`                          | **200** `{ items[], count, next_cursor, has_more }`          |
| **GET**   | `/search`                                 | Search active conversations by `anonymous_handle` (empty string ⇒ inbox) | ✔️   | Query: `my_user_id`, `anonymous_handle?`, `limit?`, `offset?`                                                 | **200** `{ count, items[{ user_profile, latest_message }]} ` |
| **PATCH** | `/conversations/{conversation_thread_id}/read` | Mark messages as read in a conversation                                 | ✔️   | `MarkReadBody`                                                                                                 | **200** `{ updated: number }`                                |
| **POST**  | `/upload-image`                           | Upload an image file to storage                                          | ✔️   | File upload (multipart/form-data)                                                                              | **200** `{ object_path, data: { path } }`                    |

**Behavior**

* **Message delivery**: Default delay is 12 hours from send time (customizable via `delay_hours`)
* **Blocking enforcement**: Users cannot send messages if either party has blocked the other
* **File uploads**: Supports image uploads via multipart/form-data or separate `/upload-image` endpoint
* **Signed URLs**: Letter URLs in responses are automatically signed for secure access
* **Pagination**: Uses cursor-based pagination with `last_message_id` for efficient scrolling
* **Read tracking**: Messages can be marked as read per conversation thread

**Storage**

* Files are stored in Supabase storage bucket `letters` with auto-generated paths
* Signed URLs are cached for 24 hours with 60-second buffer before refresh

**Errors**

* `POST /messages` may return **403** if users have blocked each other, **404** if no active match/thread exists, **400** for validation errors
* `GET /messages/page` may return **403** if access forbidden due to blocks, **404** if cursor not found, **400** if cursor doesn't belong to thread

---

## Moderation Service

**Base:** `/api/v1`

| Method   | Path                           | Purpose                                              | Auth | Headers                                                         | Request Body                                              | Success                                                         |
| -------- | ------------------------------ | ---------------------------------------------------- | ---- | --------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| **POST** | `/check`                       | Profanity check + (internal) auto‑log/censor         | ✔️   | **Either** `X-User-Id` (internal) **or** `X-Api-Key` (external) | `CheckRequest`                                            | **200** `{ contains_profanity, censored_text }`                |
| **POST** | `/report-user`                 | Report a user for violations                         | ✔️   | —                                                               | `ReportUser`                                              | **200/201** reported users list                                |
| **POST** | `/report-message`              | Report a specific message for violations             | ✔️   | —                                                               | `ReportMessage`                                           | **200** moderation log entry                                   |
| **POST** | `/block-user`                  | Block a user (add to blocked list)                  | ✔️   | —                                                               | `BlockUser`                                               | **200/201** blocked users list                                 |
| **POST** | `/ban-user/{log_id}`           | Ban user based on moderation log entry              | ✔️   | —                                                               | —                                                         | **200** `{ message }`                                           |
| **POST** | `/ban-clerk-user/{clerk_id}`   | Ban user by Clerk ID                                | ✔️   | —                                                               | —                                                         | **200** `{ message }`                                           |
| **POST** | `/unban-user/{user_id}`        | Unban user by user ID                               | ✔️   | —                                                               | —                                                         | **200** `{ message }`                                           |
| **POST** | `/unban-clerk-user/{clerk_id}` | Unban user by Clerk ID                              | ✔️   | —                                                               | —                                                         | **200** `{ message }`                                           |
| **POST** | `/resolve-case`                | Resolve a moderation case with action and notes     | ✔️   | —                                                               | `ResolveCase`                                             | **200** `{ message }`                                           |
| **GET**  | `/fingerprint/{fingerprint}`   | Check if device fingerprint is banned               | ✔️   | —                                                               | —                                                         | **200** `{ is_banned, message }`                               |
| **GET**  | `/logs`                        | Get all moderation logs (moderators only)           | ✔️   | `X-User-Id` (required)                                          | —                                                         | **200** `{ logs[] }`                                            |
| **GET**  | `/banned-users`                | Get list of all banned users                        | ✔️   | —                                                               | —                                                         | **200** `{ banned_users[] }`                                   |

**Behavior**

* **Internal (`X-User-Id`)**: if profanity is detected, a moderation log is created and the user's `reported_count` is incremented.
* **External (`X-Api-Key`)**: usage limits enforced; **401** on invalid key; **429** when limit reached.
* **Check endpoint**: Returns **400** if both headers provided or neither provided; **404** if internal user not found.
* **Logs endpoint**: Requires `X-User-Id` header and user must have `moderator: true` in profile.
* **Ban/Unban operations**: Also manage Clerk authentication status and banned fingerprints.
* **Report operations**: Create moderation log entries and update user violation counts.

---

## Representative Models (abbrev.)

```ts
// Core Profiles
interface ProfileCreate { clerk_id: string; username: string; age_range: string; country: string; timezone: string; languages: string[]; bio?: string }
interface ProfileUpdate { username?: string; age_range?: string; country?: string; timezone?: string; languages?: string[]; bio?: string }
interface Profile extends ProfileCreate { id: string; created_at: string; updated_at: string }

// Matchmaking
interface MatchingPreferences { match_type: 'one-time'|'long-term'|'either'; languages?: string[]; age_ranges?: string[]; country_codes?: string[]; interests?: string[]; exclude_previous?: boolean; max_timezone_difference?: number }
interface MatchDecisionRequest { clerk_id: string; accept: boolean; suggested_user_id?: string; preferences?: MatchingPreferences }
interface MatchResponse { match_id: string; thread_id: string; penpal_profile: UserProfile; match_type: string; compatibility_score: number; created_at: string }

// Messaging
interface MessageCreate { sender_id: string; recipient_id: string; message_content: string; delay_hours?: number; letter_url?: string }
interface PageLettersRequest { conversation_thread_id: string; page_size?: number; last_message_id?: string; viewer_user_id: string }
interface SearchUsers { anonymous_handle: string; my_user_id: string; limit?: number; offset?: number }
interface MarkReadBody { my_user_id: string }

// Moderation
interface CheckRequest { text: string }
interface ReportUser { reporterId: string; reportedId: string; violationType: string }
interface ReportMessage { reporterId: string; reportedUserId: string; reportedMessageId: string; violationType: string }
interface BlockUser { reporterId: string; reportedId: string }
interface ResolveCase { log_id: string; action: string; notes: string }
```

---

## Status Codes (common)

* **200 OK** – Read/updated successfully
* **201 Created** – Resource created (Core: `POST /profiles` on first create)
* **400/422** – Validation/constraint failures
* **401/403** – Auth/permission issues
* **404** – Not found / none available
* **409** – Conflict (e.g., unique handle)
* **429** – Rate limited (external moderation)

---

## Examples (cURL)

```bash
# Create or fetch a profile (Core)
curl -X POST "$CORE/profiles" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"clerk_id":"user_123","username":"alice","age_range":"18-25","country":"ZA","timezone":"Africa/Johannesburg","languages":["en"],"bio":"hi"}'

# Suggestions (Matchmaking)
curl "$MM/profiles/suggestions/user_123?limit=3&languages=en,ja&match_type=either"

# Send a scheduled letter (Messaging)
curl -X POST "$MSG/api/v1/messages" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"sender_id":"u1","recipient_id":"u2","message_content":"Hi from SA!","delay_hours":12}'

# Send a letter with image upload (multipart)
curl -X POST "$MSG/api/v1/messages" -H "Authorization: Bearer $TOKEN" \
  -F "sender_id=u1" -F "recipient_id=u2" -F "message_content=Hi with image!" \
  -F "delay_hours=24" -F "file=@image.jpg"

# Get conversation messages
curl "$MSG/api/v1/messages/page?conversation_thread_id=thread123&viewer_user_id=u1&page_size=10" \
  -H "Authorization: Bearer $TOKEN"

# Search conversations
curl "$MSG/api/v1/search?my_user_id=u1&anonymous_handle=alice&limit=20" \
  -H "Authorization: Bearer $TOKEN"

# Mark conversation as read
curl -X PATCH "$MSG/api/v1/conversations/thread123/read" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"my_user_id":"u1"}'

# Upload image separately
curl -X POST "$MSG/api/v1/upload-image" -H "Authorization: Bearer $TOKEN" \
  -F "file=@image.jpg"

# Moderation check (internal)
curl -X POST "$MOD/api/v1/check" -H "X-User-Id: u1" -H "Content-Type: application/json" \
  -d '{"text":"some text with darn words"}'

# Moderation check (external API key)
curl -X POST "$MOD/api/v1/check" -H "X-Api-Key: your-api-key" -H "Content-Type: application/json" \
  -d '{"text":"some text to check"}'

# Report a user
curl -X POST "$MOD/api/v1/report-user" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"reporterId":"user1","reportedId":"user2","violationType":"harassment"}'

# Get moderation logs (moderators only)
curl -X GET "$MOD/api/v1/logs" -H "Authorization: Bearer $TOKEN" -H "X-User-Id: moderator_id"

# Ban a user by log ID
curl -X POST "$MOD/api/v1/ban-user/log123" -H "Authorization: Bearer $TOKEN"

# Check fingerprint status
curl -X GET "$MOD/api/v1/fingerprint/abc123def456" -H "Authorization: Bearer $TOKEN"
```
