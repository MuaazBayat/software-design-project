import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2 } from "lucide-react"

interface MainContentProps {
  letterContent: string
  setLetterContent: (content: string) => void
  fontStyle: string
  fontSize: number[]
  success?: boolean
}

export default function MainContent({ 
  letterContent, 
  setLetterContent, 
  fontStyle, 
  fontSize,
  success = false
}: MainContentProps) {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-2xl mx-auto">
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
            <p>Your letter has been sent successfully! It will be delivered to your pen pal soon.</p>
          </div>
        )}
        
        <div className="mb-8">
          <p className="text-gray-500 text-base mb-4 font-handwritten">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <p className="text-gray-700 text-lg mb-6 font-handwritten">To a kindred spirit,</p>
        </div>

        <Card className="p-8 bg-white/80 backdrop-blur-sm border-amber-200 shadow-lg">
          <Textarea
            value={letterContent}
            onChange={(e) => setLetterContent(e.target.value)}
            className={`min-h-96 border-none resize-none focus:ring-0 text-gray-700 leading-relaxed ${
              fontStyle === "handwritten"
                ? "font-handwritten text-lg"
                : fontStyle === "typewriter"
                  ? "font-mono"
                  : "font-sans"
            }`}
            style={{ fontSize: `${fontSize[0]}px` }}
            placeholder="Start writing your letter..."
            disabled={success}
          />
        </Card>

        <div className="mt-6 text-right">
          <p className="text-gray-600 font-handwritten text-lg">Yours, PenPal_123</p>
        </div>
      </div>
    </div>
  )
}
