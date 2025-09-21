# main.py
from fastapi import FastAPI, HTTPException, File, UploadFile, Request
from fastapi import FastAPI, HTTPException, File, UploadFile, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Iterable, Tuple
from datetime import datetime
from zoneinfo import ZoneInfo
from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import os, time
from uuid import uuid4
from threading import RLock
import os, time
from uuid import uuid4
from threading import RLock

# -----------------------------
# Environment / Supabase client
# -----------------------------
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # Use SERVICE ROLE on the server
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_KEY")

# IMPORTANT: must be project root, not the storage subdomain.
# Example OK: https://kvoiazgvavwtkzloaaib.supabase.co
# Example BAD: https://kvoiazgvavwtkzloaaib.storage.supabase.co
if ".storage.supabase.co" in SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL must be the project root (…supabase.co), not the storage subdomain."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# -------------
# FastAPI app
# -------------
app = FastAPI(title="Messages API (fast, SA time)")
app = FastAPI(title="Messages API (fast, SA time)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# -------------
# Models
# -------------
class MessagesPage(BaseModel):
    # Either provide conversation_thread_id, OR my_user_id+other_user_id
    conversation_thread_id: Optional[str] = None
    my_user_id: Optional[str] = None
    other_user_id: Optional[str] = None

    page_size: int = Field(10, ge=1, le=100)
    last_message_id: Optional[str] = None
    only_visible_now: bool = True  # respect SA time visibility

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
        # Surface PostgREST/RPC errors cleanly
        raise HTTPException(status_code=500, detail=str(e))

def _normalize_pair(a: str, b: str) -> Tuple[str, str]:
    return (a, b) if a <= b else (b, a)

def _get_active_match_and_thread(user_x: str, user_y: str) -> Dict[str, Optional[str]]:
    """
    Return {'match_id': ..., 'conversation_thread_id': ...} for ACTIVE match between two users.
    If active match exists but conversation_thread_id is NULL, we DO NOT create one here
    (RPC will create when sending; for paging we just return None -> empty set).
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
def _fetch_latest_visible_messages(convo_ids: Iterable[str], now_sa_iso: str, limit_cap: int = 1000) -> Dict[str, Dict[str, Any]]:
    convo_ids = list(convo_ids)
    if not convo_ids:
        return {}
    msgs_res = _safe_execute(
        supabase.table("messages")
        .select(
            "message_id,conversation_thread_id,message_content,"
            "sender_id,recipient_id,scheduled_delivery_at,read_at,delivery_status,created_at,letter_url"
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
        if cid not in latest_by_convo:
            latest_by_convo[cid] = m
    return latest_by_convo

# ---------------------------
# Signed URL cache
# ---------------------------
_SIGNED_URL_CACHE: Dict[str, Tuple[str, float]] = {}
_CACHE_LOCK = RLock()

def _get_signed_url_cached(object_path: str, ttl_seconds: int = 1800) -> Optional[str]:
    if not object_path:
        return None
    now = time.time()
    with _CACHE_LOCK:
        entry = _SIGNED_URL_CACHE.get(object_path)
        if entry:
            url, exp = entry
            if exp - now > 60:
                return url
        signed = supabase.storage.from_("letters").create_signed_url(object_path, ttl_seconds)
        if signed and signed.get("signedURL"):
            url = signed["signedURL"]
            _SIGNED_URL_CACHE[object_path] = (url, now + ttl_seconds)
            return url
    return None

# ---------------------------
# Upload helper (for /messages multipart)
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
    return {"ok": True, "time_sa": now_in_sa().isoformat()}

# SEND: JSON or multipart, default 12h delay, image+message in one call.
@app.post("/messages")
async def send_message(request: Request):
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

# PAGE: accepts conversation_thread_id OR (my_user_id, other_user_id)
@app.post("/messages/page")
def page_messages_sa(body: MessagesPage):
    # Resolve thread id
    thread_id = body.conversation_thread_id
    if not thread_id:
        if not body.my_user_id or not body.other_user_id:
            raise HTTPException(
                status_code=422,
                detail="Provide either conversation_thread_id OR my_user_id and other_user_id"
            )
        info = _get_active_match_and_thread(body.my_user_id, body.other_user_id)
        thread_id = info.get("conversation_thread_id")
        if not thread_id:
            # No thread yet => no messages yet
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
            supabase.table("messages").select("created_at").eq("message_id", body.last_message_id).single()
        )
        if not cur.data:
            raise HTTPException(status_code=404, detail="last_message_id not found")
        q = q.lt("created_at", cur.data["created_at"])
        q = q.lt("created_at", cur.data["created_at"])

    res = _safe_execute(q.order("created_at", desc=True).limit(body.page_size))
    rows = res.data or []

    for r in rows:
        if r.get("letter_url"):
            r["letter_url_signed"] = _get_signed_url_cached(r["letter_url"], ttl_seconds=1800)


    next_cursor = rows[-1]["message_id"] if rows else None
    return {
        "items": rows,
        "count": len(rows),
        "next_cursor": next_cursor,
        "has_more": len(rows) == body.page_size,
    }

# SEARCH (inbox-style, returns latest visible msg per convo + signed URL)
@app.post("/search")
def search(body: SearchUsers):
    conv_map = _get_conv_map_for_user(body.my_user_id)
    if not conv_map:
        return {"count": 0, "items": []}

    profiles = _search_active_profiles_fts(conv_map.keys(), qtext=body.anonymous_handle)
    profiles = _search_active_profiles_fts(conv_map.keys(), qtext=body.anonymous_handle)
    if not profiles:
        return {"count": 0, "items": []}

    # simple paging in memory
    start, end = max(body.offset, 0), max(body.offset, 0) + max(body.limit, 1)
    paged_profiles = profiles[start:end]
    if not paged_profiles:
        return {"count": 0, "items": []}

    now_sa_iso = now_in_sa().isoformat()
    convo_ids = [conv_map[p["user_id"]] for p in paged_profiles]
    latest_by_convo = _fetch_latest_visible_messages(convo_ids, now_sa_iso, limit_cap=1000)

    items = []
    for p in paged_profiles:
        cid = conv_map[p["user_id"]]
        latest = latest_by_convo.get(cid)
        if latest and latest.get("letter_url"):
            latest["letter_url_signed"] = _get_signed_url_cached(latest["letter_url"], ttl_seconds=1800)
        items.append({"user_profile": p, "latest_message": latest})

    return {"count": len(items), "items": items}

# Legacy/compat image helpers (optional for external tools)
@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    object_path = await _upload_from_uploadfile(file)
    return {"object_path": object_path, "data": {"path": object_path}}

@app.get("/get-image")
def get_image(object_path: str):
    signed = _get_signed_url_cached(object_path, ttl_seconds=1800)
    if not signed:
        raise HTTPException(status_code=404, detail="Image not found or failed to sign URL")
    return {"signed_url": signed}
