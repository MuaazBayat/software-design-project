"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useUser } from "@clerk/nextjs";
import { useVisitorData } from "@fingerprintjs/fingerprintjs-pro-react";
import { moderationApi } from '@/lib/moderationApiClient';
import { ProfilesApiClient, Match, MatchesResponse } from '@/lib/profilesApiClient';

export interface Profile {
  user_id: string;
  clerk_id: string;
  anonymous_handle: string;
  fingerprint?: string;
  created_at?: string;
  updated_at?: string;
  moderator: boolean;
  country_code?: string;
  bio?: string;
  age_range?: string;
  interests?: string[];
  primary_language?: string;
  secondary_languages?: string[];
  time_zone?: string;
  favorite_local_fact?: string;
}

interface ProfileContextType {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  loading: boolean;
  error: string | null;
  synced: boolean;
  syncProfile: () => Promise<void>;
  clearProfile: () => void;
  isOnboardingComplete: boolean;
  checkOnboardingStatus: () => boolean;
  initialOnboardingCheckDone: boolean;
  matches: Match[];
  matchesLoading: boolean;
  fetchMatches: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, user } = useUser();

  // FingerprintJS hook
  const { isLoading: fpLoading, data: fpData, error: fpError } = useVisitorData(
    { extendedResult: true },
    { immediate: true }
  );

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [initialOnboardingCheckDone, setInitialOnboardingCheckDone] = useState(false);

  // Check if onboarding is complete based on required fields
  const checkOnboardingStatus = (): boolean => {
    if (!profile) return false;
    
    const hasValidHandle = !!profile.anonymous_handle && 
                          HANDLE_RE.test(profile.anonymous_handle);
    const hasPrimaryLanguage = !!profile.primary_language;
    const hasTimeZone = !!profile.time_zone;
    
    return hasValidHandle && hasPrimaryLanguage && hasTimeZone;
  };

  // Update onboarding status whenever profile changes
  useEffect(() => {
    const onboardingComplete = checkOnboardingStatus();
    setIsOnboardingComplete(onboardingComplete);
    
    // Mark initial check as done once we have a profile and it's loaded
    if (profile && !loading && synced) {
      setInitialOnboardingCheckDone(true);
    }
  }, [profile, loading, synced]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  const syncProfile = useCallback(async () => {
    if (!isSignedIn || !user) return;

    // Get fingerprint - use fallback if FingerprintJS failed
    const visitorId = fpData?.visitorId || `fallback_${user.id}`;

    // Check if fingerprint is banned (only if we have a real fingerprint)
    if (fpData?.visitorId && !fpLoading) {
      try {
        const fpCheck = await moderationApi.checkFingerprint(fpData.visitorId);
        if (fpCheck.is_banned) {
          setError(`Access denied: ${fpCheck.message}`);
          moderationApi.banClerkUser(user.id);
          return;
        }
      } catch (err) {
        console.error("Fingerprint check failed:", err);
      }
    }
    setLoading(true);
    setError(null);

    const coreUrl = process.env.NEXT_PUBLIC_CORE_URL;
    if (!coreUrl) {
      setError("NEXT_PUBLIC_CORE_URL is not set. Add it to .env.local");
      setLoading(false);
      return;
    }

    try {
      // Build payload - fingerprint is required by backend
      const payload = {
        clerk_id: user.id,
        anonymous_handle: user.primaryEmailAddress?.emailAddress ?? null,
        fingerprint: visitorId, // Always include, use fallback if FingerprintJS failed
      };
      
      console.log('Syncing profile with payload:', payload);
      
      const response = await fetch(`${coreUrl}/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Profile sync failed (${response.status}):`, errorText);
        
        // If profile already exists (409 or 422), try to fetch it instead
        if (response.status === 422 || response.status === 409) {
          console.log('Profile might already exist, trying GET instead...');
          const getResponse = await fetch(`${coreUrl}/profiles/${user.id}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });
          
          if (getResponse.ok) {
            const profileData: Profile = await getResponse.json();
            console.log('Successfully fetched existing profile:', profileData);
            setProfile(profileData);
            setSynced(true);
            setLoading(false);
            return;
          }
        }
        
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const profileData: Profile = await response.json();
      setProfile(profileData);
      setSynced(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to sync profile:", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, user, fpData?.visitorId]);

  const fetchMatches = useCallback(async () => {
    if (!isSignedIn || !user || !synced || !profile?.user_id) return;

    setMatchesLoading(true);
    try {
      const coreUrl = process.env.NEXT_PUBLIC_CORE_URL;
      if (!coreUrl) {
        console.error("NEXT_PUBLIC_CORE_URL is not set. Add it to .env.local");
        return;
      }

      const profilesClient = new ProfilesApiClient(coreUrl);
      const matchesResponse = await profilesClient.getMatches(profile.user_id);
      setMatches(matchesResponse.matches);
    } catch (err) {
      console.error("Failed to fetch matches:", err);
      setMatches([]); // Set empty array on error
    } finally {
      setMatchesLoading(false);
    }
  }, [isSignedIn, user, synced, profile?.user_id]);

  const clearProfile = () => {
    setProfile(null);
    setError(null);
    setSynced(false);
    setLoading(false);
    setIsOnboardingComplete(false);
    setInitialOnboardingCheckDone(false);
    setMatches([]);
    setMatchesLoading(false);
  };

  // Auto-sync when user signs in and profile hasn't been synced yet
  useEffect(() => {
    if (isSignedIn && user && !synced && !loading) {
      syncProfile();
    }
  }, [isSignedIn, user, synced, loading, syncProfile]);

  // Clear profile when user signs out
  useEffect(() => {
    if (!isSignedIn) {
      clearProfile();
    }
  }, [isSignedIn]);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        setProfile,
        loading,
        error: error || (fpError ? fpError.message : null),
        synced,
        syncProfile,
        clearProfile,
        isOnboardingComplete,
        checkOnboardingStatus,
        initialOnboardingCheckDone,
        matches,
        matchesLoading,
        fetchMatches,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}

// Optional: Hook for backward compatibility with the old useSyncProfile
export function useSyncProfile() {
  const { profile, loading, error, synced, matches, matchesLoading, fetchMatches } = useProfile();
  return { profile, loading, error, synced, matches, matchesLoading, fetchMatches };
}