# 🔗 GlobeTalk Matchmaking API


This repository contains a simplified Matchmaking API service for connecting users with pen pals. It's a FastAPI-based service that handles basic matching using essential filters.

## 🚀 Features

- **Straightforward Matching:** Connect users based on basic preferences
- **Essential Filters:** Filter by language, age range, and exclude previous matches
- **Match Management:** Create, retrieve, and complete matches
- **Supabase Integration:** Works with existing database schemas
- **Previous Match Exclusion:** Prevent repeat matches

## ⚙️ Getting Started

### Prerequisites
- Python 3.8+
- A Supabase project with the GlobeTalk schema
- Access to the project's `.env` file with Supabase credentials

### Project Structure

```
matchmaking/
├── main.py          # FastAPI application with matching logic
└── requirements.txt # Project dependencies
```

### Setup

Navigate to the matchmaking directory:

```bash
cd services/matchmaking
```

Create a virtual environment and install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate    
python -m pip install -U pip
python -m pip install -r requirements.txt
```


Add your Supabase credentials to a `.env` file in the project root:

```env
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_KEY="your-anon-key"
```

Run the API:

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## 💾 Database Dependencies

The Matchmaking API requires the following tables in your Supabase database:

- `user_profiles` (from Core API)
- `match_records` (for storing match relationships)

### Match Records Schema

This has already been done for our penpal app. If you want to recreate the database run this SQL in Supabase SQL editor:

```sql
CREATE TABLE match_records (
    match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    user_1_id UUID NOT NULL REFERENCES user_profiles(user_id),
    user_2_id UUID NOT NULL REFERENCES user_profiles(user_id),
    match_type correspondence_enum,
    match_source match_source_enum,
    compatibility_score NUMERIC,
    time_zone_difference INT,
    status match_status_enum,
    conversation_thread_id UUID,
    first_message_sent_at TIMESTAMPTZ,
    last_message_sent_at TIMESTAMPTZ,
    total_messages_exchanged INT,
    completion_reason completion_reason_enum,
    completed_at TIMESTAMPTZ,
    user_1_rating INT,
    user_2_rating INT
);
```

## Matching Logic

The simplified matching process:

1.Get all active users

2.Exclude previous matches if requested

3.Select first available match

4.Create match record

##  API Endpoints

### Health Check

#### `GET /health`

Verifies the API service is running and responsive. This is a basic endpoint used for service monitoring and health checks.

```bash
curl -X 'GET' \
  'http://127.0.0.1:8001/health' \
  -H 'accept: application/json'
```

**Response:**
```json
{
  "status": "ok"
}
```

### Find Penpal

#### `POST /matches/find`

The core matchmaking endpoint that connects users with compatible pen pals. It:

1.Validates the requesting user exists
2.Finds potential matches from active users
3.Filters out previous matches if requested
4.Creates a new match record in the database
5.Returns the matched penpal's profile (without sensitive info)

Parameters:

* `user_id` : ID of the user requesting a match
* `preferences`: Matching criteria including:
* `match_type`: "one-time" or "long-term"
* `languages`: Preferred languages for matching
* `age_ranges`: Preferred age ranges
* `exclude_previous`: Whether to avoid previous matches

```bash
curl -X 'POST' \
  'http://127.0.0.1:8001/matches/find' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "b8f73cd2-742f-45c7-9019-54b13613de27",
    "preferences": {
      "match_type": "long-term",
      "languages": ["en", "es"],
      "age_ranges": ["26-35", "36-45"],
      "exclude_previous": true
    }
  }'
```

**Response:**
```json
{
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "thread_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "penpal_profile": {
    "age_range": "26-35",
    "primary_language": "en",
    "time_zone": "America/New_York",
    "country_code": "US",
    "bio": "Love traveling and learning!",
    "interests": ["reading", "hiking"],
    "anonymous_handle": "traveler123"
  },
  "match_type": "long-term",
  "created_at": "2025-08-17T10:30:00.000Z"
}
```

### Get User Matches

#### `GET /matches/{user_id}`

Retrieves all matches for a specific user. This endpoint:

* Fetches both active and historical matches

* Shows matches where the user is either user1 or user2

* Returns full match details including status and creation time

 Parameters: 

`user_id`: ID of the user to retrieve matches for

```bash
curl -X 'GET' \
  'http://127.0.0.1:8001/matches/b8f73cd2-742f-45c7-9019-54b13613de27' \
  -H 'accept: application/json'
```

**Response:**
```json
{
    "matches": [
        {
            "match_id": "a9de6063-1a1d-4c7c-8531-6f749f76a87d",
            "created_at": "2025-08-17T16:08:46.73274+00:00",
            "updated_at": "2025-08-17T16:08:46.73274+00:00",
            "user_1_id": "b8f73cd2-742f-45c7-9019-54b13613de27",
            "user_2_id": "22222222-2222-2222-2222-222222222222",
            "match_type": "long-term",
            "match_source": "random",
            "compatibility_score": null,
            "time_zone_difference": null,
            "status": "active",
            "conversation_thread_id": "690d37ea-bd9b-4cb1-8e46-2dc390194e90",
            "first_message_sent_at": null,
            "last_message_sent_at": null,
            "total_messages_exchanged": 0,
            "completion_reason": null,
            "completed_at": null,
            "user_1_rating": null,
            "user_2_rating": null
        }
```

### Complete Match

#### `PUT /matches/{match_id}/complete`


Marks a match as completed. This endpoint:

* Updates the match status to "completed"

* Preserves the match record for historical purposes

* typically called when a conversation naturally ends

Parameters:

`match_id`: ID of the match to complete

```bash
curl -X 'PUT' \
  'http://127.0.0.1:8001/matches/550e8400-e29b-41d4-a716-446655440000/complete' \
  -H 'accept: application/json'
```

**Response:**
```json
{
  "message": "Match completed"
}
```

## 🔧 Matching Preferences

### Match Types
- `one-time` - Single conversation session
- `long-term` - Extended pen pal relationship  
- `either` - User is flexible with match duration

### Match Status Values
- `active` - Match is currently active
- `completed` - Match finished successfully
- `abandoned` - Match was abandoned by a user
- `reported` - Match was reported for inappropriate behavior

### Filter Options
- **preferred_languages**: Array of language codes (e.g., ["en", "es", "fr"])
- **preferred_age_ranges**: Array of age ranges (e.g., ["18-25", "26-35"])
- **exclude_previous_matches**: Boolean to avoid repeat matches

## 🚨 Error Responses

| Status Code | Description                                                      |
|-------------|------------------------------------------------------------------|
| 400         | Invalid request data or malformed preferences                    |
| 404         | User profile not found or no suitable matches available          |
| 500         | Internal server error or database operation failed               |

**Example Error Response:**
```json
{
  "detail": "No penpals available"
}
```

## 🔐 Authentication

The API uses header-based authentication for certain operations:

- **X-User-Id**: Required for updating match status



