import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import React, { useState } from "react"
import { Heart, Clock, BarChart3, Send, Star, Gauge, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FONT_PRESETS, DEFAULT_FONT_ID } from '@/app/fonts'

interface Match {
  id: string
  name: string
  location: string
  interests: string[]
}

interface RightSidebarProps {
  // send control
  onSend?: () => void
  sending?: boolean
  sendDisabled?: boolean
  // stats
  wordCount: number
  charCount: number
  readingTime: string | number
  readability?: string | number
  selectedMatch: Match | null
  anonymousHandle?: string
  fontStyle?: string
  letterFooterPrefix?: string
}

export default function RightSidebar({
  onSend,
  sending = false,
  sendDisabled = true,
  wordCount,
  charCount,
  readingTime,
  readability = 'A2',
  selectedMatch,
  anonymousHandle = ''
  , fontStyle = 'handwritten',
  letterFooterPrefix = 'Yours,'
}: RightSidebarProps) {
  // Resolve font preset meta by id for accurate preview
  const preset = FONT_PRESETS.find(p => p.id === fontStyle) || FONT_PRESETS.find(p => p.id === DEFAULT_FONT_ID)!
  const previewClass = preset.className
  const previewInline: { [k: string]: string } = {
    ...(preset.lineHeight ? { lineHeight: preset.lineHeight } : {}),
    ...(preset.letterSpacing ? { letterSpacing: preset.letterSpacing } : {})
  }
  return (
    <div className="w-80 bg-white/60 backdrop-blur-sm border-l border-amber-200 p-6 custom-scrollbar overflow-y-auto h-[calc(100vh-80px)] shrink-0">

      {/* Letter Preview */}
      <Card className="p-4 mb-4 bg-transparent border-amber-200">
        <h4 className="font-medium text-gray-700 mb-3">Letter Preview</h4>
        <div
          className="relative rounded-lg p-6 border border-amber-300 shadow-md overflow-hidden"
          style={{
            background: 'linear-gradient(135deg,#f7f3ea 0%,#fdf6e3 100%)',
            boxShadow: '0 2px 8px -2px rgba(120,72,0,.10), 0 1px 2px rgba(120,72,0,.06)'
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
                <p className="text-[11px] uppercase tracking-wide text-amber-500/80">To</p>
                <p className={`font-medium text-gray-800 ${previewClass}`} style={previewInline}>{selectedMatch ? selectedMatch.name : 'Recipient'}</p>
              </div>
            </div>
            <div className="text-right mt-10">
              <p className="text-[11px] uppercase tracking-wide text-amber-500/80">From</p>
              <p className={`font-bold text-gray-800 ${previewClass}`} style={previewInline}>{anonymousHandle || 'You'}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Contextual send action placed directly under preview for stronger UX association */}
      <div className="mb-8 -mt-1">
        <Button
          onClick={() => onSend?.()}
          disabled={sendDisabled || sending}
          className="w-full bg-rose-500 hover:bg-rose-600 text-white px-4 py-3"
          size="sm"
        >
          <Send className="w-4 h-4 mr-2 inline" />
          {sending ? 'Sending...' : 'Send Letter'}
        </Button>
      </div>

  {/* Letter Statistics */}
      <div>
        <h4 className="font-medium text-gray-700 mb-4">Letter Statistics</h4>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card className="p-4 text-center bg-white/80 border-amber-200">
            <p className="text-3xl font-bold text-gray-800">{wordCount}</p>
            <p className="text-xs text-gray-500 mt-1 flex items-center justify-center">
              <BarChart3 className="w-3 h-3 mr-1" /> Words
            </p>
          </Card>
          <Card className="p-4 text-center bg-white/80 border-amber-200">
            <p className="text-3xl font-bold text-gray-800">{charCount.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Characters</p>
          </Card>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center bg-white/80 border-amber-200">
            <p className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              {typeof readingTime === 'string' ? readingTime : `~${readingTime}min`}
            </p>
            <p className="text-xs text-gray-500 mt-1">Reading Time</p>
          </Card>
          <Card className="p-4 text-center bg-white/80 border-amber-200">
            <ReadabilityRating value={readability} />
          </Card>
        </div>
      </div>
    </div>
  )
}

// --- Add ReadabilityRating component at top-level ---
export function ReadabilityRating({ value }: { value: string | number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col items-center justify-center">
      <span className="flex items-center gap-2 mb-1">
        <Gauge className="w-4 h-4 text-amber-500" />
        <span className="text-xl font-bold text-amber-700">
          {(!value || value === '0' || value === 0) ? 'N/A' : String(value)}
        </span>
        <button
          type="button"
          className="ml-1 p-1 rounded hover:bg-amber-100 focus:bg-amber-200 focus:outline-none"
          aria-label="Show readability details"
          onClick={() => setOpen(true)}
        >
          <Info className="w-3 h-3 text-amber-400" />
        </button>
      </span>
      <span className="text-xs text-gray-500">Readability Rating</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Readability Rating (CEFR)</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-700">
            <b>CEFR Levels:</b>
            <ul className="mt-2 mb-2 space-y-1">
              <li><b>A1</b>: Beginner</li>
              <li><b>A2</b>: Elementary</li>
              <li><b>B1</b>: Intermediate</li>
              <li><b>B2</b>: Upper Intermediate</li>
              <li><b>C1</b>: Advanced</li>
              <li><b>C2</b>: Proficient</li>
            </ul>
            <span className="block mt-2 text-amber-500">Higher = more complex language</span>
            <div className="mt-3 text-xs text-gray-500">This rating is estimated based on your letter's vocabulary and sentence structure.</div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
