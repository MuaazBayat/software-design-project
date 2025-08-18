from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum
import uuid
from fastapi import FastAPI, HTTPException, status, Query, Header
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
from supabase import create_client
import os

# Load environment variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="PenPal Matchmaking API")

# --- Simplified Models ---
class MatchType(str, Enum):
    ONE_TIME = "one-time"
    LONG_TERM = "long-term"

class MatchStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"

class MatchingPreferences(BaseModel):
    match_type: MatchType
    languages: List[str] = []
    age_ranges: List[str] = []
    exclude_previous: bool = True

class MatchRequest(BaseModel):
    user_id: str
    preferences: MatchingPreferences

class MatchResponse(BaseModel):
    match_id: str
    thread_id: str
    penpal_profile: Dict[str, Any]
    match_type: str
    created_at: str

# --- Core Endpoints ---
@app.post("/matches/find", response_model=MatchResponse)
async def find_penpal(request: MatchRequest):
    """Find a matching penpal based on preferences"""
    # Get user profile
    user_res = supabase.table("user_profiles").select("*").eq("user_id", request.user_id).execute()
    if not user_res.data:
        raise HTTPException(404, "User not found")
    user = user_res.data[0]

    # Find potential matches
    matches = supabase.table("user_profiles").select("*").neq("user_id", request.user_id).execute().data
    if not matches:
        raise HTTPException(404, "No penpals available")
    
    # Filter and select best match
    if request.preferences.exclude_previous:
        prev_matches = get_previous_matches(request.user_id)
        matches = [m for m in matches if m['user_id'] not in prev_matches]
    
    # Simplified matching logic - select first available
    if not matches:
        raise HTTPException(404, "No new penpals available based on preferences")
    selected = matches[0]
    
    # Create match record
    match_id = str(uuid.uuid4())
    thread_id = str(uuid.uuid4())
    supabase.table("match_records").insert({
        "match_id": match_id,
        "user_1_id": request.user_id,
        "user_2_id": selected['user_id'],
        "conversation_thread_id": thread_id,  
        "match_type": request.preferences.match_type.value,
        "status": "active"
    }).execute()
    
    return MatchResponse(
        match_id=match_id,
        thread_id=thread_id,
        penpal_profile=clean_profile(selected),
        match_type=request.preferences.match_type.value,
        created_at=datetime.now().isoformat()
    )

@app.get("/matches/{user_id}")
async def get_matches(user_id: str):
    """Get user's matches"""
    matches = supabase.table("match_records").select("*").or_(
        f"user_1_id.eq.{user_id},user_2_id.eq.{user_id}"
    ).execute().data
    return {"matches": matches}

@app.put("/matches/{match_id}/complete")
async def complete_match(match_id: str):
    """Mark match as completed"""
    supabase.table("match_records").update({"status": "completed"}).eq("match_id", match_id).execute()
    return {"message": "Match completed"}

# --- Helper Functions ---
def get_previous_matches(user_id: str) -> List[str]:
    """Get user's previous match partners"""
    res = supabase.table("match_records").select("user_1_id,user_2_id").or_(
        f"user_1_id.eq.{user_id},user_2_id.eq.{user_id}"
    ).execute()
    return [
        m['user_1_id'] if m['user_1_id'] != user_id else m['user_2_id'] 
        for m in res.data
    ]

def clean_profile(profile: Dict) -> Dict:
    """Remove sensitive profile fields"""
    return {k: v for k, v in profile.items() if k not in ['email', 'password']}

# Health check
@app.get("/health")
def health_check():
    return {"status": "ok"}