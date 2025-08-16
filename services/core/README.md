# 🌐 GlobeTalk Core API

This repository contains the Core API service for the GlobeTalk application. It is a FastAPI-based microservice that handles all user profile management.

The API is responsible for creating, retrieving, and updating user profiles, as well as managing match records and message storage.

## 🚀 Features

- **User Profile Management:** Create, retrieve, and update detailed user profiles with information such as languages, interests, time zone, and a short bio.
- **Supabase Integration:** Connects to a Supabase database to securely store all application data.
- **Clerk Authentication:** Designed to work with a frontend that uses Clerk for user authentication, identifying profiles using a unique `user_id`.
- **Data Models:** Uses Pydantic to ensure all API requests and responses are validated against a consistent data schema.

## ⚙️ Getting Started

### Prerequisites

- Python 3.10+
- A Supabase project
- Access to the project's `.env` file with Supabase credentials

### Project Structure

```
core/
├── main.py          # FastAPI application with endpoints
├── database.py      # Supabase client setup
├── models.py        # Pydantic data models
└── requirements.txt # Project dependencies
```

### Setup

Navigate to the core directory:

```bash
cd services/core
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `.env` file:

Add your Supabase credentials to a `.env` file in the core directory:

```env
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_KEY="your-anon-key"
```

## 💾 Database Setup

The API requires a full database schema to function correctly. For the complete SQL script, please refer to the following repository:

[https://github.com/200-Not-OK/TestDoc](https://github.com/200-Not-OK/TestDoc)

## 📚 Endpoints

### Examples

#### `POST /profiles/`

This example creates a new user profile with a full data payload.

```bash
curl -X 'POST' \
  'http://127.0.0.1:8000/profiles/' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "age_range": "26-35",
    "primary_language": "fr",
    "secondary_languages": ["en"],
    "time_zone": "Europe/Paris",
    "country_code": "FR",
    "bio": "A student of culture and history from France.",
    "interests": ["history", "art", "travel"],
    "user_id": "test-user-id-12345",
    "anonymous_handle": "globetrotter"
  }'
```

**Example Output**
```json
{
  "age_range": "26-35",
  "primary_language": "fr",
  "secondary_languages": [
    "en"
  ],
  "time_zone": "Europe/Paris",
  "country_code": "FR",
  "bio": "A student of culture and history from France.",
  "interests": [
    "history",
    "art",
    "travel"
  ],
  "user_id": "test-user-id-12345",
  "anonymous_handle": "globetrotter",
  "created_at": "2025-08-16T11:00:00.000Z",
  "updated_at": "2025-08-16T11:00:00.000Z",
  "last_active": null
}
```

#### `GET /profiles/{user_id}`

This example retrieves the profile for a user with the ID `b8f73cd2-742f-45c7-9019-54b13613de27`.

```bash
curl -X 'GET' \
  'http://127.0.0.1:8000/profiles/b8f73cd2-742f-45c7-9019-54b13613de27' \
  -H 'accept: application/json'
```

**Example Output**
```json
{
  "age_range": "36-45",
  "primary_language": "en",
  "secondary_languages": [
    "es",
    "fr"
  ],
  "time_zone": "America/New_York",
  "country_code": "ZA",
  "bio": "A passionate conversationalist looking to connect with people from around the globe to discuss music, technology, and culture.",
  "interests": [
    "technology",
    "music",
    "gaming"
  ],
  "user_id": "b8f73cd2-742f-45c7-9019-54b13613de27",
  "anonymous_handle": "diddy",
  "created_at": "2025-08-16T10:42:12.459384Z",
  "updated_at": "2025-08-16T10:42:12.459384Z",
  "last_active": "2025-08-16T10:42:12.459384Z"
}
```

#### `PUT /profiles/{user_id}`

This example updates only the `country_code` for the specified user, demonstrating a partial update.

```bash
curl -X 'PUT' \
  'http://127.0.0.1:8000/profiles/b8f73cd2-742f-45c7-9019-54b13613de27' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "country_code": "ZA"
  }'
```

**Example Output**
```json
{
  "age_range": "36-45",
  "primary_language": "en",
  "secondary_languages": [
    "es",
    "fr"
  ],
  "time_zone": "America/New_York",
  "country_code": "ZA",
  "bio": "A passionate conversationalist looking to connect with people from around the globe to discuss music, technology, and culture.",
  "interests": [
    "technology",
    "music",
    "gaming"
  ],
  "user_id": "b8f73cd2-742f-45c7-9019-54b13613de27",
  "anonymous_handle": "diddy",
  "created_at": "2025-08-16T10:42:12.459384Z",
  "updated_at": "2025-08-16T10:55:47.000Z",
  "last_active": "2025-08-16T10:42:12.459384Z"
}
```

## 🚨 Error Responses

| Status Code | Description                                                      |
|-------------|------------------------------------------------------------------|
| 404         | Internal user not found.                                         |
| 422         | The request body is unprocessable, likely due to a syntax error. |

## 🤝 Contributing

See the main `README.md` in the project root for contribution guidelines.
