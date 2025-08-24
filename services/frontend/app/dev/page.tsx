// services/frontend/app/dev/api-tester/page.tsx
"use client";

import { useMemo, useState } from "react";
import {
  InboxService,
  MessagesService,
  SearchService,
  type InboxOut,
  type PageMessagesSAOut,
  type MessageCreate,
  type SearchUsersWithConvoOut,
} from "@/lib/services";

// Tiny JSON viewer
function JsonPanel({ data }: { data: unknown }) {
  return (
    <pre className="mt-3 rounded-lg bg-gray-900 text-gray-100 p-3 text-xs overflow-auto">
      {data ? JSON.stringify(data, null, 2) : "// no data yet"}
    </pre>
  );
}

export default function ApiTesterPage() {
  // Services (re-created only if base url changes)
  const msgsSvc = useMemo(() => new MessagesService(), []);
  const inboxSvc = useMemo(() => new InboxService(), []);
  const searchSvc = useMemo(() => new SearchService(), []);

  // ---------- Send Message ----------
  const [sendBody, setSendBody] = useState<MessageCreate>({
    match_id: "33333333-3333-3333-3333-333333333333",
    sender_id: "22222222-2222-2222-2222-222222222222",
    recipient_id: "11111111-1111-1111-1111-111111111111",
    conversation_thread_id: "44444444-4444-4444-4444-444444444444",
    message_content: "Hey! This should show 5 minutes from now (SAST cutoff).",
  });
  const [sendRes, setSendRes] = useState<any>(null);
  const [sendLoading, setSendLoading] = useState(false);

  async function onSend() {
    setSendLoading(true);
    setSendRes(null);
    try {
      const data = await msgsSvc.sendMessage(sendBody);
      setSendRes(data);
    } catch (e: any) {
      setSendRes({ error: e.message || String(e) });
    } finally {
      setSendLoading(false);
    }
  }

  // ---------- Page Messages ----------
  const [pageThreadId, setPageThreadId] = useState("44444444-4444-4444-4444-444444444444");
  const [pageSize, setPageSize] = useState(5);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [pageRes, setPageRes] = useState<PageMessagesSAOut | null>(null);
  const [pageLoading, setPageLoading] = useState(false);

  async function fetchPage(nextCursor?: string) {
    setPageLoading(true);
    try {
      const data = await msgsSvc.pageMessagesSA({
        conversation_thread_id: pageThreadId,
        page_size: pageSize,
        last_message_id: nextCursor,
      });
      setPageRes(data);
      setCursor(data.next_cursor || undefined);
    } catch (e: any) {
      setPageRes({ items: [], count: 0, has_more: false, next_cursor: null });
      alert(e.message || String(e));
    } finally {
      setPageLoading(false);
    }
  }

  // ---------- Search Users w/ Convo ----------
  const [searchHandle, setSearchHandle] = useState("user_beta");
  const [myUserId, setMyUserId] = useState("11111111-1111-1111-1111-111111111111");
  const [searchLimit, setSearchLimit] = useState(10);
  const [searchOffset, setSearchOffset] = useState(0);
  const [searchRes, setSearchRes] = useState<SearchUsersWithConvoOut | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  async function onSearch() {
    setSearchLoading(true);
    setSearchRes(null);
    try {
      const data = await searchSvc.usersWithConvo({
        anonymous_handle: searchHandle,
        my_user_id: myUserId,
        limit: searchLimit,
        offset: searchOffset,
      });
      setSearchRes(data);
    } catch (e: any) {
      setSearchRes({ count: 0, items: [] });
      alert(e.message || String(e));
    } finally {
      setSearchLoading(false);
    }
  }

  // ---------- Inbox ----------
  const [inboxLimit, setInboxLimit] = useState(15);
  const [inboxOffset, setInboxOffset] = useState(0);
  const [inboxRes, setInboxRes] = useState<InboxOut | null>(null);
  const [inboxLoading, setInboxLoading] = useState(false);

  async function onInbox() {
    setInboxLoading(true);
    setInboxRes(null);
    try {
      const data = await inboxSvc.getInbox({
        my_user_id: myUserId,
        limit: inboxLimit,
        offset: inboxOffset,
      });
      setInboxRes(data);
    } catch (e: any) {
      setInboxRes({ count: 0, items: [], has_more: false, next_offset: null });
      alert(e.message || String(e));
    } finally {
      setInboxLoading(false);
    }
  }

  const baseUrl =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "(not set — set API_BASE_URL / NEXT_PUBLIC_API_BASE_URL)";

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">API Tester</h1>
        <p className="text-sm text-gray-600">
          Using base URL: <code className="font-mono">{baseUrl}</code>
        </p>
      </header>

      {/* Send Message */}
      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold">/messages — Send Message (+5min SAST)</h2>
        <div className="grid gap-3 sm:grid-cols-2 mt-3">
          <label className="block text-sm">
            match_id
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={sendBody.match_id}
              onChange={(e) => setSendBody({ ...sendBody, match_id: e.target.value })}
            />
          </label>

          <label className="block text-sm">
            conversation_thread_id
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={sendBody.conversation_thread_id}
              onChange={(e) =>
                setSendBody({ ...sendBody, conversation_thread_id: e.target.value })
              }
            />
          </label>

          <label className="block text-sm">
            sender_id (me)
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={sendBody.sender_id}
              onChange={(e) => setSendBody({ ...sendBody, sender_id: e.target.value })}
            />
          </label>

          <label className="block text-sm">
            recipient_id (other user)
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={sendBody.recipient_id}
              onChange={(e) => setSendBody({ ...sendBody, recipient_id: e.target.value })}
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            message_content
            <textarea
              className="mt-1 w-full rounded border px-2 py-1"
              rows={3}
              value={sendBody.message_content}
              onChange={(e) => setSendBody({ ...sendBody, message_content: e.target.value })}
            />
          </label>
        </div>

        <button
          className="mt-3 rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-60"
          onClick={onSend}
          disabled={sendLoading}
        >
          {sendLoading ? "Sending…" : "Send"}
        </button>

        <JsonPanel data={sendRes} />
      </section>

      {/* Page Messages */}
      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold">/messages/page-sa — Page conversation</h2>
        <div className="grid gap-3 sm:grid-cols-3 mt-3">
          <label className="block text-sm">
            conversation_thread_id
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={pageThreadId}
              onChange={(e) => setPageThreadId(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            page_size
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded border px-2 py-1"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            />
          </label>

          <label className="block text-sm">
            last_message_id (cursor)
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              placeholder="optional"
              value={cursor || ""}
              onChange={(e) => setCursor(e.target.value || undefined)}
            />
          </label>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-60"
            onClick={() => fetchPage(undefined)}
            disabled={pageLoading}
          >
            {pageLoading ? "Loading…" : "Load latest page"}
          </button>
          <button
            className="rounded bg-gray-700 px-3 py-1 text-white disabled:opacity-60"
            onClick={() => fetchPage(cursor)}
            disabled={pageLoading || !cursor}
            title="Uses next_cursor from last result"
          >
            Load older (use next_cursor)
          </button>
        </div>

        <JsonPanel data={pageRes} />
      </section>

      {/* Search Users With Convo */}
      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold">/search/users-with-convo — Filter by handle</h2>
        <div className="grid gap-3 sm:grid-cols-4 mt-3">
          <label className="block text-sm">
            my_user_id
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={myUserId}
              onChange={(e) => setMyUserId(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            handle contains
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={searchHandle}
              onChange={(e) => setSearchHandle(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            limit
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded border px-2 py-1"
              value={searchLimit}
              onChange={(e) => setSearchLimit(Number(e.target.value))}
            />
          </label>

          <label className="block text-sm">
            offset
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border px-2 py-1"
              value={searchOffset}
              onChange={(e) => setSearchOffset(Number(e.target.value))}
            />
          </label>
        </div>

        <button
          className="mt-3 rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-60"
          onClick={onSearch}
          disabled={searchLoading}
        >
          {searchLoading ? "Searching…" : "Search"}
        </button>

        <JsonPanel data={searchRes} />
      </section>

      {/* Inbox */}
      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold">/inbox — 15 per page, newest → oldest</h2>
        <div className="grid gap-3 sm:grid-cols-3 mt-3">
          <label className="block text-sm">
            my_user_id
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={myUserId}
              onChange={(e) => setMyUserId(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            limit
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded border px-2 py-1"
              value={inboxLimit}
              onChange={(e) => setInboxLimit(Number(e.target.value))}
            />
          </label>

          <label className="block text-sm">
            offset
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border px-2 py-1"
              value={inboxOffset}
              onChange={(e) => setInboxOffset(Number(e.target.value))}
            />
          </label>
        </div>

        <button
          className="mt-3 rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-60"
          onClick={onInbox}
          disabled={inboxLoading}
        >
          {inboxLoading ? "Loading…" : "Fetch Inbox"}
        </button>

        <JsonPanel data={inboxRes} />
      </section>
    </div>
  );
}
