"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useProfile } from "@/lib/context/ProfileContext";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { loading, synced, isOnboardingComplete, initialOnboardingCheckDone } = useProfile();
  
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // Only make redirect decisions after the initial onboarding check is done
    if (!clerkLoaded || !initialOnboardingCheckDone) return;

    if (isSignedIn && !isOnboardingComplete && pathname === "/") {
      console.log("OnboardingGuard: User needs onboarding, redirecting from landing page");
      setShouldRedirect(true);
    }
  }, [clerkLoaded, isSignedIn, initialOnboardingCheckDone, isOnboardingComplete, pathname]);

  useEffect(() => {
    if (shouldRedirect) {
      router.push("/onboarding");
    }
  }, [shouldRedirect, router]);


  return <>{children}</>;
}