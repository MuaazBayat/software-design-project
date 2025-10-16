// msw/moderation.handlers.ts
// Drop-in MSW handlers for the Content Moderation API defined in FastAPI main.py.
// Usage:
//   import { moderationHandlers, resetModerationDb, seedModerationDb } from './msw/moderation.handlers';
//   handlers.push(...moderationHandlers);
//   // in your setupTests afterEach: resetModerationDb();
//
// Notes:
// - These handlers are SELF-CONTAINED. They do not modify or depend on your existing handlers or DB.
// - They simulate Supabase tables: user_profiles, external_users, moderation_logs, banned_fingerprints.
// - They mirror endpoint shapes/behaviours, including header rules, counters, and simple profanity detection.

import { http, HttpResponse, type HttpHandler } from 'msw';

/** ------------------------------
 * Types mirroring main.py models
 * -------------------------------*/
export type UUID = string;

export type UserProfile = {
  user_id: string;            // primary key (internal users)
  clerk_id?: string | null;   // for ban/unban via Clerk
  moderator?: boolean;        // access to /logs
  account_status?: 'active' | 'banned';
  fingerprint?: string[] | string | null; // array in most cases
  reported_users?: string[] | null;       // list of user_ids this user has reported
  blocked_users?: string[] | null;        // list of user_ids this user has blocked
  reported_count?: number;                // increments on auto-detection & RPC
  created_at?: string;                    // ISO
  updated_at?: string;                    // ISO
};

export type ExternalUser = {
  id: string;         // primary key (external user id)
  api_key: string;    // provided via X-Api-Key
  usage_count: number;
  usage_limit: number;
};

export type ModerationLog = {
  log_id: UUID;                    // synthetic id for the log row
  target_type: 'user' | 'message';
  target_id: string;               // user_id or message_id
  reported_user_id: string | null; // who is accused
  reporting_user_id: string | null;// who filed report (null for automated)
  violation_type: string;          // e.g., inappropriate_content
  violation_description: string;
  severity_level: 'low' | 'medium' | 'high' | string;
  automated_detection: boolean;
  status: 'open' | 'resolved' | 'dismissed';
  resolution_action?: string | null;  // e.g., content_removal, permanent_ban
  resolution_notes?: string | null;
  reviewed_at?: string | null;        // ISO timestamp when resolved
  created_at: string;                 // ISO
};

export type BannedFingerprint = {
  user_id: string;
  fingerprint: string;
};

/** ------------------------------
 * In-memory stores (isolated)
 * -------------------------------*/
const nowIso = () => new Date().toISOString();
const genId = (): UUID =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

// Tables
const userProfiles = new Map<string, UserProfile>();          // key: user_id
const externalUsers = new Map<string, ExternalUser>();         // key: id
const externalUsersByKey = new Map<string, ExternalUser>();    // key: api_key
const moderationLogs = new Map<string, ModerationLog>();       // key: log_id
const bannedFingerprints: BannedFingerprint[] = [];            // array is fine here

/**
 * Helpers
 */
function upsertUser(u: UserProfile) {
  const base: UserProfile = {
    moderator: false,
    account_status: 'active',
    reported_users: [],
    blocked_users: [],
    reported_count: 0,
    created_at: nowIso(),
    updated_at: nowIso(),
    ...u,
  };
  userProfiles.set(base.user_id, base);
  return base;
}

function getUserOr404(user_id: string) {
  const u = userProfiles.get(user_id);
  if (!u) {
    return HttpResponse.json({ detail: 'User not found' }, { status: 404 });
  }
  return u;
}

function addLog(row: Omit<ModerationLog, 'log_id' | 'created_at'> & Partial<Pick<ModerationLog, 'log_id' | 'created_at'>>) {
  const log: ModerationLog = {
    log_id: row.log_id ?? genId(),
    created_at: row.created_at ?? nowIso(),
    ...row,
  } as ModerationLog;
  moderationLogs.set(log.log_id, log);
  return log;
}

function censorText(text: string): { contains: boolean; censored: string } {
  // Lightweight profanity simulation (replace common words; extend as needed)
  const bad = ['fuck', 'shit', 'bitch', 'asshole'];
  let contains = false;
  let censored = text;
  for (const w of bad) {
    const re = new RegExp(w, 'gi');
    if (re.test(censored)) contains = true;
    censored = censored.replace(re, (m) => m[0] + '*'.repeat(Math.max(0, m.length - 1)));
  }
  return { contains, censored };
}

function arrayify<T>(v: T[] | T | null | undefined): T[] {
  if (Array.isArray(v)) return v;
  if (v == null) return [] as T[];
  return [v];
}

/** ------------------------------
 * Public test utilities
 * -------------------------------*/
export function resetModerationDb() {
  userProfiles.clear();
  externalUsers.clear();
  externalUsersByKey.clear();
  moderationLogs.clear();
  bannedFingerprints.length = 0;
}

export function seedModerationDb({
  users = [],
  externals = [],
  logs = [],
  banned = [],
}: {
  users?: UserProfile[];
  externals?: ExternalUser[];
  logs?: Omit<ModerationLog, 'created_at'>[];
  banned?: BannedFingerprint[];
} = {}) {
  for (const u of users) upsertUser(u);
  for (const e of externals) {
    externalUsers.set(e.id, e);
    externalUsersByKey.set(e.api_key, e);
  }
  for (const l of logs) addLog(l);
  bannedFingerprints.push(...banned);
}

/** ------------------------------
 * Handlers (one-to-one with main.py)
 * -------------------------------*/
export const moderationHandlers: HttpHandler[] = [
  // POST /api/v1/check
  http.post('*/api/v1/check', async ({ request }) => {
    const headers = request.headers;
    const xUserId = headers.get('X-User-Id');
    const xApiKey = headers.get('X-Api-Key');

    if (xUserId && xApiKey) {
      return HttpResponse.json({ detail: 'Provide either X-User-Id or X-Api-Key, not both' }, { status: 400 });
    }
    if (!xUserId && !xApiKey) {
      return HttpResponse.json({ detail: 'Missing authentication header' }, { status: 400 });
    }

    const body = (await request.json()) as { text: string };

    let userType: 'internal' | 'external' | null = null;
    let user: UserProfile | ExternalUser | null = null;
    let internalId: string | null = null;

    if (xApiKey) {
      const ext = externalUsersByKey.get(xApiKey);
      if (!ext) return HttpResponse.json({ detail: 'Invalid API key' }, { status: 401 });
      if (ext.usage_count >= ext.usage_limit) {
        return HttpResponse.json({ detail: 'Usage limit reached' }, { status: 429 });
      }
      ext.usage_count += 1; // increment usage
      userType = 'external';
      user = ext;
    } else if (xUserId) {
      const found = userProfiles.get(xUserId);
      if (!found) return HttpResponse.json({ detail: 'User not found' }, { status: 404 });
      userType = 'internal';
      user = found;
      internalId = found.user_id;
    }

    const { contains, censored } = censorText(body.text);

    if (userType === 'internal' && contains && internalId) {
      // auto moderation log
      addLog({
        target_type: 'message',
        target_id: genId(),
        reported_user_id: internalId,
        reporting_user_id: null,
        violation_type: 'inappropriate_content',
        violation_description: `Profanity detected in text: '${censored}'`,
        severity_level: 'low',
        automated_detection: true,
        status: 'resolved',
        resolution_action: 'content_removal',
        resolution_notes: 'Profanity automatically detected and censored',
        reviewed_at: nowIso(),
      });
      // increment reported_count
      const u = userProfiles.get(internalId)!;
      u.reported_count = (u.reported_count ?? 0) + 1;
      u.updated_at = nowIso();
      userProfiles.set(internalId, u);
    }

    return HttpResponse.json({ contains_profanity: contains, censored_text: censored }, { status: 200 });
  }),

  // POST /api/v1/report-user
  http.post('*/api/v1/report-user', async ({ request }) => {
    const { reporterId, reportedId, violationType } = (await request.json()) as {
      reporterId: string;
      reportedId: string;
      violationType: string;
    };

    const reporter = getUserOr404(reporterId);
    if (reporter instanceof Response) return reporter; // bubbled HttpResponse

    const reported = getUserOr404(reportedId);
    if (reported instanceof Response) return reported;

    const list = reporter.reported_users ?? [];
    if (list.includes(reportedId)) {
      return HttpResponse.json(list, { status: 200 });
    }

    const next = [...list, reportedId];
    reporter.reported_users = next;
    reporter.updated_at = nowIso();
    userProfiles.set(reporterId, reporter);

    // simulate RPC increment_user_reported_count
    reported.reported_count = (reported.reported_count ?? 0) + 1;
    reported.updated_at = nowIso();
    userProfiles.set(reportedId, reported);

    // create moderation log
    addLog({
      target_type: 'user',
      target_id: reportedId,
      reported_user_id: reportedId,
      reporting_user_id: reporterId,
      violation_type: violationType,
      violation_description: 'User reported',
      severity_level: 'low',
      automated_detection: false,
      status: 'open',
    });

    return HttpResponse.json(next, { status: 201 });
  }),

  // POST /api/v1/report-message
  http.post('*/api/v1/report-message', async ({ request }) => {
    const { reporterId, reportedUserId, reportedMessageId, violationType } = (await request.json()) as {
      reporterId: string;
      reportedUserId: string;
      reportedMessageId: string;
      violationType: string;
    };

    // If a log for this message already exists, return it
    const existing = Array.from(moderationLogs.values()).filter((l) => l.target_id === reportedMessageId);
    if (existing.length > 0) {
      return HttpResponse.json(existing, { status: 200 });
    }

    const log = addLog({
      target_type: 'message',
      target_id: reportedMessageId,
      reported_user_id: reportedUserId,
      reporting_user_id: reporterId,
      violation_type: violationType,
      violation_description: 'User reported message',
      severity_level: 'low',
      automated_detection: false,
      status: 'open',
    });

    return HttpResponse.json(log, { status: 200 });
  }),

  // POST /api/v1/block-user
  http.post('*/api/v1/block-user', async ({ request }) => {
    const { reporterId, reportedId } = (await request.json()) as {
      reporterId: string;
      reportedId: string;
    };

    const reporter = getUserOr404(reporterId);
    if (reporter instanceof Response) return reporter;

    // ensure list exists
    const list = reporter.blocked_users ?? [];
    if (list.includes(reportedId)) {
      return HttpResponse.json(list, { status: 200 });
    }

    const next = [...list, reportedId];
    reporter.blocked_users = next;
    reporter.updated_at = nowIso();
    userProfiles.set(reporterId, reporter);

    return HttpResponse.json(next, { status: 201 });
  }),

  // POST /api/v1/ban-user/{log_id}
  http.post('*/api/v1/ban-user/:log_id', async ({ params }) => {
    const { log_id } = params as { log_id: string };
    const log = moderationLogs.get(log_id);
    if (!log) return HttpResponse.json({ detail: 'Moderation log not found' }, { status: 404 });

    const user_id = log.reported_user_id;
    if (!user_id) return HttpResponse.json({ detail: 'User not found' }, { status: 404 });

    const user = userProfiles.get(user_id);
    if (!user) return HttpResponse.json({ detail: 'User not found' }, { status: 404 });

    const clerkId = user.clerk_id ?? null;
    if (!clerkId) return HttpResponse.json({ detail: 'Clerk ID not found for user.' }, { status: 400 });

    // Update account_status
    user.account_status = 'banned';
    user.updated_at = nowIso();
    userProfiles.set(user_id, user);

    // Resolve the log
    const updated: ModerationLog = {
      ...log,
      status: 'resolved',
      resolution_action: 'permanent_ban',
      resolution_notes: 'User banned',
      reviewed_at: nowIso(),
    };
    moderationLogs.set(updated.log_id, updated);

    // Add fingerprints
    for (const fp of arrayify<string>(user.fingerprint)) {
      bannedFingerprints.push({ user_id, fingerprint: fp });
    }

    // Simulate Clerk ban (always success in tests)
    return HttpResponse.json({ message: `User ${user_id} has been banned.` }, { status: 200 });
  }),

  // POST /api/v1/ban-clerk-user/{clerk_id}
  http.post('*/api/v1/ban-clerk-user/:clerk_id', async ({ params }) => {
    const { clerk_id } = params as { clerk_id: string };

    // If we have a local profile with this clerk_id, mark banned
    const profile = Array.from(userProfiles.values()).find((u) => u.clerk_id === clerk_id);
    if (profile) {
      profile.account_status = 'banned';
      profile.updated_at = nowIso();
      userProfiles.set(profile.user_id, profile);
    }

    // Simulate Clerk ban
    return HttpResponse.json({ message: `Clerk user ${clerk_id} has been banned.` }, { status: 200 });
  }),

  // POST /api/v1/unban-user/{user_id}
  http.post('*/api/v1/unban-user/:user_id', async ({ params }) => {
    const { user_id } = params as { user_id: string };
    const user = userProfiles.get(user_id);
    if (!user) return HttpResponse.json({ detail: 'User not found' }, { status: 404 });

    const clerkId = user.clerk_id ?? null;
    if (!clerkId) return HttpResponse.json({ detail: 'Clerk ID not found for user.' }, { status: 400 });

    user.account_status = 'active';
    user.updated_at = nowIso();
    userProfiles.set(user_id, user);

    // delete banned_fingerprints rows for this user
    for (let i = bannedFingerprints.length - 1; i >= 0; i--) {
      if (bannedFingerprints[i].user_id === user_id) bannedFingerprints.splice(i, 1);
    }

    // Simulate Clerk unban
    return HttpResponse.json({ message: `User ${user_id} has been unbanned.` }, { status: 200 });
  }),

  // POST /api/v1/unban-clerk-user/{clerk_id}
  http.post('*/api/v1/unban-clerk-user/:clerk_id', async ({ params }) => {
    const { clerk_id } = params as { clerk_id: string };

    // If we have a local profile with this clerk_id, mark active
    const profile = Array.from(userProfiles.values()).find((u) => u.clerk_id === clerk_id);
    if (profile) {
      profile.account_status = 'active';
      profile.updated_at = nowIso();
      userProfiles.set(profile.user_id, profile);
    }

    // Simulate Clerk unban
    return HttpResponse.json({ message: `Clerk user ${clerk_id} has been unbanned.` }, { status: 200 });
  }),

  // POST /api/v1/resolve-case
  http.post('*/api/v1/resolve-case', async ({ request }) => {
    const body = (await request.json()) as { log_id: string; action: string; notes: string };

    const valid = ['warning', 'no_action', 'content_removal', 'temporary_ban', 'permanent_ban'];
    if (!valid.includes(body.action)) {
      return HttpResponse.json({ detail: 'Invalid status value' }, { status: 400 });
    }

    const log = moderationLogs.get(body.log_id);
    if (!log) return HttpResponse.json({ detail: 'Moderation log not found' }, { status: 404 });

    const updated: ModerationLog = {
      ...log,
      status: 'resolved', // mirrors main.py behaviour
      resolution_action: body.action,
      resolution_notes: body.notes,
      reviewed_at: nowIso(),
    };
    moderationLogs.set(updated.log_id, updated);

    return HttpResponse.json({ message: `Moderation log ${body.log_id} has been updated.` }, { status: 200 });
  }),

  // GET /api/v1/fingerprint/{fingerprint}
  http.get('*/api/v1/fingerprint/:fingerprint', ({ params }) => {
    const { fingerprint } = params as { fingerprint: string };
    const is_banned = bannedFingerprints.some((b) => b.fingerprint === fingerprint);
    return HttpResponse.json(
      is_banned
        ? { is_banned: true, message: 'Fingerprint is banned.' }
        : { is_banned: false, message: 'Fingerprint is not banned.' },
      { status: 200 },
    );
  }),

  // GET /api/v1/logs (moderator-only)
  http.get('*/api/v1/logs', ({ request }) => {
    const xUserId = request.headers.get('X-User-Id');
    if (!xUserId) return HttpResponse.json({ detail: 'Missing X-User-Id header' }, { status: 400 });

    const user = userProfiles.get(xUserId);
    if (!user) return HttpResponse.json({ detail: 'User not found' }, { status: 404 });
    if (!user.moderator) return HttpResponse.json({ detail: 'Access denied. User is not a moderator.' }, { status: 403 });

    const logs = Array.from(moderationLogs.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
    return HttpResponse.json({ logs }, { status: 200 });
  }),

  // GET /api/v1/banned-users
  http.get('*/api/v1/banned-users', () => {
    const banned = Array.from(userProfiles.values()).filter((u) => u.account_status === 'banned');
    return HttpResponse.json({ banned_users: banned }, { status: 200 });
  }),
];

// Optional convenience: tiny factory for test data
export const factories = {
  user: (partial: Partial<UserProfile> & { user_id: string }): UserProfile => {
    const { user_id, ...rest } = partial;   // remove user_id from the spread
    return upsertUser({
      user_id,                               // set it once
      clerk_id: null,
      moderator: false,
      account_status: 'active',
      fingerprint: [],
      reported_users: [],
      blocked_users: [],
      reported_count: 0,
      ...rest,                               // rest has no user_id now
    });
  },

  external: (partial: Partial<ExternalUser> & { id: string; api_key: string }): ExternalUser => {
    const e: ExternalUser = { usage_count: 0, usage_limit: 1000, ...partial } as ExternalUser;
    externalUsers.set(e.id, e);
    externalUsersByKey.set(e.api_key, e);
    return e;
  },

  log: (
    partial: Omit<ModerationLog, 'log_id' | 'created_at'> &
      Partial<Pick<ModerationLog, 'log_id' | 'created_at'>>
  ) => addLog(partial),
};

