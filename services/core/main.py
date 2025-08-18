# main.py
# This file contains the main FastAPI application for the GlobeTalk Core API.
# It defines the endpoints for creating, retrieving, and updating user profiles.

import sys
import os

# Add the 'services' directory to the Python path
# This helps resolve absolute imports like `from core.models`
# when running the script from the project root.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException, status, Depends
from typing import Optional, List
from supabase import Client
from core.models import ProfileCreate, ProfileUpdate, Profile
from core.database import supabase

# Create the FastAPI application instance.
app = FastAPI(title="GlobeTalk Core API")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$",
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
    return supabase


# --- API Endpoints ---

@app.post("/profiles/", response_model=Profile, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_data: ProfileCreate, 
    db: Client = Depends(get_supabase)
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
    existing_profile = db.table("user_profiles").select("clerk_id").eq("clerk_id", profile_data.clerk_id).execute()
    if existing_profile.data:
        raise HTTPException(status_code=400, detail="Profile for this user already exists.")

    # Insert the new profile data into the Supabase table.
    response = db.table("user_profiles").insert(profile_data.dict()).execute()
    
    # Check if the database operation was successful.
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create profile.")
        
    return response.data[0]


@app.get("/profiles/{clerk_id}", response_model=Profile)
async def get_profile(
    clerk_id: str, 
    db: Client = Depends(get_supabase)
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
    # Select all columns from the 'user_profiles' table where the clerk_id matches.
    response = db.table("user_profiles").select("*").eq("clerk_id", clerk_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found.")
        
    return response.data[0]


@app.put("/profiles/{clerk_id}", response_model=Profile)
async def update_profile(
    clerk_id: str, 
    profile_data: ProfileUpdate, 
    db: Client = Depends(get_supabase)
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
    response = db.table("user_profiles").update(profile_data.dict(exclude_unset=True)).eq("clerk_id", clerk_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found or no changes were made.")
        
    return response.data[0]
