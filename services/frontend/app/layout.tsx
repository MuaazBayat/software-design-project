import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/components/header";
import "./globals.css";
import { ConversationUserProvider } from "@/lib/context/ConversationUserContext";
import { ProfileProvider } from "@/lib/context/ProfileContext";
import { ThemeProvider } from "@/lib/context/ThemeContext";
import { FpjsProvider } from "@fingerprintjs/fingerprintjs-pro-react";
import { Toaster } from "sonner";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { BackgroundWrapper } from "@/components/BackgroundWrapper";

export const metadata: Metadata = {
  title: "GlobeTalk",
  description: "Connecting Cultures, One Letter at a Time",
  icons: {
    icon: [
      { url: "/globe.png", sizes: "32x32", type: "image/png" },
      { url: "/globe.png", sizes: "192x192", type: "image/png" },
      { url: "/globe.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/globe.png",
  },
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fpjsKey = process.env.NEXT_PUBLIC_FPJS_KEY;
  
  const content = (
    <ThemeProvider>
      <ProfileProvider>
        <ConversationUserProvider>
          <OnboardingGuard>
            {/* Background wrapper that responds to theme */}
            <BackgroundWrapper />

            {/* Content wrapper with relative positioning */}
            <div className="relative z-10 min-h-screen">
              <Header />
              {children}
              <Toaster richColors position="top-center" />
            </div>
          </OnboardingGuard>
        </ConversationUserProvider>
      </ProfileProvider>
    </ThemeProvider>
  );

  return (
    <html lang="en">
      <ClerkProvider>
        <body
          className="antialiased min-h-screen"
        >
          {fpjsKey ? (
            <FpjsProvider
              loadOptions={{
                apiKey: fpjsKey,
                region: "eu",
                // Removed custom scriptUrlPattern - use default CDN
              }}
            >
              {content}
            </FpjsProvider>
          ) : (
            content
          )}
        </body>
      </ClerkProvider>
    </html>
  );
}