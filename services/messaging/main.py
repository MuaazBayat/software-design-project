# main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Iterable, Tuple
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo  # Python 3.9+
from supabase import create_client, Client
from dotenv import load_dotenv
import os

from fastapi.middleware.cors import CORSMiddleware



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

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

ALLOWED_ORIGINS.append(os.getenv("FRONTEND_URL", ""))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,   # or ["*"] in dev
    allow_credentials=False,         # keep false if using "*"
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
# -------------
# Models
# -------------

class LetterStyles(BaseModel):
    font_size: int = Field(ge=8, le=96)
    font_family: str = Field(min_length=1, max_length=100)

class MessageCreate(BaseModel):
    match_id: str
    sender_id: str
    recipient_id: str
    conversation_thread_id: str
    message_content: str = Field(min_length=1, max_length=5000)
    letter_styles: Optional[LetterStyles] = None   # <— NEW


class MessagesPage(BaseModel):
    conversation_thread_id: str
    page_size: int = Field(5, ge=1, le=100)
    # Use message_id cursor instead of timestamps; optional for first page
    last_message_id: Optional[str] = None

class SearchUsers(BaseModel):
    anonymous_handle: str  # pass "" to act like an inbox
    my_user_id: str
    limit: int = 20
    offset: int = 0

# ---------------------------
# Time helpers (South Africa)
# ---------------------------
def now_in_sa() -> datetime:
    """Current time in Africa/Johannesburg as aware datetime."""
    return datetime.now(ZoneInfo("Africa/Johannesburg"))

# ---------------------------
# Shared DB helpers
# ---------------------------
def _safe_execute(q):
    try:
        return q.execute()
    except Exception as e:
        # Surface common PG error codes cleanly
        err = str(e)
        if "23503" in err:
            raise HTTPException(status_code=400, detail="Foreign key violation.")
        if "23514" in err:
            raise HTTPException(status_code=400, detail="Check constraint failed.")
        raise

def _get_conv_map_for_user(my_user_id: str) -> Dict[str, str]:
    """
    Return {other_user_id: conversation_thread_id} for active matches where a conversation exists.
    Combines both roles (user_1 and user_2).
    """
    conv_map: Dict[str, str] = {}

    # I'm user_1
    r1 = _safe_execute(
        supabase.table("match_records")
        .select("user_1_id,user_2_id,conversation_thread_id,status")
        .eq("user_1_id", my_user_id)
        .eq("status", "active")
        .not_.is_("conversation_thread_id", "null")
    )
    for r in (r1.data or []):
        conv_map[r["user_2_id"]] = r["conversation_thread_id"]

    # I'm user_2
    r2 = _safe_execute(
        supabase.table("match_records")
        .select("user_1_id,user_2_id,conversation_thread_id,status")
        .eq("user_2_id", my_user_id)
        .eq("status", "active")
        .not_.is_("conversation_thread_id", "null")
    )
    for r in (r2.data or []):
        conv_map[r["user_1_id"]] = r["conversation_thread_id"]

    return conv_map

def _fetch_active_profiles(user_ids: Iterable[str], handle_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch ACTIVE user_profiles for given user_ids.
    If handle_filter is provided (including ""), apply ilike on anonymous_handle.
    """
    user_ids = list(user_ids)
    if not user_ids:
        return []

    q = (
        supabase.table("user_profiles")
        .select("*")
        .in_("user_id", user_ids)
        .eq("account_status", "active")
    )
    # Accept empty string to mean "no filter" but still stable-order by handle
    if handle_filter is not None:
        q = q.ilike("anonymous_handle", f"%{handle_filter}%").order("anonymous_handle", desc=False)

    res = _safe_execute(q)
    return res.data or []

def _fetch_latest_visible_messages(convo_ids: Iterable[str], now_sa_iso: str, limit_cap: int = 2000) -> Dict[str, Dict[str, Any]]:
    """
    For the given conversation IDs, fetch messages visible up to now_sa_iso and
    return a dict {conversation_thread_id: latest_message_row}.
    """
    convo_ids = list(convo_ids)
    if not convo_ids:
        return {}

    msgs_res = _safe_execute(
        supabase.table("messages")
        .select(
            "message_id,conversation_thread_id,message_content,"
            "sender_id,recipient_id,scheduled_delivery_at,read_at,delivery_status,created_at"
        )
        .in_("conversation_thread_id", convo_ids)
        .lte("scheduled_delivery_at", now_sa_iso)
        .order("scheduled_delivery_at", desc=True)
        .limit(limit_cap)
    )

    latest_by_convo: Dict[str, Dict[str, Any]] = {}
    for m in (msgs_res.data or []):
        cid = m["conversation_thread_id"]
        # first seen due to desc order is the latest
        if cid not in latest_by_convo:
            latest_by_convo[cid] = m
    return latest_by_convo

def _format_latest_message(m: Optional[Dict[str, Any]], my_user_id: str) -> Optional[Dict[str, Any]]:
    if not m:
        return None
    return {
        "message_id": m["message_id"],
        "conversation_thread_id": m["conversation_thread_id"],
        "message_content": m["message_content"],
        "sender_id": m["sender_id"],
        "recipient_id": m["recipient_id"],
        "scheduled_delivery_at": m["scheduled_delivery_at"],
        "read_at": m["read_at"],
        "from_me": m["sender_id"] == my_user_id,
        "is_read": m["read_at"] is not None,
        "delivery_status": m.get("delivery_status"),
    }

def _paginate_list(items: List[Any], limit: int, offset: int) -> Tuple[List[Any], bool, Optional[int]]:
    start = max(offset, 0)
    end = start + max(limit, 1)
    sliced = items[start:end]
    has_more = end < len(items)
    next_offset = end if has_more else None
    return sliced, has_more, next_offset

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
    scheduled_dt = now_in_sa() + timedelta(hours=12)

    # Determine next message_sequence (simple, non-racy increment)
    res = _safe_execute(
        supabase.table("messages")
        .select("message_sequence")
        .eq("conversation_thread_id", msg.conversation_thread_id)
        .order("message_sequence", desc=True)
        .limit(1)
    )
    seq = int(res.data[0]["message_sequence"]) + 1 if res.data else 1

    payload = {
        "match_id": msg.match_id,
        "sender_id": msg.sender_id,
        "recipient_id": msg.recipient_id,
        "conversation_thread_id": msg.conversation_thread_id,
        "message_sequence": seq,
        "message_content": msg.message_content,
        # SA is UTC+2, no DST; store ISO8601 with offset
        "scheduled_delivery_at": scheduled_dt.isoformat()
    }

    if msg.letter_styles is not None:
        payload["letter_styles"] = msg.letter_styles.model_dump()

    ins = _safe_execute(supabase.table("messages").insert(payload))
    if not ins.data:
        raise HTTPException(status_code=500, detail="Failed to insert message")
    return ins.data[0]

@app.post("/messages/page")
def page_messages_sa(body: MessagesPage):
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
        cur = _safe_execute(
            supabase.table("messages")
            .select("created_at")
            .eq("message_id", body.last_message_id)
            .single()
        )
        if not cur.data:
            raise HTTPException(status_code=404, detail="last_message_id not found")
        last_created_at = cur.data["created_at"]
        q = q.lt("created_at", last_created_at)

    res = _safe_execute(q.order("created_at", desc=True).limit(body.page_size))
    rows = res.data or []

    next_cursor = rows[-1]["message_id"] if rows else None

    return {
        "items": rows,                      # newest → oldest within this page
        "count": len(rows),
        "next_cursor": next_cursor,         # pass back as last_message_id for older page
        "has_more": len(rows) == body.page_size,
    }

# ---- shared implementation for search (acts like inbox when anonymous_handle == "") ----
def _search_users_impl(
    anonymous_handle: str,
    my_user_id: str,
    limit: int = 20,
    offset: int = 0,
):
    """
    Search users you have an active conversation with.
    Pass an empty anonymous_handle ("") to fetch all conversations (acts like inbox).
    """
    # 1) Map other_user_id → conversation_thread_id
    conv_map = _get_conv_map_for_user(my_user_id)
    if not conv_map:
        return {"count": 0, "items": []}

    # 2) Active profiles filtered by handle (empty string returns all, ordered by handle)
    profiles = _fetch_active_profiles(conv_map.keys(), handle_filter=anonymous_handle)
    if not profiles:
        return {"count": 0, "items": []}

    # 3) Page profiles
    paged_profiles, _, _ = _paginate_list(profiles, limit=limit, offset=offset)
    if not paged_profiles:
        return {"count": 0, "items": []}

    # 4) Latest visible message per convo using SA time cutoff
    now_sa_iso = now_in_sa().isoformat()
    convo_ids = [conv_map[p["user_id"]] for p in paged_profiles]
    latest_by_convo = _fetch_latest_visible_messages(convo_ids, now_sa_iso, limit_cap=1000)

    # 5) Build items
    items = []
    for p in paged_profiles:
        cid = conv_map[p["user_id"]]
        latest = _format_latest_message(latest_by_convo.get(cid), my_user_id)
        items.append(
            {
                "user_profile": p,                 # active-only
                "latest_message": latest,          # may be None if all are future-scheduled
            }
        )
    return {"count": len(items), "items": items}

# ---- POST (JSON body) ----
@app.post("/search")
def search(body: SearchUsers):
    """
    Search users you have an active conversation with.
    Pass an empty anonymous_handle ("") to fetch all conversations (acts like inbox).
    """
    return _search_users_impl(
        anonymous_handle=body.anonymous_handle,
        my_user_id=body.my_user_id,
        limit=body.limit,
        offset=body.offset,
    )
