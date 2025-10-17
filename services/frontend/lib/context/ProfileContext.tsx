"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useUser } from "@clerk/nextjs";
import { useVisitorData } from "@fingerprintjs/fingerprintjs-pro-react";
import { moderationApi } from '@/lib/moderationApiClient';

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

  const syncProfile = async () => {
    if (!isSignedIn || !user) return;

    // Wait until fingerprint is ready
    if (fpLoading) return;
    const visitorId = fpData?.visitorId || null;

    //Check if fingerprint is banned
    if (visitorId) {
      try {
        const fpCheck = await moderationApi.checkFingerprint(visitorId);
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
      const response = await fetch(`${coreUrl}/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerk_id: user.id,
          anonymous_handle: user.primaryEmailAddress?.emailAddress ?? null,
          fingerprint: visitorId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
  };

  const clearProfile = () => {
    setProfile(null);
    setError(null);
    setSynced(false);
    setLoading(false);
    setIsOnboardingComplete(false);
    setInitialOnboardingCheckDone(false);
  };

  // Auto-sync when user signs in and profile hasn't been synced yet
  useEffect(() => {
    if (isSignedIn && user && !synced && !loading && !fpLoading) {
      syncProfile();
    }
  }, [isSignedIn, user, synced, loading, fpLoading]);

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
  const { profile, loading, error, synced } = useProfile();
  return { profile, loading, error, synced };
}