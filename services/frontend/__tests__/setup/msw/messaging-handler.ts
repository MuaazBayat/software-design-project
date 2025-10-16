// __tests__/integration/setup/msw/messaging-handler.ts
// MSW handlers for your FastAPI-like messaging service (full endpoint coverage)
// Implements (best-effort parity to your design):
//   POST   */api/v1/messages                     -> create message (JSON or multipart-lite)
//   GET    */api/v1/messages/page                 -> cursor paging for a conversation (with_user_id, cursor, limit)
//   GET    */api/v1/messages/thread               -> first page alias for page (with_user_id, limit)
//   GET    */api/v1/messages/search               -> lightweight latest + total summary
//   GET    */api/v1/messages/latest               -> alias of search returning just latest
//   GET    */api/v1/messages/inbox                -> recipient-centric paging (visible-only)
//   GET    */api/v1/messages/outbox               -> sender-centric paging (includes future scheduled)
//   POST   */api/v1/storage/sign-batch            -> batch-sign storage paths (fake signed URLs)
//
// Conventions
// - Caller identity is taken from the `X-User-Id` header (string).
// - Visibility rule: a message is visible to recipient only when `scheduled_delivery_at <= now`.
//   The sender can always see their own outgoing messages (including future-scheduled).
// - Sorting: newer messages have larger `created_at`. Paging uses a `cursor` = message_id; server
//   uses that message's `created_at` as a cutoff (strictly older for next page).
// - Signed URLs: we return `letter_url_signed` as `signed://<encoded path>?sig=fake`.
// - This file exports: handlers array, factories, reset/seed helpers.

import { http, HttpResponse, delay, type HttpHandler } from 'msw';

// ----------------------
// Types
// ----------------------
export type User = {
  user_id: string;
  clerk_id?: string;
  anonymous_handle?: string;
};

export type Message = {
  message_id: string;
  sender_id: string;
  recipient_id: string;
  body_text?: string;
  letter_url?: string;           // storage path (e.g., bucket/key)
  letter_url_signed?: string;    // computed on read/seed
  created_at: string;            // ISO
  scheduled_delivery_at?: string;// ISO
};

// ----------------------
// In-memory DB
// ----------------------
const now = () => new Date();
const db = {
  users: new Map<string, User>(),
  messages: [] as Message[], // newest first convenience (we still sort defensively)
};

export function resetMessagingDb() {
  db.users.clear();
  db.messages.length = 0;
}

function rid(prefix = '') { return prefix + Math.random().toString(36).slice(2, 10); }
function signUrl(path: string) { return `signed://${encodeURIComponent(path)}?sig=faketoken`; }

export function seedMessagingDb(seed: Partial<{ users: User[]; messages: Message[] }>) {
  if (seed.users) seed.users.forEach(u => db.users.set(u.user_id, u));
  if (seed.messages) {
    const normalized = seed.messages.map((m) => ({
      ...m,
      letter_url_signed: m.letter_url ? signUrl(m.letter_url) : m.letter_url_signed,
    }));
    normalized.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    db.messages.unshift(...normalized);
  }
}

export const factories = {
  user(over: Partial<User> = {}): User {
    return {
      user_id: over.user_id ?? rid('user_'),
      clerk_id: over.clerk_id,
      anonymous_handle: over.anonymous_handle ?? `u_${rid()}`,
    };
  },
  message(over: Partial<Message> = {}): Message {
    const created = over.created_at ? new Date(over.created_at) : now();
    const scheduled = over.scheduled_delivery_at
      ? new Date(over.scheduled_delivery_at)
      : created;
    const letter_url = over.letter_url;
    return {
      message_id: over.message_id ?? rid('msg_'),
      sender_id: over.sender_id ?? 'alice',
      recipient_id: over.recipient_id ?? 'bob',
      body_text: over.body_text ?? 'hello',
      letter_url,
      letter_url_signed: letter_url ? signUrl(letter_url) : undefined,
      created_at: created.toISOString(),
      scheduled_delivery_at: scheduled.toISOString(),
    };
  },
};

// ----------------------
// Helpers
// ----------------------
function getUserId(req: Request) {
  return req.headers.get('x-user-id') || req.headers.get('X-User-Id') || undefined;
}

function visibleTo(userId: string, m: Message) {
  const cutoff = now().toISOString();
  const scheduled = m.scheduled_delivery_at ?? m.created_at;
  if (m.sender_id === userId) return true; // sender always sees own outgoing
  if (m.recipient_id === userId) return scheduled <= cutoff;
  return false;
}

function sortDesc(a: Message, b: Message) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function pageList(list: Message[], cursorId: string | undefined, limit: number) {
  const sorted = [...list].sort(sortDesc);
  let filtered = sorted;
  if (cursorId) {
    const cur = sorted.find(m => m.message_id === cursorId);
    if (cur) {
      const ts = new Date(cur.created_at).getTime();
      filtered = filtered.filter(m => new Date(m.created_at).getTime() < ts);
    }
  }
  const items = filtered.slice(0, limit);
  const next = filtered.length > limit ? filtered[limit].message_id : null;
  return { items, next_cursor: next, has_more: Boolean(next) };
}

function ensureSigned(m: Message): Message {
  return m.letter_url && !m.letter_url_signed
    ? { ...m, letter_url_signed: signUrl(m.letter_url) }
    : m;
}

// Build a conversation list between two users
function convoBetween(a: string, b: string) {
  return db.messages.filter(m =>
    (m.sender_id === a && m.recipient_id === b) || (m.sender_id === b && m.recipient_id === a)
  );
}

// ----------------------
// Handlers (full set)
// ----------------------
export const messagingHandlers: HttpHandler[] = [
  // Create message (JSON or multipart-lite)
  http.post('*/api/v1/messages', async ({ request }) => {
    const userId = getUserId(request);
    if (!userId) return HttpResponse.json({ detail: 'missing X-User-Id' }, { status: 401 });

    const ct = request.headers.get('content-type') || '';
    let payload: any = {};
    if (ct.includes('application/json')) {
      payload = await request.json();
    } else if (ct.includes('multipart/form-data')) {
      const form = await (request as any).formData?.();
      if (form) {
        payload.sender_id = form.get('sender_id') ?? userId;
        payload.recipient_id = form.get('recipient_id');
        payload.body_text = form.get('body_text') ?? undefined;
        payload.scheduled_delivery_at = form.get('scheduled_delivery_at') ?? undefined;
        const p = form.get('letter_url');
        payload.letter_url = typeof p === 'string' ? p : undefined;
      }
    } else {
      try { payload = await request.json(); } catch {}
    }

    if (!payload?.recipient_id) {
      return HttpResponse.json({ detail: 'recipient_id required' }, { status: 400 });
    }

    const created = factories.message({
      sender_id: payload.sender_id ?? userId,
      recipient_id: payload.recipient_id,
      body_text: payload.body_text,
      letter_url: payload.letter_url,
      scheduled_delivery_at: payload.scheduled_delivery_at,
    });

    db.messages.unshift(created);
    await delay(30);
    return HttpResponse.json(ensureSigned(created), { status: 201 });
  }),

  // Page a conversation (requires with_user_id)
  http.get('*/api/v1/messages/page', async ({ request }) => {
    const userId = getUserId(request);
    if (!userId) return HttpResponse.json({ detail: 'missing X-User-Id' }, { status: 401 });

    const url = new URL(request.url);
    const withUser = url.searchParams.get('with_user_id') || '';
    if (!withUser) return HttpResponse.json({ detail: 'with_user_id is required' }, { status: 400 });

    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 20)));
    const cursor = url.searchParams.get('cursor') || undefined;

    const convo = convoBetween(userId, withUser).filter(m => visibleTo(userId, m));
    const page = pageList(convo, cursor, limit);

    await delay(40);
    return HttpResponse.json({
      items: page.items.map(ensureSigned),
      next_cursor: page.next_cursor,
      has_more: page.has_more,
    });
  }),

  // Thread alias (first page only)
  http.get('*/api/v1/messages/thread', async ({ request }) => {
    const userId = getUserId(request);
    if (!userId) return HttpResponse.json({ detail: 'missing X-User-Id' }, { status: 401 });

    const url = new URL(request.url);
    const withUser = url.searchParams.get('with_user_id') || '';
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 20)));
    if (!withUser) return HttpResponse.json({ detail: 'with_user_id is required' }, { status: 400 });

    const convo = convoBetween(userId, withUser).filter(m => visibleTo(userId, m));
    const items = [...convo].sort(sortDesc).slice(0, limit).map(ensureSigned);

    await delay(30);
    return HttpResponse.json({ items, next_cursor: items.at(-1)?.message_id ?? null, has_more: convo.length > items.length });
  }),

  // Search summary (latest + count) optional with_user_id filter
  http.get('*/api/v1/messages/search', async ({ request }) => {
    const userId = getUserId(request);
    if (!userId) return HttpResponse.json({ detail: 'missing X-User-Id' }, { status: 401 });

    const url = new URL(request.url);
    const withUser = url.searchParams.get('with_user_id') || undefined;

    let msgs = db.messages.filter(m => m.sender_id === userId || m.recipient_id === userId);
    if (withUser) msgs = msgs.filter(m => m.sender_id === withUser || m.recipient_id === withUser);
    msgs = msgs.filter(m => visibleTo(userId, m)).sort(sortDesc);

    const latest = msgs[0] ? ensureSigned(msgs[0]) : null;

    await delay(20);
    return HttpResponse.json({ latest, total_visible: msgs.length });
  }),

  // Latest alias that returns just the message
  http.get('*/api/v1/messages/latest', async ({ request }) => {
    const userId = getUserId(request);
    if (!userId) return HttpResponse.json({ detail: 'missing X-User-Id' }, { status: 401 });

    const url = new URL(request.url);
    const withUser = url.searchParams.get('with_user_id') || undefined;

    let msgs = db.messages.filter(m => m.sender_id === userId || m.recipient_id === userId);
    if (withUser) msgs = msgs.filter(m => m.sender_id === withUser || m.recipient_id === withUser);
    msgs = msgs.filter(m => visibleTo(userId, m)).sort(sortDesc);

    await delay(20);
    return HttpResponse.json(msgs[0] ? ensureSigned(msgs[0]) : null);
  }),

  // Inbox paging (recipient-centric, only visible)
  http.get('*/api/v1/messages/inbox', async ({ request }) => {
    const userId = getUserId(request);
    if (!userId) return HttpResponse.json({ detail: 'missing X-User-Id' }, { status: 401 });

    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 20)));
    const cursor = url.searchParams.get('cursor') || undefined;

    const list = db.messages.filter(m => m.recipient_id === userId && visibleTo(userId, m));
    const page = pageList(list, cursor, limit);

    await delay(35);
    return HttpResponse.json({ items: page.items.map(ensureSigned), next_cursor: page.next_cursor, has_more: page.has_more });
  }),

  // Outbox paging (sender-centric, includes future scheduled)
  http.get('*/api/v1/messages/outbox', async ({ request }) => {
    const userId = getUserId(request);
    if (!userId) return HttpResponse.json({ detail: 'missing X-User-Id' }, { status: 401 });

    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 20)));
    const cursor = url.searchParams.get('cursor') || undefined;

    const list = db.messages.filter(m => m.sender_id === userId);
    const page = pageList(list, cursor, limit);

    await delay(35);
    return HttpResponse.json({ items: page.items.map(ensureSigned), next_cursor: page.next_cursor, has_more: page.has_more });
  }),

  // Batch sign storage paths
  http.post('*/api/v1/storage/sign-batch', async ({ request }) => {
    const userId = getUserId(request);
    if (!userId) return HttpResponse.json({ detail: 'missing X-User-Id' }, { status: 401 });
    let body: any = {};
try { body = await request.json(); } catch { body = {}; }
const paths: string[] = Array.isArray(body?.paths) ? (body.paths as string[]) : [];
    const out = paths.map(p => ({ path: p, signed_url: signUrl(p) }));
    await delay(10);
    return HttpResponse.json({ items: out });
  }),
  // Add to messaging handlers
http.post('*/api/v1/users/search', async ({ request }) => {
  const userId = request.headers.get('X-User-Id') || '';
  if (!userId) return HttpResponse.json({ detail: 'missing X-User-Id' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    my_user_id?: string; anonymous_handle?: string; limit?: number; offset?: number;
  };
  const me = body.my_user_id || userId;
  const limit = Math.max(1, Math.min(50, Number(body.limit ?? 10)));
  const offset = Math.max(0, Number(body.offset ?? 0));

  // Build a list of other users from the in-memory db
  const allUsers = Array.from(db.users.values()).filter(u => u.user_id !== me);

  // Map to the shape expected by the page
  const items = allUsers.slice(offset, offset + limit).map(u => {
    // Find latest message (either direction) between me and u
    const convo = db.messages.filter(m =>
      (m.sender_id === me && m.recipient_id === u.user_id) ||
      (m.sender_id === u.user_id && m.recipient_id === me)
    ).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const latest = convo[0];
    const conversation_thread_id =
      latest ? `thread_${[me, u.user_id].sort().join('_')}` : undefined;

    return {
      user_profile: {
        user_id: u.user_id,
        anonymous_handle: u.anonymous_handle ?? `u_${u.user_id.slice(-6)}`,
        country_code: 'ZA', // or omit if you don’t care
      },
      latest_message: latest ? {
        conversation_thread_id,
        match_id: `match_${[me, u.user_id].sort().join('_')}`,
      } : undefined,
    };
  });

  await delay(25);
  return HttpResponse.json({ items });
}),
// Add to messaging handlers
http.post('*/api/v1/uploads', async ({ request }) => {
  const userId = request.headers.get('X-User-Id') || 'anon';
  const form = (request as any).formData ? await (request as any).formData() : null;
  // Optional: validate form.get('file')
  const path = `letters/${userId}/${Date.now()}.jpg`;

  // Keep the response shape the client expects
  return HttpResponse.json({ data: { path } }, { status: 200 });
}),

];

export default messagingHandlers;
export function getMessagingStoreUnsafe() {
return {
users: db.users, // Map<string, User>
messages: db.messages, // Message[] (newest-first by our seeding)
} as const;
}