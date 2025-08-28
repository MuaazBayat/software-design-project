"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { User2, MessageSquareHeart } from "lucide-react";

// ===== Types that match your FastAPI models =====
export type ProfileModel = {
  anonymous_handle?: string | null;
  age_range?: string | null; // DB expects hyphen buckets, e.g. "26-35"
  primary_language?: string | null; // DB expects ISO code, e.g. "fr"
  secondary_languages?: string[] | null; // array of ISO codes
  time_zone?: string | null;
  country_code?: string | null; // ISO-3166 alpha‑2
  bio?: string | null;
  interests?: string[] | null;
};

// ----- helpers -----
function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <div>
        <Label className="text-[0.9rem] text-stone-800">{label}</Label>
        {hint ? <p className="text-xs text-stone-500 mt-1 leading-snug">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Chip({ text, onRemove }: { text: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
      {text}
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 inline-flex rounded-full p-0.5 opacity-60 hover:opacity-100 focus:outline-none"
        aria-label={`Remove ${text}`}
      >
        ×
      </button>
    </span>
  );
}


const API_BASE = process.env.NEXT_PUBLIC_CORE_API_BASE_URL; 
async function apiGetProfile(clerkId: string): Promise<ProfileModel | null> {
  const res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(clerkId)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET failed: ${res.status}`);
  return (await res.json()) as ProfileModel;
}

async function apiUpdateProfile(
  clerkId: string,
  patch: Partial<ProfileModel>
): Promise<ProfileModel> {
  const res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(clerkId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`PUT failed: ${res.status} ${detail}`);
  }
  return (await res.json()) as ProfileModel;
}

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

// Direct select values — EXACTLY what the DB expects
const AGE_BUCKETS = [
  "13-17",
  "18-25",
  "26-35",
  "36-45",
  "46-55",
  "56-65",
  "66+",
  "prefer-not",
] as const;

const LANG = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "ar", label: "Arabic" },
  { code: "sw", label: "Swahili" },
  { code: "hi", label: "Hindi" },
  { code: "bn", label: "Bengali" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
] as const;

// ===== Component =====
export default function SettingsPage_ModelOnly_API_Handle({ clerkId }: { clerkId?: string }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const resolvedClerkId = React.useMemo(() => clerkId ?? (user?.id ?? ""), [clerkId, user?.id]);

  // Model fields
  const [handle, setHandle] = React.useState("");
  const [countryCode, setCountryCode] = React.useState<string | undefined>();
  const [ageRange, setAgeRange] = React.useState<string | undefined>();
  const [bio, setBio] = React.useState<string>("");
  const [interests, setInterests] = React.useState<string[]>([]);
  const [interestInput, setInterestInput] = React.useState("");

  const [primaryLanguage, setPrimaryLanguage] = React.useState<string | undefined>(); // ISO code
  const [secondaryLanguages, setSecondaryLanguages] = React.useState<string[]>([]); // ISO codes
  const [secondaryLangInput, setSecondaryLangInput] = React.useState(""); // expect ISO code or label; send raw value
  const [timeZone, setTimeZone] = React.useState<string | undefined>();

  // fetch state
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const originalRef = React.useRef<ProfileModel | null>(null);

  // Hydrate from GET once Clerk is loaded and we have an id
  React.useEffect(() => {
    if (!isLoaded || !resolvedClerkId) return;
    let alive = true;
    setLoading(true);
    setError(null);
    apiGetProfile(resolvedClerkId)
      .then((data) => {
        if (!alive) return;
        if (!data) {
          originalRef.current = {
            anonymous_handle: null,
            age_range: null,
            primary_language: null,
            secondary_languages: [],
            time_zone: null,
            country_code: null,
            bio: "",
            interests: [],
          };
          return;
        }
        const model: ProfileModel = {
          anonymous_handle: data.anonymous_handle ?? null,
          age_range: data.age_range ?? null,
          primary_language: data.primary_language ?? null,
          secondary_languages: data.secondary_languages ?? [],
          time_zone: data.time_zone ?? null,
          country_code: data.country_code ?? null,
          bio: data.bio ?? "",
          interests: data.interests ?? [],
        };
        originalRef.current = model;
        setHandle((model.anonymous_handle ?? "") as string);
        setAgeRange(model.age_range ?? undefined);
        setPrimaryLanguage(model.primary_language ?? undefined);
        setSecondaryLanguages(model.secondary_languages ?? []);
        setTimeZone(model.time_zone ?? undefined);
        setCountryCode(model.country_code ?? undefined);
        setBio((model.bio ?? "") as string);
        setInterests(model.interests ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, [isLoaded, resolvedClerkId]);

function buildPatch(): Partial<ProfileModel> {
  const orig = (originalRef.current ?? {}) as ProfileModel;
  const patch: Partial<ProfileModel> = {};

  const curr: ProfileModel = {
    // include anonymous_handle line if this page has it:
    // anonymous_handle: handle || null,
    age_range: ageRange ?? null,
    primary_language: primaryLanguage ?? null,
    secondary_languages: secondaryLanguages,
    time_zone: timeZone ?? null,
    country_code: countryCode ?? null,
    bio: bio || null,
    interests,
  };

  const isEqual = <T,>(a: T, b: T) =>
    Array.isArray(a) && Array.isArray(b)
      ? a.length === b.length && a.every((v, i) => v === b[i])
      : a === b;

  const setIfChanged = <K extends keyof ProfileModel>(key: K) => {
    const a = curr[key];
    const b = orig[key];
    if (!isEqual(a, b)) {
      patch[key] = a; // type-safe: patch[K] is ProfileModel[K] | undefined
    }
  };

  (Object.keys(curr) as (keyof ProfileModel)[]).forEach((k) => setIfChanged(k));
  return patch;
}



  async function onSave() {
    const id = resolvedClerkId;
    if (!id) {
      alert("Missing clerkId — sign in or pass it as a prop.");
      return;
    }
    if (handle && !HANDLE_RE.test(handle)) {
      alert("Handle must be 3–20 chars: lowercase letters, numbers, underscores.");
      return;
    }
    const patch = buildPatch();
    if (Object.keys(patch).length === 0) {
      alert("No changes to save.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await apiUpdateProfile(id, patch);
      originalRef.current = {
        anonymous_handle: updated.anonymous_handle ?? null,
        age_range: updated.age_range ?? null,
        primary_language: updated.primary_language ?? null,
        secondary_languages: updated.secondary_languages ?? [],
        time_zone: updated.time_zone ?? null,
        country_code: updated.country_code ?? null,
        bio: updated.bio ?? "",
        interests: updated.interests ?? [],
      };
      alert("Saved changes.");
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  setError(msg);
}finally {
      setSaving(false);
    }
  }

  // Render guards for Clerk state
  if (!isLoaded) {
    return <div className="min-h-screen grid place-items-center text-stone-600">Loading account…</div>;
  }
  if (!isSignedIn && !clerkId) {
    return <div className="min-h-screen grid place-items-center text-stone-700">Please sign in to view your settings.</div>;
  }

  // UI
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#faf6ed,#f3eadc)]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-serif tracking-tight text-amber-900">Your Settings</h1>
          <p className="mt-1 text-sm text-stone-600">Fields match the backend model. Data loads via GET.</p>
          {error && <p className="mt-2 text-sm text-red-600 whitespace-pre-wrap">{error}</p>}
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-2 border bg-amber-50/60 text-stone-700">
            <TabsTrigger value="profile" className="data-[state=active]:bg-white">
              <User2 className="mr-2 h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="language" className="data-[state=active]:bg-white">
              <MessageSquareHeart className="mr-2 h-4 w-4" /> Languages & Time
            </TabsTrigger>
          </TabsList>

          {/* PROFILE TAB */}
          <TabsContent value="profile" className="mt-4">
            <Card className="border-amber-200/70 shadow-sm">
              <CardHeader>
                <CardTitle className="text-stone-800">Profile</CardTitle>
                <CardDescription>Handle, country, age, bio, interests.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                {/* Anonymous handle */}
                <div className="grid gap-2">
                  <Label htmlFor="handle" className="text-[0.9rem] text-stone-800">Anonymous handle</Label>
                  <div className="relative max-w-md">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">@</span>
                    <Input
                      id="handle"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20))}
                      placeholder="your_handle"
                      className="pl-7 bg-white"
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-stone-500">3–20 chars; lowercase letters, numbers, underscores.</p>
                  {handle && !HANDLE_RE.test(handle) && (
                    <p className="text-xs text-red-600">Invalid handle format.</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldRow label="Country code" hint="Used for culture & matching hints.">
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="ZA">South Africa (ZA)</SelectItem>
                        <SelectItem value="US">United States (US)</SelectItem>
                        <SelectItem value="GB">United Kingdom (GB)</SelectItem>
                        <SelectItem value="DE">Germany (DE)</SelectItem>
                        <SelectItem value="FR">France (FR)</SelectItem>
                        <SelectItem value="NG">Nigeria (NG)</SelectItem>
                        <SelectItem value="IN">India (IN)</SelectItem>
                        <SelectItem value="JP">Japan (JP)</SelectItem>
                        <SelectItem value="BR">Brazil (BR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Age range" hint="Used only for matching; not public.">
                    <Select value={ageRange} onValueChange={setAgeRange}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select age range" /></SelectTrigger>
                      <SelectContent>
                        {AGE_BUCKETS.map((v) => (
                          <SelectItem key={v} value={v}>{v === "prefer-not" ? "Prefer not to say" : v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>
                </div>

                <FieldRow label="Bio">
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell people about yourself…"
                    className="bg-white min-h-[90px]"
                  />
                </FieldRow>

                <FieldRow label="Interests" hint="Type and press Enter to add.">
                  <div className="grid gap-2">
                    {interests.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {interests.map((i) => (
                          <Chip key={i} text={i} onRemove={() => setInterests((prev) => prev.filter((x) => x !== i))} />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 max-w-md">
                      <Input
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const v = interestInput.trim();
                            if (v) {
                              setInterests((prev) => (prev.includes(v) ? prev : [...prev, v]));
                              setInterestInput("");
                            }
                          }
                        }}
                        placeholder="e.g. hiking, anime, cooking"
                        className="bg-white"
                      />
                      <Button type="button" variant="secondary" onClick={() => {
                        const v = interestInput.trim();
                        if (v) {
                          setInterests((prev) => (prev.includes(v) ? prev : [...prev, v]));
                          setInterestInput("");
                        }
                      }}>Add</Button>
                    </div>
                  </div>
                </FieldRow>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <div className="text-xs text-stone-500">{loading ? "Loading…" : saving ? "Saving…" : ""}</div>
                <Button onClick={onSave} disabled={saving || (handle !== "" && !HANDLE_RE.test(handle))} className="bg-amber-700 hover:bg-amber-800">Save Changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* LANGUAGES & TIME TAB */}
          <TabsContent value="language" className="mt-4">
            <Card className="border-amber-200/70 shadow-sm">
              <CardHeader>
                <CardTitle className="text-stone-800">Languages & Time</CardTitle>
                <CardDescription>Primary/secondary languages and your time zone.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldRow label="Primary language">
                    <Select value={primaryLanguage} onValueChange={setPrimaryLanguage}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select language" /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {LANG.map(({ code, label }) => (
                          <SelectItem key={code} value={code}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Time zone" hint="IANA time zone">
                    <Select value={timeZone} onValueChange={setTimeZone}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select time zone" /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (UTC+2)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (UTC±0/±1)</SelectItem>
                        <SelectItem value="Europe/Paris">Europe/Paris (UTC+1/+2)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (UTC−5/−4)</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los_Angeles (UTC−8/−7)</SelectItem>
                        <SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</SelectItem>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                </div>

                <FieldRow label="Secondary languages" hint="Add ISO codes (e.g. ja, fr). Type and press Enter.">
                  <div className="grid gap-2">
                    {secondaryLanguages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {secondaryLanguages.map((code) => (
                          <Chip key={code} text={code} onRemove={() => setSecondaryLanguages((prev) => prev.filter((x) => x !== code))} />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 max-w-md">
                      <Input
                        value={secondaryLangInput}
                        onChange={(e) => setSecondaryLangInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const v = secondaryLangInput.trim();
                            if (v) {
                              setSecondaryLanguages((prev) => (prev.includes(v) ? prev : [...prev, v]));
                              setSecondaryLangInput("");
                            }
                          }
                        }}
                        placeholder="e.g. ja, fr, de"
                        className="bg-white"
                      />
                      <Button type="button" variant="secondary" onClick={() => {
                        const v = secondaryLangInput.trim();
                        if (v) {
                          setSecondaryLanguages((prev) => (prev.includes(v) ? prev : [...prev, v]));
                          setSecondaryLangInput("");
                        }
                      }}>Add</Button>
                    </div>
                  </div>
                </FieldRow>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <div className="text-xs text-stone-500">{loading ? "Loading…" : saving ? "Saving…" : ""}</div>
                <Button onClick={onSave} disabled={saving || (handle !== "" && !HANDLE_RE.test(handle))} className="bg-amber-700 hover:bg-amber-800">Save Changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
