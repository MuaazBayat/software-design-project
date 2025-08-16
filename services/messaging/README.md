# Messages API

## Overview

This service provides a minimal messages backend backed by **Supabase/Postgres** with a **FastAPI** HTTP interface. It exposes:

* `GET /health` – basic liveness check.
* `POST /messages` – create a single message.
* `GET /messages` – fetch messages in a conversation thread using **cursor pagination** (5 per page by default).

The API is intended for use by internal services or trusted clients. It assumes your database contains the tables and constraints described in your schema (e.g., `messages`, `match_records`, `user_profiles`).

---

## Quick Start

### 1) Environment

Create a virtual environment and install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate    # Windows: .\.venv\Scripts\Activate.ps1
python -m pip install -U pip
python -m pip install fastapi uvicorn supabase python-dotenv better-profanity
```

### 2) Configuration

Provide Supabase credentials via environment variables or a `.env` file in the project root:

```ini
# .env
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_KEY=YOUR_SERVICE_ROLE_OR_ANON_KEY
```

> **Note:** For server-side code, prefer the **service role key**. If **RLS** is enabled on `messages`, ensure policies allow the service role to perform inserts/selects.

### 3) Run the API

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

If using **GitHub Codespaces**, forward port **8000** and set **Visibility** to *Public* (or keep *Private* and include the `X-Github-Token` header when testing).

---

## Data Model Assumptions

The code expects a table `public.messages` with (at minimum) the following columns, all enforced by DB constraints:

* `match_id` (UUID, FK → `match_records.match_id`)
* `sender_id` (UUID, FK → `user_profiles.user_id`)
* `recipient_id` (UUID, FK → `user_profiles.user_id`)
* `conversation_thread_id` (UUID)
* `message_sequence` (INT, ≥ 1; unique within a thread alongside `conversation_thread_id`)
* `message_content` (TEXT, 1–5000 chars)
* `scheduled_delivery_at` (TIMESTAMPTZ, must be > `created_at` due to `valid_delivery_time` check)
* Optional/derived: `message_id` (UUID PK, default), `created_at` (default `now()`), `message_length` (generated), `delivery_status`, `moderation_status`, etc.

> Ensure related tables (`match_records`, `user_profiles`) contain referenced rows or inserts will fail with a foreign key violation (Postgres `23503`).

---

## API Reference

### `GET /health`

**Description:** Liveness probe.

**Response 200**

```json
{ "ok": true }
```

---

### `POST /messages`

**Description:** Create a single message row. The server validates and normalizes `scheduled_delivery_at` to ensure it is strictly in the future (auto-bumps by 5 minutes if needed).

**Request Body**

```json
{
  "match_id": "<uuid>",
  "sender_id": "<uuid>",
  "recipient_id": "<uuid>",
  "conversation_thread_id": "<uuid>",
  "message_sequence": 1,
  "message_content": "Hello world",
  "scheduled_delivery_at": "2025-08-16T16:40:00Z",
  "client_timezone": "UTC",
  "estimated_read_time": 1
}
```

**Validation Rules**

* `message_sequence` ≥ 1.
* `message_content` length 1–5000.
* `scheduled_delivery_at` must parse as ISO‑8601; if not > server time, it will be nudged forward by 5 minutes to satisfy DB check.
* FKs must exist in `match_records` / `user_profiles`.

**Responses**

* **201/200** – Inserted row (as returned by Supabase/PostgREST client).
* **400** –

  * Malformed `scheduled_delivery_at`.
  * Foreign key violation (`23503`).
  * Check constraint violation (`23514`), e.g., delivery time not > created\_at.
* **500** – Insert returned no data.

**Example (Thunder/JSON)**

```json
{
  "match_id": "33333333-3333-3333-3333-333333333333",
  "sender_id": "11111111-1111-1111-1111-111111111111",
  "recipient_id": "22222222-2222-2222-2222-222222222222",
  "conversation_thread_id": "44444444-4444-4444-4444-444444444444",
  "message_sequence": 1,
  "message_content": "Hello world, this is our first dummy message!",
  "scheduled_delivery_at": "2025-08-16T14:30:00Z",
  "client_timezone": "UTC",
  "estimated_read_time": 1
}
```

---

### `GET /messages`

**Description:** Cursor pagination by **`last_message_id`** (message UUID). Returns items in **chronological (oldest‑first)** order so clients can append in UI.

**Query Parameters**

* `conversation_thread_id` *(required, UUID)* – Which thread to read from.
* `last_message_id` *(optional, UUID)* – If provided, fetch messages **newer** than the given message’s `created_at`.
* `page_size` *(optional, int, default 5, 1–100)* – Page size.

**Behavior**

1. Looks up `created_at` of `last_message_id` (if provided).
2. Fetches rows with `created_at` **greater than** that timestamp, limited by `page_size`.
3. Always orders results **ASC by `created_at`**.
4. Returns a `next_cursor` (the last row’s `message_id`) and `has_more`.

**Successful Response (200)**

```json
{
  "items": [
    {
      "message_id": "...",
      "match_id": "...",
      "sender_id": "...",
      "recipient_id": "...",
      "conversation_thread_id": "...",
      "message_sequence": 7,
      "message_content": "...",
      "created_at": "2025-08-16T14:36:00Z",
      "scheduled_delivery_at": "2025-08-16T14:36:00Z",
      "client_timezone": "UTC",
      "estimated_read_time": 1,
      "delivery_status": "scheduled",
      "moderation_status": "pending"
    }
  ],
  "count": 5,
  "next_cursor": "<last_message_id>",
  "has_more": true
}
```

**Examples**

* **First page (5 messages):**

  ```http
  GET /messages?conversation_thread_id=44444444-4444-4444-4444-444444444444&page_size=5
  ```
* **Next page:** (use `next_cursor` from previous response)

  ```http
  GET /messages?conversation_thread_id=44444444-4444-4444-4444-444444444444&page_size=5&last_message_id=<next_cursor>
  ```

---

## Error Handling

The service translates common Postgres/Supabase exceptions to HTTP errors:

* **400 Bad Request**

  * Invalid ISO‑8601 for `scheduled_delivery_at`.
  * **FK violation** (`23503`): related `match_id`/`sender_id`/`recipient_id` missing.
  * **Check violation** (`23514`): e.g., `scheduled_delivery_at` must be strictly greater than `created_at`.
* **404 Not Found**

  * `last_message_id` not found during pagination cursor lookup.
* **500 Internal Server Error**

  * Insert succeeded but no representation returned (`res.data` empty).

---

## Testing Snippets

### Health

```bash
curl -i "{{BASE}}/health"
```

### Create message (JSON body)

```json
{
  "match_id": "33333333-3333-3333-3333-333333333333",
  "sender_id": "11111111-1111-1111-1111-111111111111",
  "recipient_id": "22222222-2222-2222-2222-222222222222",
  "conversation_thread_id": "44444444-4444-4444-4444-444444444444",
  "message_sequence": 12,
  "message_content": "Final pagination check 🎯",
  "scheduled_delivery_at": "2025-08-16T14:41:00Z",
  "client_timezone": "UTC",
  "estimated_read_time": 1
}
```

### Fetch first page (5 messages)

```bash
curl -i "{{BASE}}/messages?conversation_thread_id=44444444-4444-4444-4444-444444444444&page_size=5"
```

### Fetch next page (use `next_cursor`)

```bash
curl -i "{{BASE}}/messages?conversation_thread_id=44444444-4444-4444-4444-444444444444&page_size=5&last_message_id=<NEXT_CURSOR>"
```

> **Codespaces Private Ports:** add header `X-Github-Token: $GITHUB_TOKEN` to requests. For Thunder Client, define an environment with `base_url` and `github_token` and set header `X-Github-Token: {{github_token}}`.

---

## Security & RLS

* Prefer **service role key** on the server. Store secrets in `.env` (not in Git) or Codespaces secrets.
* If **Row Level Security** is **enabled** on `messages`, create policies that allow your service role to **insert/select**. Otherwise, calls will fail despite valid credentials.
* Validate/escape any user-displayed content to avoid XSS in clients.

---

## Operational Notes

* Timestamps are handled in UTC. `scheduled_delivery_at` is normalized to be > `now()`.
* For production, consider:

  * Structured logging
  * Request/response validation via Pydantic response models
  * Rate limits on create endpoints
  * Background worker to process delivery status transitions

---

## Changelog

* **1.0.0** – Initial version of the Simple Messages API docs.
