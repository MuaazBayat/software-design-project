"use client";
import React, { useMemo, useState } from "react";

// ----------------------
// Interfaces
// ----------------------
interface Message {
  message_id: string;
  conversation_thread_id: string;
  sender_id: string;
  recipient_id: string;
  message_content: string;
  created_at: string;
  scheduled_delivery_at: string;
  read_at?: string | null;
  delivery_status?: string | null;
  letter_url?: string | null;
  letter_url_signed?: string | null;
}

interface UserProfile {
  user_id: string;
  anonymous_handle: string;
  account_status: string;
}

interface SearchResult {
  user_profile: UserProfile;
  latest_message?: Message | null;
}

export default function App() {
  const [baseUrl, setBaseUrl] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("api_base") || "http://localhost:8000";
    }
    return "http://localhost:8000";
  });

  const [senderId, setSenderId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null); // path from /upload-image
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("Ready.");

  // Paging state
  const [myUserId, setMyUserId] = useState("");
  const [otherUserId, setOtherUserId] = useState("");
  const [onlyVisibleNow, setOnlyVisibleNow] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [items, setItems] = useState<Message[]>([]);

  // Search state
  const [searchHandle, setSearchHandle] = useState("");
  const [searchMyUserId, setSearchMyUserId] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const status = useMemo(() => (busy ? "Working…" : "Idle"), [busy]);

  function logJSON(prefix: string, data: unknown) {
    setLog(
      `${prefix}:\n` +
        (typeof data === "string" ? data : JSON.stringify(data, null, 2))
    );
  }

  function persistBase(u: string) {
    setBaseUrl(u);
    try {
      localStorage.setItem("api_base", u);
    } catch {}
  }

  // -------------------------
  // File upload on select
  // -------------------------
  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${baseUrl}/upload-image`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || res.statusText);

      setUploadedUrl(json.object_path); // unsigned storage path
      logJSON("/upload-image →", json);
    } catch (err) {
      logJSON("Error", String(err));
    } finally {
      setBusy(false);
    }
  }

  // -------------------------
  // Send message
  // -------------------------
  async function sendMessage() {
    if (!senderId || !recipientId || !message) {
      alert("sender_id, recipient_id, and message_content are required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: senderId,
          recipient_id: recipientId,
          message_content: message,
          letter_url: uploadedUrl, // attach uploaded file path
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || res.statusText);
      logJSON("/messages →", json);
    } catch (e) {
      logJSON("Error", String(e));
    } finally {
      setBusy(false);
    }
  }

  // -------------------------
  // Page messages
  // -------------------------
  async function pageMessages(reset = false) {
    if (!myUserId || !otherUserId) {
      alert("my_user_id and other_user_id are required for paging");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        my_user_id: myUserId,
        other_user_id: otherUserId,
        page_size: pageSize,
        only_visible_now: onlyVisibleNow,
      };
      if (!reset && nextCursor) body.last_message_id = nextCursor;

      const res = await fetch(`${baseUrl}/messages/page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || res.statusText);

      setItems((prev) => (reset ? json.items : [...prev, ...json.items]));
      setNextCursor(json.next_cursor || null);
      logJSON("/messages/page →", json);
    } catch (e) {
      logJSON("Error", String(e));
    } finally {
      setBusy(false);
    }
  }

  // -------------------------
  // Search
  // -------------------------
  async function doSearch() {
    if (!searchMyUserId) {
      alert("my_user_id is required for /search");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${baseUrl}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymous_handle: searchHandle || "",
          my_user_id: searchMyUserId,
          limit: 20,
          offset: 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || res.statusText);
      setSearchResults(json.items || []);
      logJSON("/search →", json);
    } catch (e) {
      logJSON("Error", String(e));
    } finally {
      setBusy(false);
    }
  }

  function fromMe(m: Message): boolean {
    return m.sender_id === myUserId;
  }

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <div className="max-w-6xl mx-auto grid gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Messages API — Test UI</h1>
          <div className="text-sm opacity-80">Status: {status}</div>
        </header>

        {/* API Base URL */}
        <section className="bg-neutral-900 rounded-2xl p-4 grid gap-3">
          <h2 className="text-lg font-medium">API Target</h2>
          <input
            className="flex-1 bg-neutral-800 rounded-xl px-3 py-2 outline-none"
            value={baseUrl}
            onChange={(e) => persistBase(e.target.value)}
            placeholder="http://localhost:8000"
          />
        </section>

        {/* Send message */}
        <section className="bg-neutral-900 rounded-2xl p-4 grid gap-3">
          <h2 className="text-lg font-medium">Send message</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="bg-neutral-800 rounded-xl px-3 py-2"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              placeholder="sender_id (uuid)"
            />
            <input
              className="bg-neutral-800 rounded-xl px-3 py-2"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              placeholder="recipient_id (uuid)"
            />
            <input
              className="bg-neutral-800 rounded-xl px-3 py-2 md:col-span-2"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="message_content"
            />
            <div className="flex items-center gap-3">
              <input type="file" accept="image/*" onChange={onFileChange} />
              {uploadedUrl && (
                <span className="text-sm opacity-80">Uploaded ✓</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-blue-400 text-neutral-900 rounded-xl"
              onClick={sendMessage}
              disabled={busy}
            >
              Send
            </button>
          </div>
        </section>

        {/* Page messages */}
        <section className="bg-neutral-900 rounded-2xl p-4 grid gap-3">
          <h2 className="text-lg font-medium">Page messages</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input
              className="bg-neutral-800 rounded-xl px-3 py-2"
              value={myUserId}
              onChange={(e) => setMyUserId(e.target.value)}
              placeholder="my_user_id (uuid)"
            />
            <input
              className="bg-neutral-800 rounded-xl px-3 py-2"
              value={otherUserId}
              onChange={(e) => setOtherUserId(e.target.value)}
              placeholder="other_user_id (uuid)"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button
              className="px-4 py-2 bg-neutral-100 text-neutral-900 rounded-xl"
              onClick={() => {
                setItems([]); setNextCursor(null); pageMessages(true);
              }}
              disabled={busy}
            >
              Load first page
            </button>
          </div>

          <div className="grid gap-3 mt-2">
            {items.map((m: Message) => (
              <div key={m.message_id} className="rounded-xl bg-neutral-800 p-3">
                <div className="text-xs opacity-70 flex gap-2 flex-wrap">
                  <span>{new Date(m.created_at).toLocaleString()}</span>
                  <span>· {fromMe(m) ? "from me" : "from other"}</span>
                  {m.delivery_status && <span>· {m.delivery_status}</span>}
                </div>
                <div className="mt-1">{m.message_content}</div>
                {m.letter_url_signed && (
                  <div className="mt-2">
                    <img
                      src={m.letter_url_signed}
                      alt="attached"
                      className="max-h-60 rounded-lg"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Search */}
        <section className="bg-neutral-900 rounded-2xl p-4 grid gap-3">
          <h2 className="text-lg font-medium">Search (by anonymous handle)</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input
              className="bg-neutral-800 rounded-xl px-3 py-2"
              value={searchMyUserId}
              onChange={(e) => setSearchMyUserId(e.target.value)}
              placeholder="my_user_id (uuid)"
            />
            <input
              className="bg-neutral-800 rounded-xl px-3 py-2"
              value={searchHandle}
              onChange={(e) => setSearchHandle(e.target.value)}
              placeholder="anonymous_handle (empty = inbox)"
            />
            <button
              className="px-4 py-2 bg-neutral-100 text-neutral-900 rounded-xl"
              onClick={doSearch}
              disabled={busy}
            >
              Search
            </button>
          </div>
          <div className="grid gap-3 mt-2">
            {searchResults.map((r, i) => {
              const latest = r.latest_message;
              return (
                <div key={i} className="rounded-xl bg-neutral-800 p-3">
                  <div className="text-sm font-medium">
                    {r.user_profile?.anonymous_handle}
                  </div>
                  {latest ? (
                    <div className="text-xs opacity-80 mt-1">
                      <div>Latest: {latest.message_content}</div>
                      {latest.letter_url_signed && (
                        <img
                          src={latest.letter_url_signed}
                          alt="latest"
                          className="max-h-40 rounded-lg mt-2"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="text-xs opacity-60 mt-1">
                      No visible messages yet.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Log */}
        <section className="bg-neutral-900 rounded-2xl p-4">
          <h2 className="text-lg font-medium mb-2">Console</h2>
          <pre className="bg-neutral-800 rounded-xl p-3 text-xs overflow-auto max-h-64 whitespace-pre-wrap">
            {log}
          </pre>
        </section>
      </div>
    </div>
  );
}
