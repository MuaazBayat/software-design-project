"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/context/ProfileContext";
import Stepper, { Step } from "@/components/StepperCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  User2,
  Languages,
  MapPin,
  Heart,
  Settings,
  Mail,
  Mailbox,
  Sparkles,
} from "lucide-react";

// Reuse types and API from settings
type ProfileModel = {
  anonymous_handle?: string | null;
  age_range?: string | null;
  primary_language?: string | null;
  secondary_languages?: string[] | null;
  time_zone?: string | null;
  country_code?: string | null;
  bio?: string | null;
  interests?: string[] | null;
  favorite_local_fact?: string | null;
  preferred_correspondence_type: "long-term" | "one-time" | "either";
};

const API_BASE = process.env.NEXT_PUBLIC_CORE_URL || "http://0.0.0.0:8000";

async function apiUpdateProfile(
  clerkId: string,
  patch: Partial<ProfileModel>
): Promise<ProfileModel> {
  const res = await fetch(
    `${API_BASE}/profiles/${encodeURIComponent(clerkId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }
  );
  if (!res.ok) throw new Error(`PUT failed: ${res.status}`);
  return await res.json();
}

// Constants
const AGE_BUCKETS = ["18-25", "26-35", "36-45", "46+", "prefer-not"] as const;
const LANGUAGES = [
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
const TIMEZONES = [
  "Africa/Johannesburg",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Kolkata",
] as const;

const CORRESPONDENCE_TYPES = [
  { value: "long-term", label: "long-term", icon: Mailbox },
  { value: "one-time", label: "one-time", icon: Mail },
  { value: "either", label: "either", icon: User2 },
] as const;

// Extended country list matching settings page
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

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export default function OnboardingPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const { syncProfile, isOnboardingComplete } = useProfile();

  // Profile state
  const [handle, setHandle] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [favoriteLocalFact, setFavoriteLocalFact] = useState("");
  const [preferredCorrespondenceType, setPreferredCorrespondenceType] =
    useState<"long-term" | "one-time" | "either">("either");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepValidity, setStepValidity] = useState<boolean[]>([
    true,
    false,
    false,
    true,
    true,
  ]);
  const [currentStep, setCurrentStep] = useState(1);

  // If already onboarded, redirect to home
  useEffect(() => {
    if (isLoaded && isSignedIn && isOnboardingComplete) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, isOnboardingComplete, router]);

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Effects to validate each step - MUST BE CALLED UNCONDITIONALLY
  useEffect(() => {
    updateStepValidity(0, true); // Welcome - always valid
  }, []);

  useEffect(() => {
    const isValid =
      handle !== "" &&
      HANDLE_RE.test(handle) &&
      countryCode !== "" &&
      ageRange !== "";
    updateStepValidity(1, isValid);
  }, [handle, countryCode, ageRange]);

  useEffect(() => {
    const isValid = primaryLanguage !== "" && timeZone !== "";
    updateStepValidity(2, isValid);
  }, [primaryLanguage, timeZone]);

  useEffect(() => {
    updateStepValidity(3, true); // About You - optional
  }, []);

  useEffect(() => {
    updateStepValidity(4, true); // Completion - always valid
  }, []);

  // Helper functions - defined after hooks but before any conditional returns
  const updateStepValidity = (stepIndex: number, isValid: boolean) => {
    setStepValidity((prev) => {
      const newValidity = [...prev];
      newValidity[stepIndex] = isValid;
      return newValidity;
    });
  };

  // Use the current step's validity
  const currentStepIsValid = stepValidity[currentStep - 1] || false;

  const buildProfileData = (): ProfileModel => ({
    anonymous_handle: handle || null,
    age_range: ageRange === "prefer-not" ? null : ageRange || null,
    primary_language: primaryLanguage || null,
    secondary_languages: [],
    time_zone: timeZone || null,
    country_code: countryCode || null,
    bio: bio || null,
    interests: interests.length > 0 ? interests : null,
    favorite_local_fact: favoriteLocalFact || null,
    preferred_correspondence_type: preferredCorrespondenceType,
  });

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };

  const handleCompleteOnboarding = async () => {
    // Final validation before completing
    if (handle && !HANDLE_RE.test(handle)) {
      setError(
        "Handle must be 3-20 characters: lowercase letters, numbers, underscores only."
      );
      return;
    }

    if (!primaryLanguage || !timeZone) {
      setError("Primary language, and timezone are required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await apiUpdateProfile(user!.id, buildProfileData());

      // Refresh the profile in context to update onboarding status
      await syncProfile();

      // Redirect to landing page
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

const handleGoToPreferences = async () => {
  // Final validation before completing
  if (handle && !HANDLE_RE.test(handle)) {
    setError(
      "Handle must be 3-20 characters: lowercase letters, numbers, underscores only."
    );
    return;
  }

  if (!primaryLanguage || !timeZone) {
    setError("Primary language, and timezone are required.");
    return;
  }

  setIsSaving(true);
  setError(null);

  try {
    // Save profile data but don't mark as complete
    await apiUpdateProfile(user!.id, buildProfileData());
    
    // Redirect to preference profile immediately without syncing
    router.push("/preference-profile");
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to save profile");
    setIsSaving(false);
  }
};

  const addInterest = () => {
    const trimmed = interestInput.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed]);
      setInterestInput("");
    }
  };

  // Conditional return MUST be at the very end, after all hooks
  if (!isLoaded || !isSignedIn || !user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        role="status"
        aria-label="Loading"
      >
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 p-4">
      <div className="text-center pt-8 pb-4 relative z-10">
        <h1 className="text-3xl font-bold text-stone-800 mb-2">
          Welcome to Our Community!
        </h1>
        <p className="text-stone-600">
          Let&apos;s set up your profile in a few quick steps
        </p>
      </div>

      <div className="flex items-center justify-center min-h-[80vh] -mt-8">
        <div className="w-full max-w-2xl">
          <Stepper
            initialStep={1}
            onStepChange={handleStepChange}
            onFinalStepCompleted={handleCompleteOnboarding}
            backButtonText="Back"
            nextButtonText="Next"
            nextButtonProps={{ disabled: isSaving }}
            isStepValid={currentStepIsValid}
            stepCircleContainerClassName="bg-white/20 backdrop-blur-md border border-white/30 rounded-4xl"
            contentClassName="bg-transparent"
            footerClassName="bg-transparent"
          >
            <Step>
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="text-center">
                  <div
                    className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4"
                    aria-hidden="true"
                  >
                    <User2 className="h-8 w-8 text-rose-600" />
                  </div>
                  <CardTitle>
                    Welcome, {user.firstName || "friend"}! 👋
                  </CardTitle>
                  <CardDescription>
                    We&apos;re excited to have you here. Let&apos;s get your
                    profile set up so you can start connecting with others.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-stone-600 text-center">
                    This will only take a minute. You can always adjust these
                    settings later.
                  </p>
                </CardContent>
              </Card>
            </Step>

            <Step>
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Tell us a bit about yourself
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="handle"
                      className="text-[0.9rem] text-stone-800"
                    >
                      Anonymous Handle <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative max-w-md">
                      <span
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                        aria-hidden="true"
                      >
                        @
                      </span>
                      <Input
                        id="handle"
                        value={handle}
                        onChange={(e) =>
                          setHandle(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9_]/g, "")
                              .slice(0, 20)
                          )
                        }
                        placeholder="Choose a unique handle"
                        className="pl-7"
                        required
                        aria-required="true"
                        aria-describedby={
                          handle && !HANDLE_RE.test(handle)
                            ? "handle-error"
                            : undefined
                        }
                      />
                    </div>
                    {handle && !HANDLE_RE.test(handle) && (
                      <p
                        id="handle-error"
                        className="text-xs text-red-600"
                        role="alert"
                      >
                        3-20 chars: lowercase letters, numbers, underscores only
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country">
                        Country <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={countryCode}
                        onValueChange={setCountryCode}
                      >
                        <SelectTrigger aria-label="Select your country">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64 overflow-y-auto">
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name} ({country.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="age">
                        Age Range <span className="text-red-500">*</span>
                      </Label>
                      <Select value={ageRange} onValueChange={setAgeRange}>
                        <SelectTrigger aria-label="Select your age range">
                          <SelectValue placeholder="Select age" />
                        </SelectTrigger>
                        <SelectContent>
                          {AGE_BUCKETS.map((age) => (
                            <SelectItem key={age} value={age}>
                              {age === "prefer-not" ? "Prefer not to say" : age}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Step>

            <Step>
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages className="h-5 w-5" aria-hidden="true" />
                    Language & Communication
                  </CardTitle>
                  <CardDescription>
                    Help us match you with compatible conversation partners
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="language"
                      className="text-[0.9rem] text-stone-800"
                    >
                      Primary Language <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={primaryLanguage}
                      onValueChange={setPrimaryLanguage}
                    >
                      <SelectTrigger aria-label="Select your primary language">
                        <SelectValue placeholder="Select your main language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="timezone"
                      className="text-[0.9rem] text-stone-800 flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      Time Zone <span className="text-red-500">*</span>
                    </Label>
                    <Select value={timeZone} onValueChange={setTimeZone}>
                      <SelectTrigger aria-label="Select your time zone">
                        <SelectValue placeholder="Select your time zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="correspondenceType"
                      className="text-[0.9rem] text-stone-800"
                    >
                      Preferred Correspondence Type{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={preferredCorrespondenceType}
                      onValueChange={(
                        value: "long-term" | "one-time" | "either"
                      ) => setPreferredCorrespondenceType(value)}
                    >
                      <SelectTrigger aria-label="Select your preferred correspondence type">
                        <SelectValue placeholder="Select how you'd like to communicate" />
                      </SelectTrigger>
                      <SelectContent>
                        {CORRESPONDENCE_TYPES.map((type) => {
                          const IconComponent = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <IconComponent
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                                {type.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-stone-500">
                      This helps us match you with compatible pen pals
                    </p>
                  </div>

                  <p className="text-xs text-stone-500">
                    💡 You can add secondary languages and more detailed
                    preferences in Settings later
                  </p>
                </CardContent>
              </Card>
            </Step>

            <Step>
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" aria-hidden="true" />
                    About You & Culture
                  </CardTitle>
                  <CardDescription>
                    What makes you unique? (Optional but recommended)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bio">Short Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell others a bit about yourself..."
                      className="min-h-[100px]"
                      aria-label="Your short bio"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="favoriteLocalFact">
                      Favorite Local Fact
                    </Label>
                    <Textarea
                      id="favoriteLocalFact"
                      value={favoriteLocalFact}
                      onChange={(e) => setFavoriteLocalFact(e.target.value)}
                      placeholder="Share an interesting fact about your country or culture..."
                      className="min-h-[80px]"
                      maxLength={200}
                      aria-label="Your favorite local fact"
                    />
                    <p className="text-xs text-stone-500">
                      {favoriteLocalFact.length}/200 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interests">Interests</Label>
                    <div className="flex gap-2">
                      <Input
                        id="interests"
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          (e.preventDefault(), addInterest())
                        }
                        placeholder="e.g., hiking, music, tech"
                        aria-label="Add interests"
                      />
                      <Button
                        type="button"
                        onClick={addInterest}
                        variant="outline"
                        aria-label="Add interest to list"
                      >
                        Add
                      </Button>
                    </div>
                    {interests.length > 0 && (
                      <div
                        className="flex flex-wrap gap-2 mt-2"
                        role="list"
                        aria-label="Your interests"
                      >
                        {interests.map((interest, index) => (
                          <span
                            key={index}
                            className="bg-rose-100 text-rose-800 px-2 py-1 rounded-full text-sm"
                            role="listitem"
                          >
                            {interest}
                            <button
                              type="button"
                              onClick={() =>
                                setInterests(
                                  interests.filter((_, i) => i !== index)
                                )
                              }
                              className="ml-1 hover:text-rose-900"
                              aria-label={`Remove ${interest} from interests`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Step>

            <Step>
              <Card className="border-0 shadow-none bg-transparent text-center">
                <CardHeader>
                  <div
                    className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                    aria-hidden="true"
                  >
                    <Settings className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle>You&apos;re All Set! 🎉</CardTitle>
                  <CardDescription>
                    Your profile is ready to go. You can always fine-tune these
                    settings later.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-5 w-5 text-white" aria-hidden="true" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-stone-800 mb-1">
                          Want Better Matches?
                        </h4>
                        <p className="text-sm text-stone-600 mb-3">
                          Take a moment to refine your preferences and help our algorithm find your perfect conversation partner.
                        </p>
                        <Button
                          type="button"
                          onClick={handleGoToPreferences}
                          disabled={isSaving}
                          variant="outline"
                          className="w-full bg-white hover:bg-amber-50 border-amber-300"
                        >
                          Refine My Matches
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-stone-600 space-y-2">
                    <p className="mt-4">
                      Visit <strong>Settings</strong> anytime to adjust your
                      profile.
                    </p>
                  </div>

                  {error && (
                    <div
                      className="text-red-600 text-sm bg-red-50 p-3 rounded"
                      role="alert"
                      aria-live="assertive"
                    >
                      {error}
                    </div>
                  )}

                  {isSaving && (
                    <div
                      className="text-stone-600 text-sm"
                      aria-live="polite"
                      aria-label="Saving your profile"
                    >
                      Saving your profile...
                    </div>
                  )}
                </CardContent>
              </Card>
            </Step>
          </Stepper>
        </div>
      </div>
    </div>
  );
}