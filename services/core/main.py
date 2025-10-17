# main.py
# This file contains the main FastAPI application for the GlobeTalk Core API.
# It defines the endpoints for creating, retrieving, and updating user profiles.

import sys
import os

# Add the 'services' directory to the Python path
# This helps resolve absolute imports like `from core.models`
# when running the script from the project root.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from postgrest.exceptions import APIError
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from typing import Optional, List
from supabase import Client
from models import ProfileCreate, ProfileUpdate, Profile, Match, MatchedUserProfile, MatchesResponse
from database import supabase

# Import authentication
from auth import verify_token

# Create the FastAPI application instance.
app = FastAPI(title="GlobeTalk Core API")

def add(a, b):
    return a + b
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],      # includes OPTIONS/POST/PUT
    allow_headers=["*"],      # includes content-type, authorization, etc.
    allow_credentials=False,  # keep False with wildcards; use explicit list if True
)
# --- Supabase Client Dependency ---

def get_supabase() -> Client:
    """
    Dependency to provide the Supabase client instance to API endpoints.
    This ensures a single, reusable client across all requests.
    """
    if supabase is None:
        print("ERROR: Supabase client is None - check environment variables and database.py initialization")
        raise HTTPException(status_code=500, detail="Supabase client not initialized. Check server configuration.")
    return supabase


# --- API Endpoints ---

@app.get("/health")
async def health_check():
    """
    Simple health check endpoint to verify the service is running.
    """
    try:
        # Check if Supabase client is initialized
        if supabase is None:
            return {"status": "unhealthy", "error": "Supabase client not initialized"}

        # Try a simple database operation to verify connection
        test_response = supabase.table("user_profiles").select("*").limit(0).execute()

        return {
            "status": "healthy",
            "supabase_connected": True,
            "profiles_table_accessible": True
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "supabase_connected": supabase is not None
        }

@app.post("/profiles", response_model=Profile, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_data: ProfileCreate,
    db: Client = Depends(get_supabase),
    token: str = Depends(verify_token)
):
    """
    Creates a new user profile in the database.
    This endpoint is called by the frontend after a user successfully signs up with Clerk.
    The user's unique Clerk ID is used to create the profile.
    
    Args:
        profile_data (ProfileCreate): The profile data to be created, validated by Pydantic.
        db (Client): The Supabase client dependency.
    
    Returns:
        The newly created user profile object.
    
    Raises:
        HTTPException:
            400 Bad Request: If a profile with the given user_id already exists.
            500 Internal Server Error: If the database operation fails.
    """
    # First, check if a profile for this user ID already exists to prevent duplicates.
    existing_profile = db.table("user_profiles").select("*").eq("clerk_id", profile_data.clerk_id).execute()
    if existing_profile.data:
        # Profile exists, update fingerprint and return it with 200 OK status
        fingerprints = existing_profile.data[0]["fingerprint"] or []

        if profile_data.fingerprint not in fingerprints:
            fingerprints.append(profile_data.fingerprint)
            existing_profile.data[0]["fingerprint"] = fingerprints
            
        db.table("user_profiles").update({"fingerprint": fingerprints}).eq("clerk_id", profile_data.clerk_id).execute()
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=existing_profile.data[0]
        )

    # Prepare profile data for insertion, ensuring fingerprint is stored as a list
    profile_dict = profile_data.model_dump()
    profile_dict["fingerprint"] = [profile_data.fingerprint]  # Convert string to list
    
    # Insert the new profile data into the Supabase table.
    response = db.table("user_profiles").insert(profile_dict).execute()
    
    # Check if the database operation was successful.
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create profile.")
        
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=response.data[0]
    )


@app.get("/profiles/by-user-id/{user_id}", response_model=Profile)
async def get_profile_by_user_id(
    user_id: str,
    db: Client = Depends(get_supabase),
    token: str = Depends(verify_token)
):
    """
    Retrieves a user's profile information by their unique user_id (UUID).
    This endpoint is used for viewing other users' profiles from conversations.
    
    Args:
        user_id (str): The unique UUID of the user from the database.
        db (Client): The Supabase client dependency.
        
    Returns:
        The user's profile object.
        
    Raises:
        HTTPException:
            404 Not Found: If no profile is found for the given user_id.
    """
    try:
        # Select all columns from the 'user_profiles' table where the user_id matches.
        response = db.table("user_profiles").select("*").eq("user_id", user_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Profile not found.")

        raw_data = response.data[0]
        print(f"Raw profile data for user_id '{user_id}': {raw_data}")
        
        # Handle None values for array fields
        if raw_data.get('fingerprint') is None:
            raw_data['fingerprint'] = []
        if raw_data.get('secondary_languages') is None:
            raw_data['secondary_languages'] = []
        if raw_data.get('interests') is None:
            raw_data['interests'] = []
            
        return raw_data
    except HTTPException:
        # Re-raise HTTP exceptions (like 404) as-is
        raise
    except Exception as e:
        # Log the actual error and return a 500 with proper CORS headers
        print(f"Database error in get_profile_by_user_id for user_id '{user_id}': {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/profiles/{clerk_id}", response_model=Profile)
async def get_profile(
    clerk_id: str,
    db: Client = Depends(get_supabase),
    token: str = Depends(verify_token)
):
    """
    Retrieves a user's profile information by their unique user_id.
    This endpoint is useful for other services (e.g., matchmaking) to get user details.
    
    Args:
        user_id (str): The unique ID of the user from Clerk.
        db (Client): The Supabase client dependency.
        
    Returns:
        The user's profile object.
        
    Raises:
        HTTPException:
            404 Not Found: If no profile is found for the given user_id.
    """
    try:
        # Select all columns from the 'user_profiles' table where the clerk_id matches.
        response = db.table("user_profiles").select("*").eq("clerk_id", clerk_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Profile not found.")

        return response.data[0]
    except HTTPException:
        # Re-raise HTTP exceptions (like 404) as-is
        raise
    except Exception as e:
        # Log the actual error and return a 500 with proper CORS headers
        print(f"Database error in get_profile for clerk_id '{clerk_id}': {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.put("/profiles/{clerk_id}", response_model=Profile)
async def update_profile(
    clerk_id: str,
    profile_data: ProfileUpdate,
    db: Client = Depends(get_supabase),
    token: str = Depends(verify_token)
):
    """
    Updates an existing user's profile.
    This allows users to change their profile information after initial creation.
    
    Args:
        user_id (str): The unique ID of the user.
        profile_data (ProfileUpdate): A Pydantic model containing the fields to update.
                                      Using `exclude_unset=True` ensures only provided fields are updated.
        db (Client): The Supabase client dependency.
        
    Returns:
        The updated user's profile object.
        
    Raises:
        HTTPException:
            404 Not Found: If the profile is not found or no changes were made.
    """
    # Update the profile data in the Supabase table.
    # The `dict(exclude_unset=True)` method creates a dictionary containing only
    # the fields that were actually provided in the request body.
    patch = profile_data.model_dump(exclude_unset=True)
    row = {"clerk_id": clerk_id, **patch}

    try:
        resp = db.table("user_profiles") \
                .upsert(row, on_conflict="clerk_id") \
                .execute()
    except APIError as e:
        # e.code == "23505" for other uniques (e.g., handle); map to 409
        if getattr(e, "code", None) == "23505":
            raise HTTPException(status_code=409, detail="Handle is already taken.")
        raise

    if not getattr(resp, "data", None):
        raise HTTPException(status_code=500, detail="Upsert failed.")
    return resp.data[0]


@app.get("/profiles/matches/{user_id}", response_model=MatchesResponse)
async def get_user_matches(
    user_id: str,
    db: Client = Depends(get_supabase),
    token: str = Depends(verify_token)
):
    """
    Retrieves all matches for a user by their user_id.
    Returns match records with the matched user's profile information.
    
    Args:
        user_id (str): The unique user_id (UUID) of the user.
        db (Client): The Supabase client dependency.
        
    Returns:
        MatchesResponse: List of matches with penpal profile data.
        
    Raises:
        HTTPException:
            500 Internal Server Error: If the database operation fails.
    """
    try:
        
        # Get matches where the user is either user_1 or user_2, and join with profile data
        # We need to do this in two queries due to the OR condition with different profile joins
        
        # Query 1: User is user_1_id, get user_2's profile
        matches_as_user1 = db.table("match_records")\
            .select("""
                match_id,
                conversation_thread_id,
                match_type,
                compatibility_score,
                status,
                created_at,
                user_2_id,
                user_profiles!match_records_user_2_id_fkey(
                    user_id,
                    anonymous_handle,
                    country_code,
                    bio,
                    age_range,
                    interests,
                    primary_language,
                    secondary_languages,
                    favorite_local_fact
                )
            """)\
            .eq("user_1_id", user_id)\
            .eq("status", "active")\
            .execute()
        
        # Query 2: User is user_2_id, get user_1's profile  
        matches_as_user2 = db.table("match_records")\
            .select("""
                match_id,
                conversation_thread_id,
                match_type,
                compatibility_score,
                status,
                created_at,
                user_1_id,
                user_profiles!match_records_user_1_id_fkey(
                    user_id,
                    anonymous_handle,
                    country_code,
                    bio,
                    age_range,
                    interests,
                    primary_language,
                    secondary_languages,
                    favorite_local_fact
                )
            """)\
            .eq("user_2_id", user_id)\
            .eq("status", "active")\
            .execute()
        
        matches = []
        
        # Process matches where user is user_1
        for match_data in (matches_as_user1.data or []):
            if match_data.get("user_profiles"):
                profile_data = match_data["user_profiles"]
                penpal_profile = MatchedUserProfile(
                    user_id=str(profile_data["user_id"]),
                    anonymous_handle=profile_data["anonymous_handle"],
                    country_code=profile_data.get("country_code"),
                    bio=profile_data.get("bio"),
                    age_range=profile_data.get("age_range"),
                    interests=profile_data.get("interests") or [],
                    primary_language=profile_data.get("primary_language"),
                    secondary_languages=profile_data.get("secondary_languages") or [],
                    favorite_local_fact=profile_data.get("favorite_local_fact")
                )
                
                match = Match(
                    match_id=str(match_data["match_id"]),
                    conversation_thread_id=str(match_data["conversation_thread_id"]) if match_data.get("conversation_thread_id") else None,
                    match_type=match_data.get("match_type"),
                    compatibility_score=match_data.get("compatibility_score"),
                    status=match_data["status"],
                    created_at=match_data["created_at"],
                    penpal_profile=penpal_profile
                )
                matches.append(match)
        
        # Process matches where user is user_2
        for match_data in (matches_as_user2.data or []):
            if match_data.get("user_profiles"):
                profile_data = match_data["user_profiles"]
                penpal_profile = MatchedUserProfile(
                    user_id=str(profile_data["user_id"]),
                    anonymous_handle=profile_data["anonymous_handle"],
                    country_code=profile_data.get("country_code"),
                    bio=profile_data.get("bio"),
                    age_range=profile_data.get("age_range"),
                    interests=profile_data.get("interests") or [],
                    primary_language=profile_data.get("primary_language"),
                    secondary_languages=profile_data.get("secondary_languages") or [],
                    favorite_local_fact=profile_data.get("favorite_local_fact")
                )
                
                match = Match(
                    match_id=str(match_data["match_id"]),
                    conversation_thread_id=str(match_data["conversation_thread_id"]) if match_data.get("conversation_thread_id") else None,
                    match_type=match_data.get("match_type"),
                    compatibility_score=match_data.get("compatibility_score"),
                    status=match_data["status"],
                    created_at=match_data["created_at"],
                    penpal_profile=penpal_profile
                )
                matches.append(match)
        
        return MatchesResponse(
            matches=matches,
            total_count=len(matches)
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404) as-is
        raise
    except Exception as e:
        # Log the actual error and return a 500 with proper CORS headers
        print(f"Database error in get_user_matches for user_id '{user_id}': {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
