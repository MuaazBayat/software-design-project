# main.py
from fastapi import FastAPI, HTTPException, File, UploadFile, Request, Depends, Query
from pydantic import BaseModel, Field, constr
from typing import Optional, Dict, Any, List, Iterable, Tuple
from datetime import datetime
from zoneinfo import ZoneInfo
from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import os, time
from uuid import uuid4
from threading import RLock

# Import authentication
from auth import verify_token

# -----------------------------
# Environment / Supabase client
# -----------------------------
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_KEY")

if ".storage.supabase.co" in SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL must be the project root (…supabase.co), not the storage subdomain."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# -------------
# FastAPI app
# -------------
app = FastAPI(title="Messages API (fast, SA time)")

ALLOWED_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|globetalk-frontend-388957617777\.us-central1\.run\.app)(:\d+)?$"

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],    
    allow_headers=["*"],      
    allow_credentials=False,  
)


# -------------
# Models
# -------------
class PageLettersRequest(BaseModel):
    conversation_thread_id: str = Field(..., alias="conversation_thread_id")
    page_size: int = Field(10, ge=1, le=100)
    last_message_id: Optional[str] = None
    viewer_user_id: str

class SearchUsers(BaseModel):
    anonymous_handle: str
    my_user_id: str
    limit: int = 20
    offset: int = 0
    
class MarkReadBody(BaseModel):
    my_user_id: str

class MarkRead(BaseModel):
    conversation_thread_id: constr(strip_whitespace=True, min_length=1) = Field(..., alias="conversation_thread_id")
    my_user_id: constr(strip_whitespace=True, min_length=1) = Field(..., alias="my_user_id")

    class Config:
        allow_population_by_field_name = True
        fields = {
            "conversation_thread_id": {"alias": "conversationThreadId"},
            "my_user_id": {"alias": "myUserId"},
        }

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
        raise HTTPException(status_code=500, detail=str(e))

def _normalize_pair(a: str, b: str) -> Tuple[str, str]:
    return (a, b) if a <= b else (b, a)

def _get_active_match_and_thread(user_x: str, user_y: str) -> Dict[str, Optional[str]]:
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

def _get_conv_map_for_user(my_user_id: str) -> Dict[str, Dict[str, str]]:
    """
    Returns: { other_user_id: {"conversation_thread_id": str, "match_type": str} }
    Only active matches with a thread id.
    """
    conv_map: Dict[str, Dict[str, str]] = {}

    r1 = _safe_execute(
        supabase.table("match_records")
        .select("user_1_id,user_2_id,conversation_thread_id,status,match_type")
        .eq("user_1_id", my_user_id)
        .eq("status", "active")
        .not_.is_("conversation_thread_id", "null")
    )
    for r in (r1.data or []):
        conv_map[r["user_2_id"]] = {
            "conversation_thread_id": r["conversation_thread_id"],
            "match_type": r.get("match_type") or "either",
        }

    r2 = _safe_execute(
        supabase.table("match_records")
        .select("user_1_id,user_2_id,conversation_thread_id,status,match_type")
        .eq("user_2_id", my_user_id)
        .eq("status", "active")
        .not_.is_("conversation_thread_id", "null")
    )
    for r in (r2.data or []):
        conv_map[r["user_1_id"]] = {
            "conversation_thread_id": r["conversation_thread_id"],
            "match_type": r.get("match_type") or "either",
        }

    return conv_map

def _search_active_profiles_fts(user_ids: Iterable[str], qtext: Optional[str]) -> List[Dict[str, Any]]:
    user_ids = list(user_ids)
    if not user_ids:
        return []

    base = (
        supabase.table("user_profiles")
        .select("user_id,anonymous_handle,account_status,country_code,age_range,bio,interests")
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

_SIGNED_URL_CACHE: Dict[str, Tuple[str, float]] = {}
_CACHE_LOCK = RLock()

def _batch_signed_urls(object_paths: List[str], ttl_seconds: int = 86400) -> Dict[str, str]:
    """Batch sign with cache support."""
    now = time.time()
    paths_to_sign = []
    result: Dict[str, str] = {}

    with _CACHE_LOCK:
        for p in object_paths:
            entry = _SIGNED_URL_CACHE.get(p)
            if entry:
                url, exp = entry
                if exp - now > 60:  # still fresh
                    result[p] = url
                    continue
            paths_to_sign.append(p)

    if paths_to_sign:
        res = supabase.storage.from_("letters").create_signed_urls(paths_to_sign, ttl_seconds)
        if isinstance(res, list):
            with _CACHE_LOCK:
                for r in res:
                    if r.get("path") and r.get("signedURL"):
                        result[r["path"]] = r["signedURL"]
                        _SIGNED_URL_CACHE[r["path"]] = (r["signedURL"], now + ttl_seconds)
    return result


# ---------------------------
# Message lookups for lists
# ---------------------------
def _latest_delivered_by_convo(convo_ids: List[str], now_sa_iso: str) -> Dict[str, Dict[str, Any]]:
    if not convo_ids:
        return {}
    res = _safe_execute(
        supabase.table("messages")
        .select(
            "message_id,conversation_thread_id,message_content,"
            "sender_id,recipient_id,scheduled_delivery_at,read_at,"
            "delivery_status,created_at,letter_url"
        )
        .in_("conversation_thread_id", convo_ids)
        .lte("scheduled_delivery_at", now_sa_iso)
        .order("scheduled_delivery_at", desc=True)
        .limit(2000)
    )
    out: Dict[str, Dict[str, Any]] = {}
    for m in (res.data or []):
        cid = m["conversation_thread_id"]
        if cid not in out:
            out[cid] = m
    return out

def _latest_in_transit_from_me(convo_ids: List[str], now_sa_iso: str, my_user_id: str) -> Dict[str, Dict[str, Any]]:
    if not convo_ids:
        return {}
    res = _safe_execute(
        supabase.table("messages")
        .select(
            "message_id,conversation_thread_id,message_content,"
            "sender_id,recipient_id,scheduled_delivery_at,read_at,"
            "delivery_status,created_at,letter_url"
        )
        .in_("conversation_thread_id", convo_ids)
        .eq("sender_id", my_user_id)
        .gt("scheduled_delivery_at", now_sa_iso)
        .order("scheduled_delivery_at", desc=True)
        .limit(2000)
    )
    out: Dict[str, Dict[str, Any]] = {}
    for m in (res.data or []):
        cid = m["conversation_thread_id"]
        if cid not in out:
            m["in_transit"] = True
            out[cid] = m
    return out

def _latest_unread_to_me(convo_ids: List[str], now_sa_iso: str, my_user_id: str) -> Dict[str, Dict[str, Any]]:
    """Latest delivered, unread message where I am recipient."""
    if not convo_ids:
        return {}
    res = _safe_execute(
        supabase.table("messages")
        .select(
            "message_id,conversation_thread_id,message_content,"
            "sender_id,recipient_id,scheduled_delivery_at,read_at,"
            "delivery_status,created_at,letter_url"
        )
        .in_("conversation_thread_id", convo_ids)
        .eq("recipient_id", my_user_id)
        .is_("read_at", "null")
        .lte("scheduled_delivery_at", now_sa_iso)
        .order("scheduled_delivery_at", desc=True)
        .limit(2000)
    )
    out: Dict[str, Dict[str, Any]] = {}
    for m in (res.data or []):
        cid = m["conversation_thread_id"]
        if cid not in out:
            out[cid] = m
    return out

def _latest_unread_from_me(convo_ids: List[str], now_sa_iso: str, my_user_id: str) -> Dict[str, Dict[str, Any]]:
    """Latest delivered, unread message where I am sender (recipient has not read yet)."""
    if not convo_ids:
        return {}
    res = _safe_execute(
        supabase.table("messages")
        .select(
            "message_id,conversation_thread_id,message_content,"
            "sender_id,recipient_id,scheduled_delivery_at,read_at,"
            "delivery_status,created_at,letter_url"
        )
        .in_("conversation_thread_id", convo_ids)
        .eq("sender_id", my_user_id)
        .is_("read_at", "null")
        .lte("scheduled_delivery_at", now_sa_iso)
        .order("scheduled_delivery_at", desc=True)
        .limit(2000)
    )
    out: Dict[str, Dict[str, Any]] = {}
    for m in (res.data or []):
        cid = m["conversation_thread_id"]
        if cid not in out:
            out[cid] = m
    return out

def _latest_received_any(convo_ids: List[str], now_sa_iso: str, my_user_id: str) -> Dict[str, Dict[str, Any]]:
    """Latest delivered message addressed to me, read or unread."""
    if not convo_ids:
        return {}
    res = _safe_execute(
        supabase.table("messages")
        .select(
            "message_id,conversation_thread_id,message_content,"
            "sender_id,recipient_id,scheduled_delivery_at,read_at,created_at,letter_url"
        )
        .in_("conversation_thread_id", convo_ids)
        .eq("recipient_id", my_user_id)
        .lte("scheduled_delivery_at", now_sa_iso)
        .order("scheduled_delivery_at", desc=True)
        .limit(2000)
    )
    out: Dict[str, Dict[str, Any]] = {}
    for m in (res.data or []):
        cid = m["conversation_thread_id"]
        if cid not in out:
            out[cid] = m
    return out

def _latest_sent_any(convo_ids: List[str], now_sa_iso: str, my_user_id: str) -> Dict[str, Dict[str, Any]]:
    """Latest delivered message I have sent."""
    if not convo_ids:
        return {}
    res = _safe_execute(
        supabase.table("messages")
        .select(
            "message_id,conversation_thread_id,message_content,"
            "sender_id,recipient_id,scheduled_delivery_at,read_at,created_at,letter_url"
        )
        .in_("conversation_thread_id", convo_ids)
        .eq("sender_id", my_user_id)
        .lte("scheduled_delivery_at", now_sa_iso)
        .order("scheduled_delivery_at", desc=True)
        .limit(2000)
    )
    out: Dict[str, Dict[str, Any]] = {}
    for m in (res.data or []):
        cid = m["conversation_thread_id"]
        if cid not in out:
            out[cid] = m
    return out

def _get_blocked_users(my_user_id: str) -> List[str]:
    """Get list of user IDs that this user has blocked."""
    try:
        res = _safe_execute(
            supabase.table("user_profiles")
            .select("blocked_users")
            .eq("user_id", my_user_id)
            .single()
        )
        if res.data and res.data.get("blocked_users"):
            blocked = res.data["blocked_users"]
            if isinstance(blocked, str):
                import json
                return json.loads(blocked)
            elif isinstance(blocked, list):
                return blocked
        return []
    except Exception:
        return []

def _either_blocked(user_a: str, user_b: str) -> bool:
    """True if A blocked B or B blocked A."""
    a_blocked = set(_get_blocked_users(user_a))
    if user_b in a_blocked:
        return True
    b_blocked = set(_get_blocked_users(user_b))
    return user_a in b_blocked

# ---------------------------
# Upload helper
# ---------------------------
async def _upload_from_uploadfile(file: UploadFile) -> str:
    file_bytes = await file.read()
    object_path = f"uploads/{uuid4()}_{file.filename}"
    content_type = file.content_type or "application/octet-stream"
    res = supabase.storage.from_("letters").upload(
        object_path,
        file_bytes,
        {"content-type": content_type, "x-upsert": "true", "cache-control": "public, max-age=31536000, immutable"},
    )
    if hasattr(res, "error") and res.error:
        raise HTTPException(status_code=500, detail=f"Upload failed: {res.error}")
    return object_path

# ---------------------------
# Routes
# ---------------------------

@app.post("/api/v1/messages")
async def send_message(request: Request, token: str = Depends(verify_token)):
    ctype = (request.headers.get("content-type") or "").lower()
    is_multipart = "multipart/form-data" in ctype

    sender_id = recipient_id = message_content = None
    delay_hours = os.getenv("DELAY_HOURS", 12)  # default
    delay_minutes = os.getenv("DELAY_MINUTES", 0)  # default
    object_path: Optional[str] = None

    try:
        if is_multipart:
            form = await request.form()
            sender_id = (form.get("sender_id") or "").strip()
            recipient_id = (form.get("recipient_id") or "").strip()
            message_content = (form.get("message_content") or "").strip()
            if form.get("delay_hours") is not None:
                delay_hours = int(form.get("delay_hours"))
            file_field = form.get("file")
            if isinstance(file_field, UploadFile) and file_field.filename:
                object_path = await _upload_from_uploadfile(file_field)
            else:
                object_path = (form.get("letter_url") or None)
        else:
            try:
                body = await request.json()
            except Exception:
                body = {}
            sender_id = (body.get("sender_id") or "").strip()
            recipient_id = (body.get("recipient_id") or "").strip()
            message_content = (body.get("message_content") or "").strip()
            if body.get("delay_hours") is not None:
                delay_hours = int(body.get("delay_hours"))
            object_path = body.get("letter_url") or None
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Bad request body: {e}")

    if not sender_id or not recipient_id or not message_content:
        raise HTTPException(status_code=422, detail="sender_id, recipient_id, message_content required")

    # Block enforcement: if either has blocked the other, forbid sending
    if _either_blocked(sender_id, recipient_id):
        raise HTTPException(status_code=403, detail="Messaging is forbidden due to block settings")

    payload = {
        "p_sender_id": sender_id,
        "p_recipient_id": recipient_id,
        "p_message_content": message_content,
        "p_letter_url": object_path,
        "p_delay_hours": delay_hours,
        "p_delay_minutes": delay_minutes,
    }

    res = _safe_execute(supabase.rpc("send_message_oneshot", payload))
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to insert message")
    row = res.data

    return row

@app.get("/api/v1/messages/page")
def page_messages_sa(
    conversation_thread_id: str = Query(..., alias="conversation_thread_id"),
    viewer_user_id: str = Query(..., alias="viewer_user_id"),
    page_size: int = Query(10, ge=1, le=100, alias="page_size"),
    last_message_id: Optional[str] = Query(None, alias="last_message_id"),
    token: str = Depends(verify_token),
):
    now_sa_iso = now_in_sa().isoformat()

    try:
        res = _safe_execute(
            supabase.rpc(
                "page_messages_by_thread",
                {
                    "p_conversation_thread_id": conversation_thread_id,
                    "p_last_message_id": last_message_id,
                    "p_page_size": page_size,
                    "p_now": now_sa_iso,
                    "p_viewer_user": viewer_user_id,
                },
            )
        )
    except HTTPException as e:
        msg = str(e.detail)
        if "blocked" in msg:
            raise HTTPException(status_code=403, detail="Access forbidden due to block settings")
        if "last_message_id not found" in msg:
            raise HTTPException(status_code=404, detail="last_message_id not found")
        if "cursor does not belong to thread" in msg:
            raise HTTPException(status_code=400, detail="last_message_id does not belong to conversation_thread_id")
        raise

    rows = res.data or []

    # sign URLs
    paths = [r["letter_url"] for r in rows if r.get("letter_url")]
    signed_map = _batch_signed_urls(paths) if paths else {}
    for r in rows:
        lu = r.get("letter_url")
        if lu and lu in signed_map:
            r["letter_url_signed"] = signed_map[lu]

    next_cursor = rows[-1]["message_id"] if rows else None
    return {
        "items": rows,
        "count": len(rows),
        "next_cursor": next_cursor,
        "has_more": len(rows) == page_size,
    }

@app.get("/api/v1/search")
def search(
    my_user_id: str = Query(..., alias="my_user_id"),
    anonymous_handle: str = Query("", alias="anonymous_handle"),
    limit: int = Query(20, ge=1, le=50, alias="limit"),
    offset: int = Query(0, ge=0, alias="offset"),
    token: str = Depends(verify_token),
):
    """
    Returns items shaped as:
      {
        "user_profile": {
          "user_id", "anonymous_handle", "country_code", "bio", "age_range", "interests"
        },
        "latest_message": { ... } | null,
        "match_type": "one-time" | "long-term" | "either"
      }
    """
    now_sa_iso = now_in_sa().isoformat()

    # 1) Use RPC to compute page (handles blocks, handle filter, paging, one-time rules)
    rpc = _safe_execute(
        supabase.rpc(
            "search_conversations_page",
            {
                "p_my_user": my_user_id,
                "p_query": anonymous_handle or "",
                "p_limit": limit,
                "p_offset": offset,
                "p_now": now_sa_iso,
            },
        )
    )
    rows = rpc.data or []
    if not rows:
        return {"count": 0, "items": []}

    # 2) Pre-sign any letter URLs for the 'pick' message we’ll return
    paths = [r["latest_letter_url"] for r in rows if r.get("latest_letter_url")]
    signed_map = _batch_signed_urls(paths) if paths else {}

    # 3) Fetch full user profiles for all "other_user_id" in this page
    other_ids = [r["other_user_id"] for r in rows]
    prof_res = _safe_execute(
        supabase.table("user_profiles")
        .select("user_id,anonymous_handle,country_code,bio,age_range,interests,account_status")
        .in_("user_id", other_ids)
    )
    profs = prof_res.data or []
    # optional: only active accounts (keeps parity with earlier behavior)
    profs = [p for p in profs if p.get("account_status") == "active"]
    pmap = {p["user_id"]: p for p in profs}

    # 4) Build results in the same order as RPC
    items = []
    for r in rows:
        p = pmap.get(r["other_user_id"])
        if not p:
            # If profile missing/inactive, skip this entry (or include with minimal fields)
            continue

        pick = None
        if r.get("latest_message_id"):
            pick = {
                "message_id": r["latest_message_id"],
                "conversation_thread_id": r["conversation_thread_id"],
                "sender_id": r["latest_sender_id"],
                "recipient_id": r["latest_recipient_id"],
                "scheduled_delivery_at": r["latest_scheduled_delivery_at"],
                "created_at": r["latest_created_at"],
                "read_at": r["latest_read_at"],
                "letter_url": r["latest_letter_url"],
                "message_content": r.get("latest_message_content") or r.get("message_content"),
            }
            lu = pick.get("letter_url")
            if lu and lu in signed_map:
                pick["letter_url_signed"] = signed_map[lu]

        items.append({
            "user_profile": {
                "user_id": p["user_id"],
                "anonymous_handle": p.get("anonymous_handle"),
                "country_code": p.get("country_code"),
                "bio": p.get("bio"),
                "age_range": p.get("age_range"),
                "interests": p.get("interests"),
            },
            "latest_message": pick,                 # may be None (one-time hidden)
            "match_type": r["match_type"],         # "one-time" | "long-term" | "either"
        })

    # 5) Keep your sort-by-latest behavior (RPC returns handle-ordered page)
    def _sort_key(x):
        lm = x.get("latest_message") or {}
        return lm.get("scheduled_delivery_at") or lm.get("created_at") or ""

    items.sort(key=_sort_key, reverse=True)
    return {"count": len(items), "items": items}

@app.patch("/api/v1/conversations/{conversation_thread_id}/read")
def mark_read_v2(conversation_thread_id: str, body: MarkReadBody, token: str = Depends(verify_token)):
    now_sa_iso = now_in_sa().isoformat()
    res = _safe_execute(
        supabase.table("messages")
        .update({"read_at": now_sa_iso})
        .eq("conversation_thread_id", conversation_thread_id)
        .eq("recipient_id", body.my_user_id)
        .lte("scheduled_delivery_at", now_sa_iso)
        .is_("read_at", "null")
    )
    return {"updated": len(res.data or [])}


@app.post("/api/v1/upload-image")
async def upload_image(file: UploadFile = File(...), token: str = Depends(verify_token)):
    object_path = await _upload_from_uploadfile(file)
    return {"object_path": object_path, "data": {"path": object_path}}
