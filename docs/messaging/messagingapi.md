Here is a drop-in **README.md** you can place at your repo root. It explains what the service is, how it is wired, how to run it locally, and what each test checks and why.

---

# Simple Messages API — README

## 1. Overview

This codebase provides a small messaging service built with **FastAPI** that supports:

* Creating messages between users.
* Paging through older messages in a conversation using a cursor model.
* Searching active user profiles and returning the latest visible message per conversation.

The API is designed to run against a Supabase PostgREST backend. For tests, external calls are stubbed and monkeypatched so the suite runs fully offline.

All timestamps and “now” calculations are done in the **Africa/Johannesburg** timezone through a `now_in_sa()` helper to keep behavior deterministic and coherent for local users.

---

## 2. Architecture and key components

### 2.1 Application module

`services/messaging/main.py` is the single application module. It:

* Loads required environment variables:

  * `SUPABASE_URL`, `SUPABASE_KEY` (required)
  * `FRONTEND_URL` (optional, appended to CORS allow list if set)
* Creates a Supabase client through `create_client`.
* Creates a `FastAPI` app and configures CORS, including optionally appending `FRONTEND_URL`.
* Exposes main routes:

  * `POST /messages` — create a message
  * `POST /messages/page` — page older messages using a cursor based on `last_message_id`
  * `POST /search` — search active profiles and attach the latest visible message per conversation

### 2.2 Data access helpers

* `_safe_execute(query_like)`
  Guards database calls and maps known Postgres error codes to clean HTTP errors:

  * `23503` foreign key violation → HTTP 400 with a helpful message
  * `23514` check constraint violation → HTTP 400 with a helpful message
  * other exceptions are re-raised

* `_get_conv_map_for_user(my_user_id)`
  Returns a map of `other_user_id → conversation_thread_id` where the user is party to the conversation, regardless of side.

* `_fetch_active_profiles(user_ids, handle_filter)` and
  `_search_active_profiles_fts(user_ids, qtext)`
  Fetch or search active profiles restricted to a given ID set. The FTS path attempts a websearch query and falls back gracefully if the client lacks `text_search`.

* `_fetch_latest_visible_messages(conversation_ids, now_sa_iso, limit_cap)`
  Returns the last visible message per conversation with delivery time not in the future relative to `now_sa_iso`. This is used to decorate search results with recency context.

* `_format_latest_message(message, my_user_id)`
  Normalizes a message to a UI-friendly structure and flags whether it is from me and whether it is read.

* `_paginate_list(items, limit, offset)`
  Small utility for list pagination with clamping behavior for invalid inputs.

### 2.3 Cursor based paging

`POST /messages/page` implements cursor paging:

1. When `last_message_id` is provided, it first looks up that message’s `created_at`.
2. It then returns messages strictly older than that timestamp, sorted descending, limited by `page_size`.
3. The response includes:

   * `count`: number of rows returned
   * `has_more`: whether the page was filled to capacity and thus likely has older messages
   * `next_cursor`: the `message_id` of the oldest message in this page if more older messages are likely

This gives a stable backward pagination experience even under concurrent inserts, since the cutoff is the known `created_at` of a specific message.

### 2.4 Message creation

`POST /messages`:

* Calculates the next `message_sequence` for the thread if needed.
* Persists message content and scheduled delivery time.
* If `letter_styles` is provided in the request, the field is copied into the insert payload. If it is omitted, the field is not persisted at all.

### 2.5 Timezone

All “now” values are sourced from `now_in_sa()` which returns an aware datetime in `Africa/Johannesburg`. Tests fix this function to a consistent timestamp using `monkeypatch` for determinism.

---

## 3. Environment and local setup

### 3.1 Requirements

* Python 3.11+ recommended
* FastAPI, Uvicorn, Pydantic
* Supabase Python client (for real runs; tests stub this)
* pytest

### 3.2 Environment variables

These must be present for a real application import:

* `SUPABASE_URL`
* `SUPABASE_KEY`

Optional:

* `FRONTEND_URL`
  If set, appended to the CORS allowed origins.

### 3.3 Install and run

```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

export SUPABASE_URL="https://your-instance.supabase.co"
export SUPABASE_KEY="service-role-or-anon-key"
export FRONTEND_URL="https://your-frontend.example"

uvicorn services.messaging.main:app --reload
```

---

## 4. Testing strategy

The suite is split into **unit** and **integration** tests.

* **Unit tests**
  Exercise pure functions and small helpers. External calls are replaced with fakes. No HTTP client is used. These are fast and highly isolated.

* **Integration tests**
  Exercise route wiring, import time configuration, and realistic request flows via `fastapi.testclient.TestClient`, while still using in memory fakes for data access. These give confidence that the app boundary behaves correctly without a live database.

### 4.1 Running tests

```bash
# run everything quietly
pytest -q

# only unit tests
pytest -m unit -q

# only integration tests
pytest -m integration -q

# with coverage
pytest -q --cov=services.messaging.main --cov-report=term-missing

# generate a browsable report
pytest --cov=services --cov-report=html

```

A `pytest.ini` defines markers:

```ini
[pytest]
markers =
    unit: fast, isolated tests that mock I/O and do not spin up external services
    integration: exercises app wiring or API routes with TestClient or import-time wiring
```

---

## 5. Test catalogue and expected results

Below is a compact map of what each test ensures and why it matters.

### 5.1 Unit tests

**`tests/unit/test_safe_execute.py`**

* `test_safe_execute_fk_violation`
  Confirms foreign key errors become HTTP 400 with a helpful message. This prevents leaking raw database errors to clients.
* `test_safe_execute_check_violation`
  Confirms check constraint errors become HTTP 400.
* `test_safe_execute_other_exception`
  Confirms unknown exceptions bubble up so they can be observed and fixed, rather than being silently coerced.

**`tests/unit/test_profiles_and_search_helpers.py`**

* `test_search_users_impl_no_conversations`
  With no conversations, search returns an empty set. Avoids unnecessary calls.
* `test_search_users_impl_no_profiles`
  With conversations but no matching profiles, returns empty set. Ensures correct filtering.
* `test_search_users_impl_pagination`
  Validates pagination logic over profile results when `limit` and `offset` are provided.
* `test_fetch_active_profiles_no_filter` and `test_fetch_active_profiles_with_filter`
  Ensure filtered fetch returns correct rows.
* `test_search_active_profiles_fts_inbox_behavior`
  Special case for empty query text acting like an inbox listing.
* `test_search_active_profiles_fts_websearch_success`
  Exercises the happy path with FTS websearch syntax, through a fake query builder.
* `test_search_active_profiles_fts_fallback_operator`
  If `text_search` is not available in the client, fallback filter logic still functions.
* `test_fetch_active_profiles_empty_ids` and `test_search_active_profiles_fts_empty_ids`
  Short circuit behavior for empty input sets to save work and time.

**`tests/unit/test_messages_helpers.py`**

* `test_format_latest_message_none_returns_none`
  Defensive programming around empty inputs.
* `test_fetch_latest_visible_messages_fastreturn_for_empty`
  Returns immediately for empty sets, a performance guard.
* `test_fetch_latest_visible_messages_picks_latest`
  Given multiple messages per conversation, the newest valid one is chosen.
* `test_get_conv_map_for_user_both_roles`
  The function correctly merges conversations regardless of user position.

**`tests/unit/test_pagination_and_flags.py`**

* `test_paginate_list_negative_offset_and_zero_limit`
  Limits are clamped to safe defaults for robustness.
* `test_format_latest_message_read_flags`
  Flags `from_me` and `is_read` are set correctly based on user id and read time.

### 5.2 Integration tests

**`tests/integration/test_api_messages_page.py`**

* `test_messages_page_with_cursor_short_page`
  When a page comes back with fewer rows than `page_size`, the API returns `has_more=False` and sets `next_cursor` to the last row. Validates correct termination semantics.
* `test_messages_page_with_cursor_empty_result`
  When no rows are returned for the next page, `count=0`, `has_more=False`, and `next_cursor=None`. Validates empty page response rather than error.
* `test_page_messages_cursor_lines`

  1. If the service cannot find `last_message_id`, it raises HTTP 404.
  2. When the page is exactly full, `has_more=True` and `next_cursor` points to the oldest message in the returned page. Validates both error and full page branch.

**`tests/integration/test_api_messages_send.py`**

* `test_message_content_too_long_422`
  Validates request body validation. Oversized messages are rejected with HTTP 422 by FastAPI validation.
* `test_send_message_insert_failure`
  If insert returns no echo row, the API returns HTTP 500 with `Failed to insert message`. Ensures clear failure instead of silent acceptance.
* `test_send_message_omits_letter_styles_when_none`
  Confirms that when `letter_styles` is not provided, the insert payload does not include it. This prevents null fields from being stored incorrectly.

**`tests/integration/test_module_import_and_app_wiring.py`**

* `test_import_guard_raises_without_env`
  On module import, missing `SUPABASE_URL` or `SUPABASE_KEY` triggers a `RuntimeError`. This prevents running with an invalid configuration.
* `test_cors_frontend_url_is_appended`
  If `FRONTEND_URL` is provided, it is appended to allowed origins. Validates CORS wiring.
* `test_send_message_letter_styles_line_is_hit`
  Proves the code path that copies `letter_styles` into the insert payload is executed and effective.

**`tests/integration/test_search_route_wrapper.py`**

* `test_search_route_wrapper_executes`
  Exercises the search flow end to end with minimal stubs, confirming the route wrapper composes helpers correctly and returns a well formed result with a latest message attached.

---

## 6. How the tests achieve determinism

* **Time control**
  Every test that depends on “now” uses `monkeypatch.setattr(module, "now_in_sa", lambda: fixed_now)` so assertions do not vary with wall clock.

* **Database fakes**

  * A simple `Resp` class exposes a `.data` attribute, mirroring the shape returned by Supabase client calls.
  * `_safe_execute` is monkeypatched to return deterministic sequences of data across calls. Tests use a small counter dict, for example `calls = {"i": 0}`, to drive the behavior across sequential calls.

* **Query builder fakes**
  A minimal class provides chainable no-op methods such as `select`, `eq`, `order`, `limit`, `single` so that route code can run unchanged while the test supplies the actual results through `_safe_execute`.

This allows coverage of real control flow without requiring a live database.

---

## 7. Coverage goals and CI tips

* Target high coverage on:

  * Error mapping in `_safe_execute`
  * Cursor paging branch points
  * Import guard and CORS wiring
  * Message creation code paths with and without optional fields

* Example CI step:

  ```yaml
  - name: Run tests
    run: |
      pip install -r requirements-dev.txt
      pytest -q --cov=services.messaging.main --cov-report=term-missing
  ```

---

## 8. Troubleshooting

* **Import raises “Missing SUPABASE\_URL or SUPABASE\_KEY”**
  You are importing the module for a real run without the environment set. For local development, export both variables or rely on `.env` and `python-dotenv`.
  In tests, the `test_module_import_and_app_wiring.py` file demonstrates how the module is re-executed with a stubbed Supabase and patched environment.

* **Tests fail because of network calls**
  Ensure you are not importing a different module path that creates a real client. All integration tests included here stub either `supabase` or `_safe_execute` to avoid network access.

---

## 9. Summary

This service provides a small but complete messaging API with careful handling of:

* Deterministic time
* Clean error mapping from database errors
* Stable cursor based pagination
* Optional field persistence
* Search and latest message decoration

The test suite verifies both unit level helpers and integrated route behavior with deterministic fakes, giving strong confidence in correctness without any external dependencies.
