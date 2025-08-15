import { UserButton, SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs';
import { Button } from "@/components/ui/button";

 export default function Header(){
    return(
         <header className="flex p-4 gap-4 h-16 bg-black items-center justify-between">
        <div className="text-emerald-50">GlobeTalks</div>
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
        <UserButton />
        </SignedIn>
        </div>
        </header>
    )

 }