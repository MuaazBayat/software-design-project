'use client';

import { useState, useEffect } from 'react';
import { UserButton, SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Settings, Menu, Users, Inbox, PenTool, Compass, Shield } from 'lucide-react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useProfile } from '@/lib/context/ProfileContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/lib/context/ThemeContext';

const DynamicMobileNav = dynamic(() => import('@/components/MobileNav').then(mod => mod.MobileNav), {
  ssr: false,
  loading: () => <div>Loading Mobile Navigation...</div>  // This will show while the mobile nav is loading
});

export default function Header() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const pathname = usePathname();  // Track the current path
  const { profile } = useProfile();
  
  // Safely use theme context with fallback
  let theme = 'light'; // default fallback
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
  } catch (error) {
    // ThemeProvider not available yet, use default
    console.warn('ThemeProvider not available, using default theme');
  }

  // Rotating emojis for the logo - positive smiley collection only
  const rotatingEmojis = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '🥸', '🤩', '🥳',
    '😎', '🤗', '🤭', '🤫', '😏'
  ];
  const [currentEmojiIndex, setCurrentEmojiIndex] = useState(0);
  const [previousEmojiIndex, setPreviousEmojiIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animationStyle, setAnimationStyle] = useState(0); // 0-5 for different animation styles

  // This effect ensures that once the component mounts, it's fully loaded
  useEffect(() => {
    setIsLoaded(true);  // Make sure the component is fully loaded
  }, [pathname]);

  // Rotating emoji effect with subtle, pleasant transitions
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      // Pick a random animation style for variety (limited to gentler ones)
      setAnimationStyle(Math.floor(Math.random() * 3)); // Only use first 3 gentler animations
      
      // Save current as previous and update to next
      setPreviousEmojiIndex(currentEmojiIndex);
      setCurrentEmojiIndex((prev) => (prev + 1) % rotatingEmojis.length);
      
      setTimeout(() => {
        setIsTransitioning(false);
      }, 350); // Transition duration
    }, 4000); // Change emoji every 4 seconds (less frequent)

    return () => clearInterval(interval);
  }, [rotatingEmojis.length, currentEmojiIndex]);

  if (pathname === "/onboarding") {
    return null;
  }

  // Helper function to check if a path is active
  const isActivePath = (path: string) => {
    if (path === '/matchmaking') {
      return pathname === path || pathname?.startsWith('/matchmaking');
    }
    if (path === '/inbox') {
      return pathname === path || pathname?.startsWith('/inbox');
    }
    if (path === '/compose-letter') {
      return pathname === path || pathname?.startsWith('/compose-letter');
    }
    if (path === '/cultural-explorer') {
      return pathname === path || pathname?.startsWith('/cultural-explorer');
    }
    if (path === '/moderation') {
      return pathname === path || pathname?.startsWith('/moderation');
    }
    return pathname === path;
  };
  
  // Determine if we're on the landing page for black and white styling
  const isLandingPage = pathname === "/";

  return (
    <header className={`relative flex flex-wrap p-4 gap-4 h-16 items-center justify-between z-50 transition-colors duration-300 ${isLandingPage ? '' : 'border-b'}`} style={{
      background: isLandingPage 
        ? (theme === 'dark' ? '#000000' : '#ffffff')
        : (theme === 'dark' 
          ? "linear-gradient(135deg, #2a1810 0%, #3d2518 50%, #2a1810 100%)"
          : "#d4c4a8"),
      borderBottomColor: !isLandingPage
        ? (theme === 'dark' ? '#3a3a3a' : '#c0b499')
        : 'transparent',
      boxShadow: isLandingPage 
        ? (theme === 'dark' 
          ? '0 2px 12px rgba(255,255,255,0.1)' 
          : '0 2px 8px rgba(0,0,0,0.1)')
        : (theme === 'dark' 
          ? '0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
          : '0 2px 8px rgba(139,115,85,0.15), inset 0 1px 0 rgba(255,255,255,0.4)')
    }}>
      {/* Wood grain texture - DISABLED to fix mobile menu clicking */}
      {false && !isLandingPage && (
        <>
          {/* Wood grain texture - organic flowing patterns */}
          <div
            className="pointer-events-none absolute inset-0 opacity-15"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 90% 45% at 25% 50%, rgba(139,69,19,0.06) 0%, rgba(160,82,45,0.08) 25%, rgba(101,67,33,0.04) 50%, rgba(139,69,19,0.03) 75%, transparent 100%),
                radial-gradient(ellipse 85% 40% at 75% 35%, rgba(160,82,45,0.05) 0%, rgba(139,69,19,0.06) 30%, rgba(139,69,19,0.04) 55%, rgba(101,67,33,0.02) 80%, transparent 100%),
                radial-gradient(ellipse 75% 50% at 45% 75%, rgba(101,67,33,0.05) 0%, rgba(139,69,19,0.07) 35%, rgba(160,82,45,0.04) 60%, rgba(139,69,19,0.02) 85%, transparent 100%)
              `,
            }}
          />
          {/* Wood knots and natural imperfections */}
          <div
            className="pointer-events-none absolute inset-0 opacity-12"
            style={{
              backgroundImage: `
                radial-gradient(circle 14px at 18% 32%, rgba(101,67,33,0.08) 0%, rgba(139,69,19,0.06) 35%, rgba(160,82,45,0.03) 65%, transparent 100%),
                radial-gradient(circle 12px at 82% 68%, rgba(139,69,19,0.07) 0%, rgba(101,67,33,0.05) 40%, rgba(139,69,19,0.02) 70%, transparent 100%),
                radial-gradient(circle 10px at 55% 48%, rgba(160,82,45,0.06) 0%, rgba(139,69,19,0.04) 45%, rgba(101,67,33,0.02) 75%, transparent 100%),
                radial-gradient(circle 16px at 38% 82%, rgba(101,67,33,0.07) 0%, rgba(160,82,45,0.05) 38%, rgba(139,69,19,0.03) 68%, transparent 100%),
                radial-gradient(circle 11px at 68% 18%, rgba(139,69,19,0.06) 0%, rgba(101,67,33,0.04) 42%, rgba(160,82,45,0.02) 72%, transparent 100%)
              `,
            }}
          />
          {/* Wood rings and growth patterns - organic curves */}
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 160px 28px at 50% 50%, rgba(139,69,19,0.03) 0%, rgba(160,82,45,0.02) 35%, rgba(101,67,33,0.01) 65%, transparent 100%),
                radial-gradient(ellipse 120px 22px at 25% 80%, rgba(101,67,33,0.02) 0%, rgba(139,69,19,0.02) 40%, rgba(160,82,45,0.01) 70%, transparent 100%),
                radial-gradient(ellipse 140px 25px at 75% 25%, rgba(160,82,45,0.02) 0%, rgba(101,67,33,0.02) 45%, rgba(139,69,19,0.01) 75%, transparent 100%)
              `,
            }}
          />
          {/* Wood cracks and natural splits - organic flowing patterns */}
          <div
            className="pointer-events-none absolute inset-0 opacity-8"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 70px 10px at 45% 50%, rgba(101,67,33,0.06) 0%, rgba(139,69,19,0.04) 35%, rgba(160,82,45,0.02) 65%, transparent 100%),
                radial-gradient(ellipse 55px 8px at 30% 35%, rgba(139,69,19,0.05) 0%, rgba(101,67,33,0.03) 40%, rgba(139,69,19,0.02) 70%, transparent 100%),
                radial-gradient(ellipse 65px 9px at 70% 75%, rgba(101,67,33,0.05) 0%, rgba(160,82,45,0.04) 38%, rgba(139,69,19,0.02) 68%, transparent 100%),
                radial-gradient(ellipse 50px 7px at 12% 15%, rgba(160,82,45,0.05) 0%, rgba(139,69,19,0.03) 42%, rgba(101,67,33,0.01) 72%, transparent 100%),
                radial-gradient(ellipse 60px 8px at 88% 88%, rgba(139,69,19,0.06) 0%, rgba(160,82,45,0.04) 36%, rgba(101,67,33,0.02) 66%, transparent 100%)
              `,
            }}
          />
          {/* Wood weathering and age spots */}
          <div
            className="pointer-events-none absolute inset-0 opacity-6"
            style={{
              backgroundImage: `
                radial-gradient(circle 4px at 28% 28%, rgba(101,67,33,0.08) 0%, rgba(139,69,19,0.05) 50%, transparent 100%),
                radial-gradient(circle 3px at 72% 48%, rgba(160,82,45,0.07) 0%, rgba(139,69,19,0.04) 45%, transparent 100%),
                radial-gradient(circle 5px at 42% 78%, rgba(101,67,33,0.06) 0%, rgba(139,69,19,0.03) 40%, transparent 100%),
                radial-gradient(circle 3.5px at 88% 22%, rgba(139,69,19,0.06) 0%, rgba(160,82,45,0.03) 55%, transparent 100%),
                radial-gradient(circle 4.5px at 12% 62%, rgba(101,67,33,0.07) 0%, rgba(139,69,19,0.04) 48%, transparent 100%),
                radial-gradient(circle 3.2px at 68% 18%, rgba(160,82,45,0.06) 0%, rgba(139,69,19,0.03) 52%, transparent 100%)
              `,
            }}
          />
          {/* Wood splintering and decay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-18"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 15px 3px at 30% 40%, rgba(101,67,33,0.25) 0%, rgba(139,69,19,0.12) 60%, transparent 100%),
                radial-gradient(ellipse 12px 2px at 70% 80%, rgba(160,82,45,0.22) 0%, rgba(139,69,19,0.11) 55%, transparent 100%),
                radial-gradient(ellipse 8px 4px at 55% 25%, rgba(101,67,33,0.28) 0%, rgba(139,69,19,0.14) 65%, transparent 100%)
              `,
            }}
          />
          {/* Wood water stains and discoloration */}
          <div
            className="pointer-events-none absolute inset-0 opacity-15"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 25px 15px at 20% 30%, rgba(139,69,19,0.15) 0%, rgba(160,82,45,0.08) 50%, transparent 100%),
                radial-gradient(ellipse 20px 12px at 80% 60%, rgba(101,67,33,0.12) 0%, rgba(139,69,19,0.06) 45%, transparent 100%),
                radial-gradient(ellipse 18px 10px at 45% 85%, rgba(160,82,45,0.14) 0%, rgba(139,69,19,0.07) 48%, transparent 100%)
              `,
            }}
          />
          {/* Wood worm holes and insect damage */}
          <div
            className="pointer-events-none absolute inset-0 opacity-4"
            style={{
              backgroundImage: `
                radial-gradient(circle 1.8px at 38% 38%, rgba(101,67,33,0.12) 0%, rgba(139,69,19,0.07) 70%, transparent 100%),
                radial-gradient(circle 1.5px at 85% 28%, rgba(160,82,45,0.10) 0%, rgba(139,69,19,0.06) 65%, transparent 100%),
                radial-gradient(circle 2px at 18% 72%, rgba(101,67,33,0.11) 0%, rgba(139,69,19,0.07) 68%, transparent 100%),
                radial-gradient(circle 1.6px at 62% 52%, rgba(139,69,19,0.10) 0%, rgba(160,82,45,0.05) 62%, transparent 100%),
                radial-gradient(circle 1.7px at 95% 78%, rgba(101,67,33,0.12) 0%, rgba(139,69,19,0.06) 66%, transparent 100%)
              `,
            }}
          />
          {/* Wood natural flow patterns and subtle curves */}
          <div
            className="pointer-events-none absolute inset-0 opacity-16"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 35px 4px at 50% 50%, rgba(101,67,33,0.18) 0%, rgba(139,69,19,0.12) 50%, rgba(160,82,45,0.06) 80%, transparent 100%),
                radial-gradient(ellipse 28px 3px at 25% 75%, rgba(139,69,19,0.15) 0%, rgba(101,67,33,0.09) 45%, rgba(160,82,45,0.04) 75%, transparent 100%),
                radial-gradient(ellipse 32px 5px at 75% 25%, rgba(160,82,45,0.16) 0%, rgba(139,69,19,0.1) 40%, rgba(101,67,33,0.05) 70%, transparent 100%),
                radial-gradient(ellipse 25px 3px at 10% 40%, rgba(101,67,33,0.14) 0%, rgba(160,82,45,0.08) 48%, rgba(139,69,19,0.03) 78%, transparent 100%),
                radial-gradient(ellipse 30px 4px at 90% 85%, rgba(139,69,19,0.17) 0%, rgba(160,82,45,0.11) 42%, rgba(101,67,33,0.04) 72%, transparent 100%)
              `,
            }}
          />
          {/* Wood nail holes and fasteners */}
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                radial-gradient(circle 2.5px at 12% 45%, rgba(32,32,32,0.8) 0%, rgba(64,64,64,0.4) 60%, transparent 100%),
                radial-gradient(circle 2.2px at 88% 35%, rgba(32,32,32,0.75) 0%, rgba(64,64,64,0.35) 55%, transparent 100%),
                radial-gradient(circle 2.8px at 55% 90%, rgba(32,32,32,0.82) 0%, rgba(64,64,64,0.42) 62%, transparent 100%)
              `,
            }}
          />
          {/* Wood figure patterns - flame and quilted grain */}
          <div
            className="pointer-events-none absolute inset-0 opacity-12"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 90px 25px at 25% 35%, rgba(184,134,11,0.06) 0%, rgba(160,82,45,0.04) 30%, rgba(139,69,19,0.02) 60%, transparent 100%),
                radial-gradient(ellipse 75px 20px at 75% 65%, rgba(160,82,45,0.05) 0%, rgba(139,69,19,0.03) 35%, rgba(101,67,33,0.015) 65%, transparent 100%),
                radial-gradient(ellipse 60px 18px at 45% 15%, rgba(139,69,19,0.055) 0%, rgba(160,82,45,0.035) 40%, rgba(184,134,11,0.02) 70%, transparent 100%)
              `,
            }}
          />
          {/* Wood medullary rays - subtle vertical lines */}
          <div
            className="pointer-events-none absolute inset-0 opacity-8"
            style={{
              backgroundImage: `
                linear-gradient(90deg, transparent 12%, rgba(184,134,11,0.04) 12.5%, rgba(184,134,11,0.04) 13%, transparent 13.5%, transparent 28%, rgba(160,82,45,0.03) 28.5%, rgba(160,82,45,0.03) 29%, transparent 29.5%, transparent 67%, rgba(139,69,19,0.035) 67.5%, rgba(139,69,19,0.035) 68%, transparent 68.5%),
                linear-gradient(90deg, transparent 45%, rgba(101,67,33,0.025) 45.5%, rgba(101,67,33,0.025) 46%, transparent 46.5%, transparent 82%, rgba(184,134,11,0.03) 82.5%, rgba(184,134,11,0.03) 83%, transparent 83.5%)
              `,
              backgroundSize: '150px 100%, 180px 100%',
            }}
          />
          {/* Wood subtle polish and reflection */}
          <div
            className="pointer-events-none absolute inset-0 opacity-6"
            style={{
              background: theme === 'dark'
                ? 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, transparent 25%, transparent 75%, rgba(184,134,11,0.04) 100%)'
                : 'linear-gradient(145deg, rgba(255,255,255,0.12) 0%, transparent 30%, transparent 70%, rgba(160,82,45,0.06) 100%)',
            }}
          />
          {/* Wood subtle directional grain flow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-3"
            style={{
              backgroundImage: `
                linear-gradient(45deg, transparent 25%, rgba(139,69,19,0.01) 25.5%, rgba(139,69,19,0.01) 26%, transparent 26.5%, transparent 45%, rgba(160,82,45,0.01) 45.5%, rgba(160,82,45,0.01) 46%, transparent 46.5%),
                linear-gradient(135deg, transparent 15%, rgba(101,67,33,0.01) 15.5%, rgba(101,67,33,0.01) 16%, transparent 16.5%, transparent 65%, rgba(139,69,19,0.005) 65.5%, rgba(139,69,19,0.005) 66%, transparent 66.5%)
              `,
              backgroundSize: '120px 120px, 150px 150px',
            }}
          />
          {/* Wood bark inclusions and mineral streaks */}
          <div
            className="pointer-events-none absolute inset-0 opacity-4"
            style={{
              backgroundImage: `
                radial-gradient(circle 7px at 20% 45%, rgba(85,107,47,0.06) 0%, rgba(107,142,35,0.03) 50%, transparent 100%),
                radial-gradient(circle 5px at 80% 30%, rgba(160,82,45,0.05) 0%, rgba(139,69,19,0.02) 55%, transparent 100%),
                radial-gradient(circle 6px at 38% 80%, rgba(101,67,33,0.04) 0%, rgba(85,107,47,0.02) 48%, transparent 100%),
                radial-gradient(circle 4px at 65% 15%, rgba(184,134,11,0.03) 0%, rgba(160,82,45,0.02) 52%, transparent 100%)
              `,
            }}
          />
          {/* Wood subtle checking and surface cracks */}
          <div
            className="pointer-events-none absolute inset-0 opacity-3"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 28px 3px at 25% 58%, rgba(101,67,33,0.06) 0%, rgba(139,69,19,0.03) 60%, transparent 100%),
                radial-gradient(ellipse 24px 2.5px at 75% 38%, rgba(139,69,19,0.05) 0%, rgba(160,82,45,0.02) 55%, transparent 100%),
                radial-gradient(ellipse 22px 3.5px at 58% 87%, rgba(101,67,33,0.05) 0%, rgba(139,69,19,0.03) 58%, transparent 100%),
                radial-gradient(ellipse 26px 2.2px at 10% 28%, rgba(160,82,45,0.06) 0%, rgba(101,67,33,0.02) 62%, transparent 100%)
              `,
            }}
          />
          {/* Wood natural resin pockets */}
          <div
            className="pointer-events-none absolute inset-0 opacity-2"
            style={{
              backgroundImage: `
                radial-gradient(circle 2.5px at 45% 40%, rgba(184,134,11,0.06) 0%, rgba(160,82,45,0.03) 70%, transparent 100%),
                radial-gradient(circle 2px at 65% 75%, rgba(160,82,45,0.05) 0%, rgba(139,69,19,0.02) 65%, transparent 100%),
                radial-gradient(circle 2.2px at 30% 70%, rgba(139,69,19,0.06) 0%, rgba(101,67,33,0.03) 68%, transparent 100%)
              `,
            }}
          />
        </>
      )}
      
      {/* Logo with rotating emojis */}
      <div className="flex items-center gap-2">
        <Link href="/" className={`text-xl font-bold tracking-tight lg:text-2xl lg:text-3xl ${isLandingPage ? (theme === 'dark' ? 'text-white' : 'text-black') : (theme === 'dark' ? 'text-amber-100' : 'text-amber-900')} hover:scale-105 transition-transform duration-200`} style={{
          textShadow: isLandingPage 
            ? 'none'
            : (theme === 'dark' 
              ? '0 1px 3px rgba(0,0,0,0.8), 0 0 12px rgba(184,134,11,0.4)'
              : '0 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(139,115,85,0.2)')
        }}>
          GlobeTalk
        </Link>
        <div className="flex items-center gap-1 relative" style={{ width: '48px', height: '48px' }}>
          {/* Previous emoji - animating out */}
          {isTransitioning && (
            <span 
              className={`text-4xl transform-gpu absolute inset-0 flex items-center justify-center ${isLandingPage ? (theme === 'dark' ? 'drop-shadow-lg' : 'drop-shadow-md') : (theme === 'dark' ? 'drop-shadow-lg' : 'drop-shadow-md')} ${theme === 'dark' ? 'drop-shadow-lg' : 'drop-shadow-md'}`}
              role="img" 
              aria-hidden="true"
              style={{
                transition: 'transform 0.35s ease-out, opacity 0.35s ease-out',
                transform: animationStyle === 0 ? 'scale(0.2) rotate(90deg)' // Gentle spin shrink
                  : animationStyle === 1 ? 'scale(0.3) translateY(-20px)' // Soft rise
                  : 'scale(0.2) rotate(-90deg)', // Gentle spin shrink (opposite)
                opacity: 0,
                filter: 'blur(2px)',
              }}
            >
              {rotatingEmojis[previousEmojiIndex]}
            </span>
          )}
          
          {/* Current emoji - always visible, animating in from opposite direction */}
          <span 
            key={currentEmojiIndex}
            className={`text-4xl transform-gpu absolute inset-0 flex items-center justify-center ${isLandingPage ? (theme === 'dark' ? 'drop-shadow-lg' : 'drop-shadow-md') : (theme === 'dark' ? 'drop-shadow-lg' : 'drop-shadow-md')} ${theme === 'dark' ? 'drop-shadow-lg' : 'drop-shadow-md'}`}
            role="img" 
            aria-label="rotating smiley emoji"
            style={{
              transition: 'transform 0.35s ease-out, filter 0.3s ease-out',
              filter: isLandingPage 
                ? (theme === 'dark' ? 'drop-shadow(0 2px 4px rgba(255,255,255,0.3))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))')
                : (theme === 'dark' 
                  ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                  : 'drop-shadow(0 1px 2px rgba(139,115,85,0.3))'),
              transform: 'scale(1) rotate(0deg) translate(0, 0)',
              animation: !isTransitioning ? 'emoji-idle 5s ease-in-out infinite' : 'emoji-pop-in 0.35s ease-out',
            }}
          >
            {rotatingEmojis[currentEmojiIndex]}
          </span>
          <style jsx>{`
            @keyframes emoji-idle {
              0%, 100% {
                transform: scale(1) rotate(0deg) translateY(0);
              }
              50% {
                transform: scale(1.02) rotate(2deg) translateY(-1px);
              }
            }
            
            @keyframes emoji-pop-in {
              0% {
                transform: scale(0.5) rotate(45deg);
                filter: blur(2px);
              }
              70% {
                transform: scale(1.05) rotate(-5deg);
                filter: blur(0px);
              }
              100% {
                transform: scale(1) rotate(0deg);
                filter: blur(0px);
              }
            }
            
            span:hover {
              animation: emoji-hover 0.4s ease-out !important;
              transform: scale(1.15) rotate(5deg) !important;
            }
            
            @keyframes emoji-hover {
              0% { transform: scale(1) rotate(0deg); }
              50% { transform: scale(1.2) rotate(8deg); }
              100% { transform: scale(1.15) rotate(5deg); }
            }
          `}</style>
        </div>
      </div>

      {/* Desktop Navigation (only when signed in) */}
      <SignedIn>
        <nav className="hidden lg:flex flex-grow justify-center">
          <ul className={`flex gap-4 ${isLandingPage ? (theme === 'dark' ? 'text-white' : 'text-black') : (theme === 'dark' ? 'text-amber-100' : 'text-amber-900')} font-semibold text-lg`} style={{
            textShadow: isLandingPage 
              ? 'none'
              : (theme === 'dark' 
                ? '0 1px 3px rgba(0,0,0,0.8)'
                : '0 1px 2px rgba(255,255,255,0.8)')
          }}>
            <li>
              <Link 
                href="/matchmaking" 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg hover:-translate-y-1 hover:rotate-1 ${isLandingPage ? (theme === 'dark' ? 'hover:bg-white/20 hover:shadow-white/20' : 'hover:bg-black/20 hover:shadow-black/20') : (theme === 'dark' ? 'hover:bg-amber-100/40 hover:shadow-amber-100/40' : 'hover:bg-amber-900/30 hover:shadow-amber-900/30')} ${
                  isActivePath('/matchmaking') 
                    ? `border-b-2 ${isLandingPage ? (theme === 'dark' ? 'border-white bg-white/20 text-white' : 'border-black bg-black/20 text-black') : (theme === 'dark' ? 'border-amber-400 bg-amber-100/40 text-amber-100' : 'border-amber-600 bg-amber-900/30 text-amber-900')} font-bold shadow-lg`
                    : `${isLandingPage ? (theme === 'dark' ? 'hover:bg-white/20 text-white' : 'hover:bg-black/20 text-black') : (theme === 'dark' ? 'hover:bg-amber-100/30 text-amber-100' : 'hover:bg-amber-900/20 text-amber-900')}`
                }`}
              >
                <Users className="h-4 w-4 flex-shrink-0" />
                <span>Find Pals</span>
              </Link>
            </li>
            <li>
              <Link 
                href="/inbox" 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg hover:-translate-y-1 hover:rotate-1 ${isLandingPage ? (theme === 'dark' ? 'hover:bg-white/20 hover:shadow-white/20' : 'hover:bg-black/20 hover:shadow-black/20') : (theme === 'dark' ? 'hover:bg-amber-100/40 hover:shadow-amber-100/40' : 'hover:bg-amber-900/30 hover:shadow-amber-900/30')} ${
                  isActivePath('/inbox') 
                    ? `border-b-2 ${isLandingPage ? (theme === 'dark' ? 'border-white bg-white/20 text-white' : 'border-black bg-black/20 text-black') : (theme === 'dark' ? 'border-amber-400 bg-amber-100/40 text-amber-100' : 'border-amber-600 bg-amber-900/30 text-amber-900')} font-bold shadow-lg`
                    : `${isLandingPage ? (theme === 'dark' ? 'hover:bg-white/20 text-white' : 'hover:bg-black/20 text-black') : (theme === 'dark' ? 'hover:bg-amber-100/30 text-amber-100' : 'hover:bg-amber-900/20 text-amber-900')}`
                }`}
              >
                <Inbox className="h-4 w-4 flex-shrink-0" />
                <span>My Inbox</span>
              </Link>
            </li>
            <li>
              <Link 
                href="/compose-letter" 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg hover:-translate-y-1 hover:rotate-1 ${isLandingPage ? (theme === 'dark' ? 'hover:bg-white/20 hover:shadow-white/20' : 'hover:bg-black/20 hover:shadow-black/20') : (theme === 'dark' ? 'hover:bg-amber-100/40 hover:shadow-amber-100/40' : 'hover:bg-amber-900/30 hover:shadow-amber-900/30')} ${
                  isActivePath('/compose-letter') 
                    ? `border-b-2 ${isLandingPage ? (theme === 'dark' ? 'border-white bg-white/20 text-white' : 'border-black bg-black/20 text-black') : (theme === 'dark' ? 'border-amber-400 bg-amber-100/40 text-amber-100' : 'border-amber-600 bg-amber-900/30 text-amber-900')} font-bold shadow-lg`
                    : `${isLandingPage ? (theme === 'dark' ? 'hover:bg-white/20 text-white' : 'hover:bg-black/20 text-black') : (theme === 'dark' ? 'hover:bg-amber-100/30 text-amber-100' : 'hover:bg-amber-900/20 text-amber-900')}`
                }`}
              >
                <PenTool className="h-4 w-4 flex-shrink-0" />
                <span>Write a Letter</span>
              </Link>
            </li>
            <li>
              <Link 
                href="/cultural-explorer" 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg hover:-translate-y-1 hover:rotate-1 ${isLandingPage ? (theme === 'dark' ? 'hover:bg-white/20 hover:shadow-white/20' : 'hover:bg-black/20 hover:shadow-black/20') : (theme === 'dark' ? 'hover:bg-amber-100/40 hover:shadow-amber-100/40' : 'hover:bg-amber-900/30 hover:shadow-amber-900/30')} ${
                  isActivePath('/cultural-explorer') 
                    ? `border-b-2 ${isLandingPage ? (theme === 'dark' ? 'border-white bg-white/20 text-white' : 'border-black bg-black/20 text-black') : (theme === 'dark' ? 'border-amber-400 bg-amber-100/40 text-amber-100' : 'border-amber-600 bg-amber-900/30 text-amber-900')} font-bold shadow-lg`
                    : `${isLandingPage ? (theme === 'dark' ? 'hover:bg-white/20 text-white' : 'hover:bg-black/20 text-black') : (theme === 'dark' ? 'hover:bg-amber-100/30 text-amber-100' : 'hover:bg-amber-900/20 text-amber-900')}`
                }`}
              >
                <Compass className="h-4 w-4 flex-shrink-0" />
                <span>Explore</span>
              </Link>
            </li>
            {profile?.moderator && (
              <li>
                <Link 
                  href="/moderation" 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg hover:-translate-y-1 hover:rotate-1 ${isLandingPage ? (theme === 'dark' ? 'hover:bg-white/20 hover:shadow-white/20' : 'hover:bg-black/20 hover:shadow-black/20') : (theme === 'dark' ? 'hover:bg-amber-100/40 hover:shadow-amber-100/40' : 'hover:bg-amber-900/30 hover:shadow-amber-900/30')} ${
                    isActivePath('/moderation') 
                      ? `border-b-2 ${isLandingPage ? (theme === 'dark' ? 'border-white bg-white/20 text-white' : 'border-black bg-black/20 text-black') : (theme === 'dark' ? 'border-amber-400 bg-amber-100/40 text-amber-100' : 'border-amber-600 bg-amber-900/30 text-amber-900')} font-bold shadow-lg`
                      : `${isLandingPage ? (theme === 'dark' ? 'hover:bg-white/20 text-white' : 'hover:bg-black/20 text-black') : (theme === 'dark' ? 'hover:bg-amber-100/30 text-amber-100' : 'hover:bg-amber-900/20 text-amber-900')}`
                  }`}
                >
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  <span>Moderation</span>
                </Link>
              </li>
            )}
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
            {/* Mobile: Hamburger menu */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  console.log('Hamburger clicked, current state:', isMobileNavOpen);
                  setIsMobileNavOpen(prev => !prev);
                }}
                className={`${isLandingPage ? (theme === 'dark' ? 'text-white hover:bg-white/20' : 'text-black hover:bg-black/20') : (theme === 'dark' ? 'text-amber-100 hover:bg-amber-900/30' : 'text-amber-900 hover:bg-amber-100/40')}`}
              >
                <Menu className={`${isLandingPage ? (theme === 'dark' ? 'text-white' : 'text-black') : (theme === 'dark' ? 'text-amber-100' : 'text-amber-900')}`} />
              </Button>
            </div>

            {/* Desktop: Theme toggle and Settings buttons */}
            <div className="hidden lg:flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/settings"
                aria-label="Open settings"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className={`transition-all duration-300 hover:scale-110 hover:shadow-lg hover:-translate-y-1 hover:rotate-1 ${isLandingPage ? (theme === 'dark' ? 'text-white hover:bg-white/20 hover:shadow-white/20' : 'text-black hover:bg-black/20 hover:shadow-black/20') : (theme === 'dark' ? 'text-amber-100 hover:bg-amber-900/40 hover:shadow-amber-100/40' : 'text-amber-900 hover:bg-amber-100/40 hover:shadow-amber-900/40')}`}
                  style={{
                    textShadow: isLandingPage 
                      ? 'none'
                      : (theme === 'dark' 
                        ? '0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(184,134,11,0.3)'
                        : '0 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(139,115,85,0.2)')
                  }}
                >
                  <Settings className={`h-5 w-5 transition-all duration-300 hover:rotate-90 hover:scale-110 ${isLandingPage ? (theme === 'dark' ? 'text-white' : 'text-black') : (theme === 'dark' ? 'text-amber-100' : 'text-amber-900')}`} />
                </Button>
              </Link>
            </div>

            <UserButton />
          </div>
        </SignedIn>


      </div>

      {/* Conditionally Render MobileNav (only shows when signed in and fully loaded) */}
      <SignedIn>
        {isMobileNavOpen && isLoaded && (
          <div className={`absolute top-16 left-0 w-full ${isLandingPage ? (theme === 'dark' ? 'bg-black' : 'bg-white') : (theme === 'dark' ? 'bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900' : 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50')} z-30 lg:hidden border-t ${isLandingPage ? (theme === 'dark' ? 'border-white' : 'border-black') : (theme === 'dark' ? 'border-amber-700' : 'border-amber-200')}`} style={{
            boxShadow: isLandingPage 
              ? (theme === 'dark' 
                ? '0 4px 12px rgba(255,255,255,0.1)' 
                : '0 4px 8px rgba(0,0,0,0.1)')
              : (theme === 'dark' 
                ? '0 4px 12px rgba(0,0,0,0.4)' 
                : '0 4px 8px rgba(139,115,85,0.15)')
          }}>
            <DynamicMobileNav closeNav={() => setIsMobileNavOpen(false)} />
          </div>
        )}
      </SignedIn>
    </header>
  );
}
