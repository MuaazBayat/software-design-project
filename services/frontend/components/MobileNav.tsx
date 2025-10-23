'use client';

import Link from 'next/link';
import { useProfile } from '@/lib/context/ProfileContext';
import { useTheme } from '@/lib/context/ThemeContext';
import { usePathname } from 'next/navigation';

export function MobileNav({ closeNav }: { closeNav: () => void }) {
  const { profile } = useProfile();
  const { theme } = useTheme();
  const pathname = usePathname();
  
  const isLandingPage = pathname === "/";
  
  // Determine text color based on theme and landing page
  const textColor = isLandingPage 
    ? (theme === 'dark' ? 'text-white' : 'text-black')
    : (theme === 'dark' ? 'text-amber-100' : 'text-amber-900');

  return (
    <nav className={`flex flex-col gap-4 p-4 ${textColor}`}>
      <Link href="/matchmaking" onClick={closeNav} className="hover:text-orange-300 transition-colors">Find Pals</Link>
      <Link href="/inbox" onClick={closeNav} className="hover:text-orange-300 transition-colors">My Inbox</Link>
      <Link href="/compose-letter" onClick={closeNav} className="hover:text-orange-300 transition-colors">Write a Letter</Link>
      <Link href="/cultural-explorer" onClick={closeNav} className="hover:text-orange-300 transition-colors">Explore</Link>
      <Link href="/settings" onClick={closeNav} className="hover:text-orange-300 transition-colors">Settings</Link>
      {profile?.moderator && (
        <Link href="/moderation" onClick={closeNav} className="hover:text-orange-300 transition-colors">Moderation</Link>
      )}
    </nav>
  );
}