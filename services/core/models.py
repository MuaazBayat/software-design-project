# models.py
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from uuid import UUID
from datetime import datetime

# Define the correspondence type enum to match your database
CorrespondenceType = Literal['long-term', 'one-time', 'either']

# --- Profile Models ---
class ProfileBase(BaseModel):
    """Base model for user profiles, containing common fields."""
    age_range: Optional[str] = None
    primary_language: Optional[str] = None
    secondary_languages: Optional[List[str]] = Field(default_factory=list)
    time_zone: Optional[str] = None
    country_code: Optional[str] = None
    bio: Optional[str] = None
    interests: Optional[List[str]] = Field(default_factory=list)
    favorite_local_fact: Optional[str] = None
    preferred_correspondence_type: Optional[CorrespondenceType] = 'either'

class ProfileCreate(ProfileBase):
    """
    Model for creating a new profile.
    Requires a clerk_id and an anonymous_handle.
    """
    clerk_id: str
    anonymous_handle: str
    fingerprint: str

class ProfileUpdate(ProfileBase):
    """
    Model for updating an existing profile.
    All fields are optional to support partial updates.
    We also include the anonymous_handle so it can be updated.
    """
    age_range: Optional[str] = None
    primary_language: Optional[str] = None
    secondary_languages: Optional[List[str]] = None
    time_zone: Optional[str] = None
    country_code: Optional[str] = None
    bio: Optional[str] = None
    interests: Optional[List[str]] = None
    anonymous_handle: Optional[str] = None
    favorite_local_fact: Optional[str] = None
    preferred_correspondence_type: Optional[CorrespondenceType] = None

class Profile(ProfileBase):
    """
    Complete model for a profile as it appears in the database.
    Includes database-managed fields like created_at, updated_at, and last_active.
    """
    user_id: Optional[UUID] = None  # Make user_id optional for now since tests use clerk_id
    clerk_id: str
    anonymous_handle: str
    fingerprint: Optional[List[str]] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    last_active: Optional[datetime]
    favorite_local_fact: Optional[str] = None
    preferred_correspondence_type: CorrespondenceType = 'either'