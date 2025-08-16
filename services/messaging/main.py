# main.py
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv
import os

# -----------------------------
# Environment / Supabase client
# -----------------------------
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # Prefer service role key server-side
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# -------------
# FastAPI app
# -------------
app = FastAPI(title="Simple Messages API")

# -------------
# Models
# -------------
class MessageIn(BaseModel):
    match_id: str
    sender_id: str
    recipient_id: str
    conversation_thread_id: str
    message_sequence: int = Field(ge=1)
    message_content: str = Field(min_length=1, max_length=5000)
    # ISO-8601 string, e.g. "2025-08-16T16:40:00Z"
    scheduled_delivery_at: str
    client_timezone: str = "UTC"
    estimated_read_time: int = 1

def parse_iso(dt: str) -> datetime:
    """Parse ISO-8601 allowing trailing 'Z'."""
    return datetime.fromisoformat(dt.replace("Z", "+00:00"))

def iso_now_utc() -> datetime:
    return datetime.now(timezone.utc)

# ---------------------------
# Routes
# ---------------------------
@app.get("/health")
def health():
    return {"ok": True}

@app.post("/messages")
def send_message(msg: MessageIn):
    # Validate & normalize scheduled_delivery_at
    try:
        scheduled_dt = parse_iso(msg.scheduled_delivery_at)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="scheduled_delivery_at must be ISO-8601 (e.g., 2025-08-16T16:40:00Z)"
        )

    now = iso_now_utc()
    # Auto-bump to 5 minutes in future if not strictly greater than now
    if scheduled_dt <= now:
        scheduled_dt = now + timedelta(minutes=5)

    payload = {
        "match_id": msg.match_id,
        "sender_id": msg.sender_id,
        "recipient_id": msg.recipient_id,
        "conversation_thread_id": msg.conversation_thread_id,
        "message_sequence": msg.message_sequence,
        "message_content": msg.message_content,
        "scheduled_delivery_at": scheduled_dt.isoformat(),
        "client_timezone": msg.client_timezone,
        "estimated_read_time": msg.estimated_read_time,
        # All other columns rely on DB defaults (delivery_status, moderation_status, etc.)
    }

    try:
        res = supabase.table("messages").insert(payload).execute()
    except Exception as e:
        # Try to surface common Postgres errors nicely
        msg_text = str(e)
        if "23503" in msg_text:  # foreign key violation
            raise HTTPException(
                status_code=400,
                detail="Foreign key violation: ensure match_id, sender_id, and recipient_id exist."
            )
        if "23514" in msg_text:  # check constraint (e.g., valid_delivery_time)
            raise HTTPException(
                status_code=400,
                detail="Check constraint failed (likely scheduled_delivery_at must be > created_at)."
            )
        raise

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to insert message")
    return res.data[0]



@app.get("/messages")
def get_messages(
    conversation_thread_id: str = Query(..., description="Thread to fetch"),
    last_message_id: Optional[str] = Query(None, description="Start after this message_id"),
    page_size: int = Query(5, ge=1, le=100)
):
    """
    Fetch messages in pages of `page_size`, ordered by created_at ASC.
    Provide `last_message_id` to continue from the next one.
    """
    # Base query: only messages in this thread
    q = supabase.table("messages").select("*").eq("conversation_thread_id", conversation_thread_id)

    if last_message_id:
        # Find the created_at of the last seen message
        last_res = supabase.table("messages").select("created_at").eq("message_id", last_message_id).single().execute()
        if not last_res.data:
            raise HTTPException(status_code=404, detail="last_message_id not found")
        last_created_at = last_res.data["created_at"]

        # Only fetch messages newer than that
        q = q.gt("created_at", last_created_at)

    # Always return oldest first, so the client can append them
    q = q.order("created_at", desc=False).limit(page_size)
    res = q.execute()

    rows = res.data or []
    next_cursor = rows[-1]["message_id"] if rows else None

    return {
        "items": rows,
        "count": len(rows),
        "next_cursor": next_cursor,  # Use this as last_message_id for the next page
        "has_more": len(rows) == page_size
    }
