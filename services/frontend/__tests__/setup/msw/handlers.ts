// __tests__/setup/msw/handlers.ts
import { http, HttpResponse } from 'msw';
import { moderationHandlers } from './moderation-handler';
/**
 * In-memory store to simulate your Supabase table `user_profiles`.
 * Keyed by clerk_id; enforces uniqueness of anonymous_handle.
 */
type Profile = {
  clerk_id: string;
  anonymous_handle: string;
  fingerprint: string[];
  age_range?: string | null;
  primary_language?: string | null;
  secondary_languages?: string[];
  time_zone?: string | null;
  country_code?: string | null;
  bio?: string | null;
  interests?: string[];
  created_at: string;
  updated_at: string;
  last_active?: string | null;
};

const db = new Map<string, Profile>(); // clerk_id -> profile
const nowIso = () => new Date().toISOString();

function handleIsTaken(handle: string, exceptClerk?: string) {
  for (const [cid, p] of db.entries()) {
    if (p.anonymous_handle === handle && cid !== exceptClerk) return true;
  }
  return false;
}

/** Reset between tests */
export function resetDb() {
  db.clear();
}


export const handlers = [
  // CREATE (201) or update fingerprint if clerk exists (200)
  http.post('*/profiles', async ({ request }) => {
    const body = (await request.json()) as {
      clerk_id: string;
      anonymous_handle: string;
      fingerprint: string;
      age_range?: string | null;
      primary_language?: string | null;
      secondary_languages?: string[];
      time_zone?: string | null;
      country_code?: string | null;
      bio?: string | null;
      interests?: string[];
    };

    const existing = db.get(body.clerk_id);

    if (existing) {
      const fps = Array.isArray(existing.fingerprint) ? existing.fingerprint : [];
      if (body.fingerprint && !fps.includes(body.fingerprint)) {
        existing.fingerprint = [...fps, body.fingerprint];
        existing.updated_at = nowIso();
      }
      return HttpResponse.json(existing, { status: 200 });
    }

    if (handleIsTaken(body.anonymous_handle)) {
      return HttpResponse.json({ detail: 'Handle is already taken.' }, { status: 409 });
    }

    const created: Profile = {
      clerk_id: body.clerk_id,
      anonymous_handle: body.anonymous_handle,
      fingerprint: body.fingerprint ? [body.fingerprint] : [],
      age_range: body.age_range ?? null,
      primary_language: body.primary_language ?? null,
      secondary_languages: body.secondary_languages ?? [],
      time_zone: body.time_zone ?? null,
      country_code: body.country_code ?? null,
      bio: body.bio ?? null,
      interests: body.interests ?? [],
      created_at: nowIso(),
      updated_at: nowIso(),
      last_active: null,
    };
    db.set(created.clerk_id, created);
    return HttpResponse.json(created, { status: 201 });
  }),

  // READ
  http.get('*/profiles/:clerk_id', ({ params }) => {
    const { clerk_id } = params as { clerk_id: string };
    const row = db.get(clerk_id);
    if (!row) {
      return HttpResponse.json({ detail: 'Profile not found.' }, { status: 404 });
    }
    return HttpResponse.json(row, { status: 200 });
  }),

  // UPDATE (upsert; 409 on handle conflict)
  http.put('*/profiles/:clerk_id', async ({ params, request }) => {
    const { clerk_id } = params as { clerk_id: string };
    const patch = (await request.json()) as Partial<Profile> & {
      anonymous_handle?: string;
    };

    if (patch.anonymous_handle && handleIsTaken(patch.anonymous_handle, clerk_id)) {
      return HttpResponse.json({ detail: 'Handle is already taken.' }, { status: 409 });
    }

    const existing = db.get(clerk_id);
    const base: Profile =
      existing ??
      ({
        clerk_id,
        anonymous_handle: patch.anonymous_handle ?? `user_${clerk_id}`,
        fingerprint: [],
        age_range: null,
        primary_language: null,
        secondary_languages: [],
        time_zone: null,
        country_code: null,
        bio: null,
        interests: [],
        created_at: nowIso(),
        updated_at: nowIso(),
        last_active: null,
      } as Profile);

    const updated: Profile = {
      ...base,
      ...patch,
      secondary_languages: patch.secondary_languages ?? base.secondary_languages ?? [],
      interests: patch.interests ?? base.interests ?? [],
      updated_at: nowIso(),
    };

    db.set(clerk_id, updated);
    return HttpResponse.json(updated, { status: 200 });
  }),

  ...moderationHandlers,
];
