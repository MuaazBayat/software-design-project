import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Palette, Book, Plane, UserRound, Sparkles } from "lucide-react"

interface Match {
  id: string
  name: string
  location: string
  interests: string[]
  conversation_thread_id: string
  match_id?: string
}

interface LeftSidebarProps {
  selectedMatch: Match | null
  loading?: boolean
}

export default function LeftSidebar({ selectedMatch, loading = false }: LeftSidebarProps) {
  return (
    <div className="w-80 bg-white/60 backdrop-blur-sm border-r border-amber-200 p-6 custom-scrollbar overflow-y-auto h-[calc(100vh-80px)] shrink-0">
      {/* Recipient Info */}
      <Card className="p-4 mb-6 bg-orange-100/60 border-orange-200">
        <p className="text-sm text-gray-600 mb-1">You're writing to:</p>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
          </div>
        ) : selectedMatch ? (
          <>
            <h3 className="font-bold text-gray-900 text-lg flex items-center">
              {selectedMatch.name}
              <Badge className="ml-2 bg-rose-500 text-white">{selectedMatch.location}</Badge>
            </h3>
            <p className="text-sm text-gray-500 mt-1">Pen pal since {new Date().toLocaleDateString()}</p>
          </>
        ) : (
          <div className="text-center p-4">
            <UserRound className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Please select a pen pal</p>
          </div>
        )}
      </Card>

      {/* Writing Prompts */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-700 mb-3 flex items-center">
          <Sparkles className="w-4 h-4 mr-2 text-amber-500" /> 
          Writing Prompts
        </h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-amber-100/50 cursor-pointer transition-colors">
            <div className="w-2 h-2 bg-rose-400 rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-sm text-gray-600">Share a piece of art that moved you.</p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-amber-100/50 cursor-pointer transition-colors">
            <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-sm text-gray-600">Which book character do you relate to most?</p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-amber-100/50 cursor-pointer transition-colors">
            <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-sm text-gray-600">Describe a place you dream of visiting.</p>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
            More suggestions...
          </Button>
        </div>
      </div>

      {/* Shared Interests - Only show if match is selected */}
      {selectedMatch && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-3">Potential Shared Interests</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-rose-100 text-rose-700 hover:bg-rose-200">
              <Palette className="w-3 h-3 mr-1" />
              Art & Creativity
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
              <Book className="w-3 h-3 mr-1" />
              Literature
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200">
              <Plane className="w-3 h-3 mr-1" />
              Travel
            </Badge>
          </div>
        </div>
      )}

      {/* Letter History */}
      <div>
        <h4 className="font-medium text-gray-700 mb-3">Letter History</h4>
        {selectedMatch ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-100/50 cursor-pointer transition-colors">
              <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-700 text-sm">On Art and Life</p>
                <p className="text-xs text-gray-500">Jul 20, 10:15 PM</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-100/50 cursor-pointer transition-colors">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-700 text-sm">The Blue Mountains</p>
                <p className="text-xs text-gray-500">Jul 15, 8:42 AM</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 w-full">
              View full history
            </Button>
          </div>
        ) : (
          <div className="text-center p-4 bg-gray-50 rounded-md">
            <p className="text-gray-500 text-sm">Select a pen pal to view history</p>
          </div>
        )}
      </div>
    </div>
  )
}
