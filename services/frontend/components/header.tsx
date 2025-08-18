import { UserButton, SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs';
import { Button } from "@/components/ui/button";
import { SyncProfile } from "@/lib/SyncProfile";
import Link from 'next/link';
import { Settings } from 'lucide-react';

 export default function Header(){
    return(
         <header className="flex p-4 gap-4 h-16 bg-black items-center justify-between">
        <div className="text-xl text-white font-bold tracking-tighter md:text-2xl lg:text-3xl">GlobeTalk</div>
        <div className="flex items-center gap-2">
        <SignedOut>
        <SignInButton>
            <Button>Sign In</Button>
        </SignInButton>
        <SignUpButton>
            <Button>Sign Up</Button>
        </SignUpButton>
        </SignedOut>
        <SignedIn>
            <Button variant="ghost" size="icon" asChild className="text-white hover:bg-white/2">
            <Link href="/settings" aria-label="Open settings">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
      <UserButton>
      </UserButton>
        <SyncProfile /> 
        </SignedIn>
        </div>
        </header>
    )

 }