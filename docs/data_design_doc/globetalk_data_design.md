# GlobeTalk Virtual Pen Pals - Data Design Document

**Version:** 1.0  
**Date:** August 2025  
**Team:** Backend Engineering  

## 1. System Overview

GlobeTalk is a global pen pal platform that connects users anonymously for cultural exchange through delayed messaging. The system emphasizes privacy, safety, and authentic cultural connections while simulating traditional postal correspondence.

### Core Requirements
- Anonymous user matching across global time zones
- Delayed message delivery (12+ hours)
- Cultural profile sharing without personal identification
- Robust content moderation and safety features

## 2. Data Architecture & Flow

### High-Level Data Flow
```
User Registration → Profile Creation → Matchmaking Queue → 
Active Conversations → Message Processing → Delivery Queue → 
Content Moderation → Analytics Aggregation
```

### Technology Stack
- **Primary Database:** PostgreSQL (ACID compliance for user safety)
- **Frontend:** Next.js
- **Backend Services:** FastAPI
- **File Storage:** Not applicable (text-only messaging)
- **Authentication:** Clerk (Authentication and user management)

## 3. Database Schema Design

### 3.1 User Profiles Table
```sql
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
```

### 3.2 Match Records Table
```sql
CREATE TABLE match_records (
    match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Participants
    user_1_id UUID NOT NULL REFERENCES user_profiles(user_id),
    user_2_id UUID NOT NULL REFERENCES user_profiles(user_id),
    
    -- Match Metadata
    match_type correspondence_enum NOT NULL,
    match_source match_source_enum DEFAULT 'random', -- 'random', 'language', 'timezone', 'interest'
    compatibility_score DECIMAL(3,2),
    time_zone_difference INTEGER, -- Hours apart
    
    -- Status & Lifecycle
    status match_status_enum DEFAULT 'active', -- 'active', 'completed', 'abandoned', 'reported'
    conversation_thread_id UUID,
    first_message_sent_at TIMESTAMP WITH TIME ZONE,
    last_message_sent_at TIMESTAMP WITH TIME ZONE,
    total_messages_exchanged INTEGER DEFAULT 0,
    
    -- Completion
    completion_reason completion_reason_enum, -- 'natural_end', 'one_time_complete', 'user_left', 'violation'
    completed_at TIMESTAMP WITH TIME ZONE,
    user_1_rating INTEGER CHECK (user_1_rating BETWEEN 1 AND 5),
    user_2_rating INTEGER CHECK (user_2_rating BETWEEN 1 AND 5),
    
    -- Constraints
    CONSTRAINT different_users CHECK (user_1_id != user_2_id),
    CONSTRAINT unique_active_match UNIQUE (user_1_id, user_2_id) DEFERRABLE INITIALLY DEFERRED
);

-- Indexes
CREATE INDEX idx_match_records_user_active ON match_records (user_1_id, status);
CREATE INDEX idx_match_records_user_2_active ON match_records (user_2_id, status);
CREATE INDEX idx_match_records_conversation ON match_records (conversation_thread_id);
CREATE INDEX idx_match_records_created_at ON match_records (created_at);
```

### 3.3 Message Storage Table
```sql
CREATE TABLE messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Message Routing
    match_id UUID NOT NULL REFERENCES match_records(match_id),
    sender_id UUID NOT NULL REFERENCES user_profiles(user_id),
    recipient_id UUID NOT NULL REFERENCES user_profiles(user_id),
    conversation_thread_id UUID NOT NULL,
    message_sequence INTEGER NOT NULL, -- Order within conversation
    
    -- Content
    message_content TEXT NOT NULL CHECK (char_length(message_content) BETWEEN 1 AND 5000),
    message_length INTEGER GENERATED ALWAYS AS (char_length(message_content)) STORED,
    contains_emoji BOOLEAN DEFAULT false,
    detected_language language_code,
    
    -- Delivery Management
    scheduled_delivery_at TIMESTAMP WITH TIME ZONE NOT NULL,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    delivery_status delivery_status_enum DEFAULT 'scheduled', -- 'scheduled', 'delivered', 'read', 'failed'
    
    -- Moderation
    moderation_status moderation_enum DEFAULT 'pending', -- 'pending', 'approved', 'flagged', 'blocked'
    moderation_flags TEXT[],
    moderator_id UUID,
    moderated_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    client_timezone VARCHAR(50),
    estimated_read_time INTEGER, -- Seconds
    
    CONSTRAINT valid_delivery_time CHECK (scheduled_delivery_at > created_at),
    CONSTRAINT message_order UNIQUE (conversation_thread_id, message_sequence)
);

-- Indexes
CREATE INDEX idx_messages_delivery_queue ON messages (scheduled_delivery_at, delivery_status) 
    WHERE delivery_status = 'scheduled';
CREATE INDEX idx_messages_conversation ON messages (conversation_thread_id, message_sequence);
CREATE INDEX idx_messages_moderation ON messages (moderation_status, created_at) 
    WHERE moderation_status = 'pending';
CREATE INDEX idx_messages_sender ON messages (sender_id, created_at);
CREATE INDEX idx_messages_recipient ON messages (recipient_id, delivered_at);
```

### 3.4 Moderation Logs Table
```sql
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

### 3.5 Cultural Data Table
```sql
CREATE TABLE cultural_data (
    fact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Geographic Information
    country_code CHAR(2) NOT NULL,
    region VARCHAR(100),
    
    -- Content
    fact_type cultural_fact_enum NOT NULL, -- 'holiday', 'tradition', 'food', 'language', 'greeting', 'fun_fact'
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    fun_rating INTEGER CHECK (fun_rating BETWEEN 1 AND 5),
    
    -- Metadata
    source_url TEXT,
    verified BOOLEAN DEFAULT false,
    language language_code DEFAULT 'en',
    display_frequency frequency_enum DEFAULT 'normal', -- 'rare', 'normal', 'common'
    
    -- Usage Tracking
    times_shown INTEGER DEFAULT 0,
    user_ratings DECIMAL(3,2),
    last_shown TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_cultural_data_country ON cultural_data (country_code, fact_type);
CREATE INDEX idx_cultural_data_display ON cultural_data (display_frequency, times_shown);
```

## 4. API Data Contracts

### 4.1 Matchmaking API

**POST /api/v1/matches/find**
```json
{
  "preferences": {
    "correspondence_type": "long-term",
    "language_preference": "en",
    "time_zone_range": 6,
    "region_preference": "any"
  }
}

Response:
{
  "match_id": "uuid",
  "pen_pal_profile": {
    "anonymous_handle": "string",
    "age_range": "26-35",
    "country": "CA",
    "interests": ["cooking", "travel"],
    "cultural_fact": "string"
  },
  "match_metadata": {
    "compatibility_score": 0.85,
    "time_zone_difference": 3,
    "estimated_response_time": "12-24 hours"
  }
}
```

### 4.2 Message API

**POST /api/v1/messages/send**
```json
{
  "match_id": "uuid",
  "content": "string",
  "delivery_delay_hours": 12
}

Response:
{
  "message_id": "uuid",
  "scheduled_delivery": "2025-08-15T14:30:00Z",
  "estimated_delivery": "2025-08-15T14:30:00Z"
}
```

**GET /api/v1/messages/inbox**
```json
Response:
{
  "conversations": [
    {
      "match_id": "uuid",
      "pen_pal_handle": "string",
      "last_message_preview": "string",
      "unread_count": 2,
      "conversation_status": "active",
      "last_activity": "2025-08-14T10:15:00Z"
    }
  ]
}
```

## 5. Data Governance & Security

### 5.1 Privacy Protection
- **Data Anonymization:** No real names, emails, or personally identifiable information stored
- **Geographic Masking:** Only country-level location data, no precise coordinates
- **Message Encryption:** All message content encrypted at rest using AES-256
- **Session Management:** Secure token-based authentication with 24-hour expiry

### 5.2 Content Moderation
- **Automated Filtering:** Real-time content scanning for inappropriate material
- **Human Review Queue:** Flagged content reviewed within 4 hours during business hours
- **Appeal Process:** Users can appeal moderation decisions within 7 days
- **Escalation Matrix:** Clear severity levels and corresponding actions

### 5.3 Data Retention
- **Active Users:** Profile data retained while account is active
- **Message History:** Messages deleted after 90 days for one-time conversations, 1 year for long-term
- **Moderation Logs:** Retained for 2 years for compliance and pattern analysis
- **Deleted Accounts:** All data purged within 30 days of account deletion

## 6. Performance & Scalability

### 6.1 Query Optimization
- **Matchmaking Performance:** Sub-200ms response time for match queries
- **Database Partitioning:** Messages table partitioned by month
- **Read Replicas:** Geographic distribution for global user base

### 6.2 Monitoring & Alerts
- **Database Performance:** Query response time monitoring
- **Message Delivery:** Delivery success rate tracking
- **Moderation Queue:** Alert when review queue exceeds 100 items
- **User Safety:** Automated alerts for unusual activity patterns


## 7. Data Migration & Backup

### 7.1 Backup Strategy
- **Database Backups:** Daily automated backups with 30-day retention
- **Message Archives:** Weekly encrypted backups to secure cloud storage
- **Disaster Recovery:** Cross-region backup replication with 4-hour RPO

### 7.2 Data Export
- **User Data Export:** GDPR-compliant data export within 30 days
- **Analytics Export:** Anonymized data export for research partnerships
- **Legal Compliance:** Data preservation for legal requests

---

**Document Control:**
- **Author:** Backend Engineering Team
- **Reviewers:** Security Team, Product Team, Legal Team
- **Status:** Draft - Pending Review