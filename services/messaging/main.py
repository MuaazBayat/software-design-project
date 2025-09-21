# main.py
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
async def send_message(request: Request):
    # ... unchanged (same as your code) ...
    # keep upload + RPC logic
    ...

@app.post("/messages/page")
def page_messages_sa(body: MessagesPage):
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

@app.post("/search")
def search(body: SearchUsers):
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
    latest_by_convo = _fetch_latest_visible_messages(convo_ids, now_sa_iso, limit_cap=1000)

    # batch sign
    paths = [m["letter_url"] for m in latest_by_convo.values() if m.get("letter_url")]
    signed_map = _batch_signed_urls(paths)

    items = []
    for p in paged_profiles:
        cid = conv_map[p["user_id"]]
        latest = latest_by_convo.get(cid)
        if latest and latest.get("letter_url") in signed_map:
            latest["letter_url_signed"] = signed_map[latest["letter_url"]]
        items.append({"user_profile": p, "latest_message": latest})

    return {"count": len(items), "items": items}

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    object_path = await _upload_from_uploadfile(file)
    return {"object_path": object_path, "data": {"path": object_path}}

@app.get("/get-image")
def get_image(object_path: str):
    signed_map = _batch_signed_urls([object_path])
    if object_path not in signed_map:
        raise HTTPException(status_code=404, detail="Image not found or failed to sign URL")
    return {"signed_url": signed_map[object_path]}
