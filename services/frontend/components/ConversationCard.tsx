'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import wc from 'world-countries';
import { useSyncProfile } from '@/lib/context/ProfileContext';
import waxseal from '@/public/wax.png';
import { SearchUsersResponseItem } from '../lib/MessagingApiClient';
import './animations.css';

/* ---------- Static visual constants (do not change with showHobbies) ---------- */
const WAX = { SIZE: 64, TOP: 60 } as const;
const STAMP = {
  W: 64,
  H: 46,
  TOP: 12,
  RIGHT: 12,
  ROTATE: 6,
  PAPER: '#faf4e7',
  BORDER: 'rgba(27,31,41,.12)',
} as const;
const MSG_PAPER_BASE = '#fff8ee';

/* ---------- Country → ISO alpha-2 (Omitted for brevity, no changes) ---------- */
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|of|and|republic|kingdom|federation|state|states|democratic|people|islamic|united)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const COUNTRY_INDEX: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const c of wc) {
    const code = (c.cca2 || '').toUpperCase();
    if (!code) continue;
    const aliases: string[] = [];
    if (c.name?.common) aliases.push(c.name.common);
    if (c.name?.official) aliases.push(c.name.official);
    if (Array.isArray(c.altSpellings)) aliases.push(...c.altSpellings);
    if (c.name?.common === 'United States') aliases.push('USA', 'US', 'United States of America', 'America');
    if (c.name?.common === 'United Kingdom') aliases.push('UK', 'Great Britain', 'Britain');
    if (c.name?.common === 'Czechia') aliases.push('Czech Republic');
    if (c.name?.common === 'Myanmar') aliases.push('Burma');
    if (c.name?.common === 'Côte d’Ivoire') aliases.push("Cote d'Ivoire", 'Ivory Coast');
    if (c.name?.common === 'South Korea') aliases.push('Republic of Korea', 'Korea, Republic of');
    if (c.name?.common === 'North Korea') aliases.push("Korea, Democratic People's Republic of", 'DPRK');
    if (c.name?.common === 'Russia') aliases.push('Russian Federation');
    if (c.name?.common === 'Vietnam') aliases.push('Viet Nam');
    for (const raw of aliases) {
      const key = norm(raw);
      if (key && !map.has(key)) map.set(key, code);
    }
  }
  return map;
})();

function resolveAlpha2(country: string | null | undefined): string | null {
  if (!country) return null;
  if (/^[A-Za-z]{2}$/.test(country)) return country.toUpperCase();
  let code = COUNTRY_INDEX.get(norm(country));
  if (code) return code;
  for (const p of country.split(',').map((x) => x.trim())) {
    code = COUNTRY_INDEX.get(norm(p));
    if (code) return code;
  }
  const stripped = country
    .replace(/\(.*\)/g, '')
    .replace(/Republic of|Kingdom of|Federation of|State of|Province of/gi, '')
    .trim();
  return COUNTRY_INDEX.get(norm(stripped)) || null;
}

/* ----------------------- Flapping Flag Component (Omitted for brevity, no changes) ----------------------- */
const FlappingFlag: React.FC<{ country: string | null | undefined }> = ({ country }) => {
  const alpha2 = resolveAlpha2(country)?.toLowerCase();

  if (!alpha2) return null;

  return (
    <>
      {/* SVG filter definition... */}
      <svg width="0" height="0" style={{ position: 'absolute', visibility: 'hidden' }}>
        <defs>
          <filter id="flag-flutter-effect">
            <feTurbulence type="fractalNoise" baseFrequency="0.05 0.08" numOctaves="2" seed="7" result="noise" />
            <feOffset dx="0" dy="0" in="noise" result="scrollingNoise">
              <animate
                attributeName="dx"
                values="-200;-100;0;100;200;100;0;-100;-200"
                dur="10s"
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.125;0.25;0.375;0.5;0.625;0.75;0.875;1"
                keySplines="0.1 0 0.9 1;0.1 0 0.9 1;0.1 0 0.9 1;0.1 0 0.9 1;0.1 0 0.9 1;0.1 0 0.9 1;0.1 0 0.9 1;0.1 0 0.9 1"
              />
            </feOffset>
            <feDisplacementMap in="SourceGraphic" in2="scrollingNoise" scale="5" xChannelSelector="A" yChannelSelector="A" />
          </filter>
        </defs>
      </svg>

      {/* The flag stamp */}
      <div
        className="flapping-flag"
        style={{
          width: STAMP.W,
          height: STAMP.H,
          transform: `rotate(${STAMP.ROTATE}deg)`,
          filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.22))',
          transition: 'transform 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        }}
        aria-label={country ? `Stamp: ${country} flag` : 'Stamp'}
      >
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            borderRadius: 7,
            background: STAMP.PAPER,
            boxShadow: '0 1px 0 rgba(255,255,255,.6), 0 6px 14px rgba(0,0,0,.14)',
            border: `1px solid ${STAMP.BORDER}`,
            filter: 'url(#flag-flutter-effect)',
          }}
        >
          <Image src={`https://flagcdn.com/w160/${alpha2}.png`} alt={country ? `Flag of ${country}` : 'Country flag'} fill sizes={`${STAMP.W}px`} className="object-cover pointer-events-none" priority={false} />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: 'inset 0 1px 6px rgba(0,0,0,.18), inset 0 0 0 1px rgba(0,0,0,.08)',
              borderRadius: 7,
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              width: STAMP.W * 1.15,
              height: 16,
              left: -STAMP.W * 0.25,
              top: STAMP.H * 0.6,
              transform: 'rotate(-12deg)',
              background: 'repeating-linear-gradient(90deg, rgba(30,30,30,.18) 0 14px, transparent 14px 26px)',
            }}
            aria-hidden
          />
        </div>
      </div>
    </>
  );
};

/* -------------------------- Props (Omitted for brevity, no changes) -------------------------- */
interface ConversationCardProps {
  conversation: SearchUsersResponseItem;
  formatMessagePreview: (content: string, maxLength?: number) => string;
  formatTimeAgo: (dateString: string) => string;
  getDeliveryStatusBadge: (
    status: string,
    fromMe: boolean,
    scheduledISO?: string,
    inTransitOrIsRead?: boolean,
  ) => React.ReactNode;
  onClick?: (conversation: SearchUsersResponseItem) => void;
  tabIndex?: number;
  role?: string;
  'aria-label'?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  showHobbies?: boolean | 0 | 1;
}

/* --------------------- Envelope Card ----------------------- */
const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  formatMessagePreview,
  formatTimeAgo,
  getDeliveryStatusBadge,
  onClick,
  tabIndex,
  role,
  'aria-label': ariaLabel,
  onKeyDown,
  showHobbies = true, // default ON
}) => {
  const { user_profile, latest_message } = conversation;
  const { profile } = useSyncProfile();

  const shouldShowHobbies = !!showHobbies;

  const lm: any = latest_message ?? {};
  const myId = profile?.user_id;

  const fromMe = typeof lm.from_me === 'boolean' ? lm.from_me : lm.sender_id && myId ? lm.sender_id === myId : false;
  const isRead = typeof lm.is_read === 'boolean' ? lm.is_read : Boolean(lm.read_at);
  const scheduledAtISO: string | undefined = lm.scheduled_delivery_at;
  const deliveryStatus: string | undefined = lm.delivery_status;
  const nextOutgoingISO = (conversation.next_outgoing_at || undefined) as string | undefined;
  const hasOutgoingFuture =
    Boolean(conversation.in_transit_from_me) || (nextOutgoingISO ? Date.parse(nextOutgoingISO) > Date.now() : false);
  const isNewIncoming = !fromMe && !isRead;

  const handleClick = () => {
    if (isSealBreaking) return;
    if (isNewIncoming) {
      setIsSealBreaking(true);
      setTimeout(() => {
        setIsSealBreaking(false);
        onClick?.(conversation);
      }, 1200);
    } else {
      onClick?.(conversation);
    }
  };

  const [poleVisible, setPoleVisible] = useState(false);
  const [animationsReady, setAnimationsReady] = useState(false);
  const [isSealBreaking, setIsSealBreaking] = useState(false);
  const stampRef = useRef<HTMLDivElement>(null);
  const initialTransformRef = useRef<string | null>(null);
  const alpha2 = resolveAlpha2(user_profile.country_code || user_profile.anonymous_handle)?.toLowerCase();

  useEffect(() => {
    if (stampRef.current && !initialTransformRef.current) {
      initialTransformRef.current = getComputedStyle(stampRef.current).transform;
      setTimeout(() => setAnimationsReady(true), 0);
    }
  }, [setAnimationsReady]);

  useEffect(() => {
    if (!alpha2) return;
    const animationId = { current: 0 };
    const checkAlignment = () => {
      if (stampRef.current) {
        const currentTransform = getComputedStyle(stampRef.current).transform;
        if (currentTransform !== initialTransformRef.current) {
          setPoleVisible(true);
        } else {
          setPoleVisible(false);
        }
      }
      animationId.current = requestAnimationFrame(checkAlignment);
    };
    checkAlignment();
    return () => {
      if (animationId.current) cancelAnimationFrame(animationId.current);
    };
  }, [alpha2]);

  /* --- FIX 1: Added the missing 'return (' statement --- */
  return (
    <article
      className={`
        group relative w-full flex flex-col cursor-pointer
        rounded-b-xl rounded-t-2xl transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-rose-600/40 focus:ring-offset-2
        hover:-translate-y-1
        z-10 hover:z-50 /* Prevents overlap */
        m-4 /* FIXED: Better spacing between cards */
      `}
      style={{
        background: 'linear-gradient(135deg,#f4f1e8 0%,#e8dcc0 30%,#d4c4a8 70%,#c4b08f 100%)',
        boxShadow:
          '0 8px 32px -8px rgba(101,67,33,.4), 0 4px 16px rgba(101,67,33,.3), inset 0 2px 0 rgba(255,255,255,.15), inset 0 -1px 0 rgba(0,0,0,.1), 0 0 40px rgba(184,134,11,.2)',
        minHeight: '250px',
        width: '350px',
        // transform: 'scale(1.15)', // FIXED: Removed this to fix spacing
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        filter: 'drop-shadow(0 0 20px rgba(184,134,11,0.15))',
        overflow: 'visible', // Allow letter to slide out beyond envelope
      }}
      onClick={handleClick}
      tabIndex={tabIndex ?? 0}
      role={role ?? 'button'}
      aria-label={ariaLabel ?? `Open conversation with ${user_profile.anonymous_handle}`}
      onKeyDown={
        onKeyDown ??
        ((e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        })
      }
      aria-describedby={`conversation-status-${user_profile.anonymous_handle}`}
    >
      {/* --- Texture overlays (no changes) --- */}
      <div
        className="pointer-events-none absolute inset-0 rounded-b-xl rounded-t-2xl opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(139,115,85,0.3) 1px, transparent 1px),
            radial-gradient(circle at 80% 80%, rgba(160,130,100,0.2) 1px, transparent 1px),
            radial-gradient(circle at 60% 40%, rgba(120,90,60,0.25) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px, 45px 45px, 25px 25px',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-b-xl rounded-t-2xl opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(45deg, transparent 40%, rgba(101,67,33,0.1) 41%, rgba(101,67,33,0.1) 59%, transparent 60%),
            linear-gradient(-45deg, transparent 40%, rgba(101,67,33,0.08) 41%, rgba(101,67,33,0.08) 59%, transparent 60%)
          `,
          backgroundSize: '20px 20px',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-b-xl rounded-t-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(139,115,85,0.15) 0%, transparent 20%, transparent 80%, rgba(101,67,33,0.1) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-b-xl rounded-t-2xl opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(circle at 15% 25%, rgba(255,215,0,0.8) 1px, transparent 1px),
            radial-gradient(circle at 85% 15%, rgba(255,215,0,0.6) 1px, transparent 1px),
            radial-gradient(circle at 45% 75%, rgba(184,134,11,0.7) 1px, transparent 1px),
            radial-gradient(circle at 75% 85%, rgba(255,215,0,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '25px 25px, 35px 35px, 20px 20px, 30px 30px',
          animation: 'sparkle-twinkle 4s ease-in-out infinite alternate',
        }}
      />
      {/* --- END NEW TEXTURE OVERLAYS --- */}

      {/* -------------------- Body (From/Interests) --------------------- */}
      <div
        className="relative flex flex-col px-6 pb-6 pt-20 h-full 
                        transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]
                        group-hover:translate-y-2"
        style={{
          zIndex: 50, /* Above everything - text and interests always visible */
          transform: 'translateZ(0px)',
        }}
      >
        <section
          className="transition-transform duration-600"
          aria-labelledby={`user-info-${user_profile.anonymous_handle}`}
        >
          <div className="text-base uppercase tracking-wider select-none font-bold mb-1" style={{fontFamily: '"Brush Script MT", cursive', fontStyle: 'italic', color: '#8B4513', textShadow: '0 1px 2px rgba(0,0,0,0.1)'}}>
            {fromMe ? 'To:' : 'From:'}
          </div>
          <h2
            id={`user-info-${user_profile.anonymous_handle}`}
            className="font-bold text-gray-800 select-none text-lg uppercase"
          >
            {user_profile.anonymous_handle}
          </h2>

          {/* --- FIX 2: Changed this condition to safely check for interests --- */}
          {!!shouldShowHobbies && user_profile.interests && user_profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2" role="list" aria-label="User interests">
              {user_profile.interests.slice(0, 3).map((interest, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-600/90 text-white shadow-sm"
                  role="listitem"
                >
                  {interest}
                </span>
              ))}
              {user_profile.interests.length > 3 && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-white/90 shadow-sm"
                  role="listitem"
                  aria-label={`And ${user_profile.interests.length - 3} more interests`}
                >
                  +{user_profile.interests.length - 3}
                </span>
              )}
            </div>
          )}
        </section>
      </div>

      {/* --- Envelope Flap (3D Object) --- */}
      <div
        className="absolute inset-x-0 top-0 overflow-visible
                      transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{
          height: 80,
          perspective: '1000px',
          transform: 'translateZ(1px)',
          zIndex: 25, // Below letter when it slides out
        }}
      >
        {/* This is the 3D object that flips */}
        <div
          className="flap-3d w-full h-full transform-gpu 
                         transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] 
                         transform-origin-top 
                         group-hover:[transform:rotateX(-180deg)]"
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Front of Flap (Light paper) */}
          <div
            className="flap-face absolute inset-0"
            style={{
              clipPath: 'polygon(5% 0, 50% 100%, 95% 0)',
              background: 'linear-gradient(180deg, #d4c4a8 0%, #c4b08f 50%, #b8a482 100%)',
              border: `1px solid rgba(101,67,33,.85)`,
              boxShadow: '0 6px 16px rgba(0,0,0,.25), inset 0 2px 0 rgba(255,255,255,.25), inset 0 -2px 4px rgba(101,67,33,.2)',
              backfaceVisibility: 'hidden',
            }}
            aria-hidden
          />
          {/* Back of Flap (FIXED: Dark inside) */}
          <div
            className="flap-face absolute inset-0"
            style={{
              clipPath: 'polygon(5% 0, 50% 100%, 95% 0)',
              // --- FIXED: Dark background for inside of flap ---
              background: 'linear-gradient(180deg,#2d1810,#1a0f08)',
              border: `1px solid #1a0f08`,
              boxShadow: 'none',
              // --- END FIX ---
              transform: 'rotateX(180deg)',
              backfaceVisibility: 'hidden',
            }}
            aria-hidden
          />
        </div>

      </div>
      {/* --- END FIXED FLAP --- */}

      {/* Wax seal - outside flap container */}
        {isNewIncoming && (
          <div
          className={`absolute left-1/2 -translate-x-1/2 pointer-events-none transform-gpu transition-all duration-300 ${
              isSealBreaking ? 'animate-seal-break' : 'group-hover:scale-110 group-hover:rotate-2'
            }`}
            style={{
              top: 48,
              filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))',
              width: 64,
              height: 64,
            zIndex: 50,
            }}
            aria-hidden
          >
            <Image src={waxseal} alt="Wax seal" fill className="select-none object-contain" />
          </div>
        )}

      {/* Flag - outside flap container, always on top */}
        <div
          ref={stampRef}
        className={`flag-assembly ${animationsReady ? 'animate-wave-sway' : ''}`}
          style={{
            position: 'absolute',
          top: STAMP.TOP - 2,
            right: STAMP.RIGHT,
          zIndex: 50, // Above envelope body - flag always visible
            transformOrigin: 'bottom center',
          }}
        >
          <div
            className="flagpole"
            style={{
              opacity: poleVisible ? 1 : 0,
            }}
            aria-hidden
          />
          <FlappingFlag country={user_profile.country_code || user_profile.anonymous_handle} />
        </div>

      {/* Static Back Flap - behind letter */}
      <div
        className="absolute overflow-visible"
        style={{
          top: 0,
          left: '2.5%',
          right: '2.5%',
          width: '95%',
          height: 100,
          clipPath: 'polygon(2.6% 0%, 50% 100%, 97.4% 0%)',
          background: 'linear-gradient(180deg, #d4c4a8 0%, #c4b08f 50%, #b8a482 100%)',
          border: `1px solid rgba(101,67,33,.85)`,
          boxShadow: '0 6px 16px rgba(0,0,0,.25), inset 0 2px 0 rgba(255,255,255,.25), inset 0 -2px 4px rgba(101,67,33,.2)',
          zIndex: 25, // Behind letter
        }}
        aria-hidden
      />

      {/* Left envelope side - clips left side aligned with static flap */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0,
          left: 0,
          width: '50%',
          height: 90,
          background: 'linear-gradient(135deg,#f4f1e8 0%,#e8dcc0 30%,#d4c4a8 70%,#c4b08f 100%)',
          clipPath: 'polygon(0 0, 5% 12%, 100% 100%, 0 100%)', // Left triangle aligned with flap
          zIndex: 40, // Above letter - clips it
          borderRadius: '1.5rem 0 0 0',
          overflow: 'hidden',
        }}
        aria-hidden
      >
        {/* Texture overlays for left side */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(139,115,85,0.3) 1px, transparent 1px),
            radial-gradient(circle at 80% 80%, rgba(160,130,100,0.2) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px, 45px 45px',
        }} />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `linear-gradient(45deg, transparent 40%, rgba(101,67,33,0.1) 41%, rgba(101,67,33,0.1) 59%, transparent 60%)`,
          backgroundSize: '20px 20px',
        }} />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `
            radial-gradient(circle at 15% 25%, rgba(255,215,0,0.8) 1px, transparent 1px),
            radial-gradient(circle at 75% 85%, rgba(255,215,0,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '25px 25px, 30px 30px',
          animation: 'sparkle-twinkle 4s ease-in-out infinite alternate',
        }} />
      </div>
      
      {/* Right envelope side - clips right side aligned with static flap */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0,
          right: 0,
          width: '50%',
          height: 90,
          background: 'linear-gradient(135deg,#f4f1e8 0%,#e8dcc0 30%,#d4c4a8 70%,#c4b08f 100%)',
          clipPath: 'polygon(95% 12%, 100% 0, 100% 100%, 0 100%)', // Right triangle aligned with flap
          zIndex: 40, // Above letter - clips it
          borderRadius: '0 1.5rem 0 0',
          overflow: 'hidden',
        }}
        aria-hidden
      >
        {/* Texture overlays for right side */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(139,115,85,0.3) 1px, transparent 1px),
            radial-gradient(circle at 80% 80%, rgba(160,130,100,0.2) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px, 45px 45px',
        }} />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `linear-gradient(45deg, transparent 40%, rgba(101,67,33,0.1) 41%, rgba(101,67,33,0.1) 59%, transparent 60%)`,
          backgroundSize: '20px 20px',
        }} />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `
            radial-gradient(circle at 15% 25%, rgba(255,215,0,0.8) 1px, transparent 1px),
            radial-gradient(circle at 75% 85%, rgba(255,215,0,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '25px 25px, 30px 30px',
          animation: 'sparkle-twinkle 4s ease-in-out infinite alternate',
        }} />
      </div>
      
      {/* Bottom envelope body - below the triangular opening */}
      <div
        className="absolute inset-x-0 pointer-events-none"
        style={{
          top: 80,
          bottom: 0,
          background: 'linear-gradient(135deg,#f4f1e8 0%,#e8dcc0 30%,#d4c4a8 70%,#c4b08f 100%)',
          zIndex: 40, // Above letter - clips it
          borderRadius: '0 0 0.75rem 0.75rem',
        }}
        aria-hidden
      >
        {/* Texture overlays for bottom */}
        <div className="absolute inset-0 rounded-b-xl opacity-40" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(139,115,85,0.3) 1px, transparent 1px),
            radial-gradient(circle at 80% 80%, rgba(160,130,100,0.2) 1px, transparent 1px),
            radial-gradient(circle at 60% 40%, rgba(120,90,60,0.25) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px, 45px 45px, 25px 25px',
        }} />
        <div className="absolute inset-0 rounded-b-xl opacity-20" style={{
          backgroundImage: `
            linear-gradient(45deg, transparent 40%, rgba(101,67,33,0.1) 41%, rgba(101,67,33,0.1) 59%, transparent 60%),
            linear-gradient(-45deg, transparent 40%, rgba(101,67,33,0.08) 41%, rgba(101,67,33,0.08) 59%, transparent 60%)
          `,
          backgroundSize: '20px 20px',
        }} />
        <div className="absolute inset-0 rounded-b-xl" style={{
          background: 'linear-gradient(135deg, rgba(139,115,85,0.15) 0%, transparent 20%, transparent 80%, rgba(101,67,33,0.1) 100%)',
        }} />
        <div className="absolute inset-0 rounded-b-xl opacity-30" style={{
          backgroundImage: `
            radial-gradient(circle at 15% 25%, rgba(255,215,0,0.8) 1px, transparent 1px),
            radial-gradient(circle at 85% 15%, rgba(255,215,0,0.6) 1px, transparent 1px),
            radial-gradient(circle at 45% 75%, rgba(184,134,11,0.7) 1px, transparent 1px),
            radial-gradient(circle at 75% 85%, rgba(255,215,0,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '25px 25px, 35px 35px, 20px 20px, 30px 30px',
          animation: 'sparkle-twinkle 4s ease-in-out infinite alternate',
        }} />
      </div>


      {/* Message preview — Slides out from inside envelope on hover */}
      <section
        aria-labelledby={`message-preview-${user_profile.anonymous_handle}`}
        className="
          absolute left-6 right-6 
          opacity-0 
          pointer-events-none 
          transform-gpu
          transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] delay-200
          group-hover:opacity-100 
          group-hover:pointer-events-auto 
          group-hover:-translate-y-[calc(100%+5rem)]
        "
        style={{
          top: 160, // Start slightly lower inside the envelope
          zIndex: 35, // Above flaps, below envelope edges
          filter: 'drop-shadow(0 16px 36px rgba(0,0,0,0.18))',
        }}
      >
        <div
          className="relative border border-amber-300 shadow-lg overflow-hidden"
          style={{
            background: 'linear-gradient(180deg,#f4f1e8,#e8dcc0)',
            boxShadow:
              '0 8px 32px -8px rgba(101,67,33,.4), 0 4px 16px rgba(101,67,33,.3), inset 0 2px 0 rgba(255,255,255,.15), inset 0 -1px 0 rgba(0,0,0,.1), 0 0 40px rgba(184,134,11,.2)',
            minHeight: '180px',
            width: '100%',
            filter: 'drop-shadow(0 0 20px rgba(184,134,11,0.15))',
            borderRadius: '1.25rem',
          }}
        >
          {/* ... (Texture overlays) ... */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              borderRadius: '1.25rem',
              backgroundImage: `
                radial-gradient(circle at 20% 20%, rgba(139,115,85,0.3) 1px, transparent 1px),
                radial-gradient(circle at 80% 80%, rgba(160,130,100,0.2) 1px, transparent 1px),
                radial-gradient(circle at 60% 40%, rgba(120,90,60,0.25) 1px, transparent 1px)
              `,
              backgroundSize: '30px 30px, 45px 45px, 25px 25px',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              borderRadius: '1.25rem',
              backgroundImage: `
                linear-gradient(45deg, transparent 40%, rgba(101,67,33,0.1) 41%, rgba(101,67,33,0.1) 59%, transparent 60%),
                linear-gradient(-45deg, transparent 40%, rgba(101,67,33,0.08) 41%, rgba(101,67,33,0.08) 59%, transparent 60%)
              `,
              backgroundSize: '20px 20px',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: '1.25rem',
              background: 'linear-gradient(135deg, rgba(139,115,85,0.15) 0%, transparent 20%, transparent 80%, rgba(101,67,33,0.1) 100%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              borderRadius: '1.25rem',
              backgroundImage: `
                radial-gradient(circle at 15% 25%, rgba(255,215,0,0.8) 1px, transparent 1px),
                radial-gradient(circle at 85% 15%, rgba(255,215,0,0.6) 1px, transparent 1px),
                radial-gradient(circle at 45% 75%, rgba(184,134,11,0.7) 1px, transparent 1px),
                radial-gradient(circle at 75% 85%, rgba(255,215,0,0.5) 1px, transparent 1px)
              `,
              backgroundSize: '25px 25px, 35px 35px, 20px 20px, 30px 30px',
              animation: 'sparkle-twinkle 4s ease-in-out infinite alternate',
            }}
          />

          <div className="relative p-4 pb-8">
            {/* Subtle ruled lines like writing paper */}
            <div className="absolute inset-0 pointer-events-none opacity-10" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(139,115,85,0.3) 31px, rgba(139,115,85,0.3) 32px)',
              backgroundSize: '100% 32px',
              marginTop: '60px'
            }} />
            
            <h3 id={`message-preview-${user_profile.anonymous_handle}`} className="text-xs text-amber-700/80 mb-3 font-mono font-semibold uppercase tracking-wider">
              📜 Letter Contents
            </h3>

            {latest_message ? (
              <div className="space-y-3">
                {/* Decorative corner flourishes */}
                <div className="absolute top-2 left-2 w-8 h-8 opacity-20 pointer-events-none" style={{
                  borderTop: '2px solid #8B4513',
                  borderLeft: '2px solid #8B4513',
                  borderRadius: '4px 0 0 0'
                }} />
                <div className="absolute top-2 right-2 w-8 h-8 opacity-20 pointer-events-none" style={{
                  borderTop: '2px solid #8B4513',
                  borderRight: '2px solid #8B4513',
                  borderRadius: '0 4px 0 0'
                }} />
                
                <div className="text-slate-800 text-sm leading-relaxed font-serif">
                  <span className="text-slate-600 not-italic text-xs block mb-2">{fromMe && showHobbies ? 'From you:' : 'Message:'}</span>
                  <span className="sr-only">{!fromMe && !isRead ? 'Unread message: ' : 'Message: '}</span>
                  <span className="text-slate-700 italic">&ldquo;{formatMessagePreview(lm.message_content ?? '', 120)}&rdquo;</span>
                </div>
                <div className="flex items-center justify-center pt-2 border-t border-amber-200/30">
                  {/* Status badge was removed from here in your code, so I've left it out */}
                  <div className="text-[10px] text-amber-600/80 font-mono">
                    {scheduledAtISO && showHobbies ? formatTimeAgo(scheduledAtISO) : ''}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 italic text-sm text-center py-4">
                📭 No message yet...
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Screen-reader status (no changes) */}
      <div id={`conversation-status-${user_profile.anonymous_handle}`} className="sr-only">
        {!latest_message
          ? `No messages exchanged yet with ${user_profile.anonymous_handle}`
          : !fromMe && !isRead
          ? `You have an unread message from ${user_profile.anonymous_handle}`
          /* --- FIX 3: Changed this to safely call formatTimeAgo --- */
          : `Latest message exchanged ${scheduledAtISO ? formatTimeAgo(scheduledAtISO) : 'recently'}`}
      </div>
    </article>
  );
};

export default ConversationCard;