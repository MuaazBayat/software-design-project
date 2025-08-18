# Core 
The Heart of User Profiles

The Core API is a central microservice for the GlobeTalk application, built using FastAPI. Its primary function is to handle all aspects of user profiles, ensuring a consistent and secure way to manage user data across the platform. Think of it as the central hub for user identity and personalization.

## Key Responsibilities

The Core API manages a user's entire profile lifecycle, from initial creation to ongoing updates. This service is essential for features like:

- **User Profile Management**: It creates and maintains detailed user profiles, including interests, languages, time zones, and bios. This information is critical for matching users and personalizing their experience.

- **Data Consistency**: It acts as the single source of truth for user profile data, ensuring that other services in the application always retrieve the most accurate and up-to-date information.

- **Secure Storage**: It securely connects to a Supabase database to store all profile data, protecting sensitive user information.

## Integration with the GlobeTalk Application

As outlined in the project plan, the GlobeTalk application is built on several key API modules. The Core API serves as the dedicated Profile API, providing the foundational user data that powers many of the app's features.

- **For Matchmaking**: The Matchmaking API relies on the Core API to retrieve user profiles. It queries the Core API to find the necessary information, such as language preferences and interests, to connect users anonymously with new pen pals.

- **For User Experience**: The UI modules, specifically the Cultural Explorer and Settings & Safety screens, communicate directly with the Core API. This allows users to view and update their profile details seamlessly.

## Benefits of a Dedicated Core API

Having a separate, dedicated service for user profiles offers several key advantages for our development and the application's performance.

- **Scalability**: The Core API can be scaled independently from other services. If user profile management becomes a bottleneck due to high traffic, we can scale this service up without needing to affect the entire application.

- **Modularity**: This design makes the system easier to manage. Developers can work on profile-related features without impacting the codebase for messaging or matchmaking. This simplifies development, debugging, and maintenance.

- **Single Source of Truth**: Centralizing all user profile data in one service prevents data duplication and ensures that every part of the application is working with the same, consistent information.

## Folder Structure

```
core/
├── main.py        # FastAPI application with endpoints
├── database.py    # Supabase client setup
├── models.py      # Pydantic data models
└── requirements.txt # Project dependencies
```

## Local Development

For local development, you'll need to set up a Python virtual environment to manage dependencies.

### Prerequisites

- Python 3.10+
- A Supabase project
- Access to the project's `.env` file with Supabase credentials

### Setup

1. **Create a Virtual Environment**:
   Navigate to the core directory and create a new virtual environment.

   ```bash
   cd services/core
   python -m venv venv
   ```

2. **Activate the Virtual Environment**:

   On Windows:
   ```bash
   .\venv\Scripts\activate
   ```

   On macOS/Linux:
   ```bash
   source venv/bin/activate
   ```

3. **Install Dependencies**:
   Once the virtual environment is active, install the required packages.

   ```bash
   pip install -r requirements.txt
   ```

4. **Create .env File**:
   Add your Supabase credentials to a `.env` file in the core directory.

   ```
   SUPABASE_URL="https://your-project-ref.supabase.co"
   SUPABASE_KEY="your-anon-key"
   ```

## Core API Endpoints

The Core API provides endpoints for managing user profiles, including:

- **POST `/profiles/`**: Creates a new user profile.
- **GET `/profiles/{user_id}`**: Retrieves a specific user's profile.
- **PUT `/profiles/{user_id}`**: Updates an existing user profile (supports partial updates).