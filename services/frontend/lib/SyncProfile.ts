"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export function SyncProfile() {
  const { isSignedIn, user } = useUser();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!isSignedIn || !user || synced) return;

    const createProfile = async () => {
        console.log(user.id);
       console.log(user.primaryEmailAddress?.emailAddress ?? null);   
      try {
        await fetch("http://127.0.0.1:8000/profiles/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerk_id : user.id,
            anonymous_handle: user.primaryEmailAddress?.emailAddress ?? null,

          })
        });
      } catch (err) {
        console.error("Failed to sync profile:", err);
      } finally {
        setSynced(true);
      }
    };

    createProfile();
  }, [isSignedIn, user, synced]);

  return null; 
}
