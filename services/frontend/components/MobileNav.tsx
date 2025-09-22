'use client';

import Link from 'next/link';

export function MobileNav({ closeNav }: { closeNav: () => void }) {
  return (
    <nav className="flex flex-col gap-4 p-4 text-white">
     <Link href="/matchmaking" onClick={closeNav}>Match Screen</Link>
      <Link href="/inbox" onClick={closeNav}>Message Inbox</Link>
      <Link href="/compose-letter" onClick={closeNav}>Compose Letter</Link>
      <Link href="/cultural-explorer" onClick={closeNav}>Cultural Explorer</Link>
      <Link href="/settings" onClick={closeNav}>Settings</Link>
    </nav>
  );
}
