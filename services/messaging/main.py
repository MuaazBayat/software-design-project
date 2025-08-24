# main.py
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo  # Python 3.9+
from supabase import create_client, Client
from dotenv import load_dotenv
import os

# -----------------------------
# Environment / Supabase client
# -----------------------------
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # Use service role key server-side
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# -------------
# FastAPI app
# -------------
app = FastAPI(title="Simple Messages API (SA time, ID cursor)")

# -------------
# Models
# -------------
class MessageCreate(BaseModel):
    match_id: str
    sender_id: str
    recipient_id: str
    conversation_thread_id: str
    message_content: str = Field(min_length=1, max_length=5000)

class MessagesPageSAIn(BaseModel):
    conversation_thread_id: str
    page_size: int = Field(5, ge=1, le=100)
    # Use message_id cursor instead of timestamps; optional for first page
    last_message_id: Optional[str] = None

# ---------------------------
# Time helpers (South Africa)
# ---------------------------
def now_in_sa() -> datetime:
    """Current time in Africa/Johannesburg as aware datetime."""
    return datetime.now(ZoneInfo("Africa/Johannesburg"))

# ---------------------------
# Routes
# ---------------------------
@app.get("/health")
def health():
    return {"ok": True}

@app.post("/messages")
def send_message(msg: MessageCreate):
    """
    Create a message that will be visible 5 minutes from now in South African time (SAST).
    """
    scheduled_dt = now_in_sa() + timedelta(minutes=5)

    # Determine next message_sequence (simple, non-racy increment)
    res = (
        supabase.table("messages")
        .select("message_sequence")
        .eq("conversation_thread_id", msg.conversation_thread_id)
        .order("message_sequence", desc=True)
        .limit(1)
        .execute()
    )
    seq = int(res.data[0]["message_sequence"]) + 1 if res.data else 1

    payload = {
        "match_id": msg.match_id,
        "sender_id": msg.sender_id,
        "recipient_id": msg.recipient_id,
        "conversation_thread_id": msg.conversation_thread_id,
        "message_sequence": seq,
        "message_content": msg.message_content,
        # Store with SA offset (+02:00 or +02/+01 depending on DST policy; SA is UTC+2, no DST)
        "scheduled_delivery_at": scheduled_dt.isoformat()
    }

    try:
        ins = supabase.table("messages").insert(payload).execute()
    except Exception as e:
        err = str(e)
        if "23503" in err:
            raise HTTPException(status_code=400, detail="Foreign key violation.")
        if "23514" in err:
            raise HTTPException(status_code=400, detail="Check constraint failed.")
        raise

    if not ins.data:
        raise HTTPException(status_code=500, detail="Failed to insert message")
    return ins.data[0]

@app.post("/messages/page-sa")
def page_messages_sa(body: MessagesPageSAIn):
    """
    Paginate messages for a conversation, using South Africa time (Africa/Johannesburg):
      - Only include rows where scheduled_delivery_at <= now_sa
      - Return newest -> oldest (created_at DESC)
      - page_size per page (default 5)
      - Use 'next_cursor' (a message_id) to fetch older pages

    If last_message_id is omitted, you get the latest page.
    """
    now_sa_iso = now_in_sa().isoformat()

    q = (
        supabase.table("messages")
        .select("*")
        .eq("conversation_thread_id", body.conversation_thread_id)
        .lte("scheduled_delivery_at", now_sa_iso)
    )

    if body.last_message_id:
        cur = (
            supabase.table("messages")
            .select("created_at")
            .eq("message_id", body.last_message_id)
            .single()
            .execute()
        )
        if not cur.data:
            raise HTTPException(status_code=404, detail="last_message_id not found")
        last_created_at = cur.data["created_at"]
        q = q.lt("created_at", last_created_at)

    q = q.order("created_at", desc=True).limit(body.page_size)
    res = q.execute()
    rows = res.data or []

    next_cursor = rows[-1]["message_id"] if rows else None

    return {
        "items": rows,                      # newest → oldest within this page
        "count": len(rows),
        "next_cursor": next_cursor,         # pass back as last_message_id for older page
        "has_more": len(rows) == body.page_size,
        
    }

# ---- request model for POST ----
class SearchUsersWithConvoIn(BaseModel):
    anonymous_handle: str
    my_user_id: str
    limit: int = 20
    offset: int = 0

# ---- shared implementation so GET and POST behave the same ----
def _search_users_with_convo_impl(
    anonymous_handle: str,
    my_user_id: str,
    limit: int = 20,
    offset: int = 0,
):
    # Build map of other_user_id -> conversation_thread_id (active matches with convo)
    conv_map: Dict[str, str] = {}

    # I'm user_1
    r1 = (
        supabase.table("match_records")
        .select("user_1_id,user_2_id,conversation_thread_id,status")
        .eq("user_1_id", my_user_id)
        .eq("status", "active")
        .not_.is_("conversation_thread_id", "null")
        .execute()
    )
    for r in (r1.data or []):
        conv_map[r["user_2_id"]] = r["conversation_thread_id"]

    # I'm user_2
    r2 = (
        supabase.table("match_records")
        .select("user_1_id,user_2_id,conversation_thread_id,status")
        .eq("user_2_id", my_user_id)
        .eq("status", "active")
        .not_.is_("conversation_thread_id", "null")
        .execute()
    )
    for r in (r2.data or []):
        conv_map[r["user_1_id"]] = r["conversation_thread_id"]

    if not conv_map:
        return {"count": 0, "items": []}

    other_ids = list(conv_map.keys())

    # Active profiles AND handle match
    profs_res = (
        supabase.table("user_profiles")
        .select("*")
        .in_("user_id", other_ids)
        .eq("account_status", "active")
        .ilike("anonymous_handle", f"%{anonymous_handle}%")
        .order("anonymous_handle", desc=False)
        .execute()
    )
    profiles: List[Dict[str, Any]] = profs_res.data or []
    if not profiles:
        return {"count": 0, "items": []}

    # Page profiles
    start = max(offset, 0)
    end = start + max(limit, 1)
    paged_profiles = profiles[start:end]
    if not paged_profiles:
        return {"count": 0, "items": []}

    # SA cutoff for latest visible message
    now_sa_iso = now_in_sa().isoformat()
    convo_ids = [conv_map[p["user_id"]] for p in paged_profiles]

    msgs_res = (
        supabase.table("messages")
        .select("message_id,conversation_thread_id,message_content,sender_id,recipient_id,scheduled_delivery_at,read_at,delivery_status")
        .in_("conversation_thread_id", convo_ids)
        .lte("scheduled_delivery_at", now_sa_iso)
        .order("scheduled_delivery_at", desc=True)
        .limit(1000)
        .execute()
    )

    latest_by_convo: Dict[str, Dict[str, Any]] = {}
    for m in (msgs_res.data or []):
        cid = m["conversation_thread_id"]
        if cid not in latest_by_convo:  # first seen is newest due to desc order
            latest_by_convo[cid] = m

    items = []
    for p in paged_profiles:
        cid = conv_map[p["user_id"]]
        latest = latest_by_convo.get(cid)
        latest_message = None
        if latest:
            latest_message = {
                "message_id": latest["message_id"],
                "conversation_thread_id": latest["conversation_thread_id"],
                "message_content": latest["message_content"],
                "sender_id": latest["sender_id"],
                "recipient_id": latest["recipient_id"],
                "scheduled_delivery_at": latest["scheduled_delivery_at"],
                "read_at": latest["read_at"],
                "from_me": latest["sender_id"] == my_user_id,
                "is_read": latest["read_at"] is not None,
                "delivery_status": latest.get("delivery_status"),
            }

        items.append(
            {
                "user_profile": p,             # active-only
                "latest_message": latest_message,  # may be null if all are future-scheduled
            }
        )

    return {"count": len(items), "items": items}

# ---- NEW: POST (JSON body) ----
@app.post("/search/users-with-convo")
def search_users_with_convo_post(body: SearchUsersWithConvoIn):
    return _search_users_with_convo_impl(
        anonymous_handle=body.anonymous_handle,
        my_user_id=body.my_user_id,
        limit=body.limit,
        offset=body.offset,
    )


class InboxIn(BaseModel):
    my_user_id: str
    limit: int = 15
    offset: int = 0

def _inbox_impl(my_user_id: str, limit: int = 15, offset: int = 0):
    """
    Build an inbox of active conversations for my_user_id, latest -> oldest,
    by the newest *visible* message in Africa/Johannesburg time.
    """
    # 1) Find active matches where there's a conversation_thread_id
    conv_map: Dict[str, str] = {}

    r1 = (
        supabase.table("match_records")
        .select("user_1_id,user_2_id,conversation_thread_id,status")
        .eq("user_1_id", my_user_id)
        .eq("status", "active")
        .not_.is_("conversation_thread_id", "null")
        .execute()
    )
    for r in (r1.data or []):
        conv_map[r["user_2_id"]] = r["conversation_thread_id"]

    r2 = (
        supabase.table("match_records")
        .select("user_1_id,user_2_id,conversation_thread_id,status")
        .eq("user_2_id", my_user_id)
        .eq("status", "active")
        .not_.is_("conversation_thread_id", "null")
        .execute()
    )
    for r in (r2.data or []):
        conv_map[r["user_1_id"]] = r["conversation_thread_id"]

    if not conv_map:
        return {"count": 0, "items": [], "has_more": False}

    other_ids = list(conv_map.keys())

    # 2) Only ACTIVE profiles
    profs_res = (
        supabase.table("user_profiles")
        .select("*")
        .in_("user_id", other_ids)
        .eq("account_status", "active")
        .execute()
    )
    profiles: List[Dict[str, Any]] = profs_res.data or []
    if not profiles:
        return {"count": 0, "items": [], "has_more": False}

    # Only keep conversations where the other user is active
    active_other_ids = {p["user_id"] for p in profiles}
    conv_map = {oid: cid for oid, cid in conv_map.items() if oid in active_other_ids}
    if not conv_map:
        return {"count": 0, "items": [], "has_more": False}

    # 3) Latest visible message per convo using SA time cutoff
    now_sa_iso = now_in_sa().isoformat()
    convo_ids = list(conv_map.values())
    msgs_res = (
        supabase.table("messages")
        .select("message_id,conversation_thread_id,message_content,sender_id,recipient_id,scheduled_delivery_at,read_at,delivery_status")
        .in_("conversation_thread_id", convo_ids)
        .lte("scheduled_delivery_at", now_sa_iso)
        .order("scheduled_delivery_at", desc=True)
        .limit(2000)  # big enough to cover all convos
        .execute()
    )
    latest_by_convo: Dict[str, Dict[str, Any]] = {}
    for m in (msgs_res.data or []):
        cid = m["conversation_thread_id"]
        if cid not in latest_by_convo:  # first seen is newest due to desc order
            latest_by_convo[cid] = m

    # 4) Build items [{ user_profile, conversation_thread_id, latest_message }]
    prof_by_id = {p["user_id"]: p for p in profiles}
    items: List[Dict[str, Any]] = []
    for other_id, cid in conv_map.items():
        latest = latest_by_convo.get(cid)
        latest_message = None
        if latest:
            latest_message = {
                "message_id": latest["message_id"],
                "conversation_thread_id": cid,
                "message_content": latest["message_content"],
                "sender_id": latest["sender_id"],
                "recipient_id": latest["recipient_id"],
                "scheduled_delivery_at": latest["scheduled_delivery_at"],
                "read_at": latest["read_at"],
                "from_me": latest["sender_id"] == my_user_id,
                "is_read": latest["read_at"] is not None,
                "delivery_status": latest.get("delivery_status"),
            }

        items.append(
            {
                "user_profile": prof_by_id.get(other_id),
                "conversation_thread_id": cid,
                "latest_message": latest_message,  # can be None if nothing visible yet
            }
        )

    # 5) Order latest -> oldest by latest visible message; items with None go last
    def sort_key(row: Dict[str, Any]):
        lm = row["latest_message"]
        # Use very old date for None to push to end
        return lm["scheduled_delivery_at"] if lm else "0000-01-01T00:00:00Z"

    items.sort(key=sort_key, reverse=True)

    # 6) Pagination (offset/limit)
    start = max(offset, 0)
    end = start + max(limit, 1)
    slice_items = items[start:end]

    return {
        "count": len(slice_items),
        "items": slice_items,
        "has_more": end < len(items),
        "next_offset": end if end < len(items) else None,
        
    }

# --- POST (JSON body) inbox endpoint ---
@app.post("/inbox")
def inbox(body: InboxIn):
    return _inbox_impl(
        my_user_id=body.my_user_id,
        limit=body.limit,
        offset=body.offset,
    )