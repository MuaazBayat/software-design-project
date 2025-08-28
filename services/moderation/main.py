from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from better_profanity import profanity
from supabase import create_client, Client
from dotenv import load_dotenv
import os
from datetime import datetime
import uuid

# Environment variables for Supabase
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(dotenv_path)

# Retrieve Supabase credentials from environment variables.
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Load profanity words
profanity.load_censor_words()

app = FastAPI(title="Content Moderation API")

# Request model
class CheckRequest(BaseModel):
    text: str

@app.post("/check")
def check_profanity(
    body: CheckRequest,
    x_user_id: str | None = Header(None, alias="X-User-Id"),
    x_api_key: str | None = Header(None, alias="X-Api-Key")
):
    # Determine user type
    if x_user_id and x_api_key:
        raise HTTPException(status_code=400, detail="Provide either X-User-Id or X-Api-Key, not both")
    
    if not x_user_id and not x_api_key:
        raise HTTPException(status_code=400, detail="Missing authentication header")

    # External user flow
    if x_api_key:
        user_res = supabase.table("external_users").select("*").eq("api_key", x_api_key).execute()
        if not user_res.data:
            raise HTTPException(status_code=401, detail="Invalid API key")
        user = user_res.data[0]

        if user["usage_count"] >= user["usage_limit"]:
            raise HTTPException(status_code=429, detail="Usage limit reached")

        # Increment usage
        supabase.table("external_users").update({"usage_count": user["usage_count"] + 1}).eq("id", user["id"]).execute()
        user_type = "external"
        user_id = user["id"]

    # Internal user flow - UPDATED
    elif x_user_id:
        # Query user_profiles table instead of internal_users
        user_res = supabase.table("user_profiles").select("*").eq("user_id", x_user_id).execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="User not found")
        user = user_res.data[0]
        
        user_type = "internal"
        user_id = user["user_id"]

    # Check profanity
    has_profanity = profanity.contains_profanity(body.text)
    censored = profanity.censor(body.text)

    # For internal users, create moderation log if profanity found - UPDATED
    if user_type == "internal" and has_profanity:
        # Create a moderation log entry
        moderation_log_entry = {
            "target_type": "message",
            "target_id": str(uuid.uuid4()),  # Generate a unique ID for this text check
            "reported_user_id": user_id,
            "reporting_user_id": None,  # System-generated report
            "violation_type": "inappropriate_content",
            "violation_description": f"Profanity detected in text: '{censored}'",
            "severity_level": "low",  # Adjust based on your business rules
            "automated_detection": True,
            "status": "resolved",  # Auto-resolved since it's automated
            "resolution_action": "content_removal",
            "resolution_notes": "Profanity automatically detected and censored",
            "reviewed_at": datetime.utcnow().isoformat(),
            "system_context": {
                "original_text_length": len(body.text),
                "censored_text": censored,
                "detection_method": "better_profanity"
            }
        }
        
        # Insert moderation log
        supabase.table("moderation_logs").insert(moderation_log_entry).execute()
        
        # Increment reported_count for the user
        supabase.table("user_profiles").update({
            "reported_count": user["reported_count"] + 1,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("user_id", user_id).execute()

    return {
        "contains_profanity": has_profanity,
        "censored_text": censored
    }

