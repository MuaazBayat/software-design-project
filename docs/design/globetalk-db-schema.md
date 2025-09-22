# GlobeTalk Database Schema Documentation

## Database Architecture

The database is hosted on **Supabase**, a PostgreSQL-based Backend-as-a-Service platform, providing:
- Real-time subscriptions
- Row Level Security (RLS)
- Edge functions support

## Schema Overview

The database consists of 8 core tables that handle user management, matchmaking, messaging, moderation, and cultural content:

```
user_profiles (Core User Data)
    ↓
match_records (User Pairings)
    ↓
messages (Communication)
    ↓
moderation_logs (Safety & Compliance)

cultural_data (Content Repository)
external_users (API Access)
passed_profiles (Matchmaking History)
user_preference_selections (Onboarding Data)
```

---

## Table Specifications

### 1. user_profiles
**Purpose**: Core user information and preferences for matchmaking and communication.

```sql
CREATE TABLE public.user_profiles (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  anonymous_handle varchar NOT NULL UNIQUE,
  last_active timestamptz,
  age_range USER-DEFINED,
  primary_language USER-DEFINED,
  secondary_languages ARRAY,
  time_zone varchar,
  country_code char,
  bio text CHECK (char_length(bio) <= 500),
  interests ARRAY CHECK (array_length(interests, 1) <= 10),
  favorite_local_fact text CHECK (char_length(favorite_local_fact) <= 200),
  preferred_correspondence_type USER-DEFINED DEFAULT 'either'::correspondence_enum,
  max_active_conversations int DEFAULT 3 CHECK (max_active_conversations <= 10),
  preferred_time_zone_distance int DEFAULT 6,
  account_status USER-DEFINED DEFAULT 'active'::status_enum,
  privacy_level USER-DEFINED DEFAULT 'standard'::privacy_enum,
  blocked_users ARRAY,
  reported_count int DEFAULT 0,
  match_eligibility_score numeric DEFAULT 1.0,
  cultural_completeness_score numeric,
  clerk_id text DEFAULT 'NULL'::text UNIQUE
);
```

**Key Features**:
- Anonymous handles ensure privacy while maintaining identity
- Flexible language support with primary/secondary options
- Geographic and time zone preferences for better matching
- Built-in safety through blocked users and eligibility scoring

### 2. match_records
**Purpose**: Tracks user pairings and relationship lifecycle management.

```sql
CREATE TABLE public.match_records (
  match_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_1_id uuid NOT NULL REFERENCES user_profiles(user_id),
  user_2_id uuid NOT NULL REFERENCES user_profiles(user_id),
  match_type USER-DEFINED NOT NULL,
  match_source USER-DEFINED DEFAULT 'random'::match_source_enum,
  compatibility_score numeric,
  time_zone_difference int,
  status USER-DEFINED DEFAULT 'active'::match_status_enum,
  conversation_thread_id uuid,
  first_message_sent_at timestamptz,
  last_message_sent_at timestamptz,
  total_messages_exchanged int DEFAULT 0,
  completion_reason USER-DEFINED,
  completed_at timestamptz,
  user_1_rating int CHECK (user_1_rating >= 1 AND user_1_rating <= 5),
  user_2_rating int CHECK (user_2_rating >= 1 AND user_2_rating <= 5)
);
```

**Key Features**:
- Comprehensive match lifecycle tracking
- Compatibility scoring for algorithm improvement
- Mutual rating system for quality assurance
- Analytics-ready structure for match success analysis

### 3. messages
**Purpose**: Stores and manages asynchronous message delivery with postal mail simulation.

```sql
CREATE TABLE public.messages (
  message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  match_id uuid NOT NULL REFERENCES match_records(match_id),
  sender_id uuid NOT NULL REFERENCES user_profiles(user_id),
  recipient_id uuid NOT NULL REFERENCES user_profiles(user_id),
  conversation_thread_id uuid NOT NULL,
  message_sequence int NOT NULL,
  message_content text NOT NULL CHECK (char_length(message_content) >= 1 AND char_length(message_content) <= 5000),
  message_length int DEFAULT char_length(message_content),
  contains_emoji boolean DEFAULT false,
  detected_language USER-DEFINED,
  scheduled_delivery_at timestamptz NOT NULL,
  read_at timestamptz,
  delivery_status USER-DEFINED DEFAULT 'scheduled'::delivery_status_enum,
  moderation_status USER-DEFINED DEFAULT 'pending'::moderation_enum,
  moderation_flags ARRAY,
  moderator_id uuid,
  moderated_at timestamptz,
  client_timezone varchar,
  estimated_read_time int,
  letter_styles jsonb
);
```

**Key Features**:
- Scheduled delivery system simulating postal delays
- Built-in content moderation workflow
- Rich metadata for analytics and user experience
- Sequence tracking for conversation ordering
- Flexible styling options via JSONB

### 4. moderation_logs
**Purpose**: Comprehensive safety and moderation system for user protection.

```sql
CREATE TABLE public.moderation_logs (
  log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  target_type USER-DEFINED NOT NULL,
  target_id uuid NOT NULL,
  reported_user_id uuid REFERENCES user_profiles(user_id),
  reporting_user_id uuid REFERENCES user_profiles(user_id),
  violation_type USER-DEFINED NOT NULL,
  violation_description text,
  severity_level USER-DEFINED DEFAULT 'low'::severity_enum,
  automated_detection boolean DEFAULT false,
  status USER-DEFINED DEFAULT 'open'::report_status_enum,
  moderator_id uuid,
  reviewed_at timestamptz,
  resolution_action USER-DEFINED,
  resolution_notes text,
  appeal_status USER-DEFINED DEFAULT 'none'::appeal_status_enum,
  evidence_message_ids ARRAY,
  evidence_screenshots ARRAY,
  system_context jsonb
);
```

**Key Features**:
- Multi-target moderation (messages, profiles, etc.)
- Complete audit trail for compliance
- Appeal process support
- Evidence collection and storage
- Hybrid automated and manual moderation

### 5. external_users
**Purpose**: API access management for external moderation services.

```sql
CREATE TABLE public.external_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text NOT NULL UNIQUE,
  usage_count int DEFAULT 0,
  usage_limit int DEFAULT 1000,
  group_name text
);
```

**Key Features**:
- Secure API key management
- Usage tracking and rate limiting
- Group-based access control

### 6. passed_profiles
**Purpose**: Matchmaking history to prevent repeated unwanted pairings.

```sql
CREATE TABLE public.passed_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  passed_user_id text NOT NULL,
  passed_at timestamptz DEFAULT now()
);
```

**Key Features**:
- Prevents match recycling
- Improves user experience through learned preferences
- Supports matchmaking algorithm refinement

### 7. user_preference_selections
**Purpose**: Onboarding preference storage for personalized experience.

```sql
CREATE TABLE public.user_preference_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES user_profiles(user_id),
  selected_profile_id text NOT NULL,
  selected_at timestamptz DEFAULT now(),
  preference_type text NOT NULL
);
```

**Key Features**:
- Captures initial user preferences
- Enables personalization from first use

---

## Design Justifications

### Database Platform Choice: Supabase

**Advantages**:
- **Real-time capabilities**: Essential for live messaging features
- **Row Level Security**: Ensures data privacy and compliance
- **PostgreSQL foundation**: Provides ACID compliance and complex query support

### Schema Design Principles

#### 1. **Privacy by Design**
- Anonymous handles instead of real names
- UUID-based identifiers prevent enumeration
- Blocked users arrays for user-controlled privacy
- Geographical approximation rather than exact locations

#### 2. **Scalability Architecture**
- UUID primary keys prevent collision in distributed systems
- Indexed timestamp columns for efficient querying
- JSONB for flexible, schema-less data where needed
- Array columns for multi-value attributes

#### 3. **Content Moderation Strategy**
- Proactive moderation status tracking
- Appeal process integration
- Automated and possible manual moderation support

#### 4. **User Experience Optimization**
- Match compatibility tracking improves algorithm
- Message delivery scheduling simulates postal experience
- Preference learning prevents repeated unwanted matches

### Security Considerations

1. **Row Level Security (RLS)**: Implemented through Supabase policies
2. **API Rate Limiting**: Built into external_users table
3. **Audit Trails**: Complete moderation and action logging

### Performance Optimizations

1. **Indexing Strategy**:
   - Primary key UUIDs with B-tree indexes
   - Compound indexes on frequently queried combinations
   - Partial indexes for status-based queries

2. **Query Efficiency**:
   - Normalized design reduces data redundancy
   - Array columns reduce join operations

3. **Caching Strategy**:
   - Cultural data cached at application layer
   - User preferences cached for matchmaking
   - Message delivery scheduled in background

---

## Deployment Architecture

### Production Environment
```
Client Applications
    ↓
Supabase Edge (Global CDN)
    ↓
Supabase API Gateway
    ↓
PostgreSQL Database (Primary)
    ↓
Read Replicas (Analytics)
```

### Monitoring and Observability
- Real-time database performance metrics
- Query performance analysis
- User activity tracking
- Moderation queue monitoring
- API usage analytics

---