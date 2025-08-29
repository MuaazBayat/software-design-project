from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Union
from enum import Enum
import uuid
import random
from fastapi import FastAPI, HTTPException, Query
from fastapi import Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from supabase import create_client, Client
from dotenv import load_dotenv
import os


dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(dotenv_path)


SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="PenPal Matchmaking API", version="2.0.0")


ALLOWED_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|globetalk-frontend-388957617777\.us-central1\.run\.app)(:\d+)?$"
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_methods=["*"],     
    allow_headers=["*"],      
    allow_credentials=False,  
)

# --- Enums ---
class CorrespondenceEnum(str, Enum):

    LONG_TERM = "long-term"  # Added to match frontend
    ONE_TIME = "one-time"    # Added to match frontend
    EITHER = "either"

class MatchStatusEnum(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    EXPIRED = "expired"

# --- Models ---
class UserProfile(BaseModel):
    user_id: str
    anonymous_handle: str
    bio: Optional[str] = None
    age_range: Optional[str] = None
    primary_language: Optional[str] = None
    secondary_languages: Optional[List[str]] = []
    time_zone: Optional[str] = None
    country_code: Optional[str] = None
    interests: Optional[List[str]] = []
    favorite_local_fact: Optional[str] = None
    preferred_correspondence_type: Optional[str] = None
    last_active: Optional[str] = None
    cultural_completeness_score: Optional[float] = None

class PassedProfile(BaseModel):
    user_id: str
    passed_user_id: str
    passed_at: str

class MatchingPreferences(BaseModel):
    match_type: str = "either"  # Changed from CorrespondenceEnum to match frontend
    languages: List[str] = []
    age_ranges: List[str] = []
    country_codes: List[str] = []
    interests: List[str] = []
    exclude_previous: bool = True
    max_timezone_difference: Optional[int] = 6

class MatchRequest(BaseModel):
    clerk_id: str
    preferences: MatchingPreferences

class MatchResponse(BaseModel):
    match_id: str
    thread_id: str
    penpal_profile: UserProfile
    match_type: str
    compatibility_score: float
    created_at: str

class DailyStatsResponse(BaseModel):
    matches_used: int
    matches_remaining: int
    total_daily_limit: int
    reset_time: str

class MatchDecisionRequest(BaseModel):
    clerk_id: str
    accept: bool  # True if Accept, False if Reject
    suggested_user_id: Optional[str] = None  # Add this field for the suggested profile
    preferences: Optional[MatchingPreferences] = MatchingPreferences(match_type="either")


class PreferenceSelection(BaseModel):
    clerk_id: str
    selected_profile_id: str
    preference_type: str  # 'real' or 'fake'

class PreferenceProfile(BaseModel):
    profile_id: str
    anonymous_handle: str
    country_code: Optional[str] = None
    bio: Optional[str] = None
    interests: Optional[List[str]] = None
    age_range: Optional[str] = None
    primary_language: Optional[str] = None
    favorite_local_fact: Optional[str] = None
    is_real: bool



# --- Helper Functions ---
async def get_user_by_clerk_id(clerk_id: str) -> Dict:
    """Get user profile by Clerk ID"""
    result = supabase.table("user_profiles").select("*").eq("clerk_id", clerk_id).execute()
    if not result.data:
        raise HTTPException(404, f"User not found for clerk_id: {clerk_id}")
    return result.data[0]

async def get_user_by_id(user_id: str) -> Dict:
    """Get user profile by user_id"""
    result = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(404, f"User not found for user_id: {user_id}")
    return result.data[0]

def get_passed_users(user_id: str) -> List[str]:
    """Get list of user IDs that this user has passed on"""
    result = supabase.table("passed_profiles").select("passed_user_id").eq("user_id", user_id).execute()
    return [p['passed_user_id'] for p in result.data] if result.data else []

def record_pass(user_id: str, passed_user_id: str):
    record = {
        "user_id": user_id,
        "passed_user_id": passed_user_id,
        "passed_at": datetime.now().isoformat()
    }
    existing = supabase.table("passed_profiles") \
        .select("user_id") \
        .eq("user_id", user_id) \
        .eq("passed_user_id", passed_user_id) \
        .execute()

    if not existing.data:
        supabase.table("passed_profiles").insert(record).execute()


def should_reset_passed_users(user_id: str, available_profiles: List[Dict]) -> bool:
    """Check if we should reset passed users (when all available users have been passed)"""
    passed_users = get_passed_users(user_id)
    available_user_ids = [p['user_id'] for p in available_profiles]
    
    # If all available users have been passed, we should reset
    unpassed_users = [uid for uid in available_user_ids if uid not in passed_users]
    return len(unpassed_users) == 0

def prioritize_profiles_by_filters(profiles: List[Dict], user: Dict, preferences: MatchingPreferences) -> List[Dict]:
    """Prioritize profiles that match user's filters, then add others"""
    if not profiles:
        return profiles
    
    filtered_matches = []
    other_profiles = []
    
    for profile in profiles:
        matches_filters = True
        
        # Check language filter
        if preferences.languages:
            profile_languages = [profile.get('primary_language')] + (profile.get('secondary_languages') or [])
            profile_languages = [l.lower() for l in profile_languages if l]
            pref_languages = [l.lower() for l in preferences.languages]
            if not any(lang in pref_languages for lang in profile_languages):
                matches_filters = False
        
        # Check age range filter
        if preferences.age_ranges and profile.get('age_range') not in preferences.age_ranges:
            matches_filters = False
        
        # Check country filter
        if preferences.country_codes and profile.get('country_code') not in preferences.country_codes:
            matches_filters = False
        
        # Check interests filter
        if preferences.interests:
            profile_interests = [i.lower() for i in (profile.get('interests') or [])]
            pref_interests = [i.lower() for i in preferences.interests]
            if not any(interest in pref_interests for interest in profile_interests):
                matches_filters = False
        
        # Check match type filter
        if preferences.match_type and preferences.match_type != 'either':
            backend_match_type = preferences.match_type
            if preferences.match_type == "long-term":
                backend_match_type = "email"
            elif preferences.match_type == "one-time":
                backend_match_type = "chat"
            
            if profile.get('preferred_correspondence_type') != backend_match_type:
                matches_filters = False
        
        if matches_filters:
            filtered_matches.append(profile)
        else:
            other_profiles.append(profile)
    
    # Return filtered matches first, then other profiles
    return filtered_matches + other_profiles

def calculate_compatibility_score(user1: Dict, user2: Dict, preferences: MatchingPreferences) -> float:
    """Enhanced compatibility scoring with better language and interest matching"""
    score = 0.0
    max_score = 0.0

    # Language compatibility (35% - increased weight)
    user1_languages = [user1.get('primary_language')] + (user1.get('secondary_languages') or [])
    user2_languages = [user2.get('primary_language')] + (user2.get('secondary_languages') or [])
    user1_languages = [l.lower() for l in user1_languages if l]
    user2_languages = [l.lower() for l in user2_languages if l]
    
    if user1_languages and user2_languages:
        common_langs = set(user1_languages) & set(user2_languages)
        if common_langs:
            # Bonus for primary language match
            if user1.get('primary_language', '').lower() == user2.get('primary_language', '').lower():
                score += 0.25  # High score for primary match
            else:
                score += 0.15  # Lower score for secondary match
            
            # Additional bonus for multiple language matches
            if len(common_langs) > 1:
                score += 0.1
        
        # Preference filter bonus - if user specified language preferences, boost matching profiles
        if preferences.languages:
            pref_langs = [l.lower() for l in preferences.languages]
            user2_match_prefs = any(lang in pref_langs for lang in user2_languages)
            if user2_match_prefs:
                score += 0.1
    max_score += 0.35

    # Interests compatibility (30% - increased weight)
    user1_interests = [i.lower() for i in (user1.get('interests', []) or [])]
    user2_interests = [i.lower() for i in (user2.get('interests', []) or [])]
    
    if user1_interests and user2_interests:
        common_interests = set(user1_interests) & set(user2_interests)
        interest_ratio = len(common_interests) / max(len(user1_interests), len(user2_interests), 1)
        score += interest_ratio * 0.2
        
        # Bonus for multiple shared interests
        if len(common_interests) >= 2:
            score += 0.1
            
        # Preference filter bonus
        if preferences.interests:
            pref_interests = [i.lower() for i in preferences.interests]
            user2_match_prefs = any(interest in pref_interests for interest in user2_interests)
            if user2_match_prefs:
                score += 0.05
    max_score += 0.3

    # Age range compatibility (15%)
    if user1.get('age_range') and user2.get('age_range'):
        age_ranges = [ "18-25", "26-35", "36-45", "46+"]
        try:
            idx1 = age_ranges.index(user1['age_range'])
            idx2 = age_ranges.index(user2['age_range'])
            if idx1 == idx2:
                score += 0.15
            elif abs(idx1 - idx2) == 1:
                score += 0.08
            elif abs(idx1 - idx2) == 2:
                score += 0.03
        except ValueError:
            pass
    max_score += 0.15

    # Cultural diversity bonus (10%)
    if user1.get('country_code') and user2.get('country_code') and user1['country_code'] != user2['country_code']:
        score += 0.1
    max_score += 0.1

    # Profile completeness bonus (10%)
    cultural_score = user2.get('cultural_completeness_score') or 0
    score += 0.1 * cultural_score
    max_score += 0.1

    return min((score / max_score) if max_score > 0 else 0.0, 1.0)

def get_daily_match_stats(user_id: str) -> Dict[str, Any]:
    """Get user's daily matching statistics"""
    today = datetime.now().date()
    matches_today = supabase.table("match_records").select("*").or_(
        f"user_1_id.eq.{user_id},user_2_id.eq.{user_id}"
    ).gte("created_at", today.isoformat()).execute()
    used = len(matches_today.data) if matches_today.data else 0
    daily_limit = 5
    return {
        "matches_used": used,
        "matches_remaining": max(0, daily_limit - used),
        "total_daily_limit": daily_limit,
        "reset_time": (datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).isoformat()
    }

def get_previous_matches(user_id: str) -> List[str]:
    """Get user's previous match partners"""
    result = supabase.table("match_records").select("user_1_id,user_2_id").or_(
        f"user_1_id.eq.{user_id},user_2_id.eq.{user_id}"
    ).execute()
    return [
        m['user_1_id'] if m['user_1_id'] != user_id else m['user_2_id']
        for m in result.data
    ] if result.data else []

def clean_profile(profile: Dict) -> Dict:
    """Remove sensitive fields"""
    sensitive = ['blocked_users', 'reported_count', 'clerk_id']
    cleaned = {k:v for k,v in profile.items() if k not in sensitive}
    cleaned['interests'] = cleaned.get('interests') or []
    cleaned['secondary_languages'] = cleaned.get('secondary_languages') or []
    return cleaned

def filter_profiles_by_timezone(profiles: List[Dict], user_timezone: str, max_difference: int) -> List[Dict]:
    """Filter profiles by timezone difference"""
    if not user_timezone or not max_difference:
        return profiles
    
    def parse_timezone_offset(tz_str):
        if not tz_str or not tz_str.startswith("UTC"):
            return 0
        
        try:
            sign = 1 if '+' in tz_str else -1
            parts = tz_str.replace("UTC", "").replace("+", "").split(":")
            hours = int(parts[0])
            minutes = int(parts[1]) if len(parts) > 1 else 0
            return sign * (hours + minutes/60)
        except:
            return 0
    
    user_offset = parse_timezone_offset(user_timezone)
    filtered_profiles = []
    
    for profile in profiles:
        profile_offset = parse_timezone_offset(profile.get('time_zone'))
        if abs(user_offset - profile_offset) <= max_difference:
            filtered_profiles.append(profile)
    
    return filtered_profiles

def apply_language_filter(query, languages: List[str]):
    """Apply language filters to Supabase query"""
    if not languages:
        return query
        
    # Create OR conditions for language matching
    language_conditions = []
    
    # Primary language condition
    for lang in languages:
        language_conditions.append(f"primary_language.eq.{lang}")
    
    # Secondary languages condition (array contains)
    for lang in languages:
        language_conditions.append(f"secondary_languages.cs.{{{lang}}}")
    
    # Combine all conditions with OR
    if language_conditions:
        query = query.or_(",".join(language_conditions))
    
    return query

def apply_interest_filter(query, interests: List[str]):
    """Apply interest filters to Supabase query"""
    if not interests:
        return query
    
    # For interests, we want profiles that have ANY of the specified interests
    interest_conditions = []
    for interest in interests:
        interest_conditions.append(f"interests.cs.{{{interest}}}")
    
    if interest_conditions:
        query = query.or_(",".join(interest_conditions))
    
    return query



def calculate_similarity_score(profile: Dict, preference_profile: Dict) -> float:
    """Calculate how similar a profile is to the user's preference profile"""
    score = 0.0
    max_score = 0.0
    
    # Country similarity (25%)
    if profile.get('country_code') and preference_profile.get('country_code'):
        if profile['country_code'] == preference_profile['country_code']:
            score += 0.25
    max_score += 0.25
    
    # Language similarity (25%)
    profile_languages = [profile.get('primary_language')] + (profile.get('secondary_languages') or [])
    pref_languages = [preference_profile.get('primary_language')] + (preference_profile.get('secondary_languages') or [])
    
    profile_languages = [l.lower() for l in profile_languages if l]
    pref_languages = [l.lower() for l in pref_languages if l]
    
    if profile_languages and pref_languages:
        common_langs = set(profile_languages) & set(pref_languages)
        if common_langs:
            score += 0.25 * len(common_langs) / max(len(profile_languages), len(pref_languages))
    max_score += 0.25
    
    # Interest similarity (30%)
    profile_interests = [i.lower() for i in (profile.get('interests') or [])]
    pref_interests = [i.lower() for i in (preference_profile.get('interests') or [])]
    
    if profile_interests and pref_interests:
        common_interests = set(profile_interests) & set(pref_interests)
        if common_interests:
            score += 0.3 * len(common_interests) / max(len(profile_interests), len(pref_interests))
    max_score += 0.3
    
    # Age range similarity (20%)
    if profile.get('age_range') and preference_profile.get('age_range'):
        if profile['age_range'] == preference_profile['age_range']:
            score += 0.2
    max_score += 0.2
    
    return min(score / max_score, 1.0) if max_score > 0 else 0.0

# --- Endpoints ---
@app.get("/health")
def health_check():
    return {"status":"healthy","timestamp":datetime.now().isoformat(),"version":"2.0.0"}

@app.get("/user/profile/{clerk_id}")
async def get_user_profile(clerk_id: str):
    user = await get_user_by_clerk_id(clerk_id)
    return {"profile": clean_profile(user)}

@app.get("/user/stats/{clerk_id}")
async def get_user_stats(clerk_id: str):
    user = await get_user_by_clerk_id(clerk_id)
    return get_daily_match_stats(user['user_id'])

@app.post("/profiles/pass")
async def record_profile_pass(request: dict = Body(...)):
    """Record that a user has passed on a profile"""
    clerk_id = request.get("clerk_id")
    passed_user_id = request.get("passed_user_id")
    
    if not clerk_id or not passed_user_id:
        raise HTTPException(400, "Missing clerk_id or passed_user_id")
    
    user = await get_user_by_clerk_id(clerk_id)
    user_id = user['user_id']
    
    # Record the pass
    record_pass(user_id, passed_user_id)
    
    return {"success": True, "message": "Profile pass recorded"}

@app.get("/profiles/suggestions/{clerk_id}", response_model=List[UserProfile])
async def suggest_profile_preview(
    clerk_id: str, 
    limit: int = Query(1, le=50),
    languages: Optional[str] = Query(None),
    age_ranges: Optional[str] = Query(None), 
    interests: Optional[str] = Query(None),
    match_type: Optional[str] = Query("either")
):
    """
    Enhanced suggestions endpoint with filter prioritization and pass tracking.
    DOES NOT consume daily matches.
    """
    user = await get_user_by_clerk_id(clerk_id)
    user_id = user['user_id']

    # Parse query parameters into preferences
    parsed_languages = languages.split(',') if languages else []
    parsed_age_ranges = age_ranges.split(',') if age_ranges else []
    parsed_interests = interests.split(',') if interests else []
    
    preferences = MatchingPreferences(
        match_type=match_type or "either",
        languages=parsed_languages,
        age_ranges=parsed_age_ranges,
        interests=parsed_interests
    )

    # Get all available profiles (no filters applied at database level for suggestions)
    profiles = supabase.table("user_profiles")\
        .select("*")\
        .neq("user_id", user_id)\
        .eq("account_status", "active")\
        .limit(200).execute().data

    if not profiles:
        raise HTTPException(404, "No profiles available")

    # Filter out matched users (but not passed users yet)
    prev_matches = get_previous_matches(user_id)
    profiles = [p for p in profiles if p['user_id'] not in prev_matches]
    
    if not profiles:
        raise HTTPException(404, "No new profiles available")

    # Get passed users
    passed_users = get_passed_users(user_id)
    
    # Check if we need to reset passed users
    if should_reset_passed_users(user_id, profiles):
        # Reset passed users table for this user
        supabase.table("passed_profiles").delete().eq("user_id", user_id).execute()
        passed_users = []

    # Filter out passed users (unless we just reset)
    available_profiles = [p for p in profiles if p['user_id'] not in passed_users]
    
    if not available_profiles:
        # Fallback to all profiles if somehow we still have none
        available_profiles = profiles

    # Prioritize profiles that match filters first
    prioritized_profiles = prioritize_profiles_by_filters(available_profiles, user, preferences)

    # Score all profiles but maintain the prioritization
    scored_filtered = []
    scored_others = []
    
    # Split between filtered matches and others for separate scoring
    filtered_count = 0
    for profile in available_profiles:
        if profile in prioritized_profiles[:len([p for p in available_profiles if p in prioritized_profiles])]:
            # This is a filtered match
            score = calculate_compatibility_score(user, profile, preferences)
            scored_filtered.append((profile, score + 0.5))  # Boost filtered matches
            filtered_count += 1
            if filtered_count >= len(parsed_languages) + len(parsed_age_ranges) + len(parsed_interests):
                break
    
    # Add remaining profiles
    remaining_profiles = [p for p in prioritized_profiles if p not in [prof for prof, _ in scored_filtered]]
    for profile in remaining_profiles:
        score = calculate_compatibility_score(user, profile, preferences)
        scored_others.append((profile, score))

    # Combine with filter matches first, then others
    all_scored = scored_filtered + scored_others
    
    # Sort each group separately, then combine
    scored_filtered.sort(key=lambda x: x[1] + random.random() * 0.1, reverse=True)
    scored_others.sort(key=lambda x: x[1] + random.random() * 0.1, reverse=True)
    
    # Take from filtered first, then others
    final_selection = []
    filtered_taken = min(limit, len(scored_filtered))
    final_selection.extend([p for p, s in scored_filtered[:filtered_taken]])
    
    if len(final_selection) < limit:
        remaining_needed = limit - len(final_selection)
        final_selection.extend([p for p, s in scored_others[:remaining_needed]])

    if not final_selection:
        raise HTTPException(404, "No compatible profiles found")

    return [UserProfile(**clean_profile(p)) for p in final_selection[:limit]]

@app.post("/matches/find", response_model=MatchResponse)
async def find_match_with_decision(match_request: MatchDecisionRequest = Body(...)):
    """Enhanced matching with improved filters, scoring, pass tracking, and preference consideration"""
    clerk_id = match_request.clerk_id
    accept = match_request.accept
    suggested_user_id = match_request.suggested_user_id
    preferences = match_request.preferences

    # Get current user
    user = await get_user_by_clerk_id(clerk_id)
    user_id = user['user_id']

    # Check daily stats only if accepting
    if accept:
        stats = get_daily_match_stats(user_id)
        if stats['matches_remaining'] <= 0:
            raise HTTPException(400, "Daily match limit exceeded")

    selected = None
    score = 0.0

    # If a specific profile was suggested, use that
    if suggested_user_id:
        try:
            selected_profile = await get_user_by_id(suggested_user_id)
            selected = selected_profile
            # Calculate compatibility score for this specific match
            score = calculate_compatibility_score(user, selected, preferences)
        except HTTPException:
            # If suggested profile doesn't exist, fall back to normal matching
            suggested_user_id = None

    # If no specific profile suggested or it doesn't exist, use matching logic
    if not suggested_user_id or not selected:
        # Get all available profiles without database-level filtering
        profiles = supabase.table("user_profiles")\
            .select("*")\
            .neq("user_id", user_id)\
            .eq("account_status", "active")\
            .limit(200).execute().data

        if not profiles:
            raise HTTPException(404, "No profiles available")

        # Apply timezone filter if specified
        if preferences.max_timezone_difference and user.get('time_zone'):
            profiles = filter_profiles_by_timezone(
                profiles, 
                user.get('time_zone'), 
                preferences.max_timezone_difference
            )

        # Filter out matched users
        if preferences.exclude_previous:
            prev_matches = get_previous_matches(user_id)
            profiles = [p for p in profiles if p['user_id'] not in prev_matches]
            if not profiles:
                raise HTTPException(404, "No new profiles available matching your preferences")

        # Get passed users and handle reset logic
        passed_users = get_passed_users(user_id)
        
        # Check if we need to reset passed users
        if should_reset_passed_users(user_id, profiles):
            supabase.table("passed_profiles").delete().eq("user_id", user_id).execute()
            passed_users = []

        # Filter out passed users (unless we just reset)
        available_profiles = [p for p in profiles if p['user_id'] not in passed_users]
        
        if not available_profiles:
            available_profiles = profiles

        # Get user's preference selection if it exists
        preference_selection = None
        try:
            user_pref_result = supabase.table("user_preference_selections") \
                .select("*") \
                .eq("user_id", user_id) \
                .execute()
                
            if user_pref_result.data:
                preference_selection = user_pref_result.data[0]
        except:
            pass  # Continue without preference if there's an error
        
        # If user has a preference selection, prioritize similar profiles
        if preference_selection:
            preference_profile = None
            
            if preference_selection['preference_type'] == 'real':
                # Try to get the real profile from database
                try:
                    preference_profile = await get_user_by_id(preference_selection['selected_profile_id'])
                except:
                    pass
            else:
                # Find the fake profile from our list
                for fake_user in fakeUsers:
                    if fake_user['user_id'] == preference_selection['selected_profile_id']:
                        preference_profile = fake_user
                        break
            
            # If we found the preference profile, use it to influence matching
            if preference_profile:
                # Score profiles based on similarity to preference profile
                scored_profiles = []
                for profile in available_profiles:
                    # Calculate similarity to preference profile
                    similarity_score = calculate_similarity_score(profile, preference_profile)
                    
                    # Combine with compatibility score (weighted average)
                    compatibility_score_val = calculate_compatibility_score(user, profile, preferences)
                    combined_score = (compatibility_score_val * 0.7) + (similarity_score * 0.3)
                    
                    scored_profiles.append((profile, combined_score))
                
                # Sort by combined score
                scored_profiles.sort(key=lambda x: x[1] + random.random() * 0.05, reverse=True)
                prioritized_profiles = [p for p, s in scored_profiles]
            else:
                # Fall back to original prioritization if preference profile not found
                prioritized_profiles = prioritize_profiles_by_filters(available_profiles, user, preferences)
        else:
            # No preference selection, use original logic
            prioritized_profiles = prioritize_profiles_by_filters(available_profiles, user, preferences)

        if not prioritized_profiles:
            raise HTTPException(404, "No compatible profiles found")

        # Enhanced scoring with filter preference
        scored = []
        for profile in prioritized_profiles:
            profile_score = calculate_compatibility_score(user, profile, preferences)
            # Boost score for profiles that match filters
            if profile in prioritized_profiles[:len([p for p in available_profiles 
                                                   if p in prioritized_profiles[:len(available_profiles)//2]])]:
                profile_score += 0.2  # Boost filtered matches
            scored.append((profile, profile_score))
        
        # Sort by score with small randomization
        scored.sort(key=lambda x: x[1] + random.random() * 0.05, reverse=True)
        
        if not scored:
            raise HTTPException(404, "No compatible profiles found")
        
        selected, score = scored[0]

    # Handle the decision
    if accept:
        # Create match record
        match_id = str(uuid.uuid4())
        thread_id = str(uuid.uuid4())
        record = {
            "match_id": match_id,
            "user_1_id": user_id,
            "user_2_id": selected['user_id'],
            "match_type": selected.get('preferred_correspondence_type', 'either'),
            "match_source": "random",  # Fixed enum value
            "compatibility_score": score,
            "conversation_thread_id": thread_id,
            "status": "active",
            "created_at": datetime.now().isoformat()
        }
        supabase.table("match_records").insert(record).execute()

        return MatchResponse(
            match_id=match_id,
            thread_id=thread_id,
            penpal_profile=UserProfile(**clean_profile(selected)),
            match_type=selected.get('preferred_correspondence_type', 'either'),
            compatibility_score=round(score, 2),
            created_at=record["created_at"]
        )
    else:
        # If rejected, record the pass and return the profile
        record_pass(user_id, selected['user_id'])
        
        return MatchResponse(
            match_id="",
            thread_id="",
            penpal_profile=UserProfile(**clean_profile(selected)),
            match_type=selected.get('preferred_correspondence_type', 'either'),
            compatibility_score=round(score, 2),
            created_at=datetime.now().isoformat()
        )
    
@app.post("/preferences/select")
async def select_preference_profile(selection: PreferenceSelection):
    """Store a user's preference profile selection"""
    try:
        print(f"Received selection: {selection.dict()}")  # Add this for debugging
        user = await get_user_by_clerk_id(selection.clerk_id)
        user_id = user['user_id']
        
        # Check if user already has a preference selection
        existing = supabase.table("user_preference_selections") \
            .select("*") \
            .eq("user_id", user_id) \
            .execute()
            
        record = {
            "user_id": user_id,
            "selected_profile_id": selection.selected_profile_id,
            "preference_type": selection.preference_type,
            "selected_at": datetime.now().isoformat()
        }
        
        if existing.data:
            # Update existing selection
            supabase.table("user_preference_selections") \
                .update(record) \
                .eq("user_id", user_id) \
                .execute()
        else:
            # Create new selection
            supabase.table("user_preference_selections").insert(record).execute()
            
        return {"success": True, "message": "Preference selection saved"}
        
    except Exception as e:
        raise HTTPException(500, f"Failed to save preference selection: {str(e)}")

@app.get("/preferences/profiles/{clerk_id}", response_model=List[PreferenceProfile])
async def get_preference_profiles(clerk_id: str):
    """Get a mix of real and fake profiles for preference selection"""
    try:
        # Get 4 real active profiles from the database
        real_profiles = supabase.table("user_profiles") \
            .select("user_id, anonymous_handle, country_code, bio, interests, age_range, primary_language, favorite_local_fact") \
            .eq("account_status", "active") \
            .limit(4) \
            .execute()
            
        real_profiles_list = []
        if real_profiles.data:
            real_profiles_list = [
                PreferenceProfile(
                    profile_id=profile['user_id'],
                    anonymous_handle=profile['anonymous_handle'],
                    country_code=profile['country_code'],
                    bio=profile['bio'],
                    interests=profile['interests'],
                    age_range=profile['age_range'],
                    primary_language=profile['primary_language'],
                    favorite_local_fact=profile['favorite_local_fact'],
                    is_real=True
                ) for profile in real_profiles.data
            ]
        
        # If we don't have enough real profiles, add fake ones
        fake_profiles = []
        if len(real_profiles_list) < 4:
            needed = 4 - len(real_profiles_list)
            fake_profiles = [
                PreferenceProfile(
                    profile_id=fake_user['user_id'],
                    anonymous_handle=fake_user['anonymous_handle'],
                    country_code=fake_user['country_code'],
                    bio=fake_user['bio'],
                    interests=fake_user['interests'],
                    age_range=fake_user['age_range'],
                    primary_language=fake_user['primary_language'],
                    favorite_local_fact=fake_user['favorite_local_fact'],
                    is_real=False
                ) for fake_user in fakeUsers[:needed]
            ]
        
        return real_profiles_list + fake_profiles
        
    except Exception as e:
        # Fallback to fake profiles if there's an error
        return [
            PreferenceProfile(
                profile_id=fake_user['user_id'],
                anonymous_handle=fake_user['anonymous_handle'],
                country_code=fake_user['country_code'],
                bio=fake_user['bio'],
                interests=fake_user['interests'],
                age_range=fake_user['age_range'],
                primary_language=fake_user['primary_language'],
                favorite_local_fact=fake_user['favorite_local_fact'],
                is_real=False
            ) for fake_user in fakeUsers
        ]