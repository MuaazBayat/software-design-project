from fastapi import FastAPI, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from better_profanity import profanity
from supabase import create_client, Client
from clerk_backend_api import Clerk
from clerk_backend_api import models as clerk_models
from dotenv import load_dotenv
import os
from datetime import datetime
import uuid

# Environment variables for Supabase
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(dotenv_path)

# Retrieve Supabase credentials from environment variables.
SUPABASE_URL: str | None = os.environ.get("SUPABASE_URL")
SUPABASE_KEY: str | None = os.environ.get("SUPABASE_KEY")
CLERK_SECRET_KEY: str | None = os.environ.get("CLERK_SECRET_KEY")

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL environment variable is not set.")
if not SUPABASE_KEY:
    raise ValueError("SUPABASE_KEY environment variable is not set.")
if not CLERK_SECRET_KEY:
    raise ValueError("CLERK_SECRET_KEY not found in environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
clerk = Clerk(bearer_auth=CLERK_SECRET_KEY)

# Load profanity words
profanity.load_censor_words()

app = FastAPI(title="Content Moderation API")

#for dev purposes
base_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
FRONTEND_URL: str | None = os.getenv("FRONTEND_URL")
EXTERNAL_URL: str | None = os.getenv("EXTERNAL_URL")

# Conditionally add the frontend URL if it exists
if FRONTEND_URL:
    base_origins.append(FRONTEND_URL)

# Conditionally add the external URL if it exists
if EXTERNAL_URL:
    base_origins.append(EXTERNAL_URL)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=base_origins,
    allow_credentials=True,  # Allows cookies/auth headers
    allow_methods=["POST", "OPTIONS", "GET", "PUT"],  # POST for your endpoint + OPTIONS for preflight
    allow_headers=[
        "X-User-Id", 
        "X-Api-Key", 
        "Content-Type",
        "Authorization"  # In case you add this later
    ],
)

# Request model
class CheckRequest(BaseModel):
    text: str

@app.post("/api/v1/check")
def check_profanity(
    body: CheckRequest,
    x_user_id: str | None = Header(None, alias="X-User-Id"),
    x_api_key: str | None = Header(None, alias="X-Api-Key")
):
    # Initialize variables to prevent Pylance "possibly unbound" errors
    user_type: str | None = None
    user_id: str | None = None
    user: dict | None = None

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
        # Pylance fix: assert user is not None to confirm its type.
        assert user is not None
        assert user_id is not None
        # Create a moderation log entry
        moderation_log_entry = {
            "target_type": "message",
            "target_id": str(uuid.uuid4()),  # Generate a unique ID for this text check
            "reported_user_id": user_id,
            "reporting_user_id": None,  # System-generated report
            "violation_type": "inappropriate_content",
            "violation_description": f"Profanity detected in text: '{censored}'",
            "severity_level": "low",  # Adjust as needed
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

class ReportUser(BaseModel):
    reporterId: str
    reportedId: str
    violationType: str

@app.post("/api/v1/report-user")
def reportUser(body: ReportUser):
    #get users
    reporterUserId: str = body.reporterId
    reportedUserId: str = body.reportedId
    violation: str = body.violationType

    #check if user is in reported list
    user_res = supabase.table("user_profiles").select("reported_users").eq("user_id", reporterUserId).execute()
    reportedUsers = user_res.data[0] #dict
    #Default to [] if None
    reported_list = reportedUsers["reported_users"] or [] #list

    if (reportedUserId in reported_list):
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=reported_list
        )
    
    #Add to reported users list
    reported_list.append(reportedUserId)
    #ship to supabase
    response = (
        supabase.table("user_profiles")
        .update({"reported_users": reported_list})
        .eq("user_id", reporterUserId)
        .execute()
    )

    #increment reported user's report count
    supabase.rpc('increment_user_reported_count', {'user_id_to_update': reportedUserId}).execute()

    #Create a moderation log entry
    moderation_log_entry = {
        "target_type": "user",
        "target_id": reportedUserId,
        "reported_user_id": reportedUserId,
        "reporting_user_id": reporterUserId,  
        "violation_type": violation,
        "violation_description": "User reported",
        "severity_level": "low",  
        "automated_detection": False,
        "status": "open"
    }
    
    #Insert moderation log
    supabase.table("moderation_logs").insert(moderation_log_entry).execute()

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=response.data[0]["reported_users"]
    )

class ReportMessage(BaseModel):
    reporterId: str
    reportedUserId: str
    reportedMessageId: str
    violationType: str

@app.post("/api/v1/report-message")
def reportMessage(body: ReportMessage):
    #get users
    reporterUserId: str = body.reporterId
    reportedUserId: str = body.reportedUserId
    reportedMessageId: str = body.reportedMessageId
    violation: str = body.violationType

    #check if user is in reported list
    user_res = supabase.table("moderation_logs").select("*").eq("target_id", reportedMessageId).execute()
    reportedMessage = user_res.data #dict
    
    if len(reportedMessage) > 0:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=reportedMessage
        )

    #Create a moderation log entry
    moderation_log_entry = {
        "target_type": "message",
        "target_id": reportedMessageId,  
        "reported_user_id": reportedUserId,
        "reporting_user_id": reporterUserId,  
        "violation_type": violation,
        "violation_description": "User reported message",
        "severity_level": "low", 
        "automated_detection": False,
        "status": "open"
    }
    
    #Insert moderation log
    supabase.table("moderation_logs").insert(moderation_log_entry).execute()

    return JSONResponse(
        status_code = status.HTTP_200_OK,
        content = moderation_log_entry
    )

class BlockUser(BaseModel):
    reporterId: str
    reportedId: str

@app.post("/api/v1/block-user")
def blockUser(body: BlockUser):
    #get users
    reporterUserId: str = body.reporterId
    reportedUserId: str = body.reportedId

    #check if user is in blocked list
    user_res = supabase.table("user_profiles").select("blocked_users").eq("user_id", reporterUserId).execute()
    blockedUsers = user_res.data[0] #dict
    #Default to [] if None
    blocked_list = blockedUsers["blocked_users"] or [] #list

    if (reportedUserId in blocked_list):
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=blocked_list
        )
    
    #Add to reported users list
    blocked_list.append(reportedUserId)
    #ship to supabase
    response = (
        supabase.table("user_profiles")
        .update({"blocked_users": blocked_list})
        .eq("user_id", reporterUserId)
        .execute()
    )

    return JSONResponse(
        status_code = status.HTTP_201_CREATED,
        content = response.data[0]["blocked_users"]
    )

@app.post("/api/v1/ban-user/{log_id}")
def banUser(log_id: str):

    #Fetch the moderation log entry
    log_res = supabase.table("moderation_logs").select("*").eq("log_id", log_id).execute()
    if not log_res.data:
        raise HTTPException(status_code=404, detail="Moderation log not found")
    log_entry = log_res.data[0]
    user_id = log_entry["reported_user_id"]

    #Check if user exists
    user_res = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found")
    #Get clerk ID
    clerkId = user_res.data[0].get("clerk_id", None)
    if clerkId is None:
        raise HTTPException(status_code=400, detail="Clerk ID not found for user.")
    #Update the user's is_banned status to True
    supabase.table("user_profiles").update({"account_status": "banned"}).eq("user_id", user_id).execute()

    #update old log to resolved and add notes
    supabase.table("moderation_logs").update({
        "status": "resolved", 
        "resolution_action": "permanent_ban", 
        "resolution_notes": "User banned",
        "reviewed_at": datetime.utcnow().isoformat()
        }).eq("log_id", log_id).execute()

    #Add to banned_fingerprints table
    # Add all fingerprints to banned_fingerprints table
    fingerprints = user_res.data[0].get("fingerprint", [])
    if isinstance(fingerprints, list):
        for fp in fingerprints:
            supabase.table("banned_fingerprints").insert({
                "user_id": user_id,
                "fingerprint": fp
            }).execute()
    elif isinstance(fingerprints, str):
        # In case it's a single string, not a list
        supabase.table("banned_fingerprints").insert({
            "user_id": user_id,
            "fingerprint": fingerprints
        }).execute()

    #ban clerk user
    try:
        result = clerk.users.ban(user_id=clerkId)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": f"User {user_id} has been banned."}
    )

@app.post("/api/v1/ban-clerk-user/{clerk_id}")
def banClerkUser(clerk_id: str):
    #Check if user exists
    user_res = supabase.table("user_profiles").select("*").eq("clerk_id", clerk_id).execute()
    if user_res.data:
        #Update the user's is_banned status to True
        supabase.table("user_profiles").update({"account_status": "banned"}).eq("user_id", user_res.data[0]["user_id"]).execute()

    try:
        result = clerk.users.ban(user_id=clerk_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": f"Clerk user {clerk_id} has been banned."}
    )

@app.post("/api/v1/unban-user/{user_id}")
def unbanUser(user_id: str):
    #Check if user exists
    user_res = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found")
    #Get clerk ID
    clerkId = user_res.data[0].get("clerk_id", None)
    if clerkId is None:
        raise HTTPException(status_code=400, detail="Clerk ID not found for user.")
    #Update the user's is_banned status to False
    supabase.table("user_profiles").update({"account_status": "active"}).eq("user_id", user_id).execute()

    #delete from banned_fingerprints table
    supabase.table("banned_fingerprints").delete().eq("user_id", user_id).execute()

    #unban clerk user
    try:
        result = clerk.users.unban(user_id=clerkId)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": f"User {user_id} has been unbanned."}
    )

@app.post("/api/v1/unban-clerk-user/{clerk_id}")
def unbanClerkUser(clerk_id: str):
    #Check if user exists
    user_res = supabase.table("user_profiles").select("*").eq("clerk_id", clerk_id).execute()
    if user_res.data:
        #Update the user's is_banned status to False
        supabase.table("user_profiles").update({"account_status": "active"}).eq("user_id", user_res.data[0]["user_id"]).execute()

    try:
        result = clerk.users.unban(user_id=clerk_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": f"Clerk user {clerk_id} has been unbanned."}
    )

class ResolveCase(BaseModel):
    log_id: str
    action: str
    notes: str

@app.post("/api/v1/resolve-case")
def resolve_case(body: ResolveCase):

    # Validate action
    valid_actions = ["warning", "no_action", "content_removal", "temporary_ban", "permanent_ban"]
    if body.action not in valid_actions:
        raise HTTPException(status_code=400, detail="Invalid status value")

    # Fetch the moderation log entry
    log_res = supabase.table("moderation_logs").select("*").eq("log_id", body.log_id).execute()
    if not log_res.data:
        raise HTTPException(status_code=404, detail="Moderation log not found")

    status_value = "resolved" if body.action in ["warning", "content_removal", "temporary_ban", "permanent_ban"] else "dismissed"
    # Update the log entry
    update_data = {
        "status": "resolved" ,
        "resolution_action": body.action,
        "resolution_notes": body.notes,
        "reviewed_at": datetime.utcnow().isoformat()
    }
    supabase.table("moderation_logs").update(update_data).eq("log_id", body.log_id).execute()

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": f"Moderation log {body.log_id} has been updated."}
    )

@app.get("/api/v1/fingerprint/{fingerprint}")
def check_fingerprint(fingerprint: str):
    #Check if the fingerprint exists in the banned_fingerprints table
    res = supabase.table("banned_fingerprints").select("*").eq("fingerprint", fingerprint).execute()
    if res.data:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"is_banned": True, "message": "Fingerprint is banned."}
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"is_banned": False, "message": "Fingerprint is not banned."}
        )
    
@app.get("/api/v1/logs")
def get_moderation_logs(
    x_user_id: str | None = Header(None, alias="X-User-Id")
):
    # Verify that the user is a moderator
    if not x_user_id:
        raise HTTPException(status_code=400, detail="Missing X-User-Id header")

    #check idf user exists
    user_res = supabase.table("user_profiles").select("*").eq("user_id", x_user_id).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    #check if user is a moderator
    user = user_res.data[0]
    if user["moderator"] != True:
        raise HTTPException(status_code=403, detail="Access denied. User is not a moderator.")

    # Fetch all moderation logs
    logs_res = supabase.table("moderation_logs").select("*").order("created_at", desc=True).execute()
    return {"logs": logs_res.data}