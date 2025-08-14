# Content Moderation & Profanity Filter API Documentation

## 1. Overview

This API allows you to detect and censor profanity in text. There are two types of users:

* **External Users** → Authenticated via **API key** (usage is tracked and limited).
* **Internal Users** → Authenticated via **User ID** (violations are tracked, but no usage limit).

## 2. Features

* Detect profanity using `better-profanity`.
* Censor profane words in the returned text.
* Track:
  * **External users** → API usage count + enforce usage limits.
  * **Internal users** → Profanity violations count.
* Store logs of all checks in **Supabase**.

## 3. Requirements

**Install Python packages**

```bash
pip install fastapi uvicorn better-profanity supabase python-dotenv
```

**Environment variables**

Create a `.env` file:

```env
SUPABASE_URL=your-supabase-project-url
SUPABASE_KEY=your-supabase-anonymous-key
```

## 4. Database Setup (Already Created)

This has already been done for our penpal app. If you want to recreate the database run this
SQL in Supabase SQL editor:

```sql
-- External users table
create table external_users (
    id uuid primary key default gen_random_uuid(),
    api_key text unique not null,
    usage_count int default 0,
    usage_limit int default 100
);

-- Internal users table
create table internal_users (
    id uuid primary key default gen_random_uuid(),
    name text,
    violation_count int default 0
);

-- Usage logs table
create table usage_logs (
    id uuid primary key default gen_random_uuid(),
    user_type text not null, -- 'internal' or 'external'
    user_id uuid not null,
    text text not null,
    contains_profanity boolean not null,
    created_at timestamptz default now()
);
```

## 5. Running the API

**Start server**

```bash
uvicorn main:app --reload
```

If your file is named `main.py`, the API will be available at:

```
http://127.0.0.1:8000
```

## 6. Endpoints

### POST `/check`

Checks a given text for profanity and returns the result.

**Headers**

* **Internal User** → `X-User-Id: <uuid>`
* **External User** → `X-Api-Key: <api_key>`

Only **one** of these headers should be provided.

**Request Body**

```json
{
  "text": "This is a bad word example"
}
```

**Response**

```json
{
  "contains_profanity": true,
  "censored_text": "This is a **** word example"
}
```

## 7. Example Requests

### Internal User Request

```bash
curl -X POST "http://127.0.0.1:8000/check" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 123e4567-e89b-12d3-a456-426614174000" \
  -d '{"text": "You are an idiot"}'
```

**Response:**

```json
{
  "contains_profanity": true,
  "censored_text": "You are an ****"
}
```

This will increment the `violation_count` in the `internal_users` table if profanity is detected.

### External User Request

```bash
curl -X POST "http://127.0.0.1:8000/check" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: my-secret-api-key" \
  -d '{"text": "This is damn funny"}'
```

**Response:**

```json
{
  "contains_profanity": true,
  "censored_text": "This is **** funny"
}
```

This will increment `usage_count` for the given API key and check if the limit is reached.

## 8. Error Responses

| Status Code | Description |
|-------------|-------------|
| **400** | Missing or invalid authentication header. |
| **401** | Invalid API key. |
| **404** | Internal user not found. |
| **429** | API usage limit reached (external users only). |

Example error:

```json
{
  "detail": "Usage limit reached"
}
```

## 9. Logging

Every request is stored in the `usage_logs` table with:

* User type (`internal` / `external`)
* User ID
* Original text
* Whether profanity was found
* Timestamp