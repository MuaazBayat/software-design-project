"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import {
  Sheet, SheetTrigger, SheetContent,
  SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";
import TemplateSidePanel from "../../../components/TemplateSidePanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, AlertCircle, PanelLeft, PanelRight } from "lucide-react"
import MessagingApiClient, { SearchUsersRequest, SendLetterRequest, ApiError } from "@/lib/MessagingApiClient"
import { useSyncProfile } from "@/lib/context/ProfileContext"
import LeftSidebar from "../../../components/LeftSidebar"
import MainContent from "../../../components/MainContent"
import RightSidebar from "../../../components/RightSidebar"
import { useRouter } from "next/navigation"
import { Toaster, toast } from "sonner"
import { se } from "date-fns/locale";

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

// Main component
export default function LetterApp() {
  const params = useParams();
  const router = useRouter();
  const urlUserId = params?.user_id as string;

  // Utility functions moved inside the component
  const estimateCEFR = (text: string): string => {
    if (!text || text.trim().length < 5) return "A1";
    const words = text.trim().split(/\s+/);
    const wordCount = words.length;
    const avgWordLen = words.reduce((sum, w) => sum + w.length, 0) / wordCount;
    const syllables = words.reduce((sum, w) => sum + (w.match(/[aeiouy]+/gi)?.length || 1), 0);
    const avgSyllables = syllables / wordCount;
    // For very short letters, use word complexity only
    if (wordCount < 15) {
      if (avgWordLen < 4.5 && avgSyllables < 1.5) return "A2";
      if (avgWordLen < 5.5 && avgSyllables < 1.7) return "B1";
      if (avgWordLen < 6.5 && avgSyllables < 1.9) return "B2";
      if (avgWordLen < 7.5 && avgSyllables < 2.2) return "C1";
      return "C2";
    }
    // For longer letters, factor in sentence structure
    if (avgWordLen < 4.5 && avgSyllables < 1.5) return "A2";
    if (avgWordLen < 5.5 && avgSyllables < 1.7) return "B1";
    if (avgWordLen < 6.5 && avgSyllables < 1.9) return "B2";
    if (avgWordLen < 7.5 && avgSyllables < 2.2) return "C1";
    return "C2";
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

  const [fontStyle, setFontStyle] = useState("handwritten");
  const [fontSize, setFontSize] = useState([16]);
  const [letterContent, setLetterContent] = useState(
    `I'm writing this from a small cafe, watching the world go by. The smell of coffee and old books hangs in the air, a comforting mix. I've been thinking a lot about the simple things that bring us joy. For me, it's the first sip of tea in the morning, the feeling of a good book in my hands, and the sound of rain against the windowpane. What simple pleasures do you cherish in your part of the world? I'm curious about the daily rituals and moments that make up your life. I've been learning to paint with watercolors recently. My creations are far from perfect, but I love how the colors blend and create something unexpected. It feels like a small act of magic.`
  );
  const [letterHeading, setLetterHeading] = useState<string>('To a kindred spirit,');
  const [letterFooterPrefix, setLetterFooterPrefix] = useState<string>('Yours,');

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontOverlayOpen, setFontOverlayOpen] = useState(false);
  const [previewFontId, setPreviewFontId] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templateBackground, setTemplateBackground] = useState<string | null>(null);

  const { profile, synced } = useSyncProfile();
  const userId = profile?.user_id ?? '';
  const anonymousHandle = synced ? (profile?.anonymous_handle ?? '') : '';
  const api = useMemo(() => new MessagingApiClient({ timeoutMs: 30000 }), []);

  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  const handleRecipientChange = (newMatchId: string) => {
    setSelectedMatchId(newMatchId);
  };

  useEffect(() => {
    if (!synced || !userId) {
      return;
    }

    const fetchMatches = async () => {
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
        try {
          res = await api.searchUsers(searchBody);
        } catch (err: unknown) {
          const error = err as Error;
          if (error instanceof ApiError && error.status === 408) {
            await new Promise(r => setTimeout(r, 800));
            res = await api.searchUsers(searchBody);
          } else {
            throw err;
          }
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
      } catch {
        toast.error('Failed to load matches');
        setError('Failed to load matches. Please check your connection or try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [synced, userId, urlUserId, api]);

  const selectedMatch = matches.find((match) => match.id === selectedMatchId) || null;

  const getLetterStats = (letter: string) => {
    const words = letter.trim() ? letter.trim().split(/\s+/).length : 0;
    const chars = letter.length;
    const readingTime = Math.max(1, Math.round(words / 200));
    return { wordCount: words, charCount: chars, readingTime };
  };

  const { wordCount, charCount, readingTime } = getLetterStats(letterContent);
  const readability = estimateCEFR(letterContent);

  const handleSend = async () => {
    if (!selectedMatch || !userId) return;

    setSending(true);
    setError(null);
    setSuccess(false);

    try {
      const senderID = userId;
      const recipientID = selectedMatch.id;

      const threadId = selectedMatch.conversation_thread_id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString());

      const scheduledDt = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const scheduledIso = scheduledDt.toISOString();
      const composedFooter = `${letterFooterPrefix} ${anonymousHandle}`.trim();

      const body: SendLetterRequest & { scheduled_delivery_at?: string, letter_heading?: string, letter_footer?: string } = {
        sender_id: senderID,
        recipient_id: recipientID,
        message_content: letterContent,
        letter_styles: { font_size: fontSize[0], font_family: fontStyle },
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
        description: 'It will be delivered to your pen pal soon.',
        icon: <CheckCircle2 className="text-green-500" />
      });
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
    } finally {
      setSending(false);
    }
  };

  const handleSelectTemplate = (id: string | null) => {
    setTemplateBackground(id);
    setTemplatesOpen(false);
  };

  const handlePreviewTemplate = (id: string | null) => {
    setTemplateBackground(id);
  };

  const handleToggleTemplates = () => {
    setTemplatesOpen(open => !open);
  };

    const handleToggleLeft = () => {
    setLeftOpen(open => !open);
  };

  const resetLetter = () => {
    if (letterContent.trim().length > 0 && !success) {
      const confirmed = window.confirm("Are you sure you want to start a new letter? Your current draft will be lost.");
      if (!confirmed) return;
    }
    setLetterContent("");
    setSuccess(false);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <Toaster richColors position="top-center" />
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
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setLeftOpen(true)}>
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
            />
          </div>

          {/* Main editor (always visible) */}
          <div className="flex-1">
            <MainContent
              letterContent={letterContent}
              setLetterContent={setLetterContent}
              fontStyle={fontStyle}
              fontSize={fontSize}
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
              previewFontIdExternal={previewFontId}
              onToggleFontOverlay={() => {
                setFontOverlayOpen((o) => !o);
                setPreviewFontId(null);
              }}
              overlayFontOpen={fontOverlayOpen}
              templateBackground={templateBackground}
              onToggleTemplates={handleToggleTemplates}
              toggleLeftSidebar={handleToggleLeft}
            />
          </div>

          {/* Right sidebar (desktop only) */}
          <div className="hidden xl:block xl:w-80 xl:w-96 shrink-0">
            <RightSidebar
              onSend={handleSend}
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
              onSelectTemplate={handleSelectTemplate}
              onPreviewTemplate={handlePreviewTemplate}
              templatesOpen={templatesOpen}
              setTemplatesOpen={setTemplatesOpen}
            />
          </div>
        </div>
      </div>

      {/* LEFT drawer (mobile / tablet) */}
      <Sheet open={leftOpen} onOpenChange={(open) => {
    setLeftOpen(open);
    if (!open) {
      setFontOverlayOpen(false);   // 👈 close Fonts overlay
      setPreviewFontId(null);      // 👈 clear any preview state
    }
  }}>
        <SheetContent side="left" className="xl:hidden w-[85vw] p-0">
          {/* A11y header */}
          <SheetHeader className="sr-only">
            <SheetTitle>Matches and font settings</SheetTitle>
            <SheetDescription>Choose a recipient and adjust font styles for your letter.</SheetDescription>
          </SheetHeader>

          <div className="h-full overflow-y-auto">
            <LeftSidebar
              selectedMatch={selectedMatch}
              matches={matches}
              loading={loading}
              onChangeRecipient={(m) => {
                handleRecipientChange(m);
                setLeftOpen(false);
              }}
              onApplyTemplate={(templateId: string) => {
                getLetterTemplates()
                  .then((list: LetterTemplate[]) => {
                    const t = list.find((x: LetterTemplate) => x.id === templateId);
                    if (t) setLetterContent(t.content);
                    setLeftOpen(false);
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
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* RIGHT drawer (mobile / tablet) */}
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
                handleSend();
                // setRightOpen(false) // uncomment if you want it to close after sending
              }}
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
              templatesOpen={templatesOpen}
              setTemplatesOpen={setTemplatesOpen}
            />
          </div>
        </SheetContent>
      </Sheet>

{/* TEMPLATES drawer (bottom) */}
<Sheet open={templatesOpen} onOpenChange={setTemplatesOpen}>
  <SheetContent
    side="bottom"
    className="w-full p-0 xl:hidden h-[85vh] overflow-hidden"
  >
    {/* A11y header to satisfy Radix */}
    <SheetHeader className="sr-only">
      <SheetTitle>Letter templates</SheetTitle>
      <SheetDescription>Browse and preview templates, then apply one to your letter.</SheetDescription>
    </SheetHeader>

    <TemplateSidePanel
      open={!!templatesOpen}
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
      // This tells the panel it’s not mounted “inside a sidebar”
      anchorWithinSidebar={false}
      // You can tweak thumbnail sizes if you want bigger grid
      thumbLineTile={36}
      thumbSize={80}
    />
  </SheetContent>
</Sheet>


    </div>
  );
}