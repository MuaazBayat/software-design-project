"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

// Define the profile type based on your backend response
export interface Profile {
  id: string;
  clerk_id: string;
  anonymous_handle: string;
  created_at?: string;
  updated_at?: string;
  // Add other fields from your Profile model
}

export function useSyncProfile() {
  const { isSignedIn, user } = useUser();
  const [synced, setSynced] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !user || synced) return;

    const createOrGetProfile = async () => {
      setLoading(true);
      setError(null);
      
      //console.log("Syncing profile for user:", user.id);
      //console.log("Email:", user.primaryEmailAddress?.emailAddress ?? null);   
      
      try {
        const response = await fetch("http://127.0.0.1:8000/profiles/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerk_id: user.id,
            anonymous_handle: user.primaryEmailAddress?.emailAddress ?? null,
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const profileData: Profile = await response.json();
        setProfile(profileData);
        
        // Log whether it was created or existing
        // if (response.status === 201) {
        //   console.log("New profile created:", profileData);
        // } else if (response.status === 200) {
        //   console.log("Existing profile retrieved:", profileData);
        // }
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Failed to sync profile:", errorMessage);
        setError(errorMessage);
      } finally {
        setSynced(true);
        setLoading(false);
      }
    };

    createOrGetProfile();
  }, [isSignedIn, user, synced]);

  return {
    profile,
    loading,
    error,
    synced
  };
}

// Alternative component version if you prefer the original approach
export function SyncProfile({ onProfileLoaded }: { onProfileLoaded?: (profile: Profile) => void }) {
  const { profile } = useSyncProfile();

  useEffect(() => {
    if (profile && onProfileLoaded) {
      onProfileLoaded(profile);
    }
  }, [profile, onProfileLoaded]);

  return null;
}
