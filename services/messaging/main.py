# main.py
from fastapi import FastAPI, HTTPException, File, UploadFile, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Iterable, Tuple
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo  # Python 3.9+
from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import os, time
from uuid import uuid4
from threading import RLock

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
app = FastAPI(title="Messages API (fast, SA time)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# -------------
# Models
# -------------
class MessagesPage(BaseModel):
    conversation_thread_id: str
    page_size: int = Field(5, ge=1, le=100)
    last_message_id: Optional[str] = None

class SearchUsers(BaseModel):
    anonymous_handle: str  # "" acts like inbox
    my_user_id: str
    limit: int = 20
    offset: int = 0

# ---------------------------
# Time helpers (South Africa)
# ---------------------------
def now_in_sa() -> datetime:
    return datetime.now(ZoneInfo("Africa/Johannesburg"))

# ---------------------------
# Shared DB helpers
# ---------------------------
def _safe_execute(q):
    try:
        return q.execute()
    except Exception as e:
        err = str(e)
        if "23503" in err:
            raise HTTPException(status_code=400, detail="Foreign key violation.")
        if "23514" in err:
            raise HTTPException(status_code=400, detail="Check constraint failed.")
        raise

def _normalize_pair(a: str, b: str) -> Tuple[str, str]:
    return (a, b) if a <= b else (b, a)

def _get_active_match_and_thread(user_x: str, user_y: str) -> Dict[str, str]:
    """
    Return {'match_id': ..., 'conversation_thread_id': ...} for the ACTIVE match between two users,
    regardless of ordering. Requires conversation_thread_id to be non-null.
    """
    a, b = _normalize_pair(user_x, user_y)
    res = _safe_execute(
        supabase.table("match_records")
        .select("match_id,conversation_thread_id,status")
        .or_(f"and(user_1_id.eq.{a},user_2_id.eq.{b}),and(user_1_id.eq.{b},user_2_id.eq.{a})")
        .eq("status", "active")
        .limit(1)
    )
    row = (res.data or [None])[0]
    if not row:
        raise HTTPException(status_code=404, detail="No active match between users.")
    return {"match_id": row["match_id"], "conversation_thread_id": row.get("conversation_thread_id")}

def _get_conv_map_for_user(my_user_id: str) -> Dict[str, str]:
    conv_map: Dict[str, str] = {}

    r1 = _safe_execute(
        supabase.table("match_records")
        .select("user_1_id,user_2_id,conversation_thread_id,status")
        .eq("user_1_id", my_user_id)
        .eq("status", "active")
        .not_.is_("conversation_thread_id", "null")
    )
    for r in (r1.data or []):
        conv_map[r["user_2_id"]] = r["conversation_thread_id"]

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

def _search_active_profiles_fts(user_ids: Iterable[str], qtext: Optional[str]) -> List[Dict[str, Any]]:
    user_ids = list(user_ids)
    if not user_ids:
        return []

    base = (
        supabase.table("user_profiles")
        .select("user_id,anonymous_handle,account_status")
        .in_("user_id", user_ids)
        .eq("account_status", "active")
    )

    if not qtext or not qtext.strip():
        res = _safe_execute(base.order("anonymous_handle", desc=False))
        return res.data or []

    qtext = qtext.strip()
    try:
        res = _safe_execute(
            base.text_search("anonymous_handle", qtext, {"type": "websearch", "config": "simple"})
               .order("anonymous_handle", desc=False)
        )
    except AttributeError:
        res = _safe_execute(
            base.filter("anonymous_handle", "wfts", qtext)
               .order("anonymous_handle", desc=False)
        )
    return res.data or []

def _fetch_latest_visible_messages(convo_ids: Iterable[str], now_sa_iso: str, limit_cap: int = 1000) -> Dict[str, Dict[str, Any]]:
    convo_ids = list(convo_ids)
    if not convo_ids:
        return {}
    msgs_res = _safe_execute(
        supabase.table("messages")
        .select(
            "message_id,conversation_thread_id,message_content,"
            "sender_id,recipient_id,scheduled_delivery_at,read_at,delivery_status,created_at,letter_url"
        )
        .in_("conversation_thread_id", convo_ids)
        .lte("scheduled_delivery_at", now_sa_iso)
        .order("scheduled_delivery_at", desc=True)
        .limit(limit_cap)
    )
    latest_by_convo: Dict[str, Dict[str, Any]] = {}
    for m in (msgs_res.data or []):
        cid = m["conversation_thread_id"]
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
    return {"ok": True, "time_sa": now_in_sa().isoformat()}

@app.post("/messages")
def send_message(msg: MessageCreate):
    """
    Create a message visible in South African time.
    Requires: sender_id, recipient_id, message_content, optional letter_styles.
    Uses match_records to resolve both match_id and conversation_thread_id.
    """
    # 1) Resolve active match + conversation thread id from match_records
    ids = _get_active_match_and_thread(msg.sender_id, msg.recipient_id)
    match_id = ids["match_id"]
    thread_id = ids["conversation_thread_id"]

    # 2) Schedule in SA time (example: +12 hours)
    scheduled_dt = now_in_sa() + timedelta(hours=12)

    # 3) Next sequence within this thread
    seq = _next_sequence(thread_id)

    # 4) Insert message
    payload = {
        "match_id": match_id,
        "sender_id": msg.sender_id,
        "recipient_id": msg.recipient_id,
        "conversation_thread_id": thread_id,
        "message_sequence": seq,
        "message_content": msg.message_content,
        "scheduled_delivery_at": scheduled_dt.isoformat(),
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
    Paginate messages for a conversation:
      - Only include rows where scheduled_delivery_at <= now (SA time)
      - Return newest -> oldest (created_at DESC)
      - Use 'next_cursor' (message_id) to fetch older pages
    """
    now_sa_iso = now_in_sa().isoformat()

    q = (
        supabase.table("messages")
        .select(
            "message_id,conversation_thread_id,message_sequence,message_content,"
            "sender_id,recipient_id,scheduled_delivery_at,read_at,delivery_status,created_at,letter_url"
        )
        .eq("conversation_thread_id", thread_id)
    )

    if body.only_visible_now:
        q = q.lte("scheduled_delivery_at", now_sa_iso)

    if body.last_message_id:
        cur = _safe_execute(
            supabase.table("messages").select("created_at").eq("message_id", body.last_message_id).single()
        )
        if not cur.data:
            raise HTTPException(status_code=404, detail="last_message_id not found")
        q = q.lt("created_at", cur.data["created_at"])

    res = _safe_execute(q.order("created_at", desc=True).limit(body.page_size))
    rows = res.data or []

    next_cursor = rows[-1]["message_id"] if rows else None
    return {
        "items": rows,
        "count": len(rows),
        "next_cursor": next_cursor,
        "has_more": len(rows) == body.page_size,
    }

# ---- search implementation (FTS; "" acts like inbox) ----
def _search_users_impl(
    anonymous_handle: str,
    my_user_id: str,
    limit: int = 20,
    offset: int = 0,
):
    """
    Search users you have an active conversation with.
    Full-text search on anonymous_handle (websearch).
    Pass empty anonymous_handle ('') to fetch all conversations (inbox behavior).
    """
    # 1) Map other_user_id → conversation_thread_id
    conv_map = _get_conv_map_for_user(my_user_id)
    if not conv_map:
        return {"count": 0, "items": []}

    profiles = _search_active_profiles_fts(conv_map.keys(), qtext=body.anonymous_handle)
    if not profiles:
        return {"count": 0, "items": []}

    # 3) Page profiles
    paged_profiles, _, _ = _paginate_list(profiles, limit=limit, offset=offset)
    if not paged_profiles:
        return {"count": 0, "items": []}

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
    Search users you have an active conversation with (full-text on handle).
    Pass empty anonymous_handle ('') to fetch all conversations (inbox).
    """
    return _search_users_impl(
        anonymous_handle=body.anonymous_handle,
        my_user_id=body.my_user_id,
        limit=body.limit,
        offset=body.offset,
    )
