# main.py
from fastapi import FastAPI, HTTPException, File, UploadFile, Request, Depends
from pydantic import BaseModel, Field, constr
from typing import Optional, Dict, Any, List, Iterable, Tuple
from datetime import datetime
from zoneinfo import ZoneInfo
from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import os, time, sys
from uuid import uuid4
from threading import RLock

# Import shared authentication
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from shared.auth import verify_token

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
    conversation_thread_id: Optional[str] = None
    my_user_id: Optional[str] = None
    other_user_id: Optional[str] = None

    page_size: int = Field(10, ge=1, le=100)
    last_message_id: Optional[str] = None
    only_visible_now: bool = True

class SearchUsers(BaseModel):
    anonymous_handle: str
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
        .select("user_id,anonymous_handle,account_status,country_code")
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

def _fetch_latest_visible_messages(
    convo_ids: Iterable[str],
    now_sa_iso: str,
    my_user_id: str,
    limit_cap: int = 1000
) -> Dict[str, Dict[str, Any]]:
    convo_ids = list(convo_ids)
    if not convo_ids:
        return {}

    msgs_res = _safe_execute(
        supabase.table("messages")
        .select(
            "message_id,conversation_thread_id,message_content,"
            "sender_id,recipient_id,scheduled_delivery_at,read_at,"
            "delivery_status,created_at,letter_url"
        )
        .in_("conversation_thread_id", convo_ids)
        # include delivered messages OR future-scheduled ones if sent by me
        .or_(f"scheduled_delivery_at.lte.{now_sa_iso},sender_id.eq.{my_user_id}")
        .order("scheduled_delivery_at", desc=True)
        .limit(limit_cap)
    )

    latest_by_convo: Dict[str, Dict[str, Any]] = {}
    for m in (msgs_res.data or []):
        cid = m["conversation_thread_id"]
        if cid not in latest_by_convo:
            # mark in_transit if scheduled for future AND sent by me
            in_transit = (
                m["sender_id"] == my_user_id and m["scheduled_delivery_at"] > now_sa_iso
            )
            m["in_transit"] = in_transit
            latest_by_convo[cid] = m
    return latest_by_convo

# ---------------------------
# Signed URL cache + batch
# ---------------------------
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
@app.get("/health")
def health():
    return {"ok": True, "time_sa": now_in_sa().isoformat()}

@app.post("/messages")
async def send_message(request: Request, token: str = Depends(verify_token)):
    ctype = (request.headers.get("content-type") or "").lower()
    is_multipart = "multipart/form-data" in ctype

    sender_id = recipient_id = message_content = None
    delay_hours = 12  # default
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

    payload = {
        "p_sender_id": sender_id,
        "p_recipient_id": recipient_id,
        "p_message_content": message_content,
        "p_letter_url": object_path,
        "p_delay_hours": delay_hours,
    }

    res = _safe_execute(supabase.rpc("send_message_oneshot", payload))
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to insert message")
    row = res.data

    return row

@app.post("/messages/page")
def page_messages_sa(body: MessagesPage, token: str = Depends(verify_token)):
    thread_id = body.conversation_thread_id
    if not thread_id:
        if not body.my_user_id or not body.other_user_id:
            raise HTTPException(status_code=422,
                                detail="Provide either conversation_thread_id OR my_user_id and other_user_id")
        info = _get_active_match_and_thread(body.my_user_id, body.other_user_id)
        thread_id = info.get("conversation_thread_id")
        if not thread_id:
            return {"items": [], "count": 0, "next_cursor": None, "has_more": False}

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

    # batch sign
    paths = [r["letter_url"] for r in rows if r.get("letter_url")]
    signed_map = _batch_signed_urls(paths)
    for r in rows:
        if r.get("letter_url") in signed_map:
            r["letter_url_signed"] = signed_map[r["letter_url"]]

    next_cursor = rows[-1]["message_id"] if rows else None
    return {
        "items": rows,
        "count": len(rows),
        "next_cursor": next_cursor,
        "has_more": len(rows) == body.page_size,
    }

class MarkRead(BaseModel):
    # enforce non-empty strings, whitespace stripped
    conversation_thread_id: constr(strip_whitespace=True, min_length=1) = Field(..., alias="conversation_thread_id")
    my_user_id: constr(strip_whitespace=True, min_length=1) = Field(..., alias="my_user_id")

    class Config:
        allow_population_by_field_name = True
        fields = {
            "conversation_thread_id": {"alias": "conversationThreadId"},
            "my_user_id": {"alias": "myUserId"},
        }

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
            m["in_transit"] = True  # mark future outgoing
            out[cid] = m
    return out

def _get_blocked_users(my_user_id: str) -> List[str]:
    """Get list of user IDs that this user has blocked"""
    try:
        res = _safe_execute(
            supabase.table("user_profiles")
            .select("blocked_users")
            .eq("user_id", my_user_id)
            .single()
        )
        if res.data and res.data.get("blocked_users"):
            blocked = res.data["blocked_users"]
            # Handle if it's a string that needs parsing
            if isinstance(blocked, str):
                import json
                return json.loads(blocked)
            # Handle if it's already a list
            elif isinstance(blocked, list):
                return blocked
        return []
    except Exception:
        return []

@app.post("/search")
def search(body: SearchUsers, token: str = Depends(verify_token)):
    conv_map = _get_conv_map_for_user(body.my_user_id)
    if not conv_map:
        return {"count": 0, "items": []}

    # Get blocked users
    blocked_user_ids = _get_blocked_users(body.my_user_id)
    
    # Filter out blocked users from conv_map
    filtered_conv_map = {
        uid: cid for uid, cid in conv_map.items() 
        if uid not in blocked_user_ids
    }
    
    if not filtered_conv_map:
        return {"count": 0, "items": []}

    profiles = _search_active_profiles_fts(filtered_conv_map.keys(), qtext=body.anonymous_handle)
    if not profiles:
        return {"count": 0, "items": []}

    # Rest of the function remains the same, but use filtered_conv_map instead of conv_map
    start, end = max(body.offset, 0), max(body.offset, 0) + max(body.limit, 1)
    paged_profiles = profiles[start:end]
    if not paged_profiles:
        return {"count": 0, "items": []}

    now_sa_iso = now_in_sa().isoformat()
    convo_ids = [filtered_conv_map[p["user_id"]] for p in paged_profiles]

    latest_delivered = _latest_delivered_by_convo(convo_ids, now_sa_iso)
    latest_outgoing_future = _latest_in_transit_from_me(convo_ids, now_sa_iso, body.my_user_id)

    # We'll sign whatever we actually return as "latest_message"
    paths_to_sign: List[str] = []
    items: List[Dict[str, Any]] = []

    for p in paged_profiles:
        cid = filtered_conv_map[p["user_id"]]
        delivered = latest_delivered.get(cid)
        future_mine = latest_outgoing_future.get(cid)

        # pick whichever is truly latest by scheduled_delivery_at
        pick = None
        if delivered and future_mine:
            # compare ISO strings (same format) is OK
            if future_mine["scheduled_delivery_at"] >= delivered["scheduled_delivery_at"]:
                pick = future_mine
            else:
                pick = delivered
        elif future_mine:
            pick = future_mine
        else:
            pick = delivered

        # collect letter_url to sign (only if present)
        if pick and pick.get("letter_url"):
            paths_to_sign.append(pick["letter_url"])

        items.append({
            "user_profile": p,
            "latest_message": pick,
            "in_transit_from_me": bool(future_mine),
            "next_outgoing_at": (future_mine or {}).get("scheduled_delivery_at"),
        })

    # sign URLs for whatever we picked as latest_message
    signed_map = _batch_signed_urls(paths_to_sign)
    for it in items:
        lm = it.get("latest_message") or {}
        lu = lm.get("letter_url")
        if lu in signed_map:
            lm["letter_url_signed"] = signed_map[lu]

    # sort by the latest message we actually show (fallback to next_outgoing_at)
    def _sort_key(x):
        lm = x.get("latest_message") or {}
        ts = lm.get("scheduled_delivery_at") or lm.get("created_at") or ""
        fallback = x.get("next_outgoing_at") or ""
        return (ts or fallback)

    items.sort(key=_sort_key, reverse=True)
    return {"count": len(items), "items": items}

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

@app.post("/search")
def search(body: SearchUsers, token: str = Depends(verify_token)):
    conv_map = _get_conv_map_for_user(body.my_user_id)
    if not conv_map:
        return {"count": 0, "items": []}

    profiles = _search_active_profiles_fts(conv_map.keys(), qtext=body.anonymous_handle)
    if not profiles:
        return {"count": 0, "items": []}

    start, end = max(body.offset, 0), max(body.offset, 0) + max(body.limit, 1)
    paged_profiles = profiles[start:end]
    if not paged_profiles:
        return {"count": 0, "items": []}

    now_sa_iso = now_in_sa().isoformat()
    convo_ids = [conv_map[p["user_id"]] for p in paged_profiles]

    # latest delivered (what you can actually read now)
    latest_delivered = _latest_delivered_by_convo(convo_ids, now_sa_iso)
    # also detect if I have any scheduled outgoing in transit
    latest_outgoing_future = _latest_in_transit_from_me(convo_ids, now_sa_iso, body.my_user_id)

    # batch sign (delivered previews only)
    paths = [m["letter_url"] for m in latest_delivered.values() if m.get("letter_url")]
    signed_map = _batch_signed_urls(paths)

    items = []
    for p in paged_profiles:
        cid = conv_map[p["user_id"]]
        latest = latest_delivered.get(cid)
        if latest and latest.get("letter_url") in signed_map:
            latest["letter_url_signed"] = signed_map[latest["letter_url"]]

        # UI will still preview the latest delivered message,
        # but we also signal if there's a scheduled outgoing from me
        out_future = latest_outgoing_future.get(cid)
        items.append({
            "user_profile": p,
            "latest_message": latest,                        # may be None if no delivered yet
            "in_transit_from_me": bool(out_future),          # flag for chip
            "next_outgoing_at": (out_future or {}).get("scheduled_delivery_at")
        })

    # sort by delivered created_at (desc); fall back to next_outgoing_at so “active” convos stay near top
    def _sort_key(x):
        lm = x.get("latest_message") or {}
        ts = lm.get("created_at") or ""
        fallback = x.get("next_outgoing_at") or ""
        return (ts or fallback)

    items.sort(key=_sort_key, reverse=True)
    return {"count": len(items), "items": items}

@app.post("/messages/mark-read")
def mark_read(body: MarkRead, token: str = Depends(verify_token)):
    # If you’re on Pydantic v2, use body.model_dump() instead of body.dict()
    conv_id = body.conversation_thread_id
    me = body.my_user_id
    if not conv_id or not me:
        raise HTTPException(status_code=422, detail="conversation_thread_id and my_user_id are required")

    now_sa_iso = now_in_sa().isoformat()

    # IMPORTANT: no `.select()` after update in supabase-py
    res = _safe_execute(
        supabase.table("messages")
        .update({"read_at": now_sa_iso})
        .eq("conversation_thread_id", conv_id)
        .eq("recipient_id", me)
        .lte("scheduled_delivery_at", now_sa_iso)
        .is_("read_at", "null")
    )

    updated = len(res.data or [])
    return {"updated": updated}

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...), token: str = Depends(verify_token)):
    object_path = await _upload_from_uploadfile(file)
    return {"object_path": object_path, "data": {"path": object_path}}

@app.get("/get-image")
def get_image(object_path: str, token: str = Depends(verify_token)):
    signed_map = _batch_signed_urls([object_path])
    if object_path not in signed_map:
        raise HTTPException(status_code=404, detail="Image not found or failed to sign URL")
    return {"signed_url": signed_map[object_path]}


