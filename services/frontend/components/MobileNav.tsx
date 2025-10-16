'use client';

import Link from 'next/link';
import { useProfile } from '@/lib/context/ProfileContext';

export function MobileNav({ closeNav }: { closeNav: () => void }) {
  const { profile } = useProfile();

  return (
    <nav className="flex flex-col gap-4 p-4 text-white">
     <Link href="/matchmaking" onClick={closeNav}>Find Pals</Link>
      <Link href="/inbox" onClick={closeNav}>My Inbox</Link>
      <Link href="/compose-letter" onClick={closeNav}>Write a Letter</Link>
      <Link href="/cultural-explorer" onClick={closeNav}>Explore</Link>
      <Link href="/settings" onClick={closeNav}>Settings</Link>
                  {profile?.moderator && (
              <li><Link href="/moderation" className="hover:text-orange-300 transition-colors">Moderation</Link></li>
            )}
    </nav>
  );
}
