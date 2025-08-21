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
Navigate to the matchmaking directory:

```bash
cd services/moderation
```

Create a virtual environment and install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate    
python -m pip install -U pip
python -m pip install -r requirements.txt
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
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Authentication & Session
    anonymous_handle VARCHAR(50) UNIQUE NOT NULL, -- Generated handle
    password_hash VARCHAR(255) NOT NULL,
    session_token VARCHAR(255),
    last_active TIMESTAMP WITH TIME ZONE,
    
    -- Profile Information
    age_range age_range_enum NOT NULL, -- '18-25', '26-35', '36-45', '46+'
    primary_language language_code NOT NULL, -- ISO 639-1
    secondary_languages language_code[],
    time_zone VARCHAR(50) NOT NULL, -- IANA time zone
    country_code CHAR(2) NOT NULL, -- ISO 3166-1 alpha-2
    region VARCHAR(100), -- State/province (optional)
    
    -- Cultural Profile
    bio TEXT CHECK (char_length(bio) <= 500),
    interests TEXT[] CHECK (array_length(interests, 1) <= 10),
    favorite_local_fact TEXT CHECK (char_length(favorite_local_fact) <= 200),
    
    -- Preferences
    preferred_correspondence_type correspondence_enum DEFAULT 'either', -- 'one-time', 'long-term', 'either'
    max_active_conversations INTEGER DEFAULT 3 CHECK (max_active_conversations <= 10),
    preferred_time_zone_distance INTEGER DEFAULT 6, -- Hours difference preference
    
    -- Privacy & Safety
    account_status status_enum DEFAULT 'active', -- 'active', 'suspended', 'banned', 'deleted'
    privacy_level privacy_enum DEFAULT 'standard', -- 'minimal', 'standard', 'detailed'
    blocked_users UUID[],
    reported_count INTEGER DEFAULT 0,
    
    CONSTRAINT valid_languages CHECK (primary_language = ANY(secondary_languages) = false)
);

-- Indexes
CREATE INDEX idx_user_profiles_matching ON user_profiles 
    (account_status, country_code, primary_language, age_range) 
    WHERE account_status = 'active';
CREATE INDEX idx_user_profiles_time_zone ON user_profiles (time_zone);
CREATE INDEX idx_user_profiles_last_active ON user_profiles (last_active);

-- Usage logs table
CREATE TABLE moderation_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Target Information
    target_type target_type_enum NOT NULL, -- 'user', 'message', 'match'
    target_id UUID NOT NULL,
    reported_user_id UUID REFERENCES user_profiles(user_id),
    reporting_user_id UUID REFERENCES user_profiles(user_id),
    
    -- Report Details
    violation_type violation_type_enum NOT NULL, -- 'spam', 'harassment', 'inappropriate_content', 'fake_profile', 'other'
    violation_description TEXT,
    severity_level severity_enum DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    automated_detection BOOLEAN DEFAULT false,
    
    -- Resolution
    status report_status_enum DEFAULT 'open', -- 'open', 'under_review', 'resolved', 'dismissed'
    moderator_id UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    resolution_action action_enum, -- 'no_action', 'warning', 'content_removal', 'temporary_ban', 'permanent_ban'
    resolution_notes TEXT,
    appeal_status appeal_status_enum DEFAULT 'none', -- 'none', 'pending', 'approved', 'denied'
    
    -- Evidence
    evidence_message_ids UUID[],
    evidence_screenshots TEXT[], -- Base64 encoded screenshots (if any)
    system_context JSONB -- Additional context for automated reports
);

-- Indexes
CREATE INDEX idx_moderation_logs_status ON moderation_logs (status, created_at);
CREATE INDEX idx_moderation_logs_target ON moderation_logs (target_type, target_id);
CREATE INDEX idx_moderation_logs_reported_user ON moderation_logs (reported_user_id, created_at);
CREATE INDEX idx_moderation_logs_severity ON moderation_logs (severity_level, status);
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
  "text": "This is a <bad word> example"
}
```

**Response**

```json
{
  "contains_profanity": true,
  "censored_text": "This is a **** example"
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

This will increment the `reported_count` in the `user_profiles` table if profanity is detected.

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