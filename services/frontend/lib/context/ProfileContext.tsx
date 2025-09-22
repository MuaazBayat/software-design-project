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

// Define the profile type based on your backend response
export interface Profile {
  user_id: string;
  clerk_id: string;
  anonymous_handle: string;
  fingerprint?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProfileContextType {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  loading: boolean;
  error: string | null;
  synced: boolean;
  syncProfile: () => Promise<void>;
  clearProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

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

  const syncProfile = async () => {
    if (!isSignedIn || !user) return;

    // Wait until fingerprint is ready
    if (fpLoading) return;
    const visitorId = fpData?.visitorId || null;

    setLoading(true);
    setError(null);

    const coreUrl = process.env.NEXT_PUBLIC_CORE_URL;
    if (!coreUrl) {
      const errorMessage =
        "NEXT_PUBLIC_CORE_URL is not set. Add it to .env.local";
      setError(errorMessage);
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
          fingerprint: visitorId, //send fingerprint to backend
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const profileData: Profile = await response.json();
      setProfile(profileData);

      if (response.status === 201) {
        console.log("New profile created:", profileData);
      } else if (response.status === 200) {
        console.log("Existing profile retrieved:", profileData);
      }

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
        error: error || (fpError ? fpError.message : null), //surface FP errors
        synced,
        syncProfile,
        clearProfile,
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
