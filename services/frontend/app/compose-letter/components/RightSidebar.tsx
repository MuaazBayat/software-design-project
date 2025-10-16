import { useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import TemplateSidePanel from "./TemplateSidePanel";
import { LineConfig, LineType } from "./ComposeLetterContext"; // Import from context
import { Heart, Send, BarChart3, Clock, Gauge, Info, ChevronDown, FileDown, ImageDown } from "lucide-react";
import LetterSendAnimation from "./LetterSendAnimation";
import { adjustFontSizeForExport } from "../lib/jpegGenerator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// FONT_PRESETS definition (assuming this is what's needed)
const FONT_PRESETS = [
  { id: 'handwritten', name: 'Handwritten', lineHeight: '1.6', letterSpacing: '0.05em' },
  { id: 'serif', name: 'Serif', lineHeight: '1.5', letterSpacing: '0.02em' },
  { id: 'sans-serif', name: 'Sans Serif', lineHeight: '1.4', letterSpacing: '0.01em' },
];

interface Match {
  id: string
  name: string
  location: string
  interests: string[]
  conversation_thread_id: string
  match_id?: string
}

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
  lineConfig: LineConfig;
  onLineConfigChange: (config: LineConfig) => void;
  fontColor: string;
  onFontColorChange: (color: string) => void;
  fontOpacity?: number;
  onFontOpacityChange?: (opacity: number) => void;
  backgroundColor?: string;
  onBackgroundColorChange?: (color: string) => void;
  backgroundOpacity?: number;
  onBackgroundOpacityChange?: (value: number) => void;
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
}: RightSidebarProps) {
  const [sendConfirmationOpen, setSendConfirmationOpen] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);

  const handleLineConfigChange = (key: keyof LineConfig, value: any) => {
    if (onLineConfigChange) {
      onLineConfigChange({ ...lineConfig, [key]: value });
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
    <div className="relative h-full flex flex-col bg-white/70 backdrop-blur-sm border-l border-amber-200 p-6 custom-scrollbar overflow-y-auto h-[calc(100vh-80px)] shrink-0">
      <style jsx>{`
        @keyframes gradient-flow {
          0%, 100% { background-position: 0% 50%; }
          25% { background-position: 25% 50%; }
          50% { background-position: 100% 50%; }
          75% { background-position: 75% 50%; }
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
          <Card className="p-4 mb-4 bg-transparent border-amber-200">
            <h4 className="font-medium text-gray-700 mb-3 select-none">Letter Preview</h4>
            <div
              className="relative rounded-lg p-6 border border-amber-300 shadow-md overflow-hidden"
              style={{
                background: "linear-gradient(135deg,#f7f3ea 0%,#fdf6e3 100%)",
                boxShadow:
                  "0 2px 8px -2px rgba(120,72,0,.10), 0 1px 2px rgba(120,72,0,.06)",
              }}
            >
              {/* V-shaped envelope outline */}
              <svg
                className="absolute left-0 top-0 w-full h-12 pointer-events-none"
                viewBox="0 0 320 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ zIndex: 2 }}
              >
                <polyline
                  points="0,0 160,38 320,0"
                  stroke="#e2b97f"
                  strokeWidth="3"
                  fill="none"
                />
              </svg>
              {/* Decorative badge - make non-interactive and slightly smaller so it doesn't cover text */}
              <div className="absolute top-3 right-3 pointer-events-none z-10">
                <div className="w-7 h-7 bg-rose-500 rounded-full flex items-center justify-center">
                  <Heart className="w-3.5 h-3.5 text-white fill-white" />
                </div>
              </div>
              <div className="relative z-10">
                <div className="mb-6 pr-10">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-amber-500/80 select-none">
                      To
                    </p>
                    <p
                      className={`font-medium text-gray-800 select-none`}
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
                </div>
                <div className="text-right mt-10">
                  <p className="text-[11px] uppercase tracking-wide text-amber-500/80 select-none">
                    From
                  </p>
                  <p
                    className={`font-bold text-gray-800 select-none`}
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
              </div>
            </div>
          </Card>

          {/* Contextual send action placed directly under preview for stronger UX association */}
          <div className="mb-8 -mt-1 flex items-center gap-2">
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
              className="flex-grow text-white px-4 py-3 bg-gradient-to-r from-rose-300 via-rose-400 via-rose-500 to-gray-300 hover:scale-105 hover:shadow-2xl hover:shadow-rose-500/50 hover:!animation-none transition-all duration-300"
              style={{
                backgroundSize: "200% 200%",
                animation: "gradient-flow 15s ease-in-out infinite alternate",
              }}
              size="sm"
            >
              <Send className="w-4 h-4 mr-2 inline" />
              {sending ? "Sending..." : "Send Letter"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={sendDisabled || sending}
                  className="text-white px-3 bg-gradient-to-r from-rose-300 via-rose-400 via-rose-500 to-gray-300 hover:scale-105 hover:shadow-2xl hover:shadow-rose-500/50 hover:!animation-none transition-all duration-300"
                  style={{
                    backgroundSize: "200% 200%",
                    animation: "gradient-flow 15s ease-in-out infinite alternate",
                  }}
                  size="sm"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem onClick={() => onExportPDF?.()}>
                  <FileDown className="w-4 h-4 mr-2" />
                  <span>Export as PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExportJPG?.()}>
                  <ImageDown className="w-4 h-4 mr-2" />
                  <span>Export as JPG</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Dialog open={sendConfirmationOpen} onOpenChange={(open) => { if (!open) setTempImage(null); setSendConfirmationOpen(open); }}>
            {/* Allow the dialog content to be full-bleed so the animation can occupy the
                entire dialog area. Remove the max width and padding so the child
                `LetterSendAnimation` can render edge-to-edge. */}
            <DialogContent className="w-full max-w-none p-0 h-[75vh] flex items-center justify-center">
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


          {/* Letter Statistics */}
          <Card className="p-4 bg-transparent border-amber-200">
            <h4 className="font-medium text-gray-700 mb-4 select-none">Letter Statistics</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Card className="p-4 text-center bg-amber-50/50 border-amber-200 transition-all duration-200 hover:scale-105 hover:shadow-lg">
                <p className="text-3xl font-bold text-gray-800 select-none">{wordCount}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center justify-center select-none">
                  <BarChart3 className="w-3 h-3 mr-1" /> Words
                </p>
              </Card>
              <Card className="p-4 text-center bg-amber-50/50 border-amber-200 transition-all duration-200 hover:scale-105 hover:shadow-lg">
                <p className="text-3xl font-bold text-gray-800 select-none">
                  {charCount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1 select-none">Characters</p>
              </Card>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 text-center bg-amber-50/50 border-amber-200 transition-all duration-200 hover:scale-105 hover:shadow-lg">
                <p className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2 select-none">
                  <Clock className="w-4 h-4 text-amber-500" />
                  {typeof readingTime === "string"
                    ? readingTime
                    : `~${readingTime}min`}
                </p>
                <p className="text-xs text-gray-500 mt-1 select-none">Reading Time</p>
              </Card>
              <Card className="p-4 text-center bg-amber-50/50 border-amber-200 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer">
                <ReadabilityRating value={readability} />
              </Card>
            </div>
          </Card>

          {/* Settings Panel removed as requested */}
        </>
      )}
    </div>
  );
}

// --- Add ReadabilityRating component at top-level ---
export function ReadabilityRating({ value }: { value: string | number }) {
  const [open, setOpen] = useState(false);
  // Map CEFR → Tailwind text colors
  const level = String(value).toUpperCase();
  const colorMap: Record<string, string> = {
    A1: "text-green-400",
    A2: "text-green-600",
    B1: "text-yellow-500",
    B2: "text-orange-500",
    C1: "text-red-500",
    C2: "text-red-600",
  };
  const colorClass =
    !value || value === "0" || value === 0
      ? "text-gray-400"
      : colorMap[level] || "text-gray-600";

  return (
    <>
      <div
        className="flex flex-col items-center justify-center cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2 mb-1">
          <Gauge className="w-4 h-4 text-amber-500" />
          <span className={`text-xl font-bold ${colorClass}`}>
            {(!value || value === "0" || value === 0) ? "N/A" : String(value)}
          </span>
          <button
            type="button"
            className="ml-1 p-1 rounded hover:bg-amber-100 focus:bg-amber-200 focus:outline-none"
            aria-label="Show readability details"
            onClick={(e) => {
              e.stopPropagation(); // Prevent card's onClick from firing
              setOpen(true);
            }}
          >
            <Info className="w-3 h-3 text-amber-400" />
          </button>
        </span>
        <span className="text-xs text-gray-500 select-none">Readability Rating</span>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Readability Rating (CEFR)</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-700">
            <div className="mb-2">
              This Readability Rating is meant to help you connect with your reader by guiding tone
              and language complexity.
            </div>
            <b>CEFR Levels:</b>
            <ul className="mt-2 mb-2 space-y-1">
              <li className="text-green-600"><b>A1</b>: Beginner</li>
              <li className="text-green-500"><b>A2</b>: Elementary</li>
              <li className="text-yellow-500"><b>B1</b>: Intermediate</li>
              <li className="text-orange-500"><b>B2</b>: Upper Intermediate</li>
              <li className="text-red-500"><b>C1</b>: Advanced</li>
              <li className="text-red-600"><b>C2</b>: Proficient</li>
            </ul>
            <span className="block mt-2 text-amber-500">
              Higher = more complex language
            </span>
            <div className="mt-3 text-xs text-gray-500">
              This rating is estimated based on your letter&apos;s vocabulary and sentence
              structure.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

