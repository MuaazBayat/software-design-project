"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Stepper, { Step } from '@/components/StepperCard';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User2, Languages, MapPin, Heart, Settings } from "lucide-react";

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
};

const API_BASE = process.env.NEXT_PUBLIC_CORE_URL || "http://0.0.0.0:8000";

async function apiUpdateProfile(clerkId: string, patch: Partial<ProfileModel>): Promise<ProfileModel> {
  const res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(clerkId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PUT failed: ${res.status}`);
  return await res.json();
}

// Constants
const AGE_BUCKETS = ["18-25", "26-35", "36-45", "46+", "prefer-not"] as const;
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
] as const;
const TIMEZONES = [
  "Africa/Johannesburg", "UTC", "Europe/London", "Europe/Paris",
  "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "Asia/Kolkata"
] as const;

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export default function OnboardingPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  
  // Profile state
  const [handle, setHandle] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepValidity, setStepValidity] = useState<boolean[]>([true, false, false, true, true]);

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const updateStepValidity = (stepIndex: number, isValid: boolean) => {
    setStepValidity(prev => {
      const newValidity = [...prev];
      newValidity[stepIndex] = isValid;
      return newValidity;
    });
  };
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
  });

  const handleCompleteOnboarding = async () => {
    if (handle && !HANDLE_RE.test(handle)) {
      setError("Handle must be 3-20 characters: lowercase letters, numbers, underscores only.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await apiUpdateProfile(user.id, buildProfileData());
      router.push("/preference-profile"); // Or wherever you want to redirect after onboarding
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
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

   // Effects to validate each step
  useEffect(() => {
    // Step 1 (index 0): Welcome - always valid
    updateStepValidity(0, true);
  }, []);

  useEffect(() => {
    // Step 2 (index 1): Basic Info - require handle
    const isValid = handle !== "" && HANDLE_RE.test(handle);
    updateStepValidity(1, isValid);
  }, [handle]);

  useEffect(() => {
    // Step 3 (index 2): Language & Time - require primary language and timezone
    const isValid = primaryLanguage !== "" && timeZone !== "";
    updateStepValidity(2, isValid);
  }, [primaryLanguage, timeZone]);

  useEffect(() => {
    // Step 4 (index 3): About You - optional, so always valid
    updateStepValidity(3, true);
  }, []);

  useEffect(() => {
    // Step 5 (index 4): Completion - always valid
    updateStepValidity(4, true);
  }, []);


return (
  <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 p-4">
    {/* Welcome section positioned absolutely at the top */}
    <div className="text-center pt-8 pb-4 relative z-10">
      <h1 className="text-3xl font-bold text-stone-800 mb-2">Welcome to Our Community!</h1>
      <p className="text-stone-600">Let's set up your profile in a few quick steps</p>
    </div>

    {/* Stepper container with proper centering */}
    <div className="flex items-center justify-center min-h-[80vh] -mt-8"> {/* Reduced height and negative margin */}
      <div className="w-full max-w-2xl">
        <Stepper
          initialStep={1}
      onFinalStepCompleted={handleCompleteOnboarding}
      backButtonText="Back"
      nextButtonText="Next"
      nextButtonProps={{ disabled: isSaving }}
      // Add the step validity prop
      isStepValid={currentStepIsValid}
          // Frosted glass effect
          stepCircleContainerClassName="bg-white/20 backdrop-blur-md border border-white/30 rounded-4xl"
          contentClassName="bg-transparent"
          footerClassName="bg-transparent"
        >
        <Step>
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User2 className="h-8 w-8 text-rose-600" />
              </div>
              <CardTitle>Welcome, {user.firstName || 'friend'}! 👋</CardTitle>
              <CardDescription>
                We're excited to have you here. Let's get your profile set up so you can start connecting with others.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-stone-600 text-center">
                This will only take a minute. You can always adjust these settings later.
              </p>
            </CardContent>
          </Card>
        </Step>

        <Step>
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Tell us a bit about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
  <Label htmlFor="handle" className="text-[0.9rem] text-stone-800">
    Anonymous Handle <span className="text-red-500">*</span>
  </Label>
                <div className="relative max-w-md">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">@</span>
                  <Input
                    id="handle"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
                    placeholder="Choose a unique handle"
                    className="pl-7"
                    required
                  />
                </div>
                {handle && !HANDLE_RE.test(handle) && (
                  <p className="text-xs text-red-600">3-20 chars: lowercase letters, numbers, underscores only</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="ZA">South Africa</SelectItem>
                      <SelectItem value="NG">Nigeria</SelectItem>
                      <SelectItem value="IN">India</SelectItem>
                      <SelectItem value="BR">Brazil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age Range</Label>
                  <Select value={ageRange} onValueChange={setAgeRange}>
                    <SelectTrigger><SelectValue placeholder="Select age" /></SelectTrigger>
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
                <Languages className="h-5 w-5" />
                Language & Time
              </CardTitle>
              <CardDescription>Help us match you with compatible conversation partners</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Primary Language *</Label>
                <Select value={primaryLanguage} onValueChange={setPrimaryLanguage}>
                  <SelectTrigger><SelectValue placeholder="Select your main language" /></SelectTrigger>
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
                <Label htmlFor="timezone" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Time Zone
                </Label>
                <Select value={timeZone} onValueChange={setTimeZone}>
                  <SelectTrigger><SelectValue placeholder="Select your time zone" /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-stone-500">
                💡 You can add secondary languages and more detailed preferences in Settings later
              </p>
            </CardContent>
          </Card>
        </Step>

        <Step>
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                About You
              </CardTitle>
              <CardDescription>What makes you unique? (Optional but recommended)</CardDescription>
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interests">Interests</Label>
                <div className="flex gap-2">
                  <Input
                    id="interests"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInterest())}
                    placeholder="e.g., hiking, music, tech"
                  />
                  <Button type="button" onClick={addInterest} variant="outline">
                    Add
                  </Button>
                </div>
                {interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {interests.map((interest, index) => (
                      <span key={index} className="bg-rose-100 text-rose-800 px-2 py-1 rounded-full text-sm">
                        {interest}
                        <button
                          type="button"
                          onClick={() => setInterests(interests.filter((_, i) => i !== index))}
                          className="ml-1 hover:text-rose-900"
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
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>You're All Set! 🎉</CardTitle>
              <CardDescription>
                Your profile is ready to go. You can always fine-tune these settings later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-stone-600 space-y-2">
                <p>✅ Basic profile completed</p>
                <p>✅ Language preferences set</p>
                <p>✅ Time zone configured</p>
                <p className="mt-4">
                  Visit <strong>Settings</strong> anytime to adjust secondary languages, 
                  notification preferences, and other advanced options.
                </p>
              </div>
              
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}
              
              {isSaving && (
                <div className="text-stone-600 text-sm">
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
