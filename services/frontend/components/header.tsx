'use client';

import { useState, useEffect } from 'react';
import { UserButton, SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs';
import { Button } from "@/components/ui/button";
import { SyncProfile } from "@/lib/SyncProfile";
import Link from 'next/link';
import { Settings, Menu } from 'lucide-react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const DynamicMobileNav = dynamic(() => import('@/components/MobileNav').then(mod => mod.MobileNav), { 
  ssr: false, 
  loading: () => <div>Loading Mobile Navigation...</div>  // This will show while the mobile nav is loading
});

export default function Header() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const pathname = usePathname();  // Track the current path

  // This effect ensures that once the component mounts, it's fully loaded
  useEffect(() => {
    setIsLoaded(true);  // Make sure the component is fully loaded
  }, [pathname]);

  return (
    <header className="relative flex flex-wrap p-4 gap-4 h-16 bg-black items-center justify-between z-40">
      {/* Logo */}
      <div className="text-xl text-white font-bold tracking-tighter md:text-2xl lg:text-3xl">
        GlobeTalk
      </div>

      {/* Mobile Navigation Toggle (only when signed in) */}
      <SignedIn>
        <div className="md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileNavOpen(prev => !prev)}>
            <Menu className="text-white" />
          </Button>
        </div>
      </SignedIn>

      {/* Desktop Navigation (only when signed in) */}
      <SignedIn>
        <nav className="hidden md:flex flex-grow justify-center">
          <ul className="flex gap-8 text-white font-medium text-lg">
            <li><Link href="/match-screen" className="hover:text-blue-300 transition-colors">Match Screen</Link></li>
            <li><Link href="/inbox" className="hover:text-blue-300 transition-colors">Message Inbox</Link></li>
            <li><Link href="/compose-letter" className="hover:text-blue-300 transition-colors">Compose Letter</Link></li>
            <li><Link href="/cultural-explorer" className="hover:text-blue-300 transition-colors">Cultural Explorer</Link></li>
          </ul>
        </nav>
      </SignedIn>

      {/* Auth Buttons */}
      <div className="flex items-center gap-2 z-50">
        <SignedOut>
          <div className="flex items-center gap-2">
            <SignInButton mode="modal">
              <Button>Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button>Sign Up</Button>
            </SignUpButton>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="flex items-center gap-2">
            <Link href="/settings" aria-label="Open settings">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <UserButton />
            <SyncProfile />
          </div>
        </SignedIn>
      </div>

      {/* Conditionally Render MobileNav (only shows when signed in and fully loaded) */}
      <SignedIn>
        {isMobileNavOpen && isLoaded && (
          <div className="absolute top-16 left-0 w-full bg-black z-30 md:hidden">
            <DynamicMobileNav closeNav={() => setIsMobileNavOpen(false)} />
          </div>
        )}
      </SignedIn>
    </header>
  );
}
