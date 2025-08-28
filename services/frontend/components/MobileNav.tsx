'use client';

import Link from 'next/link';

export function MobileNav({ closeNav }: { closeNav: () => void }) {
  return (
    <nav className="flex flex-col gap-4 p-4 text-white">
      <Link href="/match" onClick={closeNav}>Match Screen</Link>
      <Link href="/inbox" onClick={closeNav}>Inbox</Link>
      <Link href="/create-letter" onClick={closeNav}>Create Letter</Link>
      <Link href="/explorer" onClick={closeNav}>Cultural Explorer</Link>
    </nav>
  );
}
