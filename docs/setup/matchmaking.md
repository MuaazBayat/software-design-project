# Matchmaking API Documentation

A FastAPI-based service for connecting users with international pen pals through intelligent matching algorithms and preference learning.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Matching Logic](#matching-logic)
- [Error Handling](#error-handling)
- [Database Schema](#database-schema)

## Overview

The GlobeTalk Matchmaking API facilitates meaningful connections between users worldwide by:

- **Intelligent Matching**: Uses compatibility scoring based on languages, interests, age ranges, and cultural diversity
- **Preference Learning**: Learns from user selections to improve future matches
- **Daily Limits**: Implements reasonable usage limits to encourage thoughtful connections
- **Pass Tracking**: Prevents showing the same profiles repeatedly while allowing resets
- **Profile Suggestions**: Provides preview profiles without consuming daily matches

### Key Features

- Advanced compatibility scoring algorithm
- Timezone-aware matching
- Cultural completeness scoring
- Filter prioritization
- Automatic passed user reset mechanism
- Mix of real and synthetic profiles for preference training

## Getting Started

### Prerequisites

- Python 3.8+
- Supabase project with GlobeTalk schema
- Environment variables configured

### Installation

```bash
# Navigate to matchmaking directory
cd services/matchmaking

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Environment Configuration

Create a `.env` file in your project root:

```env
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_KEY="your-anon-key"
```

## Authentication

The API uses Clerk ID-based authentication. Include the user's Clerk ID in request bodies or path parameters as specified in each endpoint.

##  API Endpoints

### Health Check

#### `GET /health`

Verifies API service health and returns version information.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-30T10:30:00.000Z",
  "version": "2.0.0"
}
```

---

### User Profile Management

#### `GET /user/profile/{clerk_id}`

Retrieves the authenticated user's profile information.

**Parameters:**
- `clerk_id` (path): User's Clerk authentication ID

**Example Request:**
```bash
curl -X 'GET' \
  'http://localhost:8001/user/profile/clerk_user_123' \
  -H 'accept: application/json'
```

**Response:**
```json
{
  "profile": {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "anonymous_handle": "CulturalExplorer",
    "bio": "Passionate about cross-cultural exchange...",
    "age_range": "26-35",
    "primary_language": "en",
    "secondary_languages": ["es", "fr"],
    "time_zone": "America/New_York",
    "country_code": "US",
    "interests": ["travel", "cooking", "history"],
    "favorite_local_fact": "NYC has over 200 languages spoken",
    "preferred_correspondence_type": "long-term",
    "cultural_completeness_score": 0.85
  }
}
```

#### `GET /user/stats/{clerk_id}`

Returns daily matching statistics and limits.

**Example Request:**
```bash
curl -X 'GET' \
  'http://localhost:8001/user/stats/clerk_user_123' \
  -H 'accept: application/json'
```

**Response:**
```json
{
  "matches_used": 2,
  "matches_remaining": 3,
  "total_daily_limit": 5,
  "reset_time": "2025-08-31T00:00:00.000Z"
}
```

---

### Profile Discovery

#### `GET /profiles/suggestions/{clerk_id}`

Get profile suggestions without consuming daily matches. Supports filtering and prioritization.

**Query Parameters:**
- `limit` (optional): Number of profiles to return (default: 1, max: 50)
- `languages` (optional): Comma-separated language codes
- `age_ranges` (optional): Comma-separated age ranges
- `interests` (optional): Comma-separated interests
- `match_type` (optional): "long-term", "one-time", or "either"

**Example Request:**
```bash
curl -X 'GET' \
  'http://localhost:8001/profiles/suggestions/clerk_user_123?limit=3&languages=en,es&age_ranges=26-35,36-45&interests=travel,cooking&match_type=long-term' \
  -H 'accept: application/json'
```

**Response:**
```json
[
  {
    "user_id": "456e7890-e89b-12d3-a456-426614174001",
    "anonymous_handle": "TokyyoWanderer",
    "bio": "Love exploring traditional arts and modern culture",
    "age_range": "26-35",
    "primary_language": "ja",
    "secondary_languages": ["en"],
    "time_zone": "Asia/Tokyo",
    "country_code": "JP",
    "interests": ["art", "travel", "photography"],
    "favorite_local_fact": "Tokyo has more Michelin stars than any other city",
    "preferred_correspondence_type": "long-term"
  }
]
```

#### `POST /profiles/pass`

Record that a user has passed on a suggested profile.

**Request Body:**
```json
{
  "clerk_id": "clerk_user_123",
  "passed_user_id": "456e7890-e89b-12d3-a456-426614174001"
}
```

**Example Request:**
```bash
curl -X 'POST' \
  'http://localhost:8001/profiles/pass' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "clerk_id": "clerk_user_123",
    "passed_user_id": "456e7890-e89b-12d3-a456-426614174001"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Profile pass recorded"
}
```

---

### Preference Learning

#### `GET /preferences/profiles/{clerk_id}`

Get a curated set of profiles (mix of real and synthetic) for preference training.

**Example Request:**
```bash
curl -X 'GET' \
  'http://localhost:8001/preferences/profiles/clerk_user_123' \
  -H 'accept: application/json'
```

**Response:**
```json
[
  {
    "profile_id": "fake-1",
    "anonymous_handle": "Elara",
    "country_code": "JP",
    "bio": "Lover of traditional arts, matcha, and quiet temples",
    "interests": ["Art", "Tea", "Nature"],
    "age_range": "25-34",
    "primary_language": "ja",
    "favorite_local_fact": "Kyoto was the imperial capital for over 1,000 years",
    "is_real": false
  },
  {
    "profile_id": "real-user-123",
    "anonymous_handle": "BookwormBerlin",
    "country_code": "DE",
    "bio": "Avid reader and coffee enthusiast",
    "interests": ["Reading", "Coffee", "Museums"],
    "age_range": "28-37",
    "primary_language": "de",
    "favorite_local_fact": "Berlin has more museums than rainy days",
    "is_real": true
  }
]
```

#### `POST /preferences/select`

Store a user's preference profile selection for improved matching.

**Request Body:**
```json
{
  "clerk_id": "clerk_user_123",
  "selected_profile_id": "fake-1",
  "preference_type": "fake"
}
```

**Example Request:**
```bash
curl -X 'POST' \
  'http://localhost:8001/preferences/select' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "clerk_id": "clerk_user_123",
    "selected_profile_id": "fake-1",
    "preference_type": "fake"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Preference selection saved"
}
```

---

### Matching & Decisions

#### `POST /matches/find`

The primary matchmaking endpoint that handles both profile suggestions and match creation based on user decisions.

**Example Request:**
```bash
curl -X 'POST' \
  'http://localhost:8001/matches/find' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "clerk_id": "clerk_user_123",
    "accept": true,
    "suggested_user_id": "456e7890-e89b-12d3-a456-426614174001",
    "preferences": {
      "match_type": "long-term",
      "languages": ["en", "es"],
      "age_ranges": ["26-35"],
      "country_codes": ["JP", "DE", "FR"],
      "interests": ["travel", "art"],
      "exclude_previous": true,
      "max_timezone_difference": 6
    }
  }'
```

**Response (Accept):**
```json
{
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "thread_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "penpal_profile": {
    "user_id": "456e7890-e89b-12d3-a456-426614174001",
    "anonymous_handle": "TokyoWanderer",
    "bio": "Love exploring traditional arts and modern culture",
    "age_range": "26-35",
    "primary_language": "ja",
    "secondary_languages": ["en"],
    "time_zone": "Asia/Tokyo",
    "country_code": "JP",
    "interests": ["art", "travel", "photography"],
    "favorite_local_fact": "Tokyo has more Michelin stars than any other city",
    "preferred_correspondence_type": "long-term"
  },
  "match_type": "long-term",
  "compatibility_score": 0.87,
  "created_at": "2025-08-30T10:30:00.000Z"
}
```

**Response (Reject):**
```json
{
  "match_id": "",
  "thread_id": "",
  "penpal_profile": {
    "user_id": "456e7890-e89b-12d3-a456-426614174001",
    "anonymous_handle": "TokyoWanderer",
    "bio": "Love exploring traditional arts and modern culture",
    "compatibility_score": 0.87,
    "created_at": "2025-08-30T10:30:00.000Z"
  }
}
```

## Data Models

### UserProfile

Core user profile structure with cultural and preference information.

```json
{
  "user_id": "string",
  "anonymous_handle": "string",
  "bio": "string (optional)",
  "age_range": "string (optional)",
  "primary_language": "string (optional)",
  "secondary_languages": ["string"] (optional),
  "time_zone": "string (optional)",
  "country_code": "string (optional)",
  "interests": ["string"] (optional),
  "favorite_local_fact": "string (optional)",
  "preferred_correspondence_type": "string (optional)",
  "last_active": "string (optional)",
  "cultural_completeness_score": "number (optional)"
}
```

### MatchingPreferences

Defines user preferences for finding compatible matches.

```json
{
  "match_type": "long-term | one-time | either",
  "languages": ["string"],
  "age_ranges": ["string"],
  "country_codes": ["string"],
  "interests": ["string"],
  "exclude_previous": "boolean",
  "max_timezone_difference": "number (optional)"
}
```

### MatchResponse

Complete match information returned after successful matching.

```json
{
  "match_id": "string",
  "thread_id": "string",
  "penpal_profile": "UserProfile",
  "match_type": "string",
  "compatibility_score": "number",
  "created_at": "string (ISO 8601)"
}
```

## Matching Logic

### Compatibility Scoring Algorithm

The API uses a sophisticated multi-factor compatibility scoring system:

**Language Compatibility (35%)**
- Primary language match: +25%
- Secondary language match: +15%
- Multiple common languages: +10%
- Preference filter match: +10%

**Interest Compatibility (30%)**
- Shared interests ratio: up to 20%
- Multiple interests bonus: +10%
- Preference filter match: +5%

**Age Range Compatibility (15%)**
- Same age range: +15%
- Adjacent age range: +8%
- Two ranges apart: +3%

**Cultural Diversity Bonus (10%)**
- Different countries: +10%

**Profile Completeness (10%)**
- Based on cultural completeness score

### Preference Learning

The system learns from user selections through:

1. **Preference Profile Training**: Users select from curated profiles
2. **Similarity Scoring**: Future matches are weighted by similarity to selected preferences
3. **Combined Scoring**: 70% compatibility + 30% preference similarity

### Filter Prioritization

When users apply filters, the system:

1. **Primary Filtering**: Shows profiles matching all specified filters first
2. **Secondary Pool**: Includes other compatible profiles
3. **Boost Scoring**: Filtered matches receive score bonuses
4. **Randomization**: Adds small random factors to prevent predictable ordering

### Pass Management

**Automatic Reset Logic:**
- Tracks profiles each user has passed
- When all available profiles are passed, automatically resets
- Ensures continuous profile availability

**Reset Conditions:**
- No unpassed profiles in available pool
- Maintains user engagement without repetition

## Error Handling

### HTTP Status Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| 400 | Bad Request | Missing required fields, invalid preferences |
| 404 | Not Found | User not found, no available profiles |
| 500 | Internal Server Error | Database connectivity, unexpected errors |

### Error Response Format

```json
{
  "detail": "Descriptive error message"
}
```

### Common Error Scenarios

**Daily Limit Exceeded:**
```json
{
  "detail": "Daily match limit exceeded"
}
```

**No Profiles Available:**
```json
{
  "detail": "No compatible profiles found"
}
```

**User Not Found:**
```json
{
  "detail": "User not found for clerk_id: invalid_clerk_id"
}
```

## Database Schema

### Required Tables

The API depends on the following Supabase tables:

#### user_profiles
Core user information with cultural data.

#### match_records
Stores match relationships and conversation threads.

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

#### passed_profiles
Tracks profiles users have declined.

```sql
CREATE TABLE passed_profiles (
    user_id UUID REFERENCES user_profiles(user_id),
    passed_user_id UUID REFERENCES user_profiles(user_id),
    passed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, passed_user_id)
);
```

#### user_preference_selections
Stores user preference learning data.

```sql
CREATE TABLE user_preference_selections (
    user_id UUID REFERENCES user_profiles(user_id) PRIMARY KEY,
    selected_profile_id TEXT NOT NULL,
    preference_type TEXT NOT NULL CHECK (preference_type IN ('real', 'fake')),
    selected_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enums

```sql
CREATE TYPE correspondence_enum AS ENUM ('long-term', 'one-time', 'either');
CREATE TYPE match_status_enum AS ENUM ('active', 'completed', 'expired');
CREATE TYPE match_source_enum AS ENUM ('random', 'preference', 'filter');
CREATE TYPE completion_reason_enum AS ENUM ('natural', 'user_request', 'timeout', 'violation');
```

## Configuration

### CORS Settings

The API includes CORS middleware configured for:
- Local development (localhost, 127.0.0.1)
- Local network access (192.168.x.x)
- Production deployment (globetalk-frontend-388957617777.us-central1.run.app)

### Daily Limits

- **Match Creation**: 5 matches per user per day
- **Profile Suggestions**: Unlimited
- **Reset Time**: Midnight 

### Timezone Handling

- **Default Max Difference**: 6 hours
- **Format**: UTC±HH:MM (e.g., "UTC+02:00", "UTC-05:00")
- **Parsing**: Handles various timezone string formats

## Advanced Features

### Cultural Completeness Scoring

Profiles receive completeness scores based on:
- Bio richness and detail
- Number of interests listed
- Cultural information provided
- Engagement with local facts

### Synthetic Profile Integration

The system includes carefully crafted synthetic profiles for:
- **Preference Training**: Help users understand their preferences
- **Diversity**: Ensure representation of different cultures
- **Fallback**: Maintain service availability during low user periods

### Filter Strategy

**Prioritization Order:**
1. Profiles matching ALL specified filters
2. Profiles matching SOME filters
3. Remaining compatible profiles
4. Score-based ranking within each tier

**Dynamic Adjustments:**
- Boosts scores for filter-matching profiles
- Maintains diversity in suggestions
- Prevents filter bubbles through mixed results

## Development & Testing

### Local Development

```bash
# Start with hot reload
uvicorn main:app --reload --port 8001

# Run with specific environment
ENV=development uvicorn main:app --reload
```

### API Documentation

FastAPI automatically generates interactive documentation:
- **Swagger UI**: `http://localhost:8001/docs`
- **ReDoc**: `http://localhost:8001/redoc`

### Testing Endpoints

Use the provided examples or FastAPI's interactive documentation to test endpoints. All endpoints return detailed error messages for debugging.

## Performance Considerations

### Database Optimization

- **Indexes**: Ensure proper indexing on frequently queried fields
- **Limits**: Query limits prevent excessive data transfer
- **Pagination**: Consider implementing for large result sets

### Caching Opportunities

- **Profile Data**: Cache frequently accessed profiles
- **Compatibility Scores**: Cache computed scores for repeated matches
- **Daily Stats**: Cache daily statistics with TTL

### Scalability Notes

- **Connection Pooling**: Configure appropriate Supabase connection limits
- **Async Operations**: All database operations use async patterns
- **Memory Management**: Profile filtering happens in-memory for better performance

### API Versioning

The current API is version 2.0.0. Future versions will maintain backward compatibility where possible, with clear migration guides for breaking changes.