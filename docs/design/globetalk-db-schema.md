# GlobeTalk Database Schema Documentation

## Database Architecture

The database is hosted and deployed on **Supabase**, a Postgres based SQL Database platform, providing:
- Real-time subscriptions
- Row Level Security (RLS)
- Edge functions support
We are using supabase for plain Postgres and built in object storage. This decision was largely based on pricing as Google Cloud SQL was too expensive.

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
  user_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  anonymous_handle character varying NOT NULL UNIQUE,
  last_active timestamp with time zone,
  age_range USER-DEFINED,
  primary_language USER-DEFINED,
  secondary_languages ARRAY,
  time_zone character varying,
  country_code character,
  bio text CHECK (char_length(bio) <= 500),
  interests ARRAY CHECK (array_length(interests, 1) <= 10),
  favorite_local_fact text CHECK (char_length(favorite_local_fact) <= 200),
  preferred_correspondence_type USER-DEFINED DEFAULT 'either'::correspondence_enum,
  max_active_conversations integer DEFAULT 3 CHECK (max_active_conversations <= 10),
  preferred_time_zone_distance integer DEFAULT 6,
  account_status USER-DEFINED DEFAULT 'active'::status_enum,
  privacy_level USER-DEFINED DEFAULT 'standard'::privacy_enum,
  blocked_users ARRAY,
  reported_count integer DEFAULT 0,
  match_eligibility_score numeric DEFAULT 1.0,
  cultural_completeness_score numeric,
  clerk_id text DEFAULT 'NULL'::text UNIQUE,
  reported_users ARRAY,
  fingerprint ARRAY,
  moderator boolean DEFAULT false,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id)
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
  match_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_1_id uuid NOT NULL,
  user_2_id uuid NOT NULL,
  match_type USER-DEFINED NOT NULL,
  match_source USER-DEFINED DEFAULT 'random'::match_source_enum,
  compatibility_score numeric,
  time_zone_difference integer,
  status USER-DEFINED DEFAULT 'active'::match_status_enum,
  conversation_thread_id uuid,
  first_message_sent_at timestamp with time zone,
  last_message_sent_at timestamp with time zone,
  total_messages_exchanged integer DEFAULT 0,
  completion_reason USER-DEFINED,
  completed_at timestamp with time zone,
  user_1_rating integer CHECK (user_1_rating >= 1 AND user_1_rating <= 5),
  user_2_rating integer CHECK (user_2_rating >= 1 AND user_2_rating <= 5),
  CONSTRAINT match_records_pkey PRIMARY KEY (match_id),
  CONSTRAINT match_records_user_1_id_fkey FOREIGN KEY (user_1_id) REFERENCES public.user_profiles(user_id),
  CONSTRAINT match_records_user_2_id_fkey FOREIGN KEY (user_2_id) REFERENCES public.user_profiles(user_id)
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
  message_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  match_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  conversation_thread_id uuid,
  message_sequence integer NOT NULL,
  message_content text NOT NULL CHECK (char_length(message_content) >= 1 AND char_length(message_content) <= 5000),
  message_length integer DEFAULT char_length(message_content),
  contains_emoji boolean DEFAULT false,
  detected_language USER-DEFINED,
  scheduled_delivery_at timestamp with time zone NOT NULL,
  read_at timestamp with time zone,
  delivery_status USER-DEFINED DEFAULT 'scheduled'::delivery_status_enum,
  moderation_status USER-DEFINED DEFAULT 'pending'::moderation_enum,
  moderation_flags ARRAY,
  moderator_id uuid,
  moderated_at timestamp with time zone,
  client_timezone character varying,
  estimated_read_time integer,
  letter_styles jsonb,
  image_url text,
  letter_url text,
  CONSTRAINT messages_pkey PRIMARY KEY (message_id),
  CONSTRAINT messages_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.match_records(match_id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.user_profiles(user_id),
  CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.user_profiles(user_id)
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
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  target_type USER-DEFINED NOT NULL,
  target_id uuid NOT NULL,
  reported_user_id uuid,
  reporting_user_id uuid,
  violation_type USER-DEFINED NOT NULL,
  violation_description text,
  severity_level USER-DEFINED DEFAULT 'low'::severity_enum,
  automated_detection boolean DEFAULT false,
  status USER-DEFINED DEFAULT 'open'::report_status_enum,
  moderator_id uuid,
  reviewed_at timestamp with time zone,
  resolution_action USER-DEFINED,
  resolution_notes text,
  appeal_status USER-DEFINED DEFAULT 'none'::appeal_status_enum,
  evidence_message_ids ARRAY,
  evidence_screenshots ARRAY,
  system_context jsonb,
  CONSTRAINT moderation_logs_pkey PRIMARY KEY (log_id),
  CONSTRAINT moderation_logs_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.user_profiles(user_id),
  CONSTRAINT moderation_logs_reporting_user_id_fkey FOREIGN KEY (reporting_user_id) REFERENCES public.user_profiles(user_id)
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
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  api_key text NOT NULL UNIQUE,
  usage_count integer DEFAULT 0,
  usage_limit integer DEFAULT 1000,
  group_name text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT external_users_pkey PRIMARY KEY (id)
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
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  passed_user_id text NOT NULL,
  passed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT passed_profiles_pkey PRIMARY KEY (id)
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
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  selected_profile_id text NOT NULL,
  selected_at timestamp with time zone DEFAULT now(),
  preference_type text NOT NULL,
  CONSTRAINT user_preference_selections_pkey PRIMARY KEY (id),
  CONSTRAINT user_preference_selections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id)
);
```

**Key Features**:
- Captures initial user preferences
- Enables personalization from first use

### 8. banned_fingerprints
**Purpose**: List of all the banned device fingerprints.

```sql
CREATE TABLE public.banned_fingerprints (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  fingerprint text NOT NULL,
  banned_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT banned_fingerprints_pkey PRIMARY KEY (id),
  CONSTRAINT banned_fingerprints_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id)
);
```

**Key Features**:
- Prevents banned user fron creating new accounts

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
![DatabaseUML](images/supabase-schema-kvoiazgvavwtkzloaaib(1).svg)