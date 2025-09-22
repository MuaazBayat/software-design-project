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

**Base:** `/`

| Method   | Path             | Purpose                                                                  | Auth | Request Body                              | Success                                                      |
| -------- | ---------------- | ------------------------------------------------------------------------ | ---- | ----------------------------------------- | ------------------------------------------------------------ |
| **GET**  | `/health`        | Liveness                                                                 | —    | —                                         | **200** `{ ok: true }`                                       |
| **POST** | `/messages`      | Send a message (scheduled delivery, SA time)                             | ✔️   | `MessageCreate` (optional `LetterStyles`) | **200** inserted `message` row                               |
| **POST** | `/messages/page` | Page conversation messages (visible ≤ now SA)                            | ✔️   | `MessagesPage`                            | **200** `{ items[], count, next_cursor, has_more }`          |
| **POST** | `/search`        | Search active conversations by `anonymous_handle` (empty string ⇒ inbox) | ✔️   | `SearchUsers`                             | **200** `{ count, items[{ user_profile, latest_message }]} ` |

**Scheduling**

* Delivery is currently `now(Africa/Johannesburg) + 12h`.
* `page_messages_sa` only returns rows with `scheduled_delivery_at ≤ now(SA)`.

**Errors**

* `POST /messages` may return **404** if no active match/thread for the pair, **409** if active match has `conversation_thread_id` = NULL, **400** for constraint violations.

---

## Moderation Service

**Base:** `/api/v1`

| Method   | Path     | Purpose                                      | Auth | Headers                                                         | Request Body | Success                                         |
| -------- | -------- | -------------------------------------------- | ---- | --------------------------------------------------------------- | ------------ | ----------------------------------------------- |
| **POST** | `/check` | Profanity check + (internal) auto‑log/censor | ✔️   | **Either** `X-User-Id` (internal) **or** `X-Api-Key` (external) | `{ text }`   | **200** `{ contains_profanity, censored_text }` |

**Behavior**

* **Internal (`X-User-Id`)**: if profanity is detected, a moderation log is created and the user’s `reported_count` is incremented.
* **External (`X-Api-Key`)**: usage limits enforced; **401** on invalid key; **429** when limit reached.
* Returns **400** if both headers provided or neither provided; **404** if internal user not found.

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
interface LetterStyles { font_size: number; font_family: string }
interface MessageCreate { sender_id: string; recipient_id: string; message_content: string; letter_styles?: LetterStyles }
interface MessagesPage { conversation_thread_id: string; page_size?: number; last_message_id?: string }

// Moderation
interface CheckRequest { text: string }
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
curl -X POST "$MSG/messages" -H "Content-Type: application/json" \
  -d '{"sender_id":"u1","recipient_id":"u2","message_content":"Hi from SA!"}'

# Moderation check (internal)
curl -X POST "$MOD/api/v1/check" -H "X-User-Id: u1" -H "Content-Type: application/json" \
  -d '{"text":"some text with darn words"}'
```
