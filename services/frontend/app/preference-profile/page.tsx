"use client";
import { useUser, useAuth } from "@clerk/nextjs";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "sonner";

interface UserProfile {
  user_id: string;
  anonymous_handle: string;
  country_code: string | null;
  bio: string | null;
  interests: string[] | null;
  age_range: string | null;
  primary_language: string | null;
  favorite_local_fact: string | null;
  selected?: boolean;
  is_real?: boolean;
}

interface ApiUserProfile {
  profile_id?: string;
  user_id: string;
  anonymous_handle: string;
  country_code: string | null;
  bio: string | null;
  interests: string[] | null;
  age_range: string | null;
  primary_language: string | null;
  favorite_local_fact: string | null;
  is_real?: boolean;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_MATCHMAKING_URL || "http://localhost:8001";

const countryCodeToName: Record<string, string> = {
  US: "United States",
  JP: "Japan",
  AR: "Argentina",
  MA: "Morocco",
  IE: "Ireland",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  BR: "Brazil",
  IN: "India",
  CN: "China",
  IT: "Italy",
  ES: "Spain",
};

const fakeUsers: UserProfile[] = [
  {
    user_id: "fake-1",
    anonymous_handle: "Elara",
    country_code: "JP",
    bio: "Lover of traditional arts, matcha, and quiet temples. Seeking a friend to share stories of daily life and culture.",
    interests: ["Art", "Tea", "Nature"],
    age_range: "25-34",
    primary_language: "ja",
    favorite_local_fact:
      "Kyoto was the imperial capital of Japan for over 1,000 years.",
    is_real: false,
  },
  {
    user_id: "fake-2",
    anonymous_handle: "Javier",
    country_code: "AR",
    bio: "Passionate about tango, football, and asado. Let's exchange tales of bustling city life and vibrant traditions.",
    interests: ["Dancing", "Food", "Music"],
    age_range: "30-39",
    primary_language: "es",
    favorite_local_fact:
      'Buenos Aires means "good airs" or "fair winds" in Spanish.',
    is_real: false,
  },
  {
    user_id: "fake-3",
    anonymous_handle: "Amina",
    country_code: "MA",
    bio: "I find joy in the colors of the souk, the aroma of spices, and storytelling. Eager to connect with a kindred spirit.",
    interests: ["Cooking", "History", "Photography"],
    age_range: "28-37",
    primary_language: "ar",
    favorite_local_fact:
      'Marrakech is known as the "Red City" due to the color of its buildings.',
    is_real: false,
  },
  {
    user_id: "fake-4",
    anonymous_handle: "Liam",
    country_code: "IE",
    bio: "A fan of folk music, rainy days, and ancient myths. Let's share our favorite books and local legends.",
    interests: ["Music", "Reading", "Hiking"],
    age_range: "32-41",
    primary_language: "en",
    favorite_local_fact:
      "Dublin was originally founded by Vikings as a trading settlement in the 9th century.",
    is_real: false,
  },
];

const PreferenceProfileSelector = () => {
  // Remove the props
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRealUsers, setShowRealUsers] = useState(true);
  const router = useRouter(); // Use the router for navigation

  const fetchPreferenceProfiles = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true';
      const token = authDisabled ? null : await getToken();
      const response = await fetch(`${API_BASE_URL}/preferences/profiles/${user.id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      if (response.ok) {
        const data: ApiUserProfile[] = await response.json();

        const mappedProfiles = data.map((profile) => ({
          ...profile,
          user_id: profile.profile_id || profile.user_id,
          selected: false,
          is_real: profile.is_real || true,
        }));

        setProfiles(mappedProfiles);
        setShowRealUsers(true);
      } else {
        throw new Error("Failed to fetch profiles from API");
      }
    } catch (err) {
      console.error("Error fetching preference profiles:", err);
      // Don't fall back here - let the error be handled by the component
      setError("Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchPreferenceProfiles();
    }
  }, [isLoaded, user, fetchPreferenceProfiles]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-600 mx-auto"></div>
          <p className="mt-4 text-stone-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            You need to be signed in to access this page.
          </p>
        </div>
      </div>
    );
  }

  const fetchRealUsers = async () => {
    try {
      setLoading(true);

      if (!user) {
        throw new Error("No authenticated user found");
      }

      const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true';
      const token = authDisabled ? null : await getToken();
      const response = await fetch(
        `${API_BASE_URL}/preferences/profiles/${user.id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch profiles: ${response.status}`);
      }

      const data: ApiUserProfile[] = await response.json();

      if (data && data.length > 0) {
        // Map the API response to match your UserProfile interface
        const mappedProfiles = data.map((profile) => ({
          user_id: profile.profile_id || profile.user_id,
          anonymous_handle: profile.anonymous_handle,
          country_code: profile.country_code,
          bio: profile.bio,
          interests: profile.interests,
          age_range: profile.age_range,
          primary_language: profile.primary_language,
          favorite_local_fact: profile.favorite_local_fact,
          selected: false,
          is_real: profile.is_real || true, // Default to true since they're from the API
        }));

        setProfiles(mappedProfiles);
        setShowRealUsers(true);
      } else {
        // Fallback to fake users if API returns empty
        setProfiles(fakeUsers.map((user) => ({ ...user, selected: false })));
        setShowRealUsers(false);
      }
    } catch (err) {
      setError("Failed to load user profiles from API");
      console.error("Error fetching users from API:", err);

      // Fallback to fake users on error
      setProfiles(fakeUsers.map((user) => ({ ...user, selected: false })));
      setShowRealUsers(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (user_id: string) => {
    setProfiles((prev) =>
      prev.map((profile) =>
        profile.user_id === user_id
          ? { ...profile, selected: !profile.selected }
          : { ...profile, selected: false }
      )
    );
  };

  const handleProfileTypeToggle = () => {
    if (showRealUsers) {
      setProfiles(fakeUsers.map((user) => ({ ...user, selected: false })));
    } else {
      fetchPreferenceProfiles();
    }
    setShowRealUsers(!showRealUsers);
  };

  const savePreferenceSelection = async (selectedProfile: UserProfile) => {
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    try {
      const payload = {
        clerk_id: user.id,
        selected_profile_id: selectedProfile.user_id,
        preference_type: selectedProfile.is_real ? "real" : "fake",
      };


      
      const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true';
      const token = authDisabled ? null : await getToken();
      const response = await fetch(`${API_BASE_URL}/preferences/select`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error response:", errorText);

        try {
          JSON.parse(errorText);
        } catch {
          console.error("Could not parse error response as JSON");
        }

        throw new Error(
          `Failed to save preference: ${response.status} ${response.statusText}`
        );
      }

      return true;
    } catch (err) {
      console.error("Error saving preference:", err);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      setError("No authenticated user found");
      return;
    }

    const selectedProfile = profiles.find((profile) => profile.selected);
    if (selectedProfile) {
      const success = await savePreferenceSelection(selectedProfile);
      if (success) {
        toast.success("Preference saved, proceeding with signup");
        setTimeout(() => {
          router.push("/");
        }, 700);
      } else {
        toast.error("Failed to save your preference. Please try again.");
      }
    } else {
      toast.error("Please select a profile that matches your interests");
    }
  };

  const InterestTag: React.FC<{ interest: string }> = ({ interest }) => (
    <span className="px-3 py-1.5 bg-white/70 text-stone-600 rounded-full text-xs border border-stone-200" role="listitem">
      {interest}
    </span>
  );

  const ProfileCard: React.FC<{ profile: UserProfile }> = ({ profile }) => {
    const countryName = profile.country_code
      ? countryCodeToName[profile.country_code] || profile.country_code
      : "Unknown";

    return (
      <article
        className={`bg-stone-50/80 backdrop-blur-sm rounded-2xl p-6 border transition-all duration-300 cursor-pointer hover:shadow-lg ${
          profile.selected
            ? "border-stone-400 shadow-md"
            : "border-stone-200 hover:border-stone-300"
        } focus-within:ring-2 focus-within:ring-stone-600`}
        tabIndex={0}
        aria-label={`Profile for ${profile.anonymous_handle}`}
        role="listitem"
        onClick={() => toggleSelection(profile.user_id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleSelection(profile.user_id);
          }
        }}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-light text-stone-700 mb-1" tabIndex={0} id={`profile-${profile.user_id}-name`}>
              {profile.anonymous_handle}
            </h2>
            <p className="text-stone-500 text-sm" id={`profile-${profile.user_id}-country`}>
              {countryName}
            </p>
            {profile.is_real !== undefined && (
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  profile.is_real
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                }`}
                aria-label={profile.is_real ? "Real User" : "Example Profile"}
              >
                {profile.is_real ? "Real User" : "Example Profile"}
              </span>
            )}
          </div>
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              profile.selected
                ? "bg-stone-600 border-stone-600"
                : "border-stone-300"
            }`}
            aria-checked={profile.selected}
            role="checkbox"
            tabIndex={-1}
            aria-label={profile.selected ? "Selected" : "Not selected"}
          >
            {profile.selected && (
              <svg
                className="w-3 h-3 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>

        <p className="text-stone-600 text-sm leading-relaxed mb-4" id={`profile-${profile.user_id}-bio`}>
          {profile.bio || "No bio provided yet."}
        </p>

        {profile.favorite_local_fact && (
          <div className="mb-4">
            <h3 className="text-stone-600 font-medium mb-2">Local Fact</h3>
            <p className="text-stone-500 text-sm italic">
              &ldquo;{profile.favorite_local_fact}&rdquo;
            </p>
          </div>
        )}

        <div>
          <h3 className="text-stone-600 font-medium mb-3">Interests</h3>
          <div className="flex flex-wrap gap-2" role="list" aria-label="Interests">
            {profile.interests && profile.interests.length > 0 ? (
              profile.interests
                .slice(0, 5)
                .map((interest, index) => (
                  <InterestTag key={index} interest={interest} />
                ))
            ) : (
              <p className="text-stone-400 text-sm">
                No interests specified yet
              </p>
            )}
          </div>
        </div>
      </article>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-600 mx-auto"></div>
          <p className="mt-4 text-stone-600">Loading profiles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchPreferenceProfiles}
            className="px-4 py-2 bg-stone-600 text-white rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100">
      <Toaster richColors position="top-center" />
      <main className="max-w-6xl mx-auto px-6 py-12" role="main" aria-label="Preference Profile Selection">
        <h1 className="text-4xl font-light text-stone-700 text-center mb-6 tracking-wide" tabIndex={0}>
          Select Your Preference Profile
        </h1>

        <p className="text-stone-600 text-center max-w-2xl mx-auto mb-8" id="profile-desc">
          Choose a profile that matches your interests to help our algorithm
          find better matches for you. You can switch between real community
          members and example profiles.
        </p>

        <nav className="flex justify-center mb-8" aria-label="Profile Type Toggle">
          <div className="bg-white/80 rounded-lg p-1 border border-stone-200" role="radiogroup" aria-labelledby="profile-type-label">
            <span id="profile-type-label" className="sr-only">Profile Type</span>
            <button
              className={`px-4 py-2 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-600 focus-visible:ring-offset-2 ${
                showRealUsers ? "bg-stone-600 text-white" : "text-stone-600"
              }`}
              onClick={handleProfileTypeToggle}
              aria-pressed={showRealUsers}
              type="button"
              tabIndex={0}
            >
              Real Community Members
            </button>
            <button
              className={`px-4 py-2 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-600 focus-visible:ring-offset-2 ${
                !showRealUsers ? "bg-stone-600 text-white" : "text-stone-600"
              }`}
              onClick={handleProfileTypeToggle}
              aria-pressed={!showRealUsers}
              type="button"
              tabIndex={0}
            >
              Example Profiles
            </button>
          </div>
        </nav>

        {/* Profile Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12" aria-label="Profile Options" role="list">
          {profiles.map((profile) => (
            <ProfileCard key={profile.user_id} profile={profile} />
          ))}
        </section>

        {/* CTA Button */}
        <div className="text-center">
          <button
            onClick={handleSubmit}
            className="px-8 py-4 bg-white/80 text-stone-700 border border-stone-300 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-300 text-lg font-light focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-600 focus-visible:ring-offset-2"
            aria-label="Continue with Selected Preferences"
            type="button"
          >
            Continue with Selected Preferences
          </button>
        </div>
      </main>
    </div>
  );
};

export default PreferenceProfileSelector;