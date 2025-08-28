import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Heart, Globe, Clock, BarChart3 } from "lucide-react"

interface Match {
  id: string
  name: string
  location: string
  interests: string[]
  conversation_thread_id: string
  match_id?: string
}

interface RightSidebarProps {
  fontStyle: string
  setFontStyle: (style: string) => void
  fontSize: number[]
  setFontSize: (size: number[]) => void
  wordCount: number
  charCount: number
  readingTime: number
  readability?: string
  selectedMatch: Match | null
}

export default function RightSidebar({
  fontStyle,
  setFontStyle,
  fontSize,
  setFontSize,
  wordCount,
  charCount,
  readingTime,
  readability = 'A2',
  selectedMatch
}: RightSidebarProps) {
  return (
    <div className="w-80 bg-white/60 backdrop-blur-sm border-l border-amber-200 p-6 custom-scrollbar overflow-y-auto h-[calc(100vh-80px)] shrink-0">
      {/* Quick Style */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-700 mb-4">Customize Your Letter</h4>

        {/* Font Style */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">Font Style</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={fontStyle === "handwritten" ? "default" : "outline"}
              size="sm"
              onClick={() => setFontStyle("handwritten")}
              className={`text-xs ${fontStyle === "handwritten" ? "bg-rose-500 hover:bg-rose-600 text-white" : "text-gray-600"}`}
            >
              Handwritten
            </Button>
            <Button
              variant={fontStyle === "typewriter" ? "default" : "outline"}
              size="sm"
              onClick={() => setFontStyle("typewriter")}
              className={`text-xs ${fontStyle === "typewriter" ? "bg-rose-500 hover:bg-rose-600 text-white" : "text-gray-600"}`}
            >
              Typewriter
            </Button>
            <Button
              variant={fontStyle === "standard" ? "default" : "outline"}
              size="sm"
              onClick={() => setFontStyle("standard")}
              className={`text-xs ${fontStyle === "standard" ? "bg-rose-500 hover:bg-rose-600 text-white" : "text-gray-600"}`}
            >
              Standard
            </Button>
          </div>
        </div>

        {/* Font Size */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">Font Size: {fontSize[0]}px</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Tt</span>
            <Slider value={fontSize} onValueChange={setFontSize} max={24} min={12} step={1} className="flex-1" />
            <span className="text-lg text-gray-500">Tt</span>
          </div>
        </div>
      </div>

      {/* Letter Preview */}
      <Card className="p-4 mb-6 bg-amber-100/50 border-amber-200">
        <h4 className="font-medium text-gray-700 mb-3">Letter Preview</h4>
        <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg p-4 relative border border-amber-200">
          <div className="absolute top-3 right-3">
            <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
          </div>
          <div className="mb-4">
            <p className="font-handwritten text-lg text-gray-800 font-bold">{selectedMatch ? selectedMatch.name : 'Recipient'}</p>
            <div className="flex items-center text-xs text-gray-500 tracking-wider">
              <Globe className="w-3 h-3 mr-1" />
              {selectedMatch ? selectedMatch.location.toUpperCase() : 'LOCATION'}
            </div>
          </div>
          <div className="text-right mt-8">
            <p className="text-sm text-gray-600">From</p>
            <p className="font-bold text-gray-800">PenPal_123</p>
            <p className="text-xs text-gray-500 tracking-wider">YOUR PEN PAL</p>
          </div>
        </div>
      </Card>

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
            <p className="text-3xl font-bold text-gray-800">~{readingTime}min</p>
            <p className="text-xs text-gray-500 mt-1 flex items-center justify-center">
              <Clock className="w-3 h-3 mr-1" /> Reading Time
            </p>
          </Card>
          <Card className="p-4 text-center bg-white/80 border-amber-200">
            <p className="text-3xl font-bold text-gray-800">{readability}</p>
            <p className="text-xs text-gray-500 mt-1">Readability</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
