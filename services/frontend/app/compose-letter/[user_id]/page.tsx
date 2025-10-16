"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { ComposeLetterProvider, useComposeLetter } from "../components/ComposeLetterContext"
import { useParams } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import LetterSendAnimation from "../components/LetterSendAnimation";
import {
  Sheet, SheetTrigger, SheetContent,
  SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";
import TemplateSidePanel from "../components/TemplateSidePanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, AlertCircle, PanelLeft, PanelRight } from "lucide-react"
import MessagingApiClient, { SearchUsersRequest, SendLetterRequest, ApiError } from "@/lib/MessagingApiClient"
import { useSyncProfile } from "@/lib/context/ProfileContext"
import LeftSidebar from "../components/LeftSidebar"
import MainContent from "../components/MainContent"
import RightSidebar from "../components/RightSidebar"
import { FontSidePanel } from "../components/FontSidePanel"
import { useRouter } from "next/navigation"
import { toast, Toaster } from "sonner"
import { se } from "date-fns/locale";
import { PDFGenerator, LetterPDFData } from "../lib/pdfGenerator";
import { generateJPEG, generateJPEGDataUrl, captureLetterCloneAsPng } from "../lib/jpegGenerator";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { toJpeg, toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { moderationApi } from "@/lib/moderationApiClient";

// FONT_PRESETS definition
const FONT_PRESETS = [
  { id: 'handwritten', name: 'Handwritten', lineHeight: '1.6', letterSpacing: '0.05em' },
  { id: 'serif', name: 'Serif', lineHeight: '1.5', letterSpacing: '0.02em' },
  { id: 'sans-serif', name: 'Sans Serif', lineHeight: '1.4', letterSpacing: '0.01em' },
];

// Define types and interfaces at the top (these are fine as they're not exports)
export type LetterTemplate = {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  estimated_minutes?: number;
  tags?: string[]
}

interface Match {
  id: string
  name: string
  location: string
  interests: string[]
  conversation_thread_id: string
  match_id?: string
}

function LetterPageContent() {
  const params = useParams();
  const router = useRouter();
  const urlUserId = params?.user_id as string;
  const { presets } = useComposeLetter();
  // Load presets directly for restoring settings

  // Utility functions moved inside the component
  const estimateCEFR = (): string => {
    if (typeof document === 'undefined') return "A1";

    const editor = document.querySelector('.letter-content [contenteditable="true"]') as HTMLElement;
    if (!editor) return "A1";

    const html = editor.innerHTML;
    const text = editor.textContent || editor.innerText || "";

    const words = text.trim().split(/\s+/);
    const wordCount = words[0] === "" ? 0 : words.length;

    // Check for formatting elements using case-insensitive regex that allows for attributes
    const hasBullets = /<li/i.test(html);
    const hasBold = /<(b|strong)[\s>]/i.test(html);
    const hasItalic = /<(i|em)[\s>]/i.test(html);
    const hasUnderline = /<u[\s>]/i.test(html);
    const hasAnyEmphasis = hasBold || hasItalic || hasUnderline;

    // --- Rule-based Mapping ---

    // C2: Highest tier (most specific)
    if (
      (wordCount > 250 && hasBullets && hasAnyEmphasis) ||
      (wordCount > 50 && hasBullets && hasBold && hasItalic && hasUnderline)
    ) {
      return "C2";
    }

    // C1: Advanced
    if (wordCount > 150 && hasBullets && hasAnyEmphasis) {
      return "C1";
    }

    // B2: Upper Intermediate
    if (wordCount > 100 && hasBullets) {
      return "B2";
    }

    // B1: Intermediate
    if (wordCount > 75) {
      return "B1";
    }

    // A2: Elementary
    if (wordCount > 40) {
      return "A2";
    }

    // A1: Beginner (default)
    return "A1";
  };

  // Constants moved inside the component
  const DEFAULT_TEMPLATES: LetterTemplate[] = [
    {
      id: 't1',
      name: 'Intro — a friendly hello',
      description: 'A warm, short introduction you can send to start a conversation.',
      content: `I'm excited to connect with you here. I love learning about people's daily lives and small rituals. What's one little thing that makes your day better?`,
      category: 'intro'
    },
    {
      id: 't2',
      name: 'Travel story',
      description: 'Share a short travel memory to spark conversation.',
      content: `I recently took a short trip and was struck by how different the mornings felt there — the light, the sounds, and the food. One morning I wandered into a small market and tried a local pastry that I'll never forget. Have you traveled anywhere that surprised you lately?`,
      category: 'travel'
    },
    {
      id: 't3',
      name: 'Checking in',
      description: 'A gentle way to reconnect after some time.',
      content: `It's been a little while and I wanted to check in and see how you're doing. I hope life has been treating you kindly. What's been keeping you busy these days?`,
      category: 'reconnect'
    }
  ];

  const getLetterTemplates = (): Promise<LetterTemplate[]> => {
    return Promise.resolve(DEFAULT_TEMPLATES);
  };

  // State variables
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [mobilePanelType, setMobilePanelType] = useState<'left' | 'font' | null>(null);

  const [fontStyle, setFontStyle] = useState("handwritten");
  const [fontSize, setFontSize] = useState([16]);
  const [fontColor, setFontColor] = useState("#000000");
  const [fontOpacity, setFontOpacity] = useState(1);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [backgroundOpacity, setBackgroundOpacity] = useState(1);
  const [previewConfig, setPreviewConfig] = useState<{
    lineConfig: LineConfig;
    backgroundColor: string;
    backgroundOpacity: number;
    fontColor: string;
    fontOpacity: number;
  } | null>(null);
  const [letterContent, setLetterContent] = useState(
    `I'm writing this from a small cafe, watching the world go by. The smell of coffee and old books hangs in the air, a comforting mix. I've been thinking a lot about the simple things that bring us joy. For me, it's the first sip of tea in the morning, the feeling of a good book in my hands, and the sound of rain against the windowpane. What simple pleasures do you cherish in your part of the world? I'm curious about the daily rituals and moments that make up your life. I've been learning to paint with watercolors recently. My creations are far from perfect, but I love how the colors blend and create something unexpected. It feels like a small act of magic.`
  );
  const [letterHeading, setLetterHeading] = useState<string>('To a kindred spirit,');
  const [letterFooterPrefix, setLetterFooterPrefix] = useState<string>('Yours,');

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontOverlayOpen, setFontOverlayOpen] = useState(false);
  const [previewFontId, setPreviewFontId] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templateBackground, setTemplateBackground] = useState<string | null>("solid-white");
  // Extend line types to include arcs and spirals
  type LineType = 'none' | 'straight' | 'dotted' | 'wavy' | 'zigzag' | 'swirls' | 'arc' | 'spiral' | 'floral';
  interface LineConfig {
    type: LineType;
    spacing: number;
    thickness: number;
    color: string;
    opacity: number;
    rotation: number;
  }
  const [lineConfig, setLineConfig] = useState<LineConfig>({
    type: 'none',
    spacing: 24,
    thickness: 1,
    color: '#e5e7eb',
    opacity: 0.5,
    rotation: 0
  });

  const [stats, setStats] = useState({ wordCount: 0, charCount: 0, readingTime: "0:00" });
  const [readability, setReadability] = useState("A1");
  const [isProcessing, setIsProcessing] = useState(false);

  // Add request deduplication using refs to avoid dependency issues
  const isFetchingMatchesRef = useRef(false);
  const lastFetchKeyRef = useRef<string>('');

  // Manual retry function for failed match loading
  const retryFetchMatches = useCallback(() => {
    if (isFetchingMatchesRef.current) return;
    lastFetchKeyRef.current = ''; // Reset to allow refetch
    setError(null);
  }, []);


  // Map lineConfig to generator parameters
  const mapLineConfigToParams = useCallback((config: LineConfig) => {
    const { type, spacing, thickness, color, opacity, rotation } = config;
  // Use viewport dimensions so patterns fill full area
  const width = typeof window !== 'undefined' ? window.innerWidth : 600;
  const height = typeof window !== 'undefined' ? window.innerHeight : 800;
    switch (type) {
      case 'straight':
        // Start lines at the very top and cover full height with an extra line
        return {
          type,
          width,
          height,
          slope: 0,
          intercept: 0,
          spacing,
          count: Math.ceil(height / spacing) + 1,
          thickness,
          color,
          opacity,
          rotation
        };
      case 'wavy':
        return { type, width, height, amplitude: spacing / 4, frequency: 1 / 100, phase: 0, verticalOffset: 0, samples: 300, count: Math.ceil(height / spacing), spacing, thickness, color, opacity, rotation };
      case 'zigzag':
        return { type, width, height, amplitude: spacing / 4, period: 100, phase: 0, samples: 300, count: Math.ceil(height / spacing), spacing, thickness, color, opacity, rotation };
      case 'swirls':
        // Grid of small swirls across the area
        return { type: 'swirls', width, height, spacing, thickness, color, opacity, rotation };
      case 'arc':
        return { type, centerX: width / 2, centerY: height / 2, radius: Math.min(width, height) / 4, startAngle: 0, endAngle: Math.PI, count: Math.ceil((Math.min(width, height) / 2) / spacing), spacing, samples: 100, thickness, color, opacity, rotation };
      case 'spiral':
        return { type, centerX: width / 2, centerY: height / 2, a: 0, b: spacing, turns: 3, startAngle: 0, samples: 500, thickness, color, opacity, rotation };
      case 'dotted':
        return { type, width, height, originX: 0, originY: 0, spacing, thickness, jitter: 0, gridType: 'rect', color, opacity, rotation };
      default:
        return null;
    }
  }, []);

  const { profile, synced } = useSyncProfile();
  const { getToken } = useAuth();
  const userId = profile?.user_id ?? '';
  const anonymousHandle = synced ? (profile?.anonymous_handle ?? '') : '';
  const api = useMemo(() => new MessagingApiClient({ timeoutMs: 30000, getToken }), [getToken]);

  const handleSendWithImage = async (jpgDataUrl: string | null) => {
    if (!selectedMatch || !userId) return;

    setSending(true);
    setIsProcessing(true);
    setError(null);
    setSuccess(false);

    try {
      // Check for profanity
      let profanityResult;
      try {
        profanityResult = await moderationApi.checkProfanity(letterContent, userId);
      } catch (error) {
        console.error('Failed to check profanity:', error);
      }

      let contentToSend = letterContent;
      let imageDataUrl = jpgDataUrl;

      // If we need to generate censored image
      if (profanityResult?.contains_profanity && profanityResult.censored_text) {
        contentToSend = profanityResult.censored_text;
        
        // Generate censored image if we don't have one or need to replace it
        if (!jpgDataUrl) {
          const letterElement = document.querySelector('.letter-content') as HTMLElement;
          const editorElement = letterElement?.querySelector('[contenteditable="true"]') as HTMLElement;
          
          if (editorElement) {
            const originalContent = editorElement.innerHTML;
            editorElement.innerHTML = profanityResult.censored_text.replace(/\n/g, '<br>');
            
            try {
              imageDataUrl = await generateJPEGDataUrl(letterElement, { 
                targetWidth: window.innerWidth < 1280 ? 1024 : 768, 
                isMobile: window.innerWidth < 1280 
              });
            } finally {
              editorElement.innerHTML = originalContent;
            }
          }
        }
      }

      // Convert data URL to File
      if (!imageDataUrl) throw new Error('No image data available');
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'folded-letter.jpg', { type: 'image/jpeg' });

      // Upload the image
      const uploadResponse = await api.uploadImage(file);
      const imagePath = uploadResponse.data.path;

      // Prepare letter data
      const senderID = userId;
      const recipientID = selectedMatch.id;

      const threadId = selectedMatch.conversation_thread_id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString());

      const scheduledDt = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const scheduledIso = scheduledDt.toISOString();
      const composedFooter = `${letterFooterPrefix} ${anonymousHandle}`.trim();

      const body: SendLetterRequest & { scheduled_delivery_at?: string, letter_heading?: string, letter_footer?: string } = {
        sender_id: senderID,
        recipient_id: recipientID,
        message_content: contentToSend,
        letter_url: imagePath,
        scheduled_delivery_at: scheduledIso,
        letter_heading: letterHeading,
        letter_footer: composedFooter,
      };

      const sendResponse = await api.sendLetter(body);

      const realThreadId = (sendResponse && sendResponse.conversation_thread_id) ? sendResponse.conversation_thread_id : threadId;

      setMatches(prev => prev.map(match =>
        match.id === selectedMatchId
          ? { ...match, conversation_thread_id: realThreadId }
          : match
      ));

      setSuccess(true);
      toast.success('Your letter has been sent!', {
        description: 'Your letter will be delivered to your pen pal soon.',
        icon: <CheckCircle2 className="text-green-500" />
      });

      // Redirect after success
      router.push('/inbox');

    } catch (error) {
      let errorMsg = 'Unknown error';

      if (error instanceof Error) {
        errorMsg = error.message || 'Unknown error';

        if (errorMsg.includes('foreign key') || errorMsg.includes('FK') || errorMsg.includes('violation') || errorMsg.includes('constraint')) {
          errorMsg = 'Database relationship error. This may require database setup to link these users.';
          toast.error('Database Setup Required', {
            description: 'The system needs configuration to connect these users. Please ask an administrator to set up the match.',
            duration: 5000,
          });
        } else if (errorMsg.includes('uuid') || errorMsg.includes('syntax')) {
          errorMsg = 'Invalid ID format. Please try again or select a different recipient.';
        }
      }

      setError(`Failed to send letter. ${errorMsg}`);
      toast.error('Failed to send letter', {
        description: errorMsg,
        icon: <AlertCircle className="text-red-500" />
      });
      throw error; // Re-throw so the animation can catch it
    } finally {
      setSending(false);
      setIsProcessing(false);
    }
  };

  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  const handleRecipientChange = useCallback((newMatchId: string) => {
    setSelectedMatchId(newMatchId);
  }, []);

  useEffect(() => {
    if (!synced || !userId) {
      return;
    }

    // Create a unique key for this fetch request to prevent duplicates
    const fetchKey = `${userId}-${urlUserId || 'default'}`;

    if (isFetchingMatchesRef.current || fetchKey === lastFetchKeyRef.current) {
      return;
    }

    const fetchMatches = async () => {
      isFetchingMatchesRef.current = true;
      lastFetchKeyRef.current = fetchKey;

      try {
        setLoading(true);
        setError(null);
        const searchBody: SearchUsersRequest = {
          anonymous_handle: "",
          my_user_id: userId,
          limit: 10,
          offset: 0,
        };

        let res;
        let retryCount = 0;
        const maxRetries = 2;

        while (retryCount <= maxRetries) {
          try {
            res = await api.searchUsers(searchBody);
            break; // Success, exit retry loop
          } catch (err: unknown) {
            const error = err as Error;
            if (error instanceof ApiError && error.status === 408 && retryCount < maxRetries) {
              // Timeout error, retry after delay
              await new Promise(r => setTimeout(r, 800 * (retryCount + 1)));
              retryCount++;
              continue;
            } else if (error instanceof ApiError && error.status === 500 && retryCount < maxRetries) {
              // Server error, retry after delay
              await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
              retryCount++;
              continue;
            } else {
              // Non-retryable error or max retries reached
              throw err;
            }
          }
        }

        // Check if we got a successful response
        if (!res) {
          throw new Error('Failed to fetch matches after retries');
        }

        const mappedMatches: Match[] = res.items.map((item: unknown) => {
          const userItem = item as { latest_message?: { conversation_thread_id?: string; match_id?: string }; user_profile: { user_id: string; anonymous_handle: string; country_code?: string } };
          const threadId = userItem.latest_message?.conversation_thread_id;
          const matchId: string = userItem.latest_message?.match_id || '';

          return {
            id: userItem.user_profile.user_id,
            name: userItem.user_profile.anonymous_handle,
            location: userItem.user_profile.country_code || "Unknown",
            interests: [],
            conversation_thread_id: threadId || '',
            match_id: matchId || ''
          };
        });

        setMatches(mappedMatches);

        if (urlUserId && urlUserId !== 'default') {
          const matchingUser = mappedMatches.find(match => match.id === urlUserId);
          if (matchingUser) {
            setSelectedMatchId(urlUserId);
          } else {
            if (mappedMatches.length > 0) {
              setSelectedMatchId(mappedMatches[0].id);
            }
          }
        } else if (mappedMatches.length > 0) {
          setSelectedMatchId(mappedMatches[0].id);
        }
      } catch (err: unknown) {
        console.error('Failed to fetch matches:', err);
        const error = err as Error;
        let errorMessage = 'Failed to load matches. Please check your connection or try again later.';

        if (error instanceof ApiError) {
          if (error.status === 500) {
            errorMessage = 'Server temporarily unavailable. Matches will load when the service is back online.';
          } else if (error.status === 408) {
            errorMessage = 'Request timed out. Please try refreshing the page.';
          }
        }

        // Don't clear existing matches on error - preserve them for better UX
        // Only show error if we have no matches at all
        if (matches.length === 0) {
          setError(errorMessage);
        }

        // The UI will still work with existing matches or empty state
        console.warn('Match loading failed:', errorMessage);
      } finally {
        setLoading(false);
        isFetchingMatchesRef.current = false;
      }
    };

    fetchMatches();
  }, [synced, userId, urlUserId, api]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedMatch = matches.find((match) => match.id === selectedMatchId) || null;

  const getLetterStats = (html: string) => {
    if (typeof document === 'undefined') {
      return { wordCount: 0, charCount: 0, readingTime: "0:00" };
    }
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || "";
    
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    
    // Calculate reading time in seconds, rounded to nearest 5 seconds
    const totalSeconds = (words / 200) * 60;
    const roundedSeconds = Math.round(totalSeconds / 5) * 5;
    const minutes = Math.floor(roundedSeconds / 60);
    const seconds = roundedSeconds % 60;
    const readingTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return { wordCount: words, charCount: chars, readingTime };
  };

  useEffect(() => {
    setStats(getLetterStats(letterContent));
    setReadability(estimateCEFR());
  }, [letterContent]);

  const { wordCount, charCount, readingTime } = stats;

  const handleExportJPG = async (callback?: (dataUrl: string | null) => void) => {
    const letterElement = document.querySelector('.letter-content') as HTMLElement;
    if (!letterElement) {
      toast.error('Could not find letter content to export.');
      if (typeof callback === 'function') callback(null);
      return;
    }

    setIsProcessing(true);

    try {
      // Force desktop width for mobile exports to prevent shrinking
      const isMobile = window.innerWidth < 1280;
      const targetWidth = isMobile ? 1024 : 768; // Use larger width on mobile for desktop-like export

      await generateJPEG(
        letterElement,
        `letter-to-${selectedMatch?.name || 'penpal'}.jpeg`,
        callback,
        { targetWidth, isMobile }
      );

      if (!callback) {
        toast.success('JPG Exported Successfully');
      }
    } catch (error) {
      console.error('Failed to export JPG:', error);
      toast.error('Failed to export as JPG', {
        description: error instanceof Error ? error.message : 'An unknown error occurred.'
      });
      if (typeof callback === 'function') callback(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const adjustFontSizeForExport = (element: HTMLElement, desiredFontSize?: number, targetWidth?: number) => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const debug = urlParams ? urlParams.get('exportDebug') === '1' : false;
  const originalFontSizes = new Map<HTMLElement, { original: string; computed: string; originalLineHeight?: string; originalLetterSpacing?: string; computedLineHeight?: string; computedLetterSpacing?: string }>();

    // Collect only text-bearing elements (this avoids skipping contentEditable children
    // and prevents scaling non-text elements like SVGs, badges, etc.)
    const candidates: HTMLElement[] = [];
    if (element instanceof HTMLElement) candidates.push(element);
    element.querySelectorAll('*').forEach((n) => {
      if (n instanceof HTMLElement) candidates.push(n);
    });

    const textBearing = candidates.filter((el) => {
      try {
        // Include inputs/textarea and elements that have non-whitespace text
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return true;
        const txt = el.textContent || '';
        return txt.trim().length > 0;
      } catch {
        return false;
      }
    });

    // Store originals for restoration
    textBearing.forEach((el) => {
      try {
        const cs = window.getComputedStyle(el);
        originalFontSizes.set(el, {
          original: el.style.fontSize,
          computed: cs.fontSize,
          originalLineHeight: el.style.lineHeight,
          originalLetterSpacing: el.style.letterSpacing,
          computedLineHeight: cs.lineHeight,
          computedLetterSpacing: cs.letterSpacing,
        });
      } catch {
        // ignore elements we can't read
      }
    });

    // Calculate target height based on US Letter aspect ratio
    const US_LETTER_ASPECT_RATIO = 11 / 8.5;
    // Use targetWidth if provided (for mobile exports), otherwise use element width
    const effectiveWidth = typeof targetWidth === 'number' ? targetWidth : element.offsetWidth;
    const targetHeight = effectiveWidth * US_LETTER_ASPECT_RATIO;
    const currentHeight = element.scrollHeight;

    let finalScalingFactor = 1;

    // Only scale up when there is spare vertical space
    if (currentHeight < targetHeight && currentHeight > 0) {
      const baseScalingFactor = targetHeight / currentHeight;

      // Compute average computed font size across text-bearing elements
      const computedSizes: number[] = [];
      for (const styles of originalFontSizes.values()) {
        const n = parseFloat(styles.computed || '0');
        if (!isNaN(n) && n > 0) computedSizes.push(n);
      }
      const avgComputed = computedSizes.length ? (computedSizes.reduce((a, b) => a + b, 0) / computedSizes.length) : 0;

      // Aggressive boost when average font is small. This increases scale up to an extra +60%
      // for very small fonts, and less for mid-range fonts. Keep a sensible cap to avoid
      // producing giant text that breaks layout.
      let boost = 1;
      if (avgComputed > 0 && avgComputed < 14) {
        // linear interpolation from 0..14 -> boost 1.0..1.6
        boost = 1 + ((14 - avgComputed) / 14) * 0.6;
      } else if (avgComputed >= 14 && avgComputed < 18) {
        // small gentle boost for mid-range
        boost = 1 + ((18 - avgComputed) / 18) * 0.15;
      }

      // Decide final scaling factor. If baseScalingFactor < 1, we need to shrink to fit.
      // Use an iterative approach for shrinking so we find the smallest factor that fits
      // without making text unreadably small.
      const maxComputed = computedSizes.length ? Math.max(...computedSizes) : 16;

      // Determine absolute minimum factor (prevent fonts smaller than 10px by default)
      const minAllowedFactor = Math.max(0.35, 10 / Math.max(1, maxComputed));

      let finalScalingFactor = baseScalingFactor * boost;
      finalScalingFactor = Math.min(finalScalingFactor, 10);

  if (debug) console.debug('[adjustFontSizeForExport] baseScalingFactor, boost, avgComputed', baseScalingFactor, boost, avgComputed);
  // If we need to shrink (baseScalingFactor < 1) but finalScalingFactor still >1 due to boost,
      // start with min(baseScalingFactor, finalScalingFactor)
      if (baseScalingFactor < 1) {
        // Start with a candidate that leans toward the base (so we don't over-shrink unintentionally)
        let candidate = Math.min(baseScalingFactor, finalScalingFactor);

        const applyFactor = (factor: number) => {
          for (const [el, styles] of originalFontSizes.entries()) {
            const computedSize = parseFloat(styles.computed || '0');
            if (!isNaN(computedSize) && computedSize > 0) {
              const newFont = computedSize * factor;
              el.style.fontSize = `${newFont}px`;

              let compLH = parseFloat(styles.computedLineHeight || '0');
              if (isNaN(compLH) || compLH === 0) compLH = computedSize * 1.25;
              // When shrinking, enforce a slightly larger minimum line-height multiplier to avoid squashing
              const minLH = Math.max(newFont * 1.18, compLH * 0.9);
              const newLH = Math.max(compLH * factor, minLH);
              try { el.style.lineHeight = `${newLH}px`; } catch {}

              const compLS = parseFloat(styles.computedLetterSpacing || '0');
              if (!isNaN(compLS)) {
                // Don't allow negative or extreme negative letter-spacing after shrink
                const newLS = compLS * factor;
                try { el.style.letterSpacing = `${Math.max(newLS, 0)}px`; } catch {}
              }
            }
          }
        };

        // Try progressively smaller factors until the content fits or we hit minAllowedFactor
        let attempts = 0;
        applyFactor(candidate);
        // Allow the browser to reflow so scrollHeight is correct
        // We'll synchronously read scrollHeight here because clone is in DOM.
        while (element.scrollHeight > targetHeight && attempts < 12 && candidate > minAllowedFactor) {
          attempts += 1;
          candidate = Math.max(minAllowedFactor, candidate * 0.92); // reduce by 8% each iteration
          applyFactor(candidate);
        }
        finalScalingFactor = candidate;
        if (debug) console.debug('[adjustFontSizeForExport] shrink attempts', attempts, 'finalScalingFactor', finalScalingFactor, 'element.scrollHeight', element.scrollHeight, 'targetHeight', targetHeight);
      } else {
        // Upscale path (baseScalingFactor >= 1). Use finalScalingFactor computed above.
        for (const [el, styles] of originalFontSizes.entries()) {
          const computedSize = parseFloat(styles.computed || '0');
          if (!isNaN(computedSize) && computedSize > 0) {
            const newFont = computedSize * finalScalingFactor;
            el.style.fontSize = `${newFont}px`;

            let compLH = parseFloat(styles.computedLineHeight || '0');
            if (isNaN(compLH) || compLH === 0) compLH = computedSize * 1.25;
            const newLH = Math.max(compLH * finalScalingFactor, newFont * 1.12);
            try { el.style.lineHeight = `${newLH}px`; } catch {}

            const compLS = parseFloat(styles.computedLetterSpacing || '0');
            if (!isNaN(compLS) && Math.abs(compLS) > 0.01) {
              try { el.style.letterSpacing = `${compLS * finalScalingFactor}px`; } catch {}
            }
          }
        }
      }
      if (debug) {
        // Report a few scaled elements for inspection
        const report: Array<{ tag: string; old: string; new: string }> = [];
        let i = 0;
        for (const [el, styles] of originalFontSizes.entries()) {
          if (i++ > 6) break;
          report.push({ tag: el.tagName.toLowerCase(), old: styles.computed || '', new: el.style.fontSize || '' });
        }
        console.debug('[adjustFontSizeForExport] sample scaled elements', report);
      }
    }

    // Return cleanup function to restore original inline font-sizes
    return { cleanup: () => {
      for (const [el, styles] of originalFontSizes.entries()) {
        try {
          el.style.fontSize = styles.original || '';
        } catch {}
      }
    }, scalingFactor: finalScalingFactor };
  };

  // Capture the letter element by cloning it into an off-screen container so
  // we can mutate styles for export without touching the live UI (avoids
  // reflows that briefly collapse sidebars).
  const captureLetterCloneAsPng = async (element: HTMLElement, targetWidth = 768, desiredFontSize?: number) => {
    if (typeof document === 'undefined') throw new Error('No document');
    // Clone the node so we can change inline styles without affecting layout
    const clone = element.cloneNode(true) as HTMLElement;

    // Prepare an offscreen wrapper. Placing it offscreen prevents layout
    // shifts in the visible content while keeping the clone renderable.
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = `${targetWidth}px`;
    wrapper.style.height = 'auto';
    wrapper.style.overflow = 'visible';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.zIndex = '99999';
    clone.style.width = `${targetWidth}px`;
    clone.style.height = 'auto';
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    // Use the same font-scaling helper on the clone so the exported image
    // matches what the live UI would look like.
  const { cleanup, scalingFactor } = adjustFontSizeForExport(clone, desiredFontSize, targetWidth);

    // Wait for layout and fonts to apply
    await new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())));

    // Capture using html-to-image
    // @ts-ignore
    const dataUrl = await toPng(clone, { quality: 0.98, pixelRatio: 2 });

    // Clean up
    try { cleanup(); } catch (e) {}
    if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);

    return { dataUrl, scalingFactor };
  };

  const handleConfirmSend = () => {
    setAnimationKey(prevKey => prevKey + 1);
    setShowAnimation(true);
  };

  const handleSend = async () => {
    if (!selectedMatch || !userId) return;

    // Check for profanity before sending
    let profanityResult;
    try {
      profanityResult = await moderationApi.checkProfanity(letterContent, userId);
    } catch (error) {
      console.error('Failed to check profanity:', error);
      // Continue with sending if check fails (fail-open approach)
    }

    const originalSize = [...fontSize];

    setSending(true);
    setIsProcessing(true);
    setError(null);
    setSuccess(false);

    const letterElement = document.querySelector('.letter-content') as HTMLElement;
    let cleanup: (() => void) | null = null;
    let scalingFactor = 1;
    let contentToSend = letterContent;
    let editorElement: HTMLElement | null = null;
    let originalEditorContent = '';

    // Handle censored content for image generation
    if (profanityResult?.contains_profanity && profanityResult.censored_text) {
      // Find the contentEditable editor
      editorElement = letterElement?.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editorElement) {
        originalEditorContent = editorElement.innerHTML;
        // Temporarily replace with censored text for image generation
        editorElement.innerHTML = profanityResult.censored_text.replace(/\n/g, '<br>');
        contentToSend = profanityResult.censored_text;
      }
    }

    // Store original scroll container styles
    const scrollContainers: Array<{ element: HTMLElement; originalStyles: Partial<CSSStyleDeclaration> }> = [];
    
    // Force desktop width for mobile exports to prevent shrinking
    const isMobile = window.innerWidth < 1280;
    const targetWidth = isMobile ? 1024 : 768; // Use larger width on mobile for desktop-like export
    
    if (letterElement) {
      // Temporarily remove scrolling constraints for proper font size calculation
      const containers = letterElement.querySelectorAll('[style*="maxHeight"], [style*="overflowY"], [style*="overflow"]');
      containers.forEach((container) => {
        const el = container as HTMLElement;
        scrollContainers.push({
          element: el,
          originalStyles: {
            maxHeight: el.style.maxHeight,
            overflowY: el.style.overflowY,
            overflow: el.style.overflow,
          }
        });
        el.style.maxHeight = '';
        el.style.overflowY = '';
        el.style.overflow = '';
      });

      const result = adjustFontSizeForExport(letterElement, fontSize[0], targetWidth);
      cleanup = result.cleanup;
      scalingFactor = result.scalingFactor;
    }

    setFontSize([Math.min(48, Math.max(8, fontSize[0] * scalingFactor))]);

    try {
        // Generate JPG of the letter
        let imagePath = '';
        if (letterElement) {
          // Force desktop width for mobile exports to prevent shrinking
          const isMobile = window.innerWidth < 1280;
          const targetWidth = isMobile ? 1024 : 768; // Use larger width on mobile for desktop-like export

          const jpegDataUrl = await generateJPEGDataUrl(letterElement, { targetWidth, isMobile });
          if (jpegDataUrl) {
            const imgResponse = await fetch(jpegDataUrl);
            const imgBlob = await imgResponse.blob();
            const imgFile = new File([imgBlob], 'letter.jpg', { type: 'image/jpeg' });
            const uploadRes = await api.uploadImage(imgFile);
            imagePath = uploadRes.data.path;
          }
        }      const senderID = userId;
      const recipientID = selectedMatch.id;

      const threadId = selectedMatch.conversation_thread_id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString());

      const scheduledDt = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const scheduledIso = scheduledDt.toISOString();
      const composedFooter = `${letterFooterPrefix} ${anonymousHandle}`.trim();

      const body: SendLetterRequest & { scheduled_delivery_at?: string, letter_heading?: string, letter_footer?: string } = {
        sender_id: senderID,
        recipient_id: recipientID,
        message_content: contentToSend,
        letter_url: imagePath,
        scheduled_delivery_at: scheduledIso,
        letter_heading: letterHeading,
        letter_footer: composedFooter,
      };

      const response = await api.sendLetter(body);

      const realThreadId = (response && response.conversation_thread_id) ? response.conversation_thread_id : threadId;

      setMatches(prev => prev.map(match =>
        match.id === selectedMatchId
          ? { ...match, conversation_thread_id: realThreadId }
          : match
      ));

      setSuccess(true);
      toast.success('Your letter has been sent!', {
        description: 'Your letter will be delivered to your pen pal soon.',
        icon: <CheckCircle2 className="text-green-500" />
      });
      
      // Redirect after success
      router.push('/inbox');

    } catch (error) {
      let errorMsg = 'Unknown error';

      if (error instanceof Error) {
        errorMsg = error.message || 'Unknown error';

        if (errorMsg.includes('foreign key') || errorMsg.includes('FK') || errorMsg.includes('violation') || errorMsg.includes('constraint')) {
          errorMsg = 'Database relationship error. This may require database setup to link these users.';
          toast.error('Database Setup Required', {
            description: 'The system needs configuration to connect these users. Please ask an administrator to set up the match.',
            duration: 5000,
          });
        } else if (errorMsg.includes('uuid') || errorMsg.includes('syntax')) {
          errorMsg = 'Invalid ID format. Please try again or select a different recipient.';
        }
      }

      setError(`Failed to send letter. ${errorMsg}`);
      toast.error('Failed to send letter', {
        description: errorMsg,
        icon: <AlertCircle className="text-red-500" />
      });
      setShowAnimation(false); // Hide animation on error
    } finally {
      setSending(false);
      setIsProcessing(false);
      
      // Restore original editor content if it was modified
      if (editorElement && originalEditorContent) {
        editorElement.innerHTML = originalEditorContent;
      }
      
      if (cleanup) cleanup();
      setFontSize(originalSize);
      
      // Restore original scroll container styles
      scrollContainers.forEach(({ element, originalStyles }) => {
        element.style.maxHeight = originalStyles.maxHeight || '';
        element.style.overflowY = originalStyles.overflowY || '';
        element.style.overflow = originalStyles.overflow || '';
      });

      // No need to restore classes since we're not modifying them in the jpegGenerator now
    }
  };

  const handleExportPDF = async () => {
    const letterElement = document.querySelector('.letter-content') as HTMLElement;
    if (!letterElement) {
      toast.error('Could not find letter content to export.');
      return;
    }

    setIsProcessing(true);

    try {
      // Force desktop width for mobile exports to prevent shrinking
      const isMobile = window.innerWidth < 1280;
      const targetWidth = isMobile ? 1024 : 768; // Use larger width on mobile for desktop-like export

      const pdfBlob = await PDFGenerator.generateLetterPDF(letterElement, {
        content: letterContent,
        heading: letterHeading,
        footer: `${letterFooterPrefix} ${anonymousHandle}`,
        anonymousHandle,
        date: new Date().toLocaleDateString(),
        fontSize: fontSize[0],
        fontFamily: 'Arial',
        templateBackground: templateBackground || undefined,
        templateImageUrl: undefined
      }, targetWidth, isMobile);

      PDFGenerator.downloadPDF(pdfBlob, `letter-to-${selectedMatch?.name || 'penpal'}.pdf`);

      toast.success('PDF Exported Successfully');

    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Failed to export as PDF', {
        description: error instanceof Error ? error.message : 'An unknown error occurred.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectTemplate = useCallback((id: string | null) => {
    setPreviewConfig(null); // Clear preview on selection
    if (id) {
      const preset = presets.find(p => p.id === id);
      if (preset) {
        const cfg = preset.config;
        const params = cfg.pattern.params as any;
        setBackgroundColor(cfg.background.color);
        setBackgroundOpacity(cfg.background.opacity ?? 1);
        setFontColor(cfg.fontColor);
        setFontOpacity(cfg.fontOpacity ?? 1);
        setLineConfig({
          type: cfg.pattern.type as LineType,
          spacing: params.spacing,
          thickness: params.thickness,
          color: params.color,
          opacity: params.opacity,
          rotation: params.rotation
        });
      }
    }
    setTemplateBackground(id);
    setTemplatesOpen(false);
  }, [presets]);

  const handlePreviewTemplate = useCallback((id: string | null) => {
    if (id) {
      const preset = presets.find(p => p.id === id);
      if (preset) {
        const cfg = preset.config;
        const params = cfg.pattern.params as any;
        setPreviewConfig({
          backgroundColor: cfg.background.color,
          backgroundOpacity: cfg.background.opacity ?? 1,
          fontColor: cfg.fontColor,
          fontOpacity: cfg.fontOpacity ?? 1,
          lineConfig: {
            type: cfg.pattern.type as LineType,
            spacing: params.spacing,
            thickness: params.thickness,
            color: params.color,
            opacity: params.opacity,
            rotation: params.rotation
          }
        });
      }
    } else {
      setPreviewConfig(null);
    }
  }, [presets]);

  const handleToggleTemplates = useCallback(() => {
    const isMobile = window.innerWidth < 1280; // xl breakpoint
    if (isMobile) {
      // On mobile, open bottom templates sheet
      setTemplatesOpen(open => !open);
    } else {
      // On desktop, toggle templates in right sidebar
      setTemplatesOpen(open => !open);
    }
  }, []);

  const handleToggleLeft = useCallback(() => {
    setLeftOpen(open => !open);
  }, []);

  const resetLetter = useCallback(() => {
    // Confirmation is handled in MainContent's dialog
    // Clear letter content and reset template/styling back to defaults
    setLetterContent("");
    setSuccess(false);
    setError(null);
    setTemplatesOpen(false);
    setTemplateBackground(null);
    setPreviewConfig(null);
    setBackgroundColor("#ffffff");
    setBackgroundOpacity(1);
    setFontColor("#000000");
    setFontOpacity(1);
    setLineConfig({
      type: 'none',
      spacing: 24,
      thickness: 1,
      color: '#e5e7eb',
      opacity: 0.5,
      rotation: 0
    });
  }, []);

  const handleAnimationComplete = () => {
    setShowAnimation(false); // Just hide the animation
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <Toaster richColors position="top-center" />
      <LetterSendAnimation key={animationKey} show={showAnimation} onAnimationComplete={handleAnimationComplete} onSendWithImage={handleSendWithImage} />
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/inbox')} aria-label="Back to inbox" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to inbox</span>
            </Button>
          </div>
          <div className="flex items-center gap-3" />
        </div>
      </header>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-auto max-w-7xl mt-2">
          <p>{error}</p>
        </div>
      )}
      <div className="mx-auto w-full max-w-7xl px-3 xl:px-6">
        {/* Mobile top bar (only visible < md) */}
        <div className="xl:hidden sticky top-0 z-1 bg-white/90 backdrop-blur border-b border-amber-100 -mx-3 px-3 py-2 flex items-center justify-between">
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2" 
            onClick={() => {
              if (mobilePanelType === 'left') {
                setMobilePanelType(null);
              } else {
                setMobilePanelType('left');
              }
            }}
          >
            <PanelLeft className="h-4 w-4" />
            Matches
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setRightOpen(true)}>
            Preview & Send
            <PanelRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Desktop layout: 3 columns */}
        <div className="xl:flex xl:gap-6">
          {/* Left sidebar (desktop only) */}
          <div className="hidden xl:block xl:w-72 xl:w-80 shrink-0">
            <LeftSidebar
              selectedMatch={selectedMatch}
              matches={matches}
              loading={loading}
              onChangeRecipient={handleRecipientChange}
              onApplyTemplate={(templateId: string) => {
                getLetterTemplates()
                  .then((list: LetterTemplate[]) => {
                    const t = list.find((x: LetterTemplate) => x.id === templateId);
                    if (t) setLetterContent(t.content);
                  })
                  .catch((err: unknown) =>
                    console.error("Failed to apply template from left sidebar:", err)
                  );
              }}
              showFontOverlay={fontOverlayOpen}
              onToggleFontOverlay={() => {
                setFontOverlayOpen((o) => !o);
                setPreviewFontId(null);
              }}
              fontStyle={fontStyle}
              onSelectFont={(id: string) => {
                setFontStyle(id);
                setPreviewFontId(null);
              }}
              onPreviewFont={(id: string | null) => setPreviewFontId(id)}
              fontColor={fontColor}
              fontOpacity={fontOpacity}
              backgroundColor={backgroundColor}
              backgroundOpacity={backgroundOpacity}
            />
          </div>

          {/* Main editor (always visible) */}
          <div className="flex-1">
            <MainContent
              letterContent={letterContent}
              setLetterContent={setLetterContent}
              fontStyle={fontStyle}
              fontSize={fontSize}
              fontColor={previewConfig?.fontColor ?? fontColor}
              fontOpacity={previewConfig?.fontOpacity ?? fontOpacity}
              backgroundColor={previewConfig?.backgroundColor ?? backgroundColor}
              backgroundOpacity={previewConfig?.backgroundOpacity ?? backgroundOpacity}
              setFontStyle={setFontStyle}
              setFontSize={setFontSize}
              success={success}
              anonymousHandle={anonymousHandle}
              letterHeading={letterHeading}
              setLetterHeading={setLetterHeading}
              letterFooterPrefix={letterFooterPrefix}
              setLetterFooterPrefix={setLetterFooterPrefix}
              onNewLetter={resetLetter}
              sending={sending}
              isProcessing={isProcessing}
              previewFontIdExternal={previewFontId}
              onToggleFontOverlay={() => {
                const isMobile = window.innerWidth < 1280;
                if (isMobile) {
                  const currentType = mobilePanelType as 'left' | 'font' | null;
                  if (currentType === 'font') {
                    setMobilePanelType(null);
                    setFontOverlayOpen(false);
                    setPreviewFontId(null);
                  } else {
                    setMobilePanelType('font');
                    setFontOverlayOpen(true);
                    setPreviewFontId(null);
                  }
                } else {
                  setFontOverlayOpen((o) => !o);
                  setPreviewFontId(null);
                }
              }}
              overlayFontOpen={fontOverlayOpen}
              templateBackground={templateBackground}
              onToggleTemplates={handleToggleTemplates}
              toggleLeftSidebar={handleToggleLeft}
              templateData={{ lines: mapLineConfigToParams(previewConfig?.lineConfig ?? lineConfig) }}
            />
          </div>

          {/* Right sidebar (desktop only) */}
          <div className="hidden xl:block xl:w-80 xl:w-96 shrink-0">
            <RightSidebar
              onSend={handleSend}
              onExportPDF={handleExportPDF}
              onExportJPG={handleExportJPG}
              sending={sending}
              sendDisabled={!selectedMatch || !letterContent.trim() || sending}
              wordCount={wordCount}
              charCount={charCount}
              readingTime={readingTime}
              readability={readability}
              selectedMatch={selectedMatch}
              anonymousHandle={anonymousHandle}
              fontStyle={fontStyle}
              letterFooterPrefix={letterFooterPrefix}
              templateBackground={templateBackground}
              backgroundColor={backgroundColor}
              onBackgroundColorChange={setBackgroundColor}
              onSelectTemplate={handleSelectTemplate}
              onPreviewTemplate={handlePreviewTemplate}
              templatesOpen={templatesOpen}
              setTemplatesOpen={setTemplatesOpen}
              lineConfig={lineConfig}
              onLineConfigChange={(newConfig) => {
                const validatedConfig = { ...newConfig };
                // Prevent spacing from being too small, which causes too many elements
                if (validatedConfig.spacing < 8) {
                  validatedConfig.spacing = 8;
                }
                // Prevent thickness from being too small, which can be intensive for some patterns
                if (validatedConfig.thickness < 0.5) {
                  validatedConfig.thickness = 0.5;
                }
                setLineConfig(validatedConfig);
              }}
              fontColor={fontColor}
              onFontColorChange={setFontColor}
              fontOpacity={fontOpacity}
              onFontOpacityChange={setFontOpacity}
              backgroundOpacity={backgroundOpacity}
              onBackgroundOpacityChange={setBackgroundOpacity}
            />
          </div>
        </div>
      </div>

      {/* UNIFIED MOBILE PANEL (left side) */}
      <Sheet
        open={!!mobilePanelType && window.innerWidth < 1280}
        onOpenChange={(open) => {
          console.log('Sheet onOpenChange:', open, 'mobilePanelType:', mobilePanelType);
          if (!open) {
            setMobilePanelType(null);
            setFontOverlayOpen(false);
            setPreviewFontId(null);
          }
        }}
      >
        <SheetContent
          side="left"
          className="xl:hidden w-[85vw] p-0 h-[100vh] bg-background"
          style={{ zIndex: 1000 }}
        >
          {/* Always include SheetHeader for accessibility */}
          <SheetHeader>
            <VisuallyHidden.Root>
              <SheetTitle>
                {mobilePanelType === 'font' ? 'Font selection' : 'Matches and settings'}
              </SheetTitle>
              <SheetDescription>
                {mobilePanelType === 'font'
                  ? 'Choose a font style for your letter.'
                  : 'Choose a recipient and adjust settings for your letter.'
                }
              </SheetDescription>
            </VisuallyHidden.Root>
          </SheetHeader>

          <div className="h-full overflow-y-auto bg-background">
            {mobilePanelType === 'font' ? (
              <div className="h-full flex flex-col min-h-0">
                <FontSidePanel
                  open={true}
                  currentId={fontStyle}
                  onSelect={(id: string) => {
                    setFontStyle(id);
                    setPreviewFontId(null);
                    setMobilePanelType(null);
                    setFontOverlayOpen(false);
                  }}
                  onPreview={(id: string | null) => setPreviewFontId(id)}
                  onClose={() => {
                    setMobilePanelType(null);
                    setFontOverlayOpen(false);
                    setPreviewFontId(null);
                  }}
                  anchorWithinSidebar={false}
                  fontColor={fontColor}
                  fontOpacity={fontOpacity}
                />
              </div>
            ) : (
              <LeftSidebar
                selectedMatch={selectedMatch}
                matches={matches}
                loading={loading}
                onChangeRecipient={(m) => {
                  handleRecipientChange(m);
                  setMobilePanelType(null);
                }}
                onApplyTemplate={(templateId: string) => {
                  getLetterTemplates()
                    .then((list: LetterTemplate[]) => {
                      const t = list.find((x: LetterTemplate) => x.id === templateId);
                      if (t) setLetterContent(t.content);
                      setMobilePanelType(null);
                    })
                    .catch((err: unknown) =>
                      console.error("Failed to apply template from left sidebar:", err)
                    );
                }}
                showFontOverlay={(mobilePanelType as 'left' | 'font' | null) === 'font'}
                onToggleFontOverlay={() => {
                  const currentType = mobilePanelType as 'left' | 'font' | null;
                  if (currentType === 'font') {
                    setMobilePanelType('left');
                    setFontOverlayOpen(false);
                    setPreviewFontId(null);
                  } else {
                    setMobilePanelType('font');
                    setFontOverlayOpen(true);
                    setPreviewFontId(null);
                  }
                }}
                fontStyle={fontStyle}
                onSelectFont={(id: string) => {
                  setFontStyle(id);
                  setPreviewFontId(null);
                }}
                onPreviewFont={(id: string | null) => setPreviewFontId(id)}
                fontColor={fontColor}
                fontOpacity={fontOpacity}
                backgroundColor={backgroundColor}
                backgroundOpacity={backgroundOpacity}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>      {/* RIGHT drawer (mobile / tablet) */}
      <Sheet open={rightOpen} onOpenChange={setRightOpen}>
        <SheetContent side="right" className="xl:hidden w-[85vw] p-0">
          {/* A11y header */}
          <SheetHeader className="sr-only">
            <SheetTitle>Preview and send</SheetTitle>
            <SheetDescription>Preview your letter and send it to your pen pal.</SheetDescription>
          </SheetHeader>

          <div className="h-full overflow-y-auto">
            <RightSidebar
              onSend={() => {
                // When the embedded send animation completes, call the real send handler
                handleSend();
                // setRightOpen(false) // uncomment if you want it to close after sending
              }}
              onExportPDF={handleExportPDF}
              onExportJPG={handleExportJPG}
              sending={sending}
              sendDisabled={!selectedMatch || !letterContent.trim() || sending}
              wordCount={wordCount}
              charCount={charCount}
              readingTime={readingTime}
              readability={readability}
              selectedMatch={selectedMatch}
              anonymousHandle={anonymousHandle}
              fontStyle={fontStyle}
              letterFooterPrefix={letterFooterPrefix}
              templateBackground={templateBackground}
              onSelectTemplate={(t) => { handleSelectTemplate(t); }}
              onPreviewTemplate={(t) => { handlePreviewTemplate(t); }}
              templatesOpen={false} // Always show normal content on mobile right sidebar
              setTemplatesOpen={() => {}} // No-op for mobile
              fontColor={fontColor}
              onFontColorChange={setFontColor}
              fontOpacity={fontOpacity}
              onFontOpacityChange={setFontOpacity}
              backgroundColor={backgroundColor}
              onBackgroundColorChange={setBackgroundColor}
              backgroundOpacity={backgroundOpacity}
              onBackgroundOpacityChange={setBackgroundOpacity}
              lineConfig={lineConfig}
              onLineConfigChange={(newConfig) => {
                const validatedConfig = { ...newConfig };
                // Prevent spacing from being too small, which causes too many elements
                if (validatedConfig.spacing < 8) {
                  validatedConfig.spacing = 8;
                }
                // Prevent thickness from being too small, which can be intensive for some patterns
                if (validatedConfig.thickness < 0.5) {
                  validatedConfig.thickness = 0.5;
                }
                setLineConfig(validatedConfig);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

{/* TEMPLATES drawer (bottom) - Mobile only */}
<Sheet open={templatesOpen && window.innerWidth < 1280} onOpenChange={(open) => {
  if (window.innerWidth < 1280) {
    setTemplatesOpen(open);
  }
}}>
  <SheetContent
    side="bottom"
    className="w-full xl:hidden h-[85vh] overflow-hidden"
  >
    {/* A11y header to satisfy Radix */}
    <SheetHeader className="sr-only">
      <SheetTitle>Letter templates</SheetTitle>
      <SheetDescription>Browse and preview templates, then apply one to your letter.</SheetDescription>
    </SheetHeader>

    <TemplateSidePanel
      open={true}
      currentId={templateBackground || undefined}
      // Apply and close
      onSelect={(id: string | null) => {
        handleSelectTemplate(id);
        setTemplatesOpen(false);
      }}
      // Live preview without closing
      onPreview={(id: string | null) => {
        handlePreviewTemplate(id);
      }}
      onClose={() => setTemplatesOpen(false)}
      thumbSize={80}
      lineConfig={lineConfig}
      onLineConfigChange={setLineConfig}
      fontColor={fontColor}
      onFontColorChange={setFontColor}
      fontOpacity={fontOpacity}
      onFontOpacityChange={setFontOpacity}
      backgroundColor={backgroundColor}
      onBackgroundColorChange={setBackgroundColor}
      backgroundOpacity={backgroundOpacity}
      onBackgroundOpacityChange={setBackgroundOpacity}
      showCloseButton={false}
    />
  </SheetContent>
</Sheet>

    </div>
  );
}

// Main component
export default function LetterApp() {
  return (
    <ComposeLetterProvider>
      <LetterPageContent />
    </ComposeLetterProvider>
  );
}