from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from better_profanity import profanity
from supabase import create_client, Client
from dotenv import load_dotenv
import os

# Load .env file
load_dotenv()

# Environment variables for Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

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

    # Internal user flow
    elif x_user_id:
        user_res = supabase.table("internal_users").select("*").eq("id", x_user_id).execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="Internal user not found")
        user = user_res.data[0]
        user_type = "internal"
        user_id = user["id"]

    # Check profanity
    has_profanity = profanity.contains_profanity(body.text)
    censored = profanity.censor(body.text)

    # For internal users, increment violations if profanity found
    if user_type == "internal" and has_profanity:
        supabase.table("internal_users").update({
            "violation_count": user["violation_count"] + 1
        }).eq("id", user_id).execute()

    # Log usage
    supabase.table("usage_logs").insert({
        "user_type": user_type,
        "user_id": user_id,
        "text": body.text,
        "contains_profanity": has_profanity
    }).execute()

    return {
        "contains_profanity": has_profanity,
        "censored_text": censored
    }
