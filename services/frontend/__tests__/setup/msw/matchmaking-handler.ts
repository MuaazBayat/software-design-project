// msw-handlers.penpal-matching.ts
// Mock Service Worker handlers for the PenPal Matchmaking API
// Mirrors the FastAPI endpoints defined in your backend (see main.py)
// Patterns replicated: in-memory Map DB, resetDb(), realistic logic, correct HttpResponse codes,
// TypeScript model types, and a single exported `handlers` array.

import { http, HttpResponse } from 'msw';

// -----------------------------
// Types (mirroring backend models)
// -----------------------------
export type UUID = string;
export type ISODate = string;

export type MatchStatusEnum = 'active' | 'completed' | 'expired';
export type CorrespondenceEnum = 'long-term' | 'one-time' | 'either';

export type UserProfile = {
  user_id: string;
  clerk_id?: string; // only for internal mapping in mock; filtered out in responses
  anonymous_handle: string;
  bio?: string | null;
  age_range?: string | null; // e.g., "18-25", "26-35", "36-45", "46+"
  primary_language?: string | null; // ISO (en, ja, es...)
  secondary_languages?: string[];
  time_zone?: string | null; // e.g., "UTC+02:00"
  country_code?: string | null; // e.g., "ZA"
  interests?: string[];
  favorite_local_fact?: string | null;
  preferred_correspondence_type?: 'email' | 'chat' | 'either' | null; // backend maps long-term->email, one-time->chat
  last_active?: ISODate | null;
  cultural_completeness_score?: number | null; // 0..1
  account_status?: 'active' | 'inactive' | 'banned' | 'suspended' | string;
};

export type MatchingPreferences = {
  match_type: CorrespondenceEnum; // 'either' | 'long-term' | 'one-time'
  languages: string[];
  age_ranges: string[];
  country_codes: string[];
  interests: string[];
  exclude_previous: boolean;
  max_timezone_difference?: number | null; // hours
};

export type MatchDecisionRequest = {
  clerk_id: string;
  accept: boolean;
  suggested_user_id?: string | null;
  preferences?: MatchingPreferences;
};

export type MatchResponse = {
  match_id: string; // empty when rejected
  thread_id: string; // empty when rejected
  penpal_profile: UserProfile;
  match_type: string; // echo from profile.preferred_correspondence_type or 'either'
  compatibility_score: number; // 0..1 rounded to 2 decimals
  created_at: ISODate;
};

export type DailyStatsResponse = {
  matches_used: number;
  matches_remaining: number;
  total_daily_limit: number;
  reset_time: ISODate;
};

export type PreferenceSelection = {
  clerk_id: string;
  selected_profile_id: string;
  preference_type: 'real' | 'fake';
};

export type PreferenceProfile = {
  profile_id: string;
  anonymous_handle: string;
  country_code?: string | null;
  bio?: string | null;
  interests?: string[] | null;
  age_range?: string | null;
  primary_language?: string | null;
  favorite_local_fact?: string | null;
  is_real: boolean;
};

// ---------------------------------
// In-memory DB (Maps + seed data)
// ---------------------------------
const db = {
  profiles: new Map<string, UserProfile>(), // user_id -> profile
  clerkIndex: new Map<string, string>(), // clerk_id -> user_id
  passed: new Map<string, Set<string>>(), // user_id -> Set<passed_user_id>
  matches: new Map<string, { match_id: UUID; user_1_id: string; user_2_id: string; match_type: string; compatibility_score: number; conversation_thread_id: UUID; status: MatchStatusEnum; created_at: ISODate }>(),
  preferenceSelections: new Map<string, { user_id: string; selected_profile_id: string; preference_type: 'real'|'fake'; selected_at: ISODate }>(),
  fakeProfiles: [
    { profile_id: 'fake-1', anonymous_handle: 'Elara', country_code: 'JP', bio: 'Lover of traditional arts, matcha, and quiet temples.', interests: ['Art','Tea','Nature'], age_range: '25-34', primary_language: 'ja', favorite_local_fact: 'Kyoto was the imperial capital for 1,000+ years.', is_real: false },
    { profile_id: 'fake-2', anonymous_handle: 'Javier', country_code: 'AR', bio: 'Tango, football, and asado!', interests: ['Dancing','Food','Music'], age_range: '30-39', primary_language: 'es', favorite_local_fact: 'Buenos Aires means “good airs”.', is_real: false },
    { profile_id: 'fake-3', anonymous_handle: 'Amina', country_code: 'MA', bio: 'Colors of the souk and storytelling.', interests: ['Cooking','History','Photography'], age_range: '28-37', primary_language: 'ar', favorite_local_fact: "Marrakech is the 'Red City'.", is_real: false },
    { profile_id: 'fake-4', anonymous_handle: 'Liam', country_code: 'IE', bio: 'Folk music and ancient myths.', interests: ['Music','Reading','Hiking'], age_range: '32-41', primary_language: 'en', favorite_local_fact: 'Dublin was founded by Vikings.', is_real: false },
  ] as PreferenceProfile[],
};

function seedProfiles() {
  db.profiles.clear();
  db.clerkIndex.clear();

  const now = new Date().toISOString();
  const seed: UserProfile[] = [
    { user_id: 'u_alice', clerk_id: 'clerk_alice', anonymous_handle: 'Alice', country_code: 'ZA', bio: 'Hello from Joburg!', interests: ['Art','Tea','Music'], age_range: '18-25', primary_language: 'en', secondary_languages: ['af'], time_zone: 'UTC+02:00', favorite_local_fact: 'Highveld thunderstorms!', preferred_correspondence_type: 'email', last_active: now, cultural_completeness_score: 0.9, account_status: 'active' },
    { user_id: 'u_bob', clerk_id: 'clerk_bob', anonymous_handle: 'Bobby', country_code: 'JP', bio: 'Kansai local.', interests: ['Food','Music','Gaming'], age_range: '26-35', primary_language: 'ja', secondary_languages: ['en'], time_zone: 'UTC+09:00', favorite_local_fact: 'Takoyaki!', preferred_correspondence_type: 'chat', last_active: now, cultural_completeness_score: 0.7, account_status: 'active' },
    { user_id: 'u_cara', clerk_id: 'clerk_cara', anonymous_handle: 'Cara', country_code: 'IE', bio: 'Rainy days reader.', interests: ['Reading','Hiking','Music'], age_range: '26-35', primary_language: 'en', secondary_languages: ['ga'], time_zone: 'UTC+00:00', favorite_local_fact: 'Giants Causeway', preferred_correspondence_type: 'either', last_active: now, cultural_completeness_score: 0.6, account_status: 'active' },
    { user_id: 'u_dave', clerk_id: 'clerk_dave', anonymous_handle: 'Dave', country_code: 'AR', bio: 'Fútbol y asado.', interests: ['Dancing','Football','Food'], age_range: '26-35', primary_language: 'es', secondary_languages: ['en'], time_zone: 'UTC-03:00', favorite_local_fact: 'Mate!', preferred_correspondence_type: 'email', last_active: now, cultural_completeness_score: 0.5, account_status: 'active' },
    { user_id: 'u_erin', clerk_id: 'clerk_erin', anonymous_handle: 'Erin', country_code: 'MA', bio: 'Souk photographer.', interests: ['Photography','History','Cooking'], age_range: '26-35', primary_language: 'fr', secondary_languages: ['ar','en'], time_zone: 'UTC+01:00', favorite_local_fact: 'Atlas mountains', preferred_correspondence_type: 'chat', last_active: now, cultural_completeness_score: 0.8, account_status: 'active' },
  ];

  for (const p of seed) {
    db.profiles.set(p.user_id, p);
    if (p.clerk_id) db.clerkIndex.set(p.clerk_id, p.user_id);
  }

  db.passed.clear();
  db.matches.clear();
  db.preferenceSelections.clear();
}

seedProfiles();

// ---------------------------------
// Test helper to reset state
// ---------------------------------
export function resetMatchmakingDb() {
  seedProfiles();
}

// ---------------------------------
// Utilities
// ---------------------------------
function cleanProfile(p: UserProfile): UserProfile {
  // Remove sensitive/internal fields
  const { clerk_id, ...rest } = p;
  // Normalize arrays
  return {
    ...rest,
    interests: rest.interests ?? [],
    secondary_languages: rest.secondary_languages ?? [],
  };
}

function parseTimezoneOffset(tz?: string | null): number {
  if (!tz || !tz.startsWith('UTC')) return 0;
  try {
    const sign = tz.includes('+') ? 1 : -1;
    const [h, m = '0'] = tz.replace('UTC', '').replace('+', '').replace('-', '').split(':');
    return sign * (parseInt(h || '0', 10) + parseInt(m || '0', 10) / 60);
  } catch {
    return 0;
  }
}

function compatibilityScore(a: UserProfile, b: UserProfile, prefs: MatchingPreferences): number {
  // Mirrors backend logic weights (approx.): languages 0.35, interests 0.30, age 0.15, diversity 0.10, completeness 0.10
  let score = 0;
  let max = 0;

  // Languages (0.35)
  const langsA = [a.primary_language, ...(a.secondary_languages ?? [])].filter(Boolean).map((x) => String(x).toLowerCase());
  const langsB = [b.primary_language, ...(b.secondary_languages ?? [])].filter(Boolean).map((x) => String(x).toLowerCase());
  if (langsA.length && langsB.length) {
    const common = new Set(langsA.filter((l) => langsB.includes(l)));
    if (common.size) {
      if ((a.primary_language ?? '').toLowerCase() === (b.primary_language ?? '').toLowerCase()) {
        score += 0.25;
      } else {
        score += 0.15;
      }
      if (common.size > 1) score += 0.1;
    }
    if (prefs.languages?.length) {
      const prefLangs = prefs.languages.map((l) => l.toLowerCase());
      if (langsB.some((l) => prefLangs.includes(l))) score += 0.1;
    }
  }
  max += 0.35;

  // Interests (0.30)
  const iA = (a.interests ?? []).map((x) => x.toLowerCase());
  const iB = (b.interests ?? []).map((x) => x.toLowerCase());
  if (iA.length && iB.length) {
    const common = new Set(iA.filter((i) => iB.includes(i)));
    const ratio = common.size / Math.max(iA.length, iB.length, 1);
    score += ratio * 0.2;
    if (common.size >= 2) score += 0.1;
    if (prefs.interests?.length) {
      const prefI = prefs.interests.map((x) => x.toLowerCase());
      if (iB.some((i) => prefI.includes(i))) score += 0.05;
    }
  }
  max += 0.3;

  // Age (0.15)
  const bands = ['18-25','26-35','36-45','46+'];
  const aIdx = bands.indexOf(a.age_range ?? '');
  const bIdx = bands.indexOf(b.age_range ?? '');
  if (aIdx !== -1 && bIdx !== -1) {
    if (aIdx === bIdx) score += 0.15;
    else if (Math.abs(aIdx - bIdx) === 1) score += 0.08;
    else if (Math.abs(aIdx - bIdx) === 2) score += 0.03;
  }
  max += 0.15;

  // Cultural diversity (0.10)
  if (a.country_code && b.country_code && a.country_code !== b.country_code) score += 0.1;
  max += 0.1;

  // Completeness (0.10)
  const comp = b.cultural_completeness_score ?? 0;
  score += 0.1 * comp;
  max += 0.1;

  return Math.min(max > 0 ? score / max : 0, 1);
}

function prioritizeByFilters(candidates: UserProfile[], user: UserProfile, prefs: MatchingPreferences): UserProfile[] {
  const filtered: UserProfile[] = [];
  const others: UserProfile[] = [];

  for (const p of candidates) {
    let ok = true;

    if (prefs.languages?.length) {
      const langs = [p.primary_language, ...(p.secondary_languages ?? [])].filter(Boolean).map((x) => String(x).toLowerCase());
      const pref = prefs.languages.map((l) => l.toLowerCase());
      if (!langs.some((l) => pref.includes(l))) ok = false;
    }

    if (ok && prefs.age_ranges?.length) {
      if (!prefs.age_ranges.includes(p.age_range ?? '')) ok = false;
    }

    if (ok && prefs.country_codes?.length) {
      if (!prefs.country_codes.includes(p.country_code ?? '')) ok = false;
    }

    if (ok && prefs.interests?.length) {
      const ints = (p.interests ?? []).map((x) => x.toLowerCase());
      const prefI = prefs.interests.map((x) => x.toLowerCase());
      if (!ints.some((i) => prefI.includes(i))) ok = false;
    }

    if (ok && prefs.match_type && prefs.match_type !== 'either') {
      const backendMatchType = prefs.match_type === 'long-term' ? 'email' : prefs.match_type === 'one-time' ? 'chat' : 'either';
      if ((p.preferred_correspondence_type ?? 'either') !== backendMatchType) ok = false;
    }

    (ok ? filtered : others).push(p);
  }

  return [...filtered, ...others];
}

function timezoneFilter(candidates: UserProfile[], user: UserProfile, maxDiff?: number | null): UserProfile[] {
  if (!maxDiff || !user.time_zone) return candidates;
  const u = parseTimezoneOffset(user.time_zone);
  return candidates.filter((p) => Math.abs(u - parseTimezoneOffset(p.time_zone)) <= maxDiff);
}

function getUserByClerkId(clerk_id: string): UserProfile | undefined {
  const uid = db.clerkIndex.get(clerk_id);
  return uid ? db.profiles.get(uid) : undefined;
}

function getDailyStats(userId: string): DailyStatsResponse {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const used = Array.from(db.matches.values()).filter((m) => (m.user_1_id === userId || m.user_2_id === userId) && new Date(m.created_at) >= start).length;
  const total = 5;
  const reset = new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString();
  return { matches_used: used, matches_remaining: Math.max(0, total - used), total_daily_limit: total, reset_time: reset };
}

function getPreviousMatches(userId: string): string[] {
  const result: string[] = [];
  for (const m of db.matches.values()) {
    if (m.user_1_id === userId) result.push(m.user_2_id);
    else if (m.user_2_id === userId) result.push(m.user_1_id);
  }
  return result;
}

function getPassedUsers(userId: string): Set<string> {
  if (!db.passed.has(userId)) db.passed.set(userId, new Set<string>());
  return db.passed.get(userId)!;
}

function shouldResetPassed(userId: string, avail: UserProfile[]): boolean {
  if (!avail.length) return false;
  const passed = getPassedUsers(userId);
  const availIds = new Set(avail.map((p) => p.user_id));
  const unpassedCount = Array.from(availIds).filter((id) => !passed.has(id)).length;
  return unpassedCount === 0;
}

function asNumber(v: string | null, def = 0) { const n = Number(v ?? ''); return Number.isFinite(n) ? n : def; }

function pickTopProfiles(user: UserProfile, candidates: UserProfile[], prefs: MatchingPreferences, limit: number): UserProfile[] {
  // Prioritize by filters then score
  const prioritized = prioritizeByFilters(candidates, user, prefs);
  const scored = prioritized.map((p, idx) => ({ p, s: compatibilityScore(user, p, prefs) + (idx < Math.ceil(prioritized.length/2) ? 0.2 : 0) }));
  scored.sort((a, b) => (b.s + Math.random()*0.05) - (a.s + Math.random()*0.05));
  return scored.slice(0, Math.max(1, limit)).map((x) => x.p);
}

function toBackendMatchType(pref: CorrespondenceEnum): 'email' | 'chat' | 'either' {
  if (pref === 'long-term') return 'email';
  if (pref === 'one-time') return 'chat';
  return 'either';
}

// ---------------------------------
// Handlers
// ---------------------------------
export const matchmakingHandlers = [
  // GET /health
  http.get('/health', () => {
    return HttpResponse.json({ status: 'healthy', timestamp: new Date().toISOString(), version: 'mock-1.0.0' }, { status: 200 });
  }),

  // GET /user/profile/:clerk_id
  http.get('/user/profile/:clerk_id', ({ params }) => {
    const { clerk_id } = params as { clerk_id: string };
    const user = getUserByClerkId(clerk_id);
    if (!user) return HttpResponse.json({ detail: `User not found for clerk_id: ${clerk_id}` }, { status: 404 });
    return HttpResponse.json({ profile: cleanProfile(user) }, { status: 200 });
  }),

  // GET /user/stats/:clerk_id
  http.get('/user/stats/:clerk_id', ({ params }) => {
    const { clerk_id } = params as { clerk_id: string };
    const user = getUserByClerkId(clerk_id);
    if (!user) return HttpResponse.json({ detail: `User not found for clerk_id: ${clerk_id}` }, { status: 404 });
    const stats = getDailyStats(user.user_id);
    return HttpResponse.json(stats, { status: 200 });
  }),

  // POST /profiles/pass
  http.post('/profiles/pass', async ({ request }) => {
    const body = (await request.json()) as { clerk_id?: string; passed_user_id?: string };
    if (!body?.clerk_id || !body?.passed_user_id) return HttpResponse.json({ detail: 'Missing clerk_id or passed_user_id' }, { status: 400 });
    const me = getUserByClerkId(body.clerk_id);
    if (!me) return HttpResponse.json({ detail: `User not found for clerk_id: ${body.clerk_id}` }, { status: 404 });

    if (!db.profiles.has(body.passed_user_id)) return HttpResponse.json({ detail: 'Passed user not found' }, { status: 404 });

    const set = getPassedUsers(me.user_id);
    set.add(body.passed_user_id);
    return HttpResponse.json({ success: true, message: 'Profile pass recorded' }, { status: 200 });
  }),

  // GET /profiles/suggestions/:clerk_id
  http.get('/profiles/suggestions/:clerk_id', ({ request, params }) => {
    const { clerk_id } = params as { clerk_id: string };
    const user = getUserByClerkId(clerk_id);
    if (!user) return HttpResponse.json({ detail: `User not found for clerk_id: ${clerk_id}` }, { status: 404 });

    const url = new URL(request.url);
    const limit = Math.min(Math.max(asNumber(url.searchParams.get('limit'), 1), 1), 50);
    const languages = (url.searchParams.get('languages') || '').split(',').filter(Boolean);
    const age_ranges = (url.searchParams.get('age_ranges') || '').split(',').filter(Boolean);
    const interests = (url.searchParams.get('interests') || '').split(',').filter(Boolean);
    const match_type = (url.searchParams.get('match_type') || 'either') as CorrespondenceEnum;

    const basePrefs: MatchingPreferences = {
      match_type,
      languages,
      age_ranges,
      interests,
      country_codes: [],
      exclude_previous: true,
      max_timezone_difference: null,
    };

    // All active profiles except self
    let candidates = Array.from(db.profiles.values()).filter((p) => p.user_id !== user.user_id && (p.account_status ?? 'active') === 'active');
    if (!candidates.length) return HttpResponse.json({ detail: 'No profiles available' }, { status: 404 });

    // Exclude previous matches
    const prev = new Set(getPreviousMatches(user.user_id));
    candidates = candidates.filter((p) => !prev.has(p.user_id));
    if (!candidates.length) return HttpResponse.json({ detail: 'No new profiles available' }, { status: 404 });

    // Passed logic & reset
    if (shouldResetPassed(user.user_id, candidates)) {
      getPassedUsers(user.user_id).clear();
    }
    const passed = getPassedUsers(user.user_id);
    candidates = candidates.filter((p) => !passed.has(p.user_id));
    if (!candidates.length) candidates = Array.from(db.profiles.values()).filter((p) => p.user_id !== user.user_id);

    const picked = pickTopProfiles(user, candidates, basePrefs, limit);
    if (!picked.length) return HttpResponse.json({ detail: 'No compatible profiles found' }, { status: 404 });

    return HttpResponse.json(picked.map(cleanProfile), { status: 200 });
  }),

  // POST /matches/find
  http.post('/matches/find', async ({ request }) => {
    const body = (await request.json()) as MatchDecisionRequest;
    const { clerk_id, accept, suggested_user_id } = body;
    const prefs: MatchingPreferences = body.preferences ?? { match_type: 'either', languages: [], age_ranges: [], country_codes: [], interests: [], exclude_previous: true, max_timezone_difference: 6 };

    const me = getUserByClerkId(clerk_id);
    if (!me) return HttpResponse.json({ detail: `User not found for clerk_id: ${clerk_id}` }, { status: 404 });

    if (accept) {
      const stats = getDailyStats(me.user_id);
      if (stats.matches_remaining <= 0) return HttpResponse.json({ detail: 'Daily match limit exceeded' }, { status: 400 });
    }

    // Build candidate pool
    let candidates = Array.from(db.profiles.values()).filter((p) => p.user_id !== me.user_id && (p.account_status ?? 'active') === 'active');

    if (prefs.max_timezone_difference && me.time_zone) {
      candidates = timezoneFilter(candidates, me, prefs.max_timezone_difference);
    }

    if (prefs.exclude_previous) {
      const prev = new Set(getPreviousMatches(me.user_id));
      candidates = candidates.filter((p) => !prev.has(p.user_id));
      if (!candidates.length) return HttpResponse.json({ detail: 'No new profiles available matching your preferences' }, { status: 404 });
    }

    const passed = getPassedUsers(me.user_id);
    if (shouldResetPassed(me.user_id, candidates)) passed.clear();
    candidates = candidates.filter((p) => !passed.has(p.user_id));
    if (!candidates.length) candidates = Array.from(db.profiles.values()).filter((p) => p.user_id !== me.user_id);

    // If suggested_user_id present and exists, prefer it
    let selected: UserProfile | undefined;
    if (suggested_user_id && db.profiles.has(suggested_user_id)) {
      selected = db.profiles.get(suggested_user_id)!;
    }

    if (!selected) {
      const top = pickTopProfiles(me, candidates, prefs, 1);
      if (!top.length) return HttpResponse.json({ detail: 'No compatible profiles found' }, { status: 404 });
      selected = top[0];
    }

    const score = compatibilityScore(me, selected, prefs);
    const createdAt = new Date().toISOString();

    if (accept) {
      const match_id = cryptoRandomId();
      const thread_id = cryptoRandomId();
      db.matches.set(match_id, {
        match_id,
        user_1_id: me.user_id,
        user_2_id: selected.user_id,
        match_type: selected.preferred_correspondence_type ?? 'either',
        compatibility_score: score,
        conversation_thread_id: thread_id,
        status: 'active',
        created_at: createdAt,
      });

      const resp: MatchResponse = {
        match_id,
        thread_id,
        penpal_profile: cleanProfile(selected),
        match_type: selected.preferred_correspondence_type ?? 'either',
        compatibility_score: Math.round(score * 100) / 100,
        created_at: createdAt,
      };
      return HttpResponse.json(resp, { status: 200 });
    }

    // Reject path: record pass
    passed.add(selected.user_id);
    const resp: MatchResponse = {
      match_id: '',
      thread_id: '',
      penpal_profile: cleanProfile(selected),
      match_type: selected.preferred_correspondence_type ?? 'either',
      compatibility_score: Math.round(score * 100) / 100,
      created_at: createdAt,
    };
    return HttpResponse.json(resp, { status: 200 });
  }),

  // POST /preferences/select
  http.post('/preferences/select', async ({ request }) => {
    const sel = (await request.json()) as PreferenceSelection;
    const me = getUserByClerkId(sel.clerk_id);
    if (!me) return HttpResponse.json({ detail: `User not found for clerk_id: ${sel.clerk_id}` }, { status: 404 });

    const record = { user_id: me.user_id, selected_profile_id: sel.selected_profile_id, preference_type: sel.preference_type, selected_at: new Date().toISOString() };
    db.preferenceSelections.set(me.user_id, record);
    return HttpResponse.json({ success: true, message: 'Preference selection saved' }, { status: 200 });
  }),

  // GET /preferences/profiles/:clerk_id
  http.get('/preferences/profiles/:clerk_id', ({ params }) => {
    const { clerk_id } = params as { clerk_id: string };
    const me = getUserByClerkId(clerk_id);
    if (!me) return HttpResponse.json({ detail: `User not found for clerk_id: ${clerk_id}` }, { status: 404 });

    const real = Array.from(db.profiles.values())
      .filter((p) => (p.account_status ?? 'active') === 'active' && p.user_id !== me.user_id)
      .slice(0, 4)
      .map<PreferenceProfile>((p) => ({
        profile_id: p.user_id,
        anonymous_handle: p.anonymous_handle,
        country_code: p.country_code ?? null,
        bio: p.bio ?? null,
        interests: p.interests ?? [],
        age_range: p.age_range ?? null,
        primary_language: p.primary_language ?? null,
        favorite_local_fact: p.favorite_local_fact ?? null,
        is_real: true,
      }));

    const need = Math.max(0, 4 - real.length);
    const fake = need > 0 ? db.fakeProfiles.slice(0, need) : [];

    const result = [...real, ...fake];
    return HttpResponse.json(result, { status: 200 });
  }),
];

// ---------------------------------
// Small helper to make a random id (Node 18+ has crypto.randomUUID)
// ---------------------------------
function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as any).randomUUID();
  // fallback
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
