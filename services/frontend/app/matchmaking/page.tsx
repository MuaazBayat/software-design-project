"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Heart,
  X,
  UserSearch,
  Globe,
  MapPin,
  Camera,
  Book,
  Mountain,
  Star,
  Clock,
  MessageCircle,
} from "lucide-react";
import Loader from "@/components/ui/loader";
import { Toaster, toast } from "sonner";

interface UserProfile {
  user_id: string;
  anonymous_handle: string;
  bio?: string;
  age_range?: string;
  primary_language?: string;
  secondary_languages?: string[];
  time_zone?: string;
  country_code?: string;
  interests?: string[];
  favorite_local_fact?: string;
  preferred_correspondence_type?: string;
  cultural_completeness_score?: number;
  last_active?: string;
}

interface DailyStats {
  matches_remaining: number;
  total_daily_limit: number;
}

interface MatchingPreferences {
  match_type: "long-term" | "one-time" | "either";
  languages: string[];
  age_ranges: string[];
  country_codes: string[];
  interests: string[];
  exclude_previous: boolean;
  max_timezone_difference: number;
}

interface MatchData {
  penpal_profile: UserProfile;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_MATCHMAKING_URL || "http://localhost:8001";

// Helper functions
const getLocationDisplay = (profile: UserProfile) => {
  const countryNames: { [key: string]: string } = {
    JP: "Japan",
    US: "United States",
    FR: "France",
    DE: "Germany",
    GB: "United Kingdom",
    CA: "Canada",
    AU: "Australia",
    ES: "Spain",
    IT: "Italy",
    BR: "Brazil",
    IN: "India",
    CN: "China",
    KR: "South Korea",
    MX: "Mexico",
    RU: "Russia",
    ZA: "South Africa",
    EG: "Egypt",
    AR: "Argentina",
    NG: "Nigeria",
    PK: "Pakistan",
    BD: "Bangladesh",
    TR: "Turkey",
    ID: "Indonesia",
    SA: "Saudi Arabia",
    IR: "Iran",
    TH: "Thailand",
    SE: "Sweden",
    NL: "Netherlands",
    PL: "Poland",
    GR: "Greece",
    FI: "Finland",
    IE: "Ireland",
    NO: "Norway",
    CH: "Switzerland",
    CL: "Chile",
    CO: "Colombia",
    DK: "Denmark",
    HK: "Hong Kong",
    HU: "Hungary",
    IS: "Iceland",
    IL: "Israel",
    NZ: "New Zealand",
    PH: "Philippines",
    PT: "Portugal",
    SG: "Singapore",
    TW: "Taiwan",
    AE: "United Arab Emirates",
    VN: "Vietnam",
  };
  return (
    countryNames[profile.country_code || ""] ||
    profile.country_code ||
    "Unknown"
  );
};

const getAgeRangeDisplay = (ageRange?: string) => {
  const ageRangeMap: { [key: string]: string } = {
    "13-17": "Teen",
    "18-24": "Young Adult",
    "25-34": "Adult",
    "35-49": "Middle-aged",
    "50+": "Senior",
  };
  return ageRange ? ageRangeMap[ageRange] || ageRange : "";
};

const getLanguageDisplay = (langCode: string) => {
  const languages: { [key: string]: string } = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    pt: "Portuguese",
    it: "Italian",
    ru: "Russian",
    ar: "Arabic",
    hi: "Hindi",
  };
  return languages[langCode] || langCode.toUpperCase();
};

const getTimeSinceActive = (lastActive?: string) => {
  if (!lastActive) return "Never";
  const now = new Date();
  const lastActiveDate = new Date(lastActive);
  const diffMs = now.getTime() - lastActiveDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return "Over a week ago";
};

const InterestTag: React.FC<{ interest: string }> = ({ interest }) => {
  const getIcon = (interest: string) => {
    const lowerInterest = interest.toLowerCase();
    if (lowerInterest.includes("read")) return <Book className="w-3 h-3" />;
    if (lowerInterest.includes("photo")) return <Camera className="w-3 h-3" />;
    if (lowerInterest.includes("hik")) return <Mountain className="w-3 h-3" />;
    return <Star className="w-3 h-3" />;
  };

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 rounded-full text-xs text-amber-700 border border-amber-200">
      {getIcon(interest)}
      <span className="font-medium">{interest}</span>
    </div>
  );
};

// FilterModal component
interface FilterModalProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  matchingPreferences: MatchingPreferences;
  setMatchingPreferences: (prefs: MatchingPreferences) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  showFilters,
  setShowFilters,
  matchingPreferences,
  setMatchingPreferences,
}) => {
  const overlayClasses = `fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 transition-opacity ${
    showFilters ? "opacity-100" : "opacity-0 pointer-events-none"
  }`;

  const modalClasses = `fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 transform transition-transform max-h-[80vh] overflow-y-auto ${
    showFilters ? "translate-y-0" : "translate-y-full"
  }`;

  return (
    <div className={overlayClasses}>
      <div className={modalClasses}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-stone-800">
            Find Your Perfect Match
          </h3>
          <button
            onClick={() => setShowFilters(false)}
            className="p-2 hover:bg-stone-100 rounded-full"
          >
            <X className="w-6 h-6 text-stone-600" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-3">
              Correspondence Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  value: "long-term" as const,
                  label: "📧 Long term",
                  desc: "Thoughtful letters",
                },
                {
                  value: "one-time" as const,
                  label: "💬 One time",
                  desc: "Quick messages",
                },
                {
                  value: "either" as const,
                  label: "✨ Either",
                  desc: "I'm flexible",
                },
              ].map((type) => (
                <button
                  key={type.value}
                  className={`p-3 rounded-xl text-center transition-all border-2 ${
                    matchingPreferences.match_type === type.value
                      ? "bg-gradient-to-br from-violet-200 to-pink-200 text-white  shadow-lg"
                      : "bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-300"
                  }`}
                  onClick={() =>
                    setMatchingPreferences({
                      ...matchingPreferences,
                      match_type: type.value,
                    })
                  }
                >
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs opacity-75">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-3">
              Age Range
            </label>
            <div className="flex flex-wrap gap-2">
              {["18-25", "26-35", "36-45", "46+"].map((range) => (
                <button
                  key={range}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    matchingPreferences.age_ranges.includes(range)
                      ? "bg-gradient-to-r from-violet-200 to-pink-200 text-white shadow-md"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                  onClick={() => {
                    const newRanges = matchingPreferences.age_ranges.includes(
                      range
                    )
                      ? matchingPreferences.age_ranges.filter(
                          (r: string) => r !== range
                        )
                      : [...matchingPreferences.age_ranges, range];
                    setMatchingPreferences({
                      ...matchingPreferences,
                      age_ranges: newRanges,
                    });
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-3">
              Languages
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { code: "en", name: "🇺🇸 English" },
                { code: "es", name: "🇪🇸 Spanish" },
                { code: "fr", name: "🇫🇷 French" },
                { code: "de", name: "🇩🇪 German" },
                { code: "ja", name: "🇯🇵 Japanese" },
                { code: "ko", name: "🇰🇷 Korean" },
                { code: "zh", name: "🇨🇳 Chinese" },
              ].map((lang) => (
                <button
                  key={lang.code}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                    matchingPreferences.languages.includes(lang.code)
                      ? "bg-gradient-to-r from-violet-200 to-pink-200 text-white shadow-md"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                  onClick={() => {
                    const newLangs = matchingPreferences.languages.includes(
                      lang.code
                    )
                      ? matchingPreferences.languages.filter(
                          (l: string) => l !== lang.code
                        )
                      : [...matchingPreferences.languages, lang.code];
                    setMatchingPreferences({
                      ...matchingPreferences,
                      languages: newLangs,
                    });
                  }}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl">
              <input
                type="checkbox"
                checked={matchingPreferences.exclude_previous}
                onChange={(e) =>
                  setMatchingPreferences({
                    ...matchingPreferences,
                    exclude_previous: e.target.checked,
                  })
                }
                className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
              />
              <div>
                <span className="text-sm font-medium text-stone-700">
                  Exclude previous matches
                </span>
                <p className="text-xs text-stone-500">
                  Don&apos;t show people I&apos;ve already connected with
                </p>
              </div>
            </label>
          </div>

          <button
            onClick={() => setShowFilters(false)}
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Apply Filters ✨
          </button>
        </div>
      </div>
    </div>
  );
};

const MatchScreen: React.FC = () => {
  const [profileQueue, setProfileQueue] = useState<UserProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [matchingPreferences, setMatchingPreferences] =
    useState<MatchingPreferences>({
      match_type: "either",
      languages: [],
      age_ranges: [],
      country_codes: [],
      interests: [],
      exclude_previous: true,
      max_timezone_difference: 6,
    });

  const { isLoaded, isSignedIn, user } = useUser();

  // Get current profile (always first in queue)
  const currentProfile = profileQueue[0] || null;

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_BASE_URL}/user/profile/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        // We can store this if needed later
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  }, [user]);

  const fetchDailyStats = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_BASE_URL}/user/stats/${user.id}`);
      if (response.ok) {
        const stats = await response.json();
        setDailyStats(stats);
      }
    } catch (error) {
      console.error("Error fetching daily stats:", error);
    }
  }, [user]);

  const fetchNextProfile = useCallback(async () => {
    if (!user) return [];

    try {
      const params = new URLSearchParams();
      params.append("limit", "5"); // Fetch 5 at once for queue

      if (matchingPreferences.languages.length > 0) {
        params.append("languages", matchingPreferences.languages.join(","));
      }
      if (matchingPreferences.age_ranges.length > 0) {
        params.append("age_ranges", matchingPreferences.age_ranges.join(","));
      }
      if (matchingPreferences.interests.length > 0) {
        params.append("interests", matchingPreferences.interests.join(","));
      }
      if (matchingPreferences.match_type !== "either") {
        params.append("match_type", matchingPreferences.match_type);
      }

      const response = await fetch(
        `${API_BASE_URL}/profiles/suggestions/${user.id}?${params.toString()}`
      );
      if (response.ok) {
        const suggestions = await response.json();
        return Array.isArray(suggestions) ? suggestions : [];
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
    return [];
  }, [user, matchingPreferences]);

  // Initialize profile queue
  const loadInitialProfiles = useCallback(async () => {
    setIsLoadingProfiles(true);
    const profiles = await fetchNextProfile();
    setProfileQueue(profiles);
    setIsLoadingProfiles(false);
  }, [fetchNextProfile]);

  // Background refill - only when queue gets low
  const refillQueue = useCallback(async () => {
    if (profileQueue.length >= 2) return; // Only refill if we have less than 2 profiles

    const newProfiles = await fetchNextProfile();
    if (newProfiles.length > 0) {
      setProfileQueue((prev) => [...prev, ...newProfiles]);
    }
  }, [profileQueue.length, fetchNextProfile]);

  // Handle pass - instant UI update, background API calls
  const handlePass = useCallback(async () => {
    if (!user || !currentProfile || actionLoading) return;

    const profileToPass = currentProfile;

    // Instantly remove from queue for immediate UI response
    setProfileQueue((prev) => prev.slice(1));

    // Background: record pass and refill queue
    setTimeout(async () => {
      try {
        await fetch(`${API_BASE_URL}/profiles/pass`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerk_id: user.id,
            passed_user_id: profileToPass.user_id,
          }),
        });
      } catch (error) {
        console.error("Error recording pass:", error);
      }

      // Refill queue if needed
      refillQueue();
    }, 0);
  }, [user, currentProfile, actionLoading, refillQueue]);

  // Handle like - instant UI update, background API calls
  const handleLike = useCallback(async () => {
    if (!user || !currentProfile || actionLoading) return;

    if (dailyStats && dailyStats.matches_remaining <= 0) {
      toast.error("Daily match limit exceeded. Try again tomorrow!");
      return;
    }

    const profileToLike = currentProfile;

    // Instantly remove from queue for immediate UI response
    setProfileQueue((prev) => prev.slice(1));

    // Background: create match, update stats, and refill queue
    setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/matches/find`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerk_id: user.id,
            accept: true,
            suggested_user_id: profileToLike.user_id,
            preferences: matchingPreferences,
          }),
        });

        if (response.ok) {
          const matchData = await response.json();
          toast.success(
            `Match created with ${matchData.penpal_profile.anonymous_handle}! 🎉`
          );
          fetchDailyStats(); // Update stats in background
        }
      } catch (error) {
        console.error("Error creating match:", error);
        toast.error("Error creating match. Please try again.");
      }

      // Refill queue if needed
      refillQueue();
    }, 0);
  }, [
    user,
    currentProfile,
    actionLoading,
    dailyStats,
    matchingPreferences,
    fetchDailyStats,
    refillQueue,
  ]);

  // Initialize on component mount
  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchDailyStats();
      loadInitialProfiles();
    }
  }, [user, fetchUserProfile, fetchDailyStats, loadInitialProfiles]);

  // Handle preference changes
  useEffect(() => {
    if (user) {
      const timeoutId = setTimeout(() => {
        loadInitialProfiles(); // Reload profiles with new preferences
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [matchingPreferences, user, loadInitialProfiles]);

  // Show loading state only when actually loading and no profiles
  const showLoadingState = isLoadingProfiles || profileQueue.length === 0;

  // Loading and error states
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-violet-200 to-pink-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-stone-800 mb-2">
            Please Sign In
          </h2>
          <p className="text-stone-600">
            You need to be signed in to use the matching feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100">
      {/* Main Content */}
      <Toaster position="top-center" richColors />
      <div className="max-w-md mx-auto px-6 py-8">
        {/* User Stats Card */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-sm p-6 border border-white/20">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-stone-800 mb-1">
                  Hi, {user.firstName || user.username || "User"} 👋
                </h2>
                <p className="text-stone-600">
                  Find your next conversation partner
                </p>
              </div>
              <button
                onClick={() => setShowFilters(true)}
                className="p-3 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-stone-200 hover:border-stone-300 hover:shadow-2xl transition-all"
              >
                <UserSearch className="w-5 h-5" />
              </button>
            </div>

            {dailyStats && (
              <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 rounded-sm p-4">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-700">
                      Daily Matches
                    </p>
                    <p className="text-xs text-stone-500">
                      {dailyStats.matches_remaining} of{" "}
                      {dailyStats.total_daily_limit} remaining
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="relative">
          {actionLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl z-10 flex items-center justify-center">
              <div className="text-center">
                <Loader />
              </div>
            </div>
          )}

          {showLoadingState ? (
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-12 text-center border border-white/20 shadow-lg">
              <div className="w-24 h-24 bg-gradient-to-r from-stone-200 to-stone-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-12 h-12 text-stone-500" />
              </div>
              <h3 className="text-xl font-semibold text-stone-700 mb-2">
                {isLoadingProfiles
                  ? "Loading profiles..."
                  : "No profiles available"}
              </h3>
              <p className="text-stone-500">
                {isLoadingProfiles
                  ? "Please wait while we find amazing people for you!"
                  : "Try adjusting your filters or check back later!"}
              </p>
            </div>
          ) : currentProfile ? (
            <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden mb-8 border border-white/20">
              {/* Profile Header with Country Flag */}
              <div className="relative h-48 bg-gradient-to-br from-violet-200 to-pink-200 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative text-center text-white">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-4xl mb-3 mx-auto">
                    {/* Country Flags */}
                    {currentProfile.country_code === "US" && "🇺🇸"}{" "}
                    {currentProfile.country_code === "JP" && "🇯🇵"}{" "}
                    {currentProfile.country_code === "AR" && "🇦🇷"}{" "}
                    {currentProfile.country_code === "MA" && "🇲🇦"}
                    {currentProfile.country_code === "IE" && "🇮🇪"}{" "}
                    {currentProfile.country_code === "GB" && "🇬🇧"}{" "}
                    {currentProfile.country_code === "CA" && "🇨🇦"}{" "}
                    {currentProfile.country_code === "AU" && "🇦🇺"}
                    {currentProfile.country_code === "DE" && "🇩🇪"}{" "}
                    {currentProfile.country_code === "FR" && "🇫🇷"}{" "}
                    {currentProfile.country_code === "BR" && "🇧🇷"}{" "}
                    {currentProfile.country_code === "IN" && "🇮🇳"}
                    {currentProfile.country_code === "CN" && "🇨🇳"}{" "}
                    {currentProfile.country_code === "IT" && "🇮🇹"}{" "}
                    {currentProfile.country_code === "ES" && "🇪🇸"}
                    {currentProfile.country_code === "SE" && "🇸🇪"}{" "}
                    {currentProfile.country_code === "NL" && "🇳🇱"}{" "}
                    {currentProfile.country_code === "PL" && "🇵🇱"}{" "}
                    {currentProfile.country_code === "GR" && "🇬🇷"}
                    {currentProfile.country_code === "FI" && "🇫🇮"}{" "}
                    {currentProfile.country_code === "NO" && "🇳🇴"}{" "}
                    {currentProfile.country_code === "CH" && "🇨🇭"}{" "}
                    {currentProfile.country_code === "CL" && "🇨🇱"}
                    {currentProfile.country_code === "CO" && "🇨🇴"}{" "}
                    {currentProfile.country_code === "DK" && "🇩🇰"}{" "}
                    {currentProfile.country_code === "HK" && "🇭🇰"}{" "}
                    {currentProfile.country_code === "HU" && "🇭🇺"}
                    {currentProfile.country_code === "IS" && "🇮🇸"}{" "}
                    {currentProfile.country_code === "IL" && "🇮🇱"}{" "}
                    {currentProfile.country_code === "NZ" && "🇳🇿"}{" "}
                    {currentProfile.country_code === "PH" && "🇵🇭"}
                    {currentProfile.country_code === "PT" && "🇵🇹"}{" "}
                    {currentProfile.country_code === "SG" && "🇸🇬"}{" "}
                    {currentProfile.country_code === "TW" && "🇹🇼"}{" "}
                    {currentProfile.country_code === "AE" && "🇦🇪"}
                    {currentProfile.country_code === "VN" && "🇻🇳"}{" "}
                    {currentProfile.country_code === "KR" && "🇰🇷"}{" "}
                    {currentProfile.country_code === "MX" && "🇲🇽"}{" "}
                    {currentProfile.country_code === "RU" && "🇷🇺"}
                    {currentProfile.country_code === "ZA" && "🇿🇦"}{" "}
                    {currentProfile.country_code === "EG" && "🇪🇬"}{" "}
                    {currentProfile.country_code === "NG" && "🇳🇬"}{" "}
                    {currentProfile.country_code === "PK" && "🇵🇰"}
                    {currentProfile.country_code === "BD" && "🇧🇩"}{" "}
                    {currentProfile.country_code === "TR" && "🇹🇷"}{" "}
                    {currentProfile.country_code === "ID" && "🇮🇩"}{" "}
                    {currentProfile.country_code === "SA" && "🇸🇦"}
                    {currentProfile.country_code === "IR" && "🇮🇷"}{" "}
                    {currentProfile.country_code === "TH" && "🇹🇭"}
                    {![
                      "JP",
                      "FR",
                      "US",
                      "DE",
                      "ES",
                      "GB",
                      "CA",
                      "AU",
                      "IT",
                      "BR",
                      "IN",
                      "CN",
                      "KR",
                      "MX",
                      "RU",
                      "ZA",
                      "EG",
                      "AR",
                      "NG",
                      "PK",
                      "BD",
                      "TR",
                      "ID",
                      "SA",
                      "IR",
                      "TH",
                      "SE",
                      "NL",
                      "PL",
                      "GR",
                      "FI",
                      "IE",
                      "NO",
                      "CH",
                      "CL",
                      "CO",
                      "DK",
                      "HK",
                      "HU",
                      "IS",
                      "IL",
                      "NZ",
                      "PH",
                      "PT",
                      "SG",
                      "TW",
                      "AE",
                      "VN",
                      "MA",
                    ].includes(currentProfile.country_code || "") && "🌍"}
                  </div>
                  <div className="bg-black/20 backdrop-blur-sm rounded-full px-4 py-1 text-sm font-medium">
                    {getLocationDisplay(currentProfile)}
                  </div>
                </div>

                {/* Activity Status */}
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                  <Clock className="w-4 h-4 text-white" />
                  <span className="text-white text-xs font-medium">
                    {getTimeSinceActive(currentProfile.last_active)}
                  </span>
                </div>
              </div>

              {/* Profile Info */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-stone-800 mb-2">
                      {currentProfile.anonymous_handle}
                    </h3>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1 text-stone-500 text-sm">
                        <MapPin className="w-4 h-4" />
                        {getLocationDisplay(currentProfile)}
                      </div>
                      {currentProfile.age_range && (
                        <div className="bg-stone-100 px-3 py-1 rounded-full text-stone-600 text-sm font-medium">
                          {getAgeRangeDisplay(currentProfile.age_range)}
                        </div>
                      )}
                    </div>
                  </div>

                  {currentProfile.cultural_completeness_score && (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-violet-200 to-pink-200 rounded-full flex items-center justify-center text-white font-bold text-sm mb-1">
                        {Math.round(
                          currentProfile.cultural_completeness_score * 100
                        )}
                        %
                      </div>
                      <p className="text-xs text-stone-500 font-medium">
                        Complete
                      </p>
                    </div>
                  )}
                </div>

                {currentProfile.bio && (
                  <div className="mb-6">
                    <p className="text-stone-600 leading-relaxed italic text-center bg-stone-50 p-4 rounded-xl border border-stone-100">
                      &ldquo;{currentProfile.bio}&rdquo;
                    </p>
                  </div>
                )}

                {currentProfile.favorite_local_fact && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl mb-6 border border-amber-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-violet-200 to-pink-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <Star className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-800 mb-1">
                          Local Fact
                        </p>
                        <p className="text-amber-700 text-sm leading-relaxed">
                          {currentProfile.favorite_local_fact}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {(currentProfile.interests || []).length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-semibold text-stone-700 mb-3">
                      Interests
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(currentProfile.interests || []).map(
                        (interest: string, index: number) => (
                          <InterestTag key={index} interest={interest} />
                        )
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-stone-500" />
                    <div>
                      <p className="text-sm font-semibold text-stone-700">
                        Languages
                      </p>
                      <p className="text-xs text-stone-500">
                        {getLanguageDisplay(
                          currentProfile.primary_language || "en"
                        )}
                        {currentProfile.secondary_languages &&
                          currentProfile.secondary_languages.length > 0 &&
                          `, ${currentProfile.secondary_languages
                            .map((lang: string) => getLanguageDisplay(lang))
                            .join(", ")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-stone-400" />
                    <span className="text-xs text-stone-500 capitalize">
                      {currentProfile.preferred_correspondence_type || "either"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        {currentProfile && (
          <div className="flex justify-center gap-6 mb-8">
            <button
              aria-label="pass"
              onClick={handlePass}
              disabled={
                actionLoading ||
                Boolean(dailyStats && dailyStats.matches_remaining <= 0)
              }
              className="w-16 h-16 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-stone-200 hover:border-stone-300 hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-6 h-6 text-stone-500" />
            </button>

            <button
              aria-label="like"
              onClick={handleLike}
              disabled={
                actionLoading ||
                Boolean(dailyStats && dailyStats.matches_remaining <= 0)
              }
              className="w-16 h-16 bg-rose-500 rounded-full shadow-xl flex items-center justify-center hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Heart className="w-8 h-8 text-white" fill="currentColor" />
            </button>
          </div>
        )}

        {/* Status Messages */}
        {dailyStats && dailyStats.matches_remaining <= 0 && (
          <div className="text-center bg-gradient-to-r from-amber-50 to-orange-50 rounded-sm p-6 border border-amber-200">
            <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-amber-800 mb-2">
              Daily limit reached!
            </h3>
            <p className="text-amber-700 text-sm">
              You&apos;ve used all your daily matches. Come back tomorrow to
              meet more amazing people!
              <br />
              <span className="text-xs opacity-75">Resets at midnight</span>
            </p>
          </div>
        )}
      </div>

      <FilterModal
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        matchingPreferences={matchingPreferences}
        setMatchingPreferences={setMatchingPreferences}
      />
    </div>
  );
};

export default MatchScreen;