import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import TemplateSidePanel from "./TemplateSidePanel";
import { LineConfig, LineType } from "./ComposeLetterContext"; // Import from context
import { Heart, Send, BarChart3, Clock, Gauge, Info, ChevronDown, FileDown, ImageDown, X } from "lucide-react";
import LetterSendAnimation from "./LetterSendAnimation";
import { adjustFontSizeForExport } from "../lib/jpegGenerator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSyncProfile } from '@/lib/context/ProfileContext';
import Image from 'next/image';
import wc from 'world-countries';
import waxseal from '@/public/wax.png';
import './animations.css';

// FONT_PRESETS definition (assuming this is what's needed)
const FONT_PRESETS = [
  { id: 'handwritten', name: 'Handwritten', lineHeight: '1.6', letterSpacing: '0.05em' },
  { id: 'serif', name: 'Serif', lineHeight: '1.5', letterSpacing: '0.02em' },
  { id: 'sans-serif', name: 'Sans Serif', lineHeight: '1.4', letterSpacing: '0.01em' },
];

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

/* ---------- Country → ISO alpha-2 ---------- */
const norm = (s: string) =>
  s.toLowerCase()
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

/* ----------------------- Flapping Flag Component ----------------------- */
const FlappingFlag: React.FC<{ country: string | null | undefined }> = ({ country }) => {
  const alpha2 = resolveAlpha2(country)?.toLowerCase();

  if (!alpha2) return null;

  return (
    <>
      {/* SVG filter definition - must be in DOM before use */}
      <svg width="0" height="0" style={{ position: 'absolute', visibility: 'hidden' }}>
        <defs>
          <filter id="flag-flutter-effect">
            
      <feTurbulence 
        type="fractalNoise" 
        baseFrequency="0.05 0.08" 
        numOctaves="2" 
        seed="7" 
        result="noise" />            <feOffset dx="0" dy="0" in="noise" result="scrollingNoise">
              <animate 
                attributeName="dx" 
                values="-200;-100;0;100;200;100;0;-100;-200" 
                dur="10s" 
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.125;0.25;0.375;0.5;0.625;0.75;0.875;1"
                keySplines="0.1 0 0.9 1;0.1 0 0.9 1;0.1 0 0.9 1;0.1 0 0.9 1;0.1 0 0.9 1;0.1 0 0.9 1;0.1 0 0.9 1;0.1 0 0.9 1" />
            </feOffset>
            
            <feDisplacementMap 
              in="SourceGraphic" 
              in2="scrollingNoise" 
              scale="5" 
              xChannelSelector="A" 
              yChannelSelector="A" />
              
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
          <Image
            src={`https://flagcdn.com/w160/${alpha2}.png`}
            alt={country ? `Flag of ${country}` : 'Country flag'}
            fill
            sizes={`${STAMP.W}px`}
            className="object-cover pointer-events-none"
            priority={false}
          />
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
              background:
                'repeating-linear-gradient(90deg, rgba(30,30,30,.18) 0 14px, transparent 14px 26px)',
            }}
            aria-hidden
          />
        </div>
      </div>
    </>
  );
};

interface Match {
  id: string
  name: string
  location: string
  interests: string[]
  conversation_thread_id: string
  match_id?: string
}

// Character limits
const MAIN_CONTENT_LIMIT = 1500;

interface RightSidebarProps {
  onSend: () => void;
  onExportPDF: () => void;
  // onExportJPG can be called with no args to trigger a download, or with a
  // callback to receive the generated JPEG data URL (used by the send flow).
  onExportJPG: ((callback?: (dataUrl: string | null) => void) => void) | undefined;
  sending?: boolean;
  sendDisabled?: boolean;
  wordCount: number;
  charCount: number;
  readingTime: string | number;
  readability?: string | number;
  selectedMatch: Match | null;
  anonymousHandle?: string;
  fontStyle?: string;
  letterFooterPrefix?: string;
  templateBackground?: string | null;
  onSelectTemplate?: (id: string | null) => void;
  onPreviewTemplate?: (id: string | null) => void;
  templatesOpen?: boolean;
  setTemplatesOpen?: (open: boolean) => void;
  lineConfig: LineConfig | null;
  onLineConfigChange: (config: LineConfig) => void;
  fontColor: string;
  onFontColorChange: (color: string) => void;
  fontOpacity?: number;
  onFontOpacityChange?: (opacity: number) => void;
  backgroundColor?: string;
  onBackgroundColorChange?: (color: string) => void;
  backgroundOpacity?: number;
  onBackgroundOpacityChange?: (value: number) => void;
  onCharacterLimitExceeded?: () => void;
  triggerFlash?: number;
}

export default function RightSidebar({
  onSend,
  onExportPDF,
  onExportJPG,
  sending = false,
  sendDisabled = true,
  wordCount,
  charCount,
  readingTime,
  readability = "A2",
  selectedMatch,
  anonymousHandle = "",
  fontStyle = "handwritten",
  templateBackground = null,
  onSelectTemplate = () => {},
  onPreviewTemplate = () => {},
  templatesOpen = false,
  setTemplatesOpen = () => {},
  lineConfig,
  onLineConfigChange,
  fontColor = "#000000",
  onFontColorChange,
  fontOpacity = 1,
  onFontOpacityChange,
  backgroundColor = "#ffffff",
  onBackgroundColorChange,
  backgroundOpacity = 1,
  onBackgroundOpacityChange = () => {},
  onCharacterLimitExceeded,
  triggerFlash = 0,
}: RightSidebarProps) {
  const [sendConfirmationOpen, setSendConfirmationOpen] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [characterLimitDialogOpen, setCharacterLimitDialogOpen] = useState(false);
  const [wordCountDialogOpen, setWordCountDialogOpen] = useState(false);
  const [readingTimeDialogOpen, setReadingTimeDialogOpen] = useState(false);
  const [readabilityDialogOpen, setReadabilityDialogOpen] = useState(false);
  const [characterLimitFlash, setCharacterLimitFlash] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [letterPreviewDialogOpen, setLetterPreviewDialogOpen] = useState(false);

  const { profile } = useSyncProfile();

  // Flag animation state
  const [poleVisible, setPoleVisible] = useState(false);
  const [animationsReady, setAnimationsReady] = useState(false);
  const stampRef = useRef<HTMLDivElement>(null);
  const initialTransformRef = useRef<string | null>(null);
  const alpha2 = resolveAlpha2(selectedMatch?.location)?.toLowerCase();

  // Flash animation when character limit is exceeded
  const triggerCharacterLimitFlash = useCallback(() => {
    setCharacterLimitFlash(true);
    setTimeout(() => setCharacterLimitFlash(false), 1000);
    onCharacterLimitExceeded?.();
  }, [onCharacterLimitExceeded]);

  // Trigger flash when triggerFlash prop changes
  useEffect(() => {
    if (triggerFlash > 0) {
      triggerCharacterLimitFlash();
    }
  }, [triggerFlash, triggerCharacterLimitFlash]);

  // Flag animation effects
  useEffect(() => {
    if (stampRef.current && !initialTransformRef.current) {
      initialTransformRef.current = getComputedStyle(stampRef.current).transform;
      setTimeout(() => setAnimationsReady(true), 0);
    }
  }, []);

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

  const handleLineConfigChange = (key: keyof LineConfig, value: any) => {
    if (onLineConfigChange) {
      onLineConfigChange({ ...(lineConfig || { type: 'none', spacing: 0, thickness: 0, color: '#000000', opacity: 0, rotation: 0 }), [key]: value });
    }
  };

  const lineTypes: { value: LineType; label: string }[] = [
    { value: "none", label: "None" },
    { value: "straight", label: "Straight" },
    { value: "wavy", label: "Wavy" },
    { value: "zigzag", label: "Zigzag" },
    { value: "dotted", label: "Dotted" },
    { value: "swirls", label: "Swirls" },
    { value: "arc", label: "Arcs" },
    { value: "spiral", label: "Spiral" },
    { value: "floral", label: "Floral" },
  ];

  return (
    <div className="relative h-full flex flex-col bg-transparent p-6 custom-scrollbar h-[calc(100vh-80px)] shrink-0 shadow-none select-none overflow-y-auto scrollbar-hide">
      <style jsx>{`
        @keyframes gradient-flow {
          0%, 100% { background-position: 0% 50%; }
          25% { background-position: 25% 50%; }
          50% { background-position: 100% 50%; }
          75% { background-position: 75% 50%; }
        }
        @keyframes float-subtle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        @keyframes pulse-gentle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-float-subtle {
          animation: float-subtle 6s ease-in-out infinite;
        }
        .animate-pulse-gentle {
          animation: pulse-gentle 3s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-float-subtle,
          .animate-pulse-gentle {
            animation: none;
          }
        }
      `}</style>
      {templatesOpen ? (
        <TemplateSidePanel
          open={templatesOpen}
          currentId={templateBackground || undefined}
          onSelect={onSelectTemplate}
          onPreview={onPreviewTemplate}
          onClose={() => setTemplatesOpen(false)}
          thumbSize={80}
          lineConfig={lineConfig}
          onLineConfigChange={onLineConfigChange}
          fontColor={fontColor}
          onFontColorChange={onFontColorChange}
          fontOpacity={fontOpacity}
          onFontOpacityChange={onFontOpacityChange}
          backgroundColor={backgroundColor}
          onBackgroundColorChange={onBackgroundColorChange}
          backgroundOpacity={backgroundOpacity}
          onBackgroundOpacityChange={onBackgroundOpacityChange}
          anchorWithinSidebar
        />
      ) : (
        <>
          {/* Letter Preview */}
          <div className="relative mb-8 group/section">
            <div className="absolute inset-[-12px] bg-gradient-to-br from-blue-400/30 via-purple-400/20 to-pink-400/30 rounded-[2.5rem] blur-xl opacity-70 group-hover/section:opacity-95 transition-all duration-500 animate-pulse-slow pointer-events-none"></div>
            <div className="absolute inset-[-6px] bg-gradient-to-br from-blue-300/20 via-purple-300/15 to-pink-300/20 rounded-[2.25rem] blur-md opacity-80 group-hover/section:opacity-100 group-hover/section:inset-[-8px] transition-all duration-500 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-3xl opacity-0 animate-shimmer pointer-events-none"></div>
          <Card className="relative p-6 bg-gradient-to-br from-white via-slate-50/30 to-white shadow-2xl backdrop-blur-sm rounded-3xl overflow-hidden hover:shadow-3xl transition-all duration-500 ease-out transform hover:scale-[1.01] hover:-translate-y-0.5 animate-float-subtle animate-fade-in-up min-h-[320px] will-change-transform border border-slate-200/50 group-hover/section:border-blue-300/40" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 50%, rgba(255,255,255,0.98) 100%)'}}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 rounded-3xl opacity-80"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 via-purple-500/5 to-pink-500/8 rounded-3xl opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute inset-0 opacity-[0.03] rounded-3xl" style={{backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.4) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(147, 51, 234, 0.4) 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
            <div className="absolute inset-0 rounded-3xl opacity-60 pointer-events-none" style={{background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, transparent 50%, rgba(147, 51, 234, 0.12) 100%)', mixBlendMode: 'overlay'}}></div>
            <div className="relative">
              <h4 className="font-bold text-slate-800 mb-6 select-none text-sm tracking-wide uppercase text-center flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Letter Preview
              </h4>
            <div
              className="relative rounded-b-xl rounded-t-2xl border border-amber-300 shadow-lg overflow-visible -ml-3 group/envelope transform scale-80 sm:scale-90 md:scale-100 origin-top-left cursor-pointer"
              onClick={() => setLetterPreviewDialogOpen(true)}
              style={{
                background: "linear-gradient(135deg,#f4f1e8 0%,#e8dcc0 30%,#d4c4a8 70%,#c4b08f 100%)",
                boxShadow:
                  "0 8px 32px -8px rgba(101,67,33,.4), 0 4px 16px rgba(101,67,33,.3), inset 0 2px 0 rgba(255,255,255,.15), inset 0 -1px 0 rgba(0,0,0,.1), 0 0 40px rgba(184,134,11,.2)",
                minHeight: '220px',
                width: '310px',
                filter: 'drop-shadow(0 0 20px rgba(184,134,11,0.15))',
                transformStyle: 'preserve-3d',
                perspective: '1000px',
              }}
              aria-label="Preview letter design and envelope"
            >
              {/* Aged paper texture overlays */}
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
              {/* Subtle parchment creases */}
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
              {/* Aged edges */}
              <div
                className="pointer-events-none absolute inset-0 rounded-b-xl rounded-t-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,115,85,0.15) 0%, transparent 20%, transparent 80%, rgba(101,67,33,0.1) 100%)',
                }}
              />

              {/* Magical sparkle effects */}
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
                  animation: 'sparkle-twinkle 4s ease-in-out infinite alternate'
                }}
              />

              {/* To: label positioned on the letter */}
              <div className="absolute top-14 left-4" style={{ zIndex: 50 }}>
                <div className="text-base uppercase tracking-wider select-none font-bold mb-1" style={{fontFamily: '"Brush Script MT", cursive', fontStyle: 'italic', color: '#8B4513', textShadow: '0 1px 2px rgba(0,0,0,0.1)'}}>
                  To:
                </div>
                <p
                  className={`font-bold text-gray-800 select-none text-lg uppercase`}
                  style={{
                    ...(FONT_PRESETS.find((p) => p.id === fontStyle)
                      ?.lineHeight
                      ? { lineHeight: FONT_PRESETS.find((p) => p.id === fontStyle)
                        ?.lineHeight }
                      : {}),
                    ...(FONT_PRESETS.find((p) => p.id === fontStyle)
                      ?.letterSpacing
                      ? { letterSpacing: FONT_PRESETS.find((p) => p.id === fontStyle)
                        ?.letterSpacing }
                      : {}),
                  }}
                >
                  {selectedMatch ? selectedMatch.name : "Recipient"}
                </p>
              </div>

              {/* From: label positioned on the letter */}
              <div className="absolute bottom-4 right-4" style={{ zIndex: 50 }}>
                <div className="text-base uppercase tracking-wider select-none font-bold mb-1" style={{fontFamily: '"Brush Script MT", cursive', fontStyle: 'italic', color: '#8B4513', textShadow: '0 1px 2px rgba(0,0,0,0.1)'}}>
                  From:
                </div>
                <p
                  className={`font-bold text-gray-800 select-none text-lg uppercase`}
                  style={{
                    ...(FONT_PRESETS.find((p) => p.id === fontStyle)
                      ?.lineHeight
                      ? { lineHeight: FONT_PRESETS.find((p) => p.id === fontStyle)
                        ?.lineHeight }
                      : {}),
                    ...(FONT_PRESETS.find((p) => p.id === fontStyle)
                      ?.letterSpacing
                      ? { letterSpacing: FONT_PRESETS.find((p) => p.id === fontStyle)
                        ?.letterSpacing }
                      : {}),
                  }}
                >
                  {anonymousHandle || "You"}
                </p>
              </div>
              
              {/* Static Flap */}
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
                  zIndex: 25,
                }}
                aria-hidden
              />

              {/* Left envelope side */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: 0,
                  left: 0,
                  width: '50%',
                  height: 100,
                  background: 'linear-gradient(135deg,#f4f1e8 0%,#e8dcc0 30%,#d4c4a8 70%,#c4b08f 100%)',
                  clipPath: 'polygon(0 0, 5% 0%, 100% 100%, 0 100%)',
                  zIndex: 40,
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
                  backgroundSize: '25px 25px, 30px 30px'
                }} />
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: `
                    linear-gradient(45deg, transparent 40%, rgba(101,67,33,0.1) 41%, rgba(101,67,33,0.1) 59%, transparent 60%)
                  `,
                  backgroundSize: '18px 18px'
                }} />
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: `
                    radial-gradient(circle at 30% 40%, rgba(255,215,0,0.6) 1px, transparent 1px),
                    radial-gradient(circle at 70% 60%, rgba(184,134,11,0.5) 1px, transparent 1px)
                  `,
                  backgroundSize: '25px 25px, 30px 30px',
                  animation: 'sparkle-twinkle 4s ease-in-out infinite alternate',
                }} />
              </div>
              
              {/* Right envelope side */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: 0,
                  right: 0,
                  width: '50%',
                  height: 100,
                  background: 'linear-gradient(135deg,#f4f1e8 0%,#e8dcc0 30%,#d4c4a8 70%,#c4b08f 100%)',
                  clipPath: 'polygon(95% 0%, 100% 0, 100% 100%, 0 100%)',
                  zIndex: 40,
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
                  backgroundSize: '25px 25px, 30px 30px'
                }} />
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: `
                    linear-gradient(-45deg, transparent 40%, rgba(101,67,33,0.1) 41%, rgba(101,67,33,0.1) 59%, transparent 60%)
                  `,
                  backgroundSize: '18px 18px'
                }} />
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: `
                    radial-gradient(circle at 25% 35%, rgba(255,215,0,0.6) 1px, transparent 1px),
                    radial-gradient(circle at 65% 70%, rgba(184,134,11,0.5) 1px, transparent 1px)
                  `,
                  backgroundSize: '25px 25px, 30px 30px',
                  animation: 'sparkle-twinkle 4s ease-in-out infinite alternate',
                }} />
              </div>

              {/* Bottom envelope body */}
              <div
                className="absolute inset-x-0 pointer-events-none"
                style={{
                  top: 100,
                  bottom: 0,
                  background: 'linear-gradient(135deg,#f4f1e8 0%,#e8dcc0 30%,#d4c4a8 70%,#c4b08f 100%)',
                  zIndex: 40,
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
                  backgroundSize: '30px 30px, 45px 45px, 25px 25px'
                }} />
                <div className="absolute inset-0 rounded-b-xl opacity-20" style={{
                  backgroundImage: `
                    linear-gradient(45deg, transparent 40%, rgba(101,67,33,0.1) 41%, rgba(101,67,33,0.1) 59%, transparent 60%),
                    linear-gradient(-45deg, transparent 40%, rgba(101,67,33,0.08) 41%, rgba(101,67,33,0.08) 59%, transparent 60%)
                  `,
                  backgroundSize: '20px 20px'
                }} />
                <div className="absolute inset-0 rounded-b-xl" style={{
                  background: 'linear-gradient(135deg, rgba(139,115,85,0.15) 0%, transparent 20%, transparent 80%, rgba(101,67,33,0.1) 100%)'
                }} />
                <div className="absolute inset-0 rounded-b-xl opacity-30" style={{
                  backgroundImage: `
                    radial-gradient(circle at 15% 25%, rgba(255,215,0,0.8) 1px, transparent 1px),
                    radial-gradient(circle at 85% 15%, rgba(255,215,0,0.6) 1px, transparent 1px),
                    radial-gradient(circle at 45% 75%, rgba(184,134,11,0.7) 1px, transparent 1px),
                    radial-gradient(circle at 75% 85%, rgba(255,215,0,0.5) 1px, transparent 1px)
                  `,
                  backgroundSize: '25px 25px, 35px 35px, 20px 20px, 30px 30px',
                  animation: 'sparkle-twinkle 4s ease-in-out infinite alternate'
                }} />
              </div>

              {/* Wax seal */}
              <div
                className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                style={{
                  top: 45,
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))',
                  width: 64,
                  height: 64,
                }}
                aria-hidden
              >
                <Image src={waxseal} alt="Wax seal" fill className="select-none object-contain" />
              </div>
              {/* Recipient's country stamp - positioned outside envelope animation */}
              <div
                ref={stampRef}
                className={`flag-assembly ${animationsReady ? 'animate-wave-sway' : ''}`}
                style={{
                  position: 'absolute',
                  top: STAMP.TOP - 2,
                  right: STAMP.RIGHT,
                  zIndex: 40,
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
                <FlappingFlag country={selectedMatch?.location} />
              </div>
            </div>

            {/* Send Controls */}
            <div className="mt-4 pt-6 border-t border-amber-200/30">
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Button
                    onClick={async () => {
                      // Use the shared export handler (onExportJPG) to produce a JPEG data URL.
                      // If the caller doesn't provide onExportJPG, fall back to the local capture.
                      try {
                        if (onExportJPG) {
                          // onExportJPG now accepts an optional callback which will be passed
                          // the final data URL instead of triggering a download.
                          await new Promise<void>((resolve) => {
                            onExportJPG((dataUrl) => {
                              try {
                                console.debug('RightSidebar: received exported JPEG length', dataUrl ? dataUrl.length : 0);
                                setTempImage(dataUrl);
                              } catch (err) {
                                console.error('Error handling exported jpeg callback', err);
                                setTempImage(null);
                              }
                              resolve();
                            });
                          });
                        } else {
                          // Shouldn't normally happen when using the page wrapper, but
                          // keep a fallback to preserve functionality.
                          console.warn('onExportJPG not provided, fallback capture not implemented here.');
                          setTempImage(null);
                        }
                      } catch (err) {
                        console.error('Failed to capture preview image via onExportJPG', err);
                        setTempImage(null);
                      }

                      setSendConfirmationOpen(true);
                    }}
                    disabled={sendDisabled || sending}
                    className="text-white px-8 py-5 bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 hover:from-rose-600 hover:via-rose-700 hover:to-pink-700 focus:from-rose-600 focus:via-rose-700 focus:to-pink-700 hover:scale-[1.03] focus:scale-[1.03] hover:shadow-2xl focus:shadow-2xl hover:shadow-rose-500/30 focus:shadow-rose-500/30 transition-all duration-300 font-bold text-base rounded-2xl border-2 border-rose-400/20 focus:border-rose-400/40 focus:outline-none focus:ring-4 focus:ring-rose-500/20 flex-1"
                    style={{
                      backgroundSize: "200% 200%",
                      animation: "gradient-flow 15s ease-in-out infinite alternate",
                      boxShadow: "0 6px 20px 0 rgba(244, 63, 94, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                    }}
                    size="sm"
                    aria-label={sending ? "Sending letter..." : "Send letter to recipient"}
                  >
                    <Send className="w-5 h-5 mr-3" aria-hidden="true" />
                    {sending ? "Sending..." : "Send Letter"}
                  </Button>

                  <DropdownMenu open={exportDropdownOpen} onOpenChange={setExportDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        disabled={sendDisabled || sending}
                        className="text-slate-700 px-4 py-5 bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 hover:from-slate-100 hover:via-slate-200 hover:to-slate-100 focus:from-slate-100 focus:via-slate-200 focus:to-slate-100 hover:scale-[1.03] focus:scale-[1.03] hover:shadow-xl focus:shadow-xl hover:shadow-slate-500/20 focus:shadow-slate-500/20 transition-all duration-300 font-bold text-base rounded-2xl border-2 border-slate-300/40 focus:border-slate-400/60 focus:outline-none focus:ring-4 focus:ring-slate-500/20"
                        size="sm"
                        aria-label="Export options"
                      >
                        <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${exportDropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48 bg-white/95 backdrop-blur-sm border-2 border-slate-200/60 shadow-2xl rounded-2xl p-2" side="top" align="end">
                      <DropdownMenuItem
                        onClick={() => onExportPDF?.()}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 focus:bg-blue-50 transition-all duration-200 cursor-pointer group"
                        aria-label="Export letter as PDF document"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                          <FileDown className="w-4 h-4 text-blue-600 group-hover:text-blue-700 transition-colors" aria-hidden="true" />
                        </div>
                        <span className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">Export as PDF</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onExportJPG?.()}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-green-50 focus:bg-green-50 transition-all duration-200 cursor-pointer group"
                        aria-label="Export letter as JPG image"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                          <ImageDown className="w-4 h-4 text-green-600 group-hover:text-green-700 transition-colors" aria-hidden="true" />
                        </div>
                        <span className="font-semibold text-slate-800 group-hover:text-green-700 transition-colors">Export as JPG</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            </div>
          </Card>
          </div>          <Dialog open={sendConfirmationOpen} onOpenChange={(open) => { if (!open) setTempImage(null); setSendConfirmationOpen(open); }}>
            {/* Allow the dialog content to be full-bleed so the animation can occupy the
                entire dialog area. Remove the max width and padding so the child
                `LetterSendAnimation` can render edge-to-edge. */}
            <DialogContent className="w-full max-w-none p-0 h-[75vh] flex items-center justify-center" showCloseButton={false}>
              <DialogTitle className="sr-only">Send Letter Confirmation</DialogTitle>
              <LetterSendAnimation
                show={sendConfirmationOpen}
                imageSrc={tempImage}
                onAnimationComplete={() => {
                  setSendConfirmationOpen(false);
                  // Keep tempImage available for later DB usage if needed; but clear it now
                  setTempImage(null);
                  onSend?.();
                }}
                embedded={false}
                onCancel={() => { setSendConfirmationOpen(false); setTempImage(null); }}
              />
            </DialogContent>
          </Dialog>


          {/* Character Limit Dialog */}
          <Dialog open={characterLimitDialogOpen} onOpenChange={setCharacterLimitDialogOpen}>
            <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-0 shadow-2xl" showCloseButton={false}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    characterLimitFlash
                      ? 'bg-red-50'
                      : charCount >= 1000
                      ? 'bg-red-50'
                      : charCount >= 500
                      ? 'bg-green-50'
                      : charCount >= 250
                      ? 'bg-yellow-50'
                      : 'bg-slate-50'
                  }`}>
                    <span className={`text-sm font-bold ${
                      characterLimitFlash
                        ? 'text-red-700'
                        : charCount >= 1000
                        ? 'text-red-700'
                        : charCount >= 500
                        ? 'text-green-700'
                        : charCount >= 250
                        ? 'text-yellow-700'
                        : 'text-slate-700'
                    }`}>Aa</span>
                  </span>
                  Character Limit
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Your letter has a maximum limit of {MAIN_CONTENT_LIMIT.toLocaleString('en-US')} characters to ensure optimal delivery and readability.
                </DialogDescription>
                <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-700">Current Count</span>
                    <span className={`text-2xl font-bold ${charCount >= 1000 ? 'text-red-600' : charCount >= 500 ? 'text-green-600' : charCount >= 250 ? 'text-yellow-600' : 'text-slate-800'}`}>
                      {charCount.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        charCount >= 1000 ? 'bg-red-500' :
                        charCount >= 500 ? 'bg-yellow-500' :
                        charCount >= 250 ? 'bg-slate-400' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(charCount / MAIN_CONTENT_LIMIT, 1) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-3 text-sm text-slate-600">
                  <p><strong>Color Guide:</strong></p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-xs">0-250 chars (plenty of space)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-slate-400 rounded"></div>
                      <span className="text-xs">250-500 chars (getting started)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span className="text-xs">500-1000 chars (halfway there)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-xs">1000-1500 chars (approaching limit)</span>
                    </div>
                  </div>
                  <p className="text-amber-600 mt-3"><strong>Note:</strong> When you try to exceed the limit, the counter will flash red as a gentle reminder.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Word Count Dialog */}
          <Dialog open={wordCountDialogOpen} onOpenChange={setWordCountDialogOpen}>
            <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-0 shadow-2xl" showCloseButton={false}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Word Count
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Your letter contains {wordCount.toLocaleString('en-US')} words.
                </DialogDescription>
                <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Word Count</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {wordCount.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${Math.min(wordCount / 400, 1) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Typical letter: 200-400 words</p>
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <p><strong>How it&apos;s calculated:</strong></p>
                  <ul className="space-y-1 ml-4">
                    <li>• Words are counted by splitting text on whitespace characters</li>
                    <li>• Punctuation marks are not counted as separate words</li>
                    <li>• Numbers and contractions (like &quot;don&apos;t&quot;) count as single words</li>
                  </ul>
                  <p className="text-amber-600 mt-3"><strong>Tip:</strong> Word count helps you gauge the length and depth of your letter. A typical personal letter might contain 200-400 words.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Reading Time Dialog */}
          <Dialog open={readingTimeDialogOpen} onOpenChange={setReadingTimeDialogOpen}>
            <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-0 shadow-2xl" showCloseButton={false}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                  <Clock className="w-5 h-5 text-purple-500" />
                  Reading Time
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Estimated reading time: {typeof readingTime === "string" ? readingTime : `~${readingTime} minute${readingTime !== 1 ? 's' : ''}`}
                </DialogDescription>
                <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Estimated Time</span>
                    <span className="text-2xl font-bold text-purple-600 flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      {typeof readingTime === "string"
                        ? readingTime
                        : `~${readingTime}min`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${Math.min((typeof readingTime === "string" ? (() => {
                        const [minutes, seconds] = readingTime.split(':').map(Number);
                        return minutes + seconds / 60;
                      })() : readingTime) / 2, 1) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Based on 200 words per minute and 750 characters per minute</p>
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <p><strong>How it&apos;s calculated:</strong></p>
                  <ul className="space-y-1 ml-4">
                    <li>• Uses both word count (200 words per minute) and character count (750 characters per minute)</li>
                    <li>• Takes the longer of the two estimates to account for complex or long words</li>
                    <li>• Represents a comfortable reading pace for most people</li>
                  </ul>
                  <p className="text-amber-600 mt-3"><strong>Tip:</strong> Reading time helps you understand how long it will take your recipient to read your letter. This encourages thoughtful, well-paced communication.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Readability Dialog */}
          <Dialog open={readabilityDialogOpen} onOpenChange={setReadabilityDialogOpen}>
            <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-0 shadow-2xl" showCloseButton={false}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                  <Gauge className="w-5 h-5 text-orange-500" />
                  Readability Level (CEFR)
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  CEFR Level: {String(readability).toUpperCase() || "Not available"}
                </DialogDescription>
                <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Your Level</span>
                    <span className={`text-2xl font-bold ${
                      (() => {
                        const level = String(readability).toUpperCase();
                        const colorMap: Record<string, string> = {
                          A1: "text-red-500",
                          A2: "text-red-600",
                          B1: "text-orange-500",
                          B2: "text-yellow-500",
                          C1: "text-green-600",
                          C2: "text-green-500",
                        };
                        return colorMap[level] || "text-gray-500";
                      })()
                    }`}>
                      {String(readability).toUpperCase() || "N/A"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        (() => {
                          const level = String(readability).toUpperCase();
                          const progressMap: Record<string, number> = {
                            A1: 17, A2: 33, B1: 50, B2: 67, C1: 83, C2: 100,
                          };
                          const progress = progressMap[level] || 0;
                          if (progress >= 83) return "bg-green-500";
                          if (progress >= 67) return "bg-green-600";
                          if (progress >= 50) return "bg-yellow-500";
                          if (progress >= 33) return "bg-orange-500";
                          return "bg-red-500";
                        })()
                      }`}
                      style={{ width: `${(() => {
                        const level = String(readability).toUpperCase();
                        const progressMap: Record<string, number> = {
                          A1: 17, A2: 33, B1: 50, B2: 67, C1: 83, C2: 100,
                        };
                        return progressMap[level] || 0;
                      })()}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {(() => {
                      const level = String(readability).toUpperCase();
                      const descriptions: Record<string, string> = {
                        A1: "Basic vocabulary and simple phrases",
                        A2: "Common expressions and basic sentences",
                        B1: "Familiar topics and straightforward language",
                        B2: "Complex topics with some abstract concepts",
                        C1: "Wide range of demanding texts",
                        C2: "Nearly all forms of written expression",
                      };
                      return descriptions[level] || "Level not determined";
                    })()}
                  </p>
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <p><strong>CEFR Levels:</strong></p>
                  <ul className="space-y-1 ml-4">
                    <li className="text-red-600"><strong>A1:</strong> Beginner - Basic words and phrases</li>
                    <li className="text-red-500"><strong>A2:</strong> Elementary - Simple connected text</li>
                    <li className="text-orange-500"><strong>B1:</strong> Intermediate - Main points of familiar topics</li>
                    <li className="text-yellow-500"><strong>B2:</strong> Upper Intermediate - Abstract and technical topics</li>
                    <li className="text-green-600"><strong>C1:</strong> Advanced - Wide range of demanding texts</li>
                    <li className="text-green-500"><strong>C2:</strong> Proficient - Understand virtually everything</li>
                  </ul>
                  <p className="text-amber-600 mt-3"><strong>Note:</strong> For shorter letters (&lt;100 characters), CEFR assessment may be less accurate due to limited text sample.</p>
                  <p className="text-amber-600 mt-2"><strong>Tip:</strong> Choose a level appropriate for your recipient. Higher levels indicate more complex language structures.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Letter Preview Explanation Dialog */}
          <Dialog open={letterPreviewDialogOpen} onOpenChange={setLetterPreviewDialogOpen}>
            <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-0 shadow-2xl" showCloseButton={false}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Letter Preview
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  This is a preview of how your letter will appear when sent to your recipient.
                </DialogDescription>
                <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-sm text-slate-700">
                    The preview shows:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-slate-600">
                    <li>The recipient&apos;s name and location (with country flag)</li>
                    <li>Your anonymous handle as the sender</li>
                    <li>The envelope design with wax seal</li>
                    <li>Aged paper texture and magical effects</li>
                  </ul>
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <p><strong>Interactive Elements:</strong></p>
                  <ul className="space-y-1 ml-4">
                    <li>• Hover over the envelope to see it open slightly</li>
                    <li>• The country flag waves gently in the breeze</li>
                    <li>• Sparkle effects add a touch of magic</li>
                  </ul>
                  <p className="text-amber-600 mt-3"><strong>Tip:</strong> This preview helps you visualize the final letter before sending it to ensure everything looks perfect!</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Letter Statistics */}
          <div className="relative group/section">
            <div className="absolute inset-[-12px] bg-gradient-to-br from-indigo-400/30 via-blue-400/20 to-violet-400/30 rounded-[2.5rem] blur-xl opacity-70 group-hover/section:opacity-95 transition-all duration-500 animate-pulse-slow pointer-events-none"></div>
            <div className="absolute inset-[-6px] bg-gradient-to-br from-indigo-300/20 via-blue-300/15 to-violet-300/20 rounded-[2.25rem] blur-md opacity-80 group-hover/section:opacity-100 group-hover/section:inset-[-8px] transition-all duration-500 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-3xl opacity-0 animate-shimmer pointer-events-none" style={{animationDelay: '1.5s'}}></div>
          <Card className="relative p-6 bg-gradient-to-br from-white via-indigo-50/20 to-white shadow-2xl backdrop-blur-sm rounded-3xl overflow-hidden hover:shadow-3xl transition-all duration-500 ease-out transform hover:scale-[1.01] hover:-translate-y-0.5 animate-float-subtle animate-fade-in-up min-h-[500px] will-change-transform border border-slate-200/50 group-hover/section:border-indigo-300/40" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 50%, rgba(255,255,255,0.98) 100%)', animationDelay: '0.15s'}}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-blue-50/20 to-violet-50/30 rounded-3xl opacity-80"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/8 via-blue-500/5 to-violet-500/8 rounded-3xl opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute inset-0 opacity-[0.03] rounded-3xl" style={{backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.4) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.4) 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
            <div className="absolute inset-0 rounded-3xl opacity-60 pointer-events-none" style={{background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, transparent 50%, rgba(59, 130, 246, 0.12) 100%)', mixBlendMode: 'overlay'}}></div>
            <div className="relative">
              <h4 className="font-bold text-slate-800 mb-6 select-none text-sm tracking-wide uppercase text-center flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Letter Statistics
              </h4>
            <div className="grid grid-cols-2 gap-5 mb-6">
              <Card className="p-6 text-center bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 cursor-pointer group rounded-2xl overflow-hidden relative" onClick={() => setWordCountDialogOpen(true)} role="button" tabIndex={0} aria-label={`Word count: ${wordCount.toLocaleString('en-US')} words. Click to view details`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setWordCountDialogOpen(true); } }}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-[-2px] bg-gradient-to-br from-blue-400/0 via-blue-400/0 to-blue-400/0 group-hover:from-blue-400/20 group-hover:via-indigo-400/20 group-hover:to-blue-400/20 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" style={{zIndex: -1}}></div>
                <div className="relative flex flex-col items-center space-y-4">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm">
                    <BarChart3 className="w-6 h-6 text-blue-600 group-hover:text-blue-700 transition-colors" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-slate-800 select-none mb-2 group-hover:text-blue-700 transition-colors">{wordCount.toLocaleString('en-US')}</p>
                    <p className="text-xs text-slate-600 font-semibold select-none uppercase tracking-wider">Words</p>
                    <div className="w-full bg-slate-200/60 rounded-full h-2 mt-3 shadow-inner">
                      <div className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500 shadow-sm" style={{ width: `${Math.min(wordCount / 400, 1) * 100}%` }} aria-label={`Word count progress: ${Math.min(wordCount / 400 * 100, 100).toFixed(0)}% of typical letter length`} />
                    </div>
                  </div>
                </div>
              </Card>
              <Card className={`p-6 text-center transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 cursor-pointer group rounded-2xl overflow-hidden relative shadow-lg hover:shadow-xl ${characterLimitFlash
                ? 'bg-gradient-to-br from-red-50 via-red-100 to-pink-100 border-0 animate-pulse shadow-red-400/50 scale-105'
                : charCount >= 1000
                ? 'bg-gradient-to-br from-red-50 via-red-100 to-pink-100 border-0'
                : charCount >= 500
                ? 'bg-gradient-to-br from-yellow-50 via-yellow-100 to-amber-100 border-0'
                : charCount >= 250
                ? 'bg-gradient-to-br from-slate-50 via-slate-100 to-gray-100 border-0'
                : 'bg-gradient-to-br from-green-50 via-green-100 to-emerald-100 border-0'
              }`}
              onClick={() => setCharacterLimitDialogOpen(true)} role="button" tabIndex={0} aria-label={`Character count: ${charCount.toLocaleString('en-US')} characters. Click to view details`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCharacterLimitDialogOpen(true); } }}>
                <div className={`absolute inset-0 transition-opacity duration-300 ${characterLimitFlash ? 'bg-red-400/20' : 'bg-gradient-to-br opacity-0 group-hover:opacity-100'} ${charCount >= 1000 ? 'from-red-400/10 to-pink-400/10' : charCount >= 500 ? 'from-yellow-400/10 to-amber-400/10' : charCount >= 250 ? 'from-slate-400/10 to-gray-400/10' : 'from-green-400/10 to-emerald-400/10'}`}></div>
                <div className={`absolute inset-[-2px] rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none ${charCount >= 1000 ? 'bg-gradient-to-br from-red-400/20 via-pink-400/20 to-red-400/20' : charCount >= 500 ? 'bg-gradient-to-br from-yellow-400/20 via-amber-400/20 to-yellow-400/20' : charCount >= 250 ? 'bg-gradient-to-br from-slate-400/20 via-gray-400/20 to-slate-400/20' : 'bg-gradient-to-br from-green-400/20 via-emerald-400/20 to-green-400/20'}`} style={{zIndex: -1}}></div>
                <div className="relative flex flex-col items-center space-y-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${charCount >= 1000 ? 'bg-red-100' : charCount >= 500 ? 'bg-yellow-100' : charCount >= 250 ? 'bg-slate-100' : 'bg-green-100'}`}>
                    {charCount >= MAIN_CONTENT_LIMIT ? (
                      <span className="text-xl text-red-600 font-bold">⚠️</span>
                    ) : (
                      <span className={`text-xl font-bold transition-colors ${
                        characterLimitFlash
                          ? 'text-red-700'
                          : charCount >= 1000
                          ? 'text-red-700'
                          : charCount >= 500
                          ? 'text-yellow-700'
                          : charCount >= 250
                          ? 'text-slate-700'
                          : 'text-green-700'
                      }`}>Aa</span>
                    )}
                  </div>
                  <div>
                    <p className={`text-4xl font-bold select-none mb-2 transition-colors ${
                      characterLimitFlash
                        ? 'text-red-700'
                        : charCount >= 1000
                        ? 'text-red-700 group-hover:text-red-800'
                        : charCount >= 500
                        ? 'text-yellow-700 group-hover:text-yellow-800'
                        : charCount >= 250
                        ? 'text-slate-800 group-hover:text-slate-900'
                        : 'text-green-700 group-hover:text-green-800'
                    }`}>
                      {charCount.toLocaleString('en-US')}
                    </p>
                    <p className="text-xs text-slate-600 font-semibold select-none uppercase tracking-wider">Characters</p>
                    <div className="w-full bg-slate-200/60 rounded-full h-2 mt-3 shadow-inner">
                      <div className={`h-2 rounded-full transition-all duration-500 shadow-sm ${
                        charCount >= 1000 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                        charCount >= 500 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                        charCount >= 250 ? 'bg-gradient-to-r from-slate-400 to-slate-500' : 'bg-gradient-to-r from-green-400 to-green-600'
                      }`} style={{ width: `${Math.min(charCount / MAIN_CONTENT_LIMIT, 1) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <Card className="p-6 text-center bg-gradient-to-br from-purple-50 via-purple-100 to-violet-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 cursor-pointer group rounded-2xl overflow-hidden relative" onClick={() => setReadingTimeDialogOpen(true)} role="button" tabIndex={0} aria-label={`Reading time: ${typeof readingTime === "string" ? readingTime : `~${readingTime} minutes`}. Click to view details`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setReadingTimeDialogOpen(true); } }}>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-violet-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-[-2px] bg-gradient-to-br from-purple-400/0 via-purple-400/0 to-violet-400/0 group-hover:from-purple-400/20 group-hover:via-violet-400/20 group-hover:to-purple-400/20 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" style={{zIndex: -1}}></div>
                <div className="relative flex flex-col items-center space-y-4">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center shadow-sm">
                    <Clock className="w-6 h-6 text-purple-600 group-hover:text-purple-700 transition-colors" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-800 select-none mb-2 group-hover:text-purple-700 transition-colors">
                      {typeof readingTime === "string"
                        ? readingTime
                        : `~${readingTime}min`}
                    </p>
                    <p className="text-xs text-slate-600 font-semibold select-none uppercase tracking-wider">Reading Time</p>
                    <div className="w-full bg-slate-200/60 rounded-full h-2 mt-3 shadow-inner">
                      <div className="h-2 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500 shadow-sm" style={{ width: `${Math.min((typeof readingTime === "string" ? (() => {
                        const [minutes, seconds] = readingTime.split(':').map(Number);
                        return minutes + seconds / 60;
                      })() : readingTime) / 2, 1) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </Card>
              <Card className={`p-6 text-center transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 cursor-pointer group rounded-2xl overflow-hidden relative shadow-lg hover:shadow-xl ${
                (() => {
                  const level = String(readability).toUpperCase();
                  switch (level) {
                    case 'A1':
                    case 'A2':
                      return 'bg-gradient-to-br from-red-50 via-red-100 to-pink-100 border-0';
                    case 'B1':
                      return 'bg-gradient-to-br from-orange-50 via-orange-100 to-amber-100 border-0';
                    case 'B2':
                      return 'bg-gradient-to-br from-yellow-50 via-yellow-100 to-amber-100 border-0';
                    case 'C1':
                    case 'C2':
                      return 'bg-gradient-to-br from-green-50 via-green-100 to-emerald-100 border-0';
                    default:
                      return 'bg-gradient-to-br from-slate-50 via-slate-100 to-gray-100 border-0';
                  }
                })()
              }`} onClick={() => setReadabilityDialogOpen(true)} role="button" tabIndex={0} aria-label={`Readability level: ${String(readability).toUpperCase() || "Not available"}. Click to view details`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setReadabilityDialogOpen(true); } }}>
                <div className={`absolute inset-0 transition-opacity duration-300 bg-gradient-to-br opacity-0 group-hover:opacity-100 ${
                  (() => {
                    const level = String(readability).toUpperCase();
                    switch (level) {
                      case 'A1':
                      case 'A2':
                        return 'from-red-400/10 to-pink-400/10';
                      case 'B1':
                        return 'from-orange-400/10 to-amber-400/10';
                      case 'B2':
                        return 'from-yellow-400/10 to-amber-400/10';
                      case 'C1':
                      case 'C2':
                        return 'from-green-400/10 to-emerald-400/10';
                      default:
                        return 'from-slate-400/10 to-gray-400/10';
                    }
                  })()
                }`}></div>
                <div className={`absolute inset-[-2px] rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none ${
                  (() => {
                    const level = String(readability).toUpperCase();
                    switch (level) {
                      case 'A1':
                      case 'A2':
                        return 'bg-gradient-to-br from-red-400/20 via-pink-400/20 to-red-400/20';
                      case 'B1':
                        return 'bg-gradient-to-br from-orange-400/20 via-amber-400/20 to-orange-400/20';
                      case 'B2':
                        return 'bg-gradient-to-br from-yellow-400/20 via-amber-400/20 to-yellow-400/20';
                      case 'C1':
                      case 'C2':
                        return 'bg-gradient-to-br from-green-400/20 via-emerald-400/20 to-green-400/20';
                      default:
                        return 'bg-gradient-to-br from-slate-400/20 via-gray-400/20 to-slate-400/20';
                    }
                  })()
                }`} style={{zIndex: -1}}></div>
                <div className="relative">
                  <ReadabilityRating value={readability} />
                </div>
              </Card>
            </div>
            </div>
          </Card>
          </div>

          {/* Settings Panel removed as requested */}
        </>
      )}
    </div>
  );
}

// --- Add ReadabilityRating component at top-level ---
export function ReadabilityRating({ value }: { value: string | number }) {
  const level = String(value).toUpperCase();

  // Enhanced CEFR calculation considering text length for shorter letters
  const getEnhancedCEFR = (baseLevel: string, textLength?: number) => {
    // For very short texts, CEFR assessment is less reliable
    if (textLength && textLength < 100) {
      return { level: baseLevel, confidence: 'low', note: 'Short text - assessment limited' };
    }
    return { level: baseLevel, confidence: 'high', note: null };
  };

  const cefrData = getEnhancedCEFR(level);

  const colorMap: Record<string, string> = {
    A1: "text-red-500",
    A2: "text-red-600",
    B1: "text-orange-500",
    B2: "text-yellow-500",
    C1: "text-green-600",
    C2: "text-green-500",
  };

  const bgColorMap: Record<string, string> = {
    A1: "bg-red-100",
    A2: "bg-red-100",
    B1: "bg-orange-100",
    B2: "bg-yellow-100",
    C1: "bg-green-100",
    C2: "bg-green-100",
  };

  const levelDescriptions: Record<string, string> = {
    A1: "Beginner",
    A2: "Elementary",
    B1: "Intermediate",
    B2: "Upper Intermediate",
    C1: "Advanced",
    C2: "Proficient",
  };

  const colorClass = colorMap[level] || "text-gray-500";
  const bgColorClass = bgColorMap[level] || "bg-gray-100";

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${bgColorClass}`}>
        <Gauge className={`w-6 h-6 ${colorClass}`} />
      </div>
      <div className="text-center">
        <span className={`text-4xl font-bold transition-colors ${colorClass}`}>
          {cefrData.level || "N/A"}
        </span>
        <p className="text-xs text-slate-600 font-semibold select-none uppercase tracking-wider mt-2">
          {levelDescriptions[level] || "Unknown"}
        </p>
        {cefrData.confidence === 'low' && (
          <p className="text-xs text-amber-600 mt-2 font-medium">
            ~
          </p>
        )}
        <div className="w-full bg-slate-200/60 rounded-full h-2 mt-3 shadow-inner">
          <div
            className={`h-2 rounded-full transition-all duration-500 shadow-sm ${bgColorClass.replace('-100', '-400').replace('bg-red-100', 'bg-gradient-to-r from-red-400 to-red-600').replace('bg-orange-100', 'bg-gradient-to-r from-orange-400 to-orange-600').replace('bg-yellow-100', 'bg-gradient-to-r from-yellow-400 to-yellow-600').replace('bg-green-100', 'bg-gradient-to-r from-green-400 to-green-600').replace('bg-gray-100', 'bg-gradient-to-r from-gray-400 to-gray-600')}`}
            style={{ width: `${Math.min((['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(level) + 1) / 6, 1) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

<style jsx global>{`
  @keyframes pulse-slow {
    0%, 100% {
      opacity: 0.7;
    }
    50% {
      opacity: 0.9;
    }
  }
  
  .animate-pulse-slow {
    animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  @keyframes shimmer {
    0% {
      transform: translateX(-100%) rotate(0deg);
      opacity: 0;
    }
    50% {
      opacity: 0.6;
    }
    100% {
      transform: translateX(100%) rotate(0deg);
      opacity: 0;
    }
  }
  
  .animate-shimmer {
    animation: shimmer 8s ease-in-out infinite;
  }
  
  @keyframes fade-in-up {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in-up {
    animation: fade-in-up 0.6s ease-out forwards;
  }

  @keyframes envelope-flutter {
    0%, 100% {
      transform: translateY(0px) rotate(0deg);
    }
    10% {
      transform: translateY(-1px) rotate(0.2deg);
    }
    20% {
      transform: translateY(0px) rotate(-0.1deg);
    }
    30% {
      transform: translateY(-0.5px) rotate(0.1deg);
    }
    40% {
      transform: translateY(0px) rotate(0deg);
    }
    60% {
      transform: translateY(0px) rotate(0deg);
    }
    70% {
      transform: translateY(-0.8px) rotate(0.15deg);
    }
    80% {
      transform: translateY(0px) rotate(-0.05deg);
    }
    90% {
      transform: translateY(-0.3px) rotate(0.05deg);
    }
  }

  .animate-envelope-flutter {
    animation: envelope-flutter 8s ease-in-out infinite;
  }

  @keyframes sparkle-twinkle {
    0%, 100% {
      opacity: 0.2;
      transform: scale(1);
    }
    25% {
      opacity: 0.4;
      transform: scale(1.1);
    }
    50% {
      opacity: 0.6;
      transform: scale(0.9);
    }
    75% {
      opacity: 0.3;
      transform: scale(1.05);
    }
  }

  .animate-sparkle-twinkle {
    animation: sparkle-twinkle 4s ease-in-out infinite;
  }

  @keyframes flag-sway {
    0% {
      transform: rotateZ(0deg) skewY(0deg) scale(1);
    }
    25% {
      transform: rotateZ(40deg) skewY(-15deg) scale(1.05);
    }
    50% {
      transform: rotateZ(0deg) skewY(0deg) scale(1);
    }
    75% {
      transform: rotateZ(-40deg) skewY(15deg) scale(0.95);
    }
    100% {
      transform: rotateZ(0deg) skewY(0deg) scale(1);
    }
  }

  .animate-flag-sway {
    animation: flag-sway 3s infinite ease-in-out;
  }

  @keyframes wave-3d {
    0% {
      transform: rotateY(0deg);
    }
    25% {
      transform: rotateY(15deg);
    }
    50% {
      transform: rotateY(0deg);
    }
    75% {
      transform: rotateY(-15deg);
    }
    100% {
      transform: rotateY(0deg);
    }
  }

  @keyframes sway {
    0% {
      transform: translateX(0px) rotate(0deg);
    }
    25% {
      transform: translateX(5px) rotate(2deg);
    }
    50% {
      transform: translateX(0px) rotate(0deg);
    }
    75% {
      transform: translateX(-5px) rotate(-2deg);
    }
    100% {
      transform: translateX(0px) rotate(0deg);
    }
  }

  .animate-wave-3d {
    animation: wave-3d 2.5s ease-in-out infinite;
  }

  .animate-sway {
    animation: sway 3.2s ease-in-out infinite;
  }

  .scrollbar-hide {
    -ms-overflow-style: none;  /* Internet Explorer 10+ */
    scrollbar-width: none;  /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;  /* Safari and Chrome */
  }


`}</style>
