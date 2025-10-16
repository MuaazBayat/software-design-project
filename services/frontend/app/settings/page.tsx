"use client";
import Link from "next/link";
import * as React from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
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
import {
  User2,
  MessageSquareHeart,
  ArrowLeft,
  MapPin,
  Heart,
} from "lucide-react";

// ===== Types that match your FastAPI models =====
export type ProfileModel = {
  anonymous_handle?: string | null;
  age_range?: string | null;
  primary_language?: string | null;
  secondary_languages?: string[] | null;
  time_zone?: string | null;
  country_code?: string | null;
  bio?: string | null;
  interests?: string[] | null;
  favorite_local_fact?: string | null;
  preferred_correspondence_type?: "long-term" | "one-time" | "either";
};

// ----- helpers -----
function FieldRow({
  label,
  hint,
  children,
  error,
  required = false,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  const fieldId = React.useId();
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className="grid gap-2">
      <div>
        <Label htmlFor={fieldId} className="text-[0.9rem] text-stone-800">
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-label="required">
              *
            </span>
          )}
        </Label>
        {hint && (
          <p id={hintId} className="text-xs text-stone-500 mt-1 leading-snug">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-red-600 mt-1" role="alert">
            {error}
          </p>
        )}
      </div>
      <div
        id={fieldId}
        aria-describedby={
          [hintId, errorId].filter(Boolean).join(" ") || undefined
        }
        aria-invalid={error ? "true" : undefined}
        aria-required={required ? "true" : undefined}
      >
        {children}
      </div>
    </div>
  );
}

function Chip({ text, onRemove }: { text: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
      <span aria-label={`Selected: ${text}`}>{text}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 inline-flex rounded-full p-0.5 opacity-60 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1"
        aria-label={`Remove ${text} from list`}
      >
        <span aria-hidden="true">×</span>
      </button>
    </span>
  );
}

// ===== API wiring =====
const API_BASE = process.env.NEXT_PUBLIC_CORE_URL || "";

async function apiGetProfile(
  clerkId: string,
  getToken: () => Promise<string | null>
): Promise<ProfileModel | null> {
  const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";
  const token = authDisabled ? null : await getToken();

  const res = await fetch(
    `${API_BASE}/profiles/${encodeURIComponent(clerkId)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET failed: ${res.status}`);
  return (await res.json()) as ProfileModel;
}

async function apiUpdateProfile(
  clerkId: string,
  patch: Partial<ProfileModel> | ProfileModel,
  getToken: () => Promise<string | null>
): Promise<ProfileModel> {
  const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";
  const token = authDisabled ? null : await getToken();

  const res = await fetch(
    `${API_BASE}/profiles/${encodeURIComponent(clerkId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(patch),
    }
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`PUT failed: ${res.status} ${detail}`);
  }
  return (await res.json()) as ProfileModel;
}

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

// Direct select values
const AGE_BUCKETS = ["18-25", "26-35", "36-45", "46+", "prefer-not"] as const;

const LANG = [
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "hi", label: "Hindi" },
  { code: "it", label: "Italian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "es", label: "Spanish" },
] as const;

const CORRESPONDENCE_TYPES = [
  { value: "long-term", label: "Long term" },
  { value: "one-time", label: "One Time" },
  { value: "either", label: "Either" },
] as const;

// Extended country list
const COUNTRIES = [
  { code: "ZA", name: "South Africa" },
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "BD", name: "Bangladesh" },
  { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" },
  { code: "CN", name: "China" },
  { code: "EG", name: "Egypt" },
  { code: "ET", name: "Ethiopia" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "KE", name: "Kenya" },
  { code: "MY", name: "Malaysia" },
  { code: "MX", name: "Mexico" },
  { code: "NG", name: "Nigeria" },
  { code: "PK", name: "Pakistan" },
  { code: "PH", name: "Philippines" },
  { code: "RU", name: "Russia" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "KR", name: "South Korea" },
  { code: "ES", name: "Spain" },
  { code: "TH", name: "Thailand" },
  { code: "TR", name: "Turkey" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "VN", name: "Vietnam" },
] as const;

// ===== Page Component =====
export default function Page() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const clerkId = user?.id ?? "";

  // Model fields
  const [handle, setHandle] = React.useState("");
  const [countryCode, setCountryCode] = React.useState<string | undefined>();
  const [ageRange, setAgeRange] = React.useState<string | undefined>();
  const [bio, setBio] = React.useState<string>("");
  const [interests, setInterests] = React.useState<string[]>([]);
  const [interestInput, setInterestInput] = React.useState("");
  const [favoriteLocalFact, setFavoriteLocalFact] = React.useState("");
  const [preferredCorrespondenceType, setPreferredCorrespondenceType] =
    React.useState<"long-term" | "one-time" | "either">("either");

  const [primaryLanguage, setPrimaryLanguage] = React.useState<
    string | undefined
  >();
  const [secondaryLanguages, setSecondaryLanguages] = React.useState<string[]>(
    []
  );
  const [secondaryLangInput, setSecondaryLangInput] = React.useState("");
  const [timeZone, setTimeZone] = React.useState<string | undefined>();
  const PREFER_NOT = "prefer-not" as const;

  // fetch state
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const originalRef = React.useRef<ProfileModel | null>(null);

  // Hydrate from GET once Clerk is loaded and we have an id
  React.useEffect(() => {
    if (!isLoaded || !isSignedIn || !clerkId) return;
    let alive = true;
    setLoading(true);
    setError(null);
    apiGetProfile(clerkId, getToken)
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
            favorite_local_fact: null,
            preferred_correspondence_type: "either",
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
          favorite_local_fact: data.favorite_local_fact ?? null,
          preferred_correspondence_type:
            data.preferred_correspondence_type ?? "either",
        };
        originalRef.current = model;
        setHandle((model.anonymous_handle ?? "") as string);
        setAgeRange(model.age_range ?? PREFER_NOT);
        setPrimaryLanguage(model.primary_language ?? undefined);
        setSecondaryLanguages(model.secondary_languages ?? []);
        setTimeZone(model.time_zone ?? undefined);
        setCountryCode(model.country_code ?? undefined);
        setBio((model.bio ?? "") as string);
        setInterests(model.interests ?? []);
        setFavoriteLocalFact((model.favorite_local_fact ?? "") as string);
        setPreferredCorrespondenceType(
          model.preferred_correspondence_type ?? "either"
        );
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e))
      )
      .finally(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, [isLoaded, isSignedIn, clerkId, getToken]);

  function buildFull(): ProfileModel {
    return {
      anonymous_handle: (handle || null) as string | null,
      age_range: ageRange === PREFER_NOT ? null : ageRange ?? null,
      primary_language: primaryLanguage ?? null,
      secondary_languages: secondaryLanguages,
      time_zone: timeZone ?? null,
      country_code: countryCode ?? null,
      bio: (bio || null) as string | null,
      interests,
      favorite_local_fact: favoriteLocalFact || null,
      preferred_correspondence_type: preferredCorrespondenceType,
    };
  }

  async function onSave() {
    if (!isLoaded || !isSignedIn || !clerkId) {
      toast.error("Please sign in first.");
      return;
    }
    if (handle && !HANDLE_RE.test(handle)) {
      toast.error(
        "Handle must be 3–20 chars: lowercase letters, numbers, underscores."
      );
      return;
    }

    const body = buildFull();

    setSaving(true);
    setError(null);
    try {
      const updated = await apiUpdateProfile(clerkId, body, getToken);
      originalRef.current = {
        anonymous_handle: updated.anonymous_handle ?? null,
        age_range: updated.age_range ?? null,
        primary_language: updated.primary_language ?? null,
        secondary_languages: updated.secondary_languages ?? [],
        time_zone: updated.time_zone ?? null,
        country_code: updated.country_code ?? null,
        bio: updated.bio ?? "",
        interests: updated.interests ?? [],
        favorite_local_fact: updated.favorite_local_fact ?? null,
        preferred_correspondence_type:
          updated.preferred_correspondence_type ?? "either",
      };
      toast.success("Settings saved successfully!");

      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "assertive");
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent = "Settings have been saved successfully";
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-black focus:text-white focus:rounded"
      >
        Skip to main content
      </a>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <header className="mb-6">
          <h1 className="text-2xl text-black mb-2">Your Settings</h1>
          <nav aria-label="Page navigation">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/" aria-label="Return to home page">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Return
              </Link>
            </Button>
          </nav>
          {API_BASE === "" && (
            <div role="alert" className="mt-2 text-xs text-red-600">
              Set NEXT_PUBLIC_CORE_API_BASE_URL in .env.local
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="mt-2 text-sm text-red-600 whitespace-pre-wrap"
            >
              {error}
            </div>
          )}
        </header>

        <main id="main-content">
          <Tabs defaultValue="profile">
            <TabsList
              className="grid w-full grid-cols-2 border bg-white text-black"
              role="tablist"
              aria-label="Settings sections"
            >
              <TabsTrigger
                value="profile"
                className="data-[state=active]:bg-black data-[state=active]:text-white"
                role="tab"
                aria-controls="profile-panel"
              >
                <User2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="language"
                className="data-[state=active]:bg-black data-[state=active]:text-white"
                role="tab"
                aria-controls="language-panel"
              >
                <MessageSquareHeart
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                />
                Languages & Time
              </TabsTrigger>
            </TabsList>

            {/* PROFILE TAB */}
            <TabsContent
              value="profile"
              className="mt-4"
              role="tabpanel"
              id="profile-panel"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-stone-800">Profile</CardTitle>
                  <CardDescription>
                    Handle, country, age, bio, interests, and local facts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onSave();
                    }}
                    aria-label="Profile settings form"
                  >
                    <fieldset className="grid gap-6">
                      <legend className="sr-only">Profile Information</legend>

                      {/* Anonymous handle */}
                      <FieldRow
                        label="Anonymous handle"
                        hint="3–20 chars; lowercase letters, numbers, underscores."
                        error={
                          handle && !HANDLE_RE.test(handle)
                            ? "Invalid handle format."
                            : undefined
                        }
                        required
                      >
                        <div className="relative max-w-md">
                          <span
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                            aria-hidden="true"
                          >
                            @
                          </span>
                          <Input
                            value={handle}
                            onChange={(e) =>
                              setHandle(
                                e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9_]/g, "_")
                                  .slice(0, 20)
                              )
                            }
                            placeholder="your_handle"
                            className="pl-7 bg-white"
                            disabled={loading}
                            aria-label="Anonymous handle (required)"
                          />
                        </div>
                      </FieldRow>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldRow
                          label="Country code"
                          hint="Used for culture & matching hints."
                        >
                          <Select
                            value={countryCode}
                            onValueChange={setCountryCode}
                          >
                            <SelectTrigger
                              className="bg-white"
                              aria-label="Select your country"
                            >
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent className="max-h-64 overflow-y-auto">
                              {COUNTRIES.map((country) => (
                                <SelectItem
                                  key={country.code}
                                  value={country.code}
                                >
                                  {country.name} ({country.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FieldRow>

                        <FieldRow
                          label="Age range"
                          hint="Used only for matching; not public."
                        >
                          <Select value={ageRange} onValueChange={setAgeRange}>
                            <SelectTrigger
                              className="bg-white"
                              aria-label="Select your age range"
                            >
                              <SelectValue placeholder="Select age range" />
                            </SelectTrigger>
                            <SelectContent>
                              {AGE_BUCKETS.map((v) => (
                                <SelectItem key={v} value={v}>
                                  {v === "prefer-not" ? "Prefer not to say" : v}
                                </SelectItem>
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
                          aria-label="Your bio"
                        />
                      </FieldRow>

                      <FieldRow
                        label="Favorite Local Fact"
                        hint="Share an interesting fact about your country or culture (max 200 characters)."
                      >
                        <Textarea
                          value={favoriteLocalFact}
                          onChange={(e) => setFavoriteLocalFact(e.target.value)}
                          placeholder="Did you know that in my country we have a tradition where..."
                          className="bg-white min-h-[80px]"
                          maxLength={200}
                          aria-label="Your favorite local fact"
                        />
                        <p className="text-xs text-stone-500 mt-1">
                          {favoriteLocalFact.length}/200 characters
                        </p>
                      </FieldRow>

                      <FieldRow
                        label="Interests"
                        hint="Type and press Enter to add."
                      >
                        <div className="grid gap-2">
                          {interests.length > 0 && (
                            <div
                              className="flex flex-wrap gap-2"
                              role="list"
                              aria-label="Your interests"
                            >
                              {interests.map((i) => (
                                <div key={i} role="listitem">
                                  <Chip
                                    text={i}
                                    onRemove={() =>
                                      setInterests((prev) =>
                                        prev.filter((x) => x !== i)
                                      )
                                    }
                                  />
                                </div>
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
                                    setInterests((prev) =>
                                      prev.includes(v) ? prev : [...prev, v]
                                    );
                                    setInterestInput("");
                                  }
                                }
                              }}
                              placeholder="e.g. hiking, anime, cooking"
                              className="bg-white"
                              aria-label="Add new interest"
                            />
                            <Button
                              className="bg-rose-500 text-white"
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                const v = interestInput.trim();
                                if (v) {
                                  setInterests((prev) =>
                                    prev.includes(v) ? prev : [...prev, v]
                                  );
                                  setInterestInput("");
                                }
                              }}
                              aria-label="Add interest to list"
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </FieldRow>
                    </fieldset>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <div
                    className="text-xs text-stone-500"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {loading ? "Loading…" : saving ? "Saving…" : ""}
                  </div>
                  <Button
                    onClick={onSave}
                    disabled={
                      saving || (handle !== "" && !HANDLE_RE.test(handle))
                    }
                    className="bg-rose-500 hover:bg-rose-600"
                    aria-describedby={
                      handle && !HANDLE_RE.test(handle)
                        ? "handle-error"
                        : undefined
                    }
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* LANGUAGES & TIME TAB */}
            <TabsContent
              value="language"
              className="mt-4"
              role="tabpanel"
              id="language-panel"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-stone-800">
                    Languages & Communication
                  </CardTitle>
                  <CardDescription>
                    Primary/secondary languages, time zone, and correspondence
                    preferences.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onSave();
                    }}
                    aria-label="Language and timezone settings form"
                  >
                    <fieldset className="grid gap-6">
                      <legend className="sr-only">
                        Language and Time Zone Information
                      </legend>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldRow label="Primary language">
                          <Select
                            value={primaryLanguage}
                            onValueChange={setPrimaryLanguage}
                          >
                            <SelectTrigger
                              className="bg-white"
                              aria-label="Select your primary language"
                            >
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                              {LANG.map(({ code, label }) => (
                                <SelectItem key={code} value={code}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FieldRow>

                        <FieldRow label="Time zone" hint="IANA time zone">
                          <Select value={timeZone} onValueChange={setTimeZone}>
                            <SelectTrigger
                              className="bg-white"
                              aria-label="Select your time zone"
                            >
                              <SelectValue placeholder="Select time zone" />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                              <SelectItem value="Africa/Johannesburg">
                                Africa/Johannesburg (UTC+2)
                              </SelectItem>
                              <SelectItem value="UTC">UTC</SelectItem>
                              <SelectItem value="Europe/London">
                                Europe/London (UTC±0/±1)
                              </SelectItem>
                              <SelectItem value="Europe/Paris">
                                Europe/Paris (UTC+1/+2)
                              </SelectItem>
                              <SelectItem value="America/New_York">
                                America/New_York (UTC−5/−4)
                              </SelectItem>
                              <SelectItem value="America/Los_Angeles">
                                America/Los_Angeles (UTC−8/−7)
                              </SelectItem>
                              <SelectItem value="Asia/Tokyo">
                                Asia/Tokyo (UTC+9)
                              </SelectItem>
                              <SelectItem value="Asia/Kolkata">
                                Asia/Kolkata (UTC+5:30)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldRow>
                      </div>

                      <FieldRow
                        label="Preferred Correspondence Type"
                        hint="How would you prefer to communicate with your pen pals?"
                      >
                        <Select
                          value={preferredCorrespondenceType}
                          onValueChange={(
                            value: "long-term" | "one-time" | "either"
                          ) => setPreferredCorrespondenceType(value)}
                        >
                          <SelectTrigger
                            className="bg-white"
                            aria-label="Select preferred correspondence type"
                          >
                            <SelectValue placeholder="Select communication preference" />
                          </SelectTrigger>
                          <SelectContent>
                            {CORRESPONDENCE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldRow>

                      <FieldRow
                        label="Secondary languages"
                        hint="Pick from the same list as primary; you can add multiple."
                      >
                        <div className="grid gap-2">
                          {secondaryLanguages.length > 0 && (
                            <div
                              className="flex flex-wrap gap-2"
                              role="list"
                              aria-label="Your secondary languages"
                            >
                              {secondaryLanguages.map((code) => (
                                <div key={code} role="listitem">
                                  <Chip
                                    text={
                                      LANG.find((l) => l.code === code)
                                        ?.label ?? code
                                    }
                                    onRemove={() =>
                                      setSecondaryLanguages((prev) =>
                                        prev.filter((x) => x !== code)
                                      )
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          <Select
                            key={secondaryLanguages.join(",") || "empty"}
                            onValueChange={(code) => {
                              setSecondaryLanguages((prev) =>
                                prev.includes(code) ? prev : [...prev, code]
                              );
                            }}
                            disabled={
                              LANG.filter(
                                ({ code }) =>
                                  code !== primaryLanguage &&
                                  !secondaryLanguages.includes(code)
                              ).length === 0
                            }
                          >
                            <SelectTrigger
                              aria-label="Add a secondary language"
                              className="w-full sm:max-w-md min-h-10 bg-white overflow-hidden text-ellipsis whitespace-nowrap"
                            >
                              <SelectValue
                                placeholder={
                                  LANG.filter(
                                    ({ code }) =>
                                      code !== primaryLanguage &&
                                      !secondaryLanguages.includes(code)
                                  ).length === 0
                                    ? "All available languages added"
                                    : "Add a secondary language"
                                }
                              />
                            </SelectTrigger>

                            <SelectContent
                              position="popper"
                              className="z-50 w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                            >
                              {LANG.filter(
                                ({ code }) =>
                                  code !== primaryLanguage &&
                                  !secondaryLanguages.includes(code)
                              ).map(({ code, label }) => (
                                <SelectItem key={code} value={code}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </FieldRow>
                    </fieldset>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <div
                    className="text-xs text-stone-500"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {loading ? "Loading…" : saving ? "Saving…" : ""}
                  </div>
                  <Button
                    onClick={onSave}
                    disabled={
                      saving || (handle !== "" && !HANDLE_RE.test(handle))
                    }
                    className="bg-rose-500 hover:bg-rose-600"
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
