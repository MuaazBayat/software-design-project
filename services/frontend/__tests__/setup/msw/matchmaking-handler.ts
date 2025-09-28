import { http, HttpResponse, delay } from 'msw';

/**
 * In-memory MSW store for the Matchmaking API used by tests.
 * Mirrors (lightly) the FastAPI endpoints in `main.py`.
 */

// ---------- Types ----------
export type UserProfile = {
  user_id: string;
  clerk_id?: string;
  anonymous_handle: string;
  bio?: string | null;
  age_range?: string | null;
  primary_language?: string | null;
  secondary_languages?: string[] | null;
  time_zone?: string | null;
  country_code?: string | null;
  interests?: string[] | null;
  favorite_local_fact?: string | null;
  preferred_correspondence_type?: 'email' | 'chat' | 'either' | null;
  cultural_completeness_score?: number | null;
  account_status?: 'active' | 'banned' | 'inactive';
};

export type MatchRecord = {
  match_id: string;
  user_1_id: string;
  user_2_id: string;
  match_type: 'email' | 'chat' | 'either';
  match_source: 'random';
  compatibility_score: number;
  conversation_thread_id: string;
  status: 'active' | 'completed' | 'expired';
  created_at: string; // ISO
};

export type PreferenceSelection = {
  user_id: string; // resolved from clerk
  selected_profile_id: string;
  preference_type: 'real' | 'fake';
  selected_at: string; // ISO
};

// ---------- Store ----------
export type MatchmakingStore = {
  users: Map<string, UserProfile>; // key: user_id
  usersByClerk: Map<string, string>; // clerk_id -> user_id
  passed: Set<string>; // `${user_id}::${passed_user_id}`
  matches: MatchRecord[];
  selections: Map<string, PreferenceSelection>; // key: user_id
  fakeUsers: UserProfile[];
};

const makeEmptyStore = (): MatchmakingStore => ({
  users: new Map(),
  usersByClerk: new Map(),
  passed: new Set(),
  matches: [],
  selections: new Map(),
  fakeUsers: [
    {
      user_id: 'fake-1',
      anonymous_handle: 'Elara',
      country_code: 'JP',
      bio: 'Lover of traditional arts, matcha, and quiet temples.',
      interests: ['Art', 'Tea', 'Nature'],
      age_range: '25-34',
      primary_language: 'ja',
      favorite_local_fact: 'Kyoto was the imperial capital of Japan for over 1,000 years.',
      preferred_correspondence_type: 'email',
      account_status: 'active',
    },
    {
      user_id: 'fake-2',
      anonymous_handle: 'Javier',
      country_code: 'AR',
      bio: 'Passionate about tango, football, and asado.',
      interests: ['Dancing', 'Food', 'Music'],
      age_range: '30-39',
      primary_language: 'es',
      favorite_local_fact: "Buenos Aires means 'good airs' in Spanish.",
      preferred_correspondence_type: 'chat',
      account_status: 'active',
    },
    {
      user_id: 'fake-3',
      anonymous_handle: 'Amina',
      country_code: 'MA',
      bio: 'Joy in colors of the souk and storytelling.',
      interests: ['Cooking', 'History', 'Photography'],
      age_range: '28-37',
      primary_language: 'ar',
      favorite_local_fact: "Marrakech is known as the 'Red City'.",
      preferred_correspondence_type: 'either',
      account_status: 'active',
    },
    {
      user_id: 'fake-4',
      anonymous_handle: 'Liam',
      country_code: 'IE',
      bio: 'Folk music, rainy days, and myths.',
      interests: ['Music', 'Reading', 'Hiking'],
      age_range: '32-41',
      primary_language: 'en',
      favorite_local_fact: 'Dublin was founded by Vikings.',
      preferred_correspondence_type: 'either',
      account_status: 'active',
    },
  ],
});

let __store: MatchmakingStore = makeEmptyStore();

export const getMatchmakingStoreUnsafe = () => __store; // for assertions/introspection in tests

export function resetMatchmakingDb() {
  __store = makeEmptyStore();
}

// ---------- Factories & seeding ----------
export const factories = {
  user(partial: Partial<UserProfile> & { user_id?: string } = {}): UserProfile {
    const id = partial.user_id ?? `u_${Math.random().toString(36).slice(2, 8)}`;
    const u: UserProfile = {
      user_id: id,
      clerk_id: partial.clerk_id ?? `clerk_${id}`,
      anonymous_handle: partial.anonymous_handle ?? id.replace('u_', ''),
      bio: partial.bio ?? null,
      age_range: partial.age_range ?? '26-35',
      primary_language: partial.primary_language ?? 'en',
      secondary_languages: partial.secondary_languages ?? [],
      time_zone: partial.time_zone ?? 'UTC+00:00',
      country_code: partial.country_code ?? 'US',
      interests: partial.interests ?? ['books'],
      favorite_local_fact: partial.favorite_local_fact ?? null,
      preferred_correspondence_type: partial.preferred_correspondence_type ?? 'either',
      cultural_completeness_score: partial.cultural_completeness_score ?? 0.6,
      account_status: partial.account_status ?? 'active',
    };
    return u;
  },
  profile(partial: Partial<UserProfile> & { user_id?: string } = {}) { return this.user(partial); },
  match(partial: Partial<MatchRecord> & { user_1_id: string; user_2_id: string }): MatchRecord {
    const rec: MatchRecord = {
      match_id: partial.match_id ?? cryptoRandomId(),
      user_1_id: partial.user_1_id,
      user_2_id: partial.user_2_id,
      match_type: partial.match_type ?? 'either',
      match_source: 'random',
      compatibility_score: partial.compatibility_score ?? 0.5,
      conversation_thread_id: partial.conversation_thread_id ?? cryptoRandomId(),
      status: partial.status ?? 'active',
      created_at: partial.created_at ?? new Date().toISOString(),
    };
    return rec;
  },
};

export function seedMatchmakingDb(data: {
  users?: UserProfile[];
  matches?: MatchRecord[];
  selections?: PreferenceSelection[];
  passed?: Array<{ user_id: string; passed_user_id: string }>;
}) {
  if (data.users) {
    for (const u of data.users) {
      __store.users.set(u.user_id, u);
      if (u.clerk_id) __store.usersByClerk.set(u.clerk_id, u.user_id);
    }
  }
  if (data.matches) {
    __store.matches.push(...data.matches);
  }
  if (data.selections) {
    for (const s of data.selections) __store.selections.set(s.user_id, s);
  }
  if (data.passed) {
    for (const p of data.passed) __store.passed.add(`${p.user_id}::${p.passed_user_id}`);
  }
}

// ---------- Utilities ----------
const cryptoRandomId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const clean = (p: UserProfile): UserProfile => {
  const { clerk_id, ...rest } = p; // strip sensitive-ish
  return rest as UserProfile;
};

function getByClerk(clerkId: string): UserProfile | undefined {
  const uid = __store.usersByClerk.get(clerkId);
  return uid ? __store.users.get(uid) : undefined;
}

function getDailyStats(userId: string) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const used = __store.matches.filter((m) => m.created_at >= start && (m.user_1_id === userId || m.user_2_id === userId)).length;
  const total_daily_limit = 5;
  return {
    matches_used: used,
    matches_remaining: Math.max(0, total_daily_limit - used),
    total_daily_limit,
    reset_time: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString(),
  };
}

function calcCompatibility(a: UserProfile, b: UserProfile): number {
  let score = 0;
  // tiny heuristic: language & country & interests
  if (a.primary_language && b.primary_language && a.primary_language === b.primary_language) score += 0.35;
  if (a.country_code && b.country_code && a.country_code !== b.country_code) score += 0.1;
  const ai = new Set((a.interests ?? []).map((s) => s.toLowerCase()));
  const bi = new Set((b.interests ?? []).map((s) => s.toLowerCase()));
  const common = [...ai].filter((x) => bi.has(x)).length;
  score += Math.min(0.3, common * 0.15);
  score += Math.min(0.1, (b.cultural_completeness_score ?? 0) * 0.1);
  return Math.min(1, Math.max(0, score));
}

// Filter helpers for suggestions
function filterProfiles(all: UserProfile[], me: UserProfile, opts: {
  languages?: string[];
  age_ranges?: string[];
  country_codes?: string[];
  interests?: string[];
  match_type?: 'long-term' | 'one-time' | 'either' | undefined;
}) {
  const backendType = (t?: string | null) => (t === 'long-term' ? 'email' : t === 'one-time' ? 'chat' : 'either');

  return all.filter((p) => {
    if (p.user_id === me.user_id) return false;
    if (p.account_status !== 'active') return false;
    // language
    if (opts.languages && opts.languages.length) {
      const langs = new Set([p.primary_language, ...(p.secondary_languages ?? [])].filter(Boolean).map((s) => String(s).toLowerCase()));
      if (!opts.languages.some((l) => langs.has(l.toLowerCase()))) return false;
    }
    // age
    if (opts.age_ranges && opts.age_ranges.length && p.age_range && !opts.age_ranges.includes(p.age_range)) return false;
    // country
    if (opts.country_codes && opts.country_codes.length && p.country_code && !opts.country_codes.includes(p.country_code)) return false;
    // interests
    if (opts.interests && opts.interests.length) {
      const ints = new Set((p.interests ?? []).map((i) => i.toLowerCase()));
      if (!opts.interests.some((i) => ints.has(i.toLowerCase()))) return false;
    }
    // match type
    if (opts.match_type && opts.match_type !== 'either') {
      if ((p.preferred_correspondence_type ?? 'either') !== backendType(opts.match_type)) return false;
    }
    // exclude passed
    if (__store.passed.has(`${me.user_id}::${p.user_id}`)) return false;
    // exclude previous matches
    const prev = __store.matches.some((m) => (m.user_1_id === me.user_id && m.user_2_id === p.user_id) || (m.user_2_id === me.user_id && m.user_1_id === p.user_id));
    if (prev) return false;

    return true;
  });
}

// ---------- Handlers ----------
const base = '*/'; // allow any host

export const matchmakingHandlers = [
  // health
  http.get(`${base}health`, async () => {
    return HttpResponse.json({ status: 'healthy', timestamp: new Date().toISOString(), version: 'msw' });
  }),

  // GET /user/profile/:clerk_id
  http.get(`${base}user/profile/:clerk_id`, async ({ params }) => {
    const clerkId = String(params.clerk_id);
    const me = getByClerk(clerkId);
    if (!me) return HttpResponse.json({ detail: `User not found for clerk_id: ${clerkId}` }, { status: 404 });
    return HttpResponse.json({ profile: clean(me) });
  }),

  // GET /user/stats/:clerk_id
  http.get(`${base}user/stats/:clerk_id`, async ({ params }) => {
    const clerkId = String(params.clerk_id);
    const me = getByClerk(clerkId);
    if (!me) return HttpResponse.json({ detail: `User not found for clerk_id: ${clerkId}` }, { status: 404 });
    return HttpResponse.json(getDailyStats(me.user_id));
  }),

  // POST /profiles/pass
  http.post(`${base}profiles/pass`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    const { clerk_id, passed_user_id } = body || {};
    const me = clerk_id ? getByClerk(String(clerk_id)) : undefined;
    if (!me || !passed_user_id) {
      return HttpResponse.json({ detail: 'Missing clerk_id or passed_user_id' }, { status: 400 });
    }
    __store.passed.add(`${me.user_id}::${String(passed_user_id)}`);
    return HttpResponse.json({ success: true, message: 'Profile pass recorded' });
  }),

  // GET /profiles/suggestions/:clerk_id
  http.get(`${base}profiles/suggestions/:clerk_id`, async ({ params, request }) => {
    const clerkId = String(params.clerk_id);
    const me = getByClerk(clerkId);
    if (!me) return HttpResponse.json({ detail: `User not found for clerk_id: ${clerkId}` }, { status: 404 });

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? '1');
    const languages = (url.searchParams.get('languages') ?? '').split(',').filter(Boolean);
    const age_ranges = (url.searchParams.get('age_ranges') ?? '').split(',').filter(Boolean);
    const interests = (url.searchParams.get('interests') ?? '').split(',').filter(Boolean);
    const match_type = (url.searchParams.get('match_type') ?? 'either') as 'long-term' | 'one-time' | 'either';

    const candidates = filterProfiles([...__store.users.values()], me, {
      languages,
      age_ranges,
      interests,
      match_type,
    });

    if (!candidates.length) {
      return HttpResponse.json({ detail: 'No compatible profiles found' }, { status: 404 });
    }

    // Simple scoring & prioritization
    const scored = candidates
      .map((p) => ({ p, s: calcCompatibility(me, p) + Math.random() * 0.05 }))
      .sort((a, b) => b.s - a.s)
      .slice(0, Math.max(1, limit))
      .map(({ p }) => clean(p));

    return HttpResponse.json(scored);
  }),

  // POST /matches/find
  http.post(`${base}matches/find`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    const { clerk_id, accept = true, suggested_user_id } = body || {};
    const me = clerk_id ? getByClerk(String(clerk_id)) : undefined;
    if (!me) return HttpResponse.json({ detail: 'User not found' }, { status: 404 });

    // choose candidate
    let candidate: UserProfile | undefined;
    if (suggested_user_id) candidate = __store.users.get(String(suggested_user_id));
    if (!candidate) {
      const pool = filterProfiles([...__store.users.values()], me, {});
      if (!pool.length) return HttpResponse.json({ detail: 'No compatible profiles found' }, { status: 404 });
      candidate = pool.sort((a, b) => calcCompatibility(me, b) - calcCompatibility(me, a))[0];
    }

    const compatibility = Number(calcCompatibility(me, candidate!).toFixed(2));

    if (accept) {
      const rec: MatchRecord = {
        match_id: cryptoRandomId(),
        user_1_id: me.user_id,
        user_2_id: candidate!.user_id,
        match_type: (candidate!.preferred_correspondence_type ?? 'either') as MatchRecord['match_type'],
        match_source: 'random',
        compatibility_score: compatibility,
        conversation_thread_id: cryptoRandomId(),
        status: 'active',
        created_at: new Date().toISOString(),
      };
      __store.matches.push(rec);
      await delay(50);
      return HttpResponse.json({
        match_id: rec.match_id,
        thread_id: rec.conversation_thread_id,
        penpal_profile: clean(candidate!),
        match_type: rec.match_type,
        compatibility_score: rec.compatibility_score,
        created_at: rec.created_at,
      });
    }

    // reject path — record a pass
    __store.passed.add(`${me.user_id}::${candidate!.user_id}`);
    return HttpResponse.json({
      match_id: '',
      thread_id: '',
      penpal_profile: clean(candidate!),
      match_type: (candidate!.preferred_correspondence_type ?? 'either'),
      compatibility_score: compatibility,
      created_at: new Date().toISOString(),
    });
  }),

  // POST /preferences/select
  http.post(`${base}preferences/select`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    const { clerk_id, selected_profile_id, preference_type } = body || {};
    const me = clerk_id ? getByClerk(String(clerk_id)) : undefined;
    if (!me || !selected_profile_id || !preference_type) {
      return HttpResponse.json({ detail: 'Missing fields' }, { status: 400 });
    }
    const rec: PreferenceSelection = {
      user_id: me.user_id,
      selected_profile_id: String(selected_profile_id),
      preference_type: preference_type === 'real' ? 'real' : 'fake',
      selected_at: new Date().toISOString(),
    };
    __store.selections.set(me.user_id, rec);
    return HttpResponse.json({ success: true, message: 'Preference selection saved' });
  }),

  // GET /preferences/profiles/:clerk_id
  http.get(`${base}preferences/profiles/:clerk_id`, async () => {
    // Return up to 4: prefer real users, then fill with fakes
    const real = [...__store.users.values()].slice(0, 4).map((p) => ({
      profile_id: p.user_id,
      anonymous_handle: p.anonymous_handle,
      country_code: p.country_code,
      bio: p.bio,
      interests: p.interests,
      age_range: p.age_range,
      primary_language: p.primary_language,
      favorite_local_fact: p.favorite_local_fact,
      is_real: true,
    }));

    const need = Math.max(0, 4 - real.length);
    const fakes = __store.fakeUsers.slice(0, need).map((p) => ({
      profile_id: p.user_id,
      anonymous_handle: p.anonymous_handle,
      country_code: p.country_code,
      bio: p.bio,
      interests: p.interests,
      age_range: p.age_range,
      primary_language: p.primary_language,
      favorite_local_fact: p.favorite_local_fact,
      is_real: false,
    }));

    return HttpResponse.json([...real, ...fakes]);
  }),
];

// Compatibility alias for tests that import `handlers`
