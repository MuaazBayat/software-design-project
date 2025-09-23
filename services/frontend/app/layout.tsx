import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/header";
import "./globals.css";
import { ConversationUserProvider } from "@/lib/context/ConversationUserContext";
import { ProfileProvider } from "@/lib/context/ProfileContext";
import { FpjsProvider } from "@fingerprintjs/fingerprintjs-pro-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GlobeTalk",
  description: "Connecting Cultures, One Letter at a Time",
  icons: {
    icon: [
      { url: "/globe.png", sizes: "32x32", type: "image/png" },
      { url: "/globe.png", sizes: "192x192", type: "image/png" }, // Android homescreen
      { url: "/globe.png", sizes: "512x512", type: "image/png" }, // PWA
    ],
    apple: "/globe.png", // iOS Safari pinned tab
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <ClerkProvider>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <FpjsProvider
            loadOptions={{
              apiKey: process.env.NEXT_PUBLIC_FPJS_KEY!,
              region: "eu",
              scriptUrlPattern: `/api/fpjs/v3/${process.env.NEXT_PUBLIC_FPJS_KEY}/loader_v3.12.1.js`,
            }}
          >
            <ProfileProvider>
              <ConversationUserProvider>
                <Header />
                {children}
              </ConversationUserProvider>
            </ProfileProvider>
          </FpjsProvider>
        </body>
      </ClerkProvider>
    </html>
  );
}
