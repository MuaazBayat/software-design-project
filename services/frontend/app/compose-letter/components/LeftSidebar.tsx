import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Palette, Book, Plane, UserRound, Sparkles, ChevronDown, MapPin, Calendar, Send, Inbox } from "lucide-react"
import { FontSidePanel } from "./FontSidePanel"

// Small inlined template type + data so this component is self-contained.
export type LetterTemplate = { id: string; name: string; description: string; content: string; category: string; estimated_minutes?: number; tags?: string[] }

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
]

interface Match {
  id: string
  name: string
  location: string
  interests: string[]
  conversation_thread_id: string
  match_id?: string
  since?: string
}

interface LeftSidebarProps {
  selectedMatch: Match | null
  loading?: boolean
  onChangeRecipient?: (matchId: string) => void
  matches: Match[]
  // message history removed — no props for messages
  onApplyTemplate?: (templateId: string) => void
  showFontOverlay?: boolean
  onToggleFontOverlay?: () => void
  fontStyle?: string
  onSelectFont?: (id: string) => void
  onPreviewFont?: (id: string | null) => void
}

export default function LeftSidebar({ 
  selectedMatch, 
  loading = false, 
  onChangeRecipient,
  matches = [],
  onApplyTemplate,
  showFontOverlay = false,
  onToggleFontOverlay,
  fontStyle = 'handwritten',
  onSelectFont,
  onPreviewFont
}: LeftSidebarProps) {
  // LeftSidebar receives matches and selection from parent; no debug logs kept
  const [templates, setTemplates] = useState<LetterTemplate[]>(DEFAULT_TEMPLATES)
  const [dialogOpen, setDialogOpen] = useState(false)
  // Search state for recipient dropdown
  const [search, setSearch] = useState("");
  const filteredMatches = matches.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.location.toLowerCase().includes(search.toLowerCase())
  );
  // Helper to format a friendly "since" string (e.g., "2y", "3m", "10d")
  function formatSince(dateStr?: string) {
    if (!dateStr) return null;
    const then = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - then.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return 'today';
    if (diffDays < 30) return `${diffDays}d`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}m`;
    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears}y`;
  }
  // Search state for templates dialog
  const [templatesSearch, setTemplatesSearch] = useState("");
  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(templatesSearch.toLowerCase()) ||
    t.description.toLowerCase().includes(templatesSearch.toLowerCase())
  )

  // templates are inlined (DEFAULT_TEMPLATES) to avoid a tiny service module.
  
  return (
    <div className={`relative w-80 bg-white/60 backdrop-blur-sm border-r border-amber-200 p-6 h-[calc(100vh-80px)] shrink-0 ${showFontOverlay ? 'overflow-hidden' : 'custom-scrollbar overflow-y-auto'}`}>
      {showFontOverlay && (
        <FontSidePanel
          open={showFontOverlay}
          anchorWithinSidebar
          currentId={fontStyle}
          onSelect={(id) => { onSelectFont?.(id) }}
          onPreview={(id) => onPreviewFont?.(id)}
          onClose={onToggleFontOverlay || (()=>{})}
        />
      )}
      <div className={showFontOverlay ? 'opacity-0 pointer-events-none select-none' : 'opacity-100 transition-opacity'} aria-hidden={showFontOverlay}>
      {/* Recipient Info with Dropdown - Enhanced */}
  <Card className="p-4 mb-6 bg-orange-100/60 border-2 border-amber-400 rounded-sm shadow-sm">
        <p className="text-sm font-cursive italic bg-gradient-to-r from-amber-600 to-rose-500 bg-clip-text text-transparent mb-1 text-center">You're writing to:</p>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
          </div>
        ) : selectedMatch ? (
            <Select key={selectedMatch.id} value={selectedMatch.id} onValueChange={(value) => {
              onChangeRecipient?.(value);
            }} disabled={loading}>
            <SelectTrigger className="w-full bg-transparent border-none shadow-none p-0 h-auto hover:bg-amber-50/50 rounded-md transition-colors cursor-pointer select-none appearance-none [&>svg]:hidden">
              <div className="flex items-start gap-3 w-full p-2">
                {/* Avatar with initials */}
                <div className="w-12 h-12 rounded-md bg-gradient-to-br from-rose-300 via-orange-200 to-amber-200 flex items-center justify-center text-white text-xl font-bold border border-amber-300 shadow-sm flex-shrink-0">
                  {selectedMatch.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg truncate flex items-center gap-2">
                    {selectedMatch.name}
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </h3>
                  {/* Interest tags — placed directly under the name for prominence */}
                  {selectedMatch.interests && selectedMatch.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedMatch.interests.slice(0, 3).map((interest, idx) => (
                        <Badge key={idx} className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded-full border border-amber-200">{interest}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 text-rose-400" />
                    <span className="font-medium truncate">{selectedMatch.location}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {selectedMatch.since ? (
                      <>
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-white/80 border border-amber-200 rounded text-xs text-amber-700">
                          <Calendar className="w-3 h-3 text-amber-600" />
                          <span className="font-medium">Since {formatSince(selectedMatch.since)}</span>
                        </div>
                        <div className="text-xs text-gray-400">{new Date(selectedMatch.since).toLocaleDateString()}</div>
                      </>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-white/70 border border-amber-100 rounded text-xs text-gray-600">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        <span className="font-medium">Recently connected</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SelectTrigger>
            <SelectContent>
              <div className="px-3 py-2 sticky top-0 bg-white z-10">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search pen pals..."
                  className="w-full px-2 py-1 border border-amber-200 rounded focus:outline-none focus:ring focus:ring-amber-100 text-sm"
                />
              </div>
              {filteredMatches.length === 0 ? (
                <div className="text-center text-xs text-gray-400 py-4">No matches found</div>
              ) : (
                filteredMatches.map(match => (
                  <SelectItem key={match.id} value={match.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-white text-xs font-bold">
                        {match.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium truncate">{match.name}</p>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-400" />
                          <span className="text-xs text-gray-500">{match.location}</span>
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-center p-4">
            <UserRound className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Please select a pen pal</p>
          </div>
        )}
      </Card>

      {/* Writing Prompts - Simplified */}
      <div className="mb-6">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <h4 className="font-medium text-gray-700 mb-3 flex items-center justify-center cursor-pointer hover:text-amber-600 transition-colors" onClick={() => setDialogOpen(true)}>
              <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
              Writing Prompts
            </h4>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Writing Templates</DialogTitle>
            </DialogHeader>
            <div className="mt-3">
              <div className="mb-3">
                <input
                  type="text"
                  value={templatesSearch}
                  onChange={e => setTemplatesSearch(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full px-3 py-2 border border-amber-200 rounded focus:outline-none focus:ring focus:ring-amber-100 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-auto">
                {templates === null ? (
                  <div className="text-sm text-gray-500">Loading templates...</div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-sm text-gray-500">No templates match your search</div>
                ) : (
                  filteredTemplates.map(t => (
                    <Card key={t.id} className="p-3 flex flex-col justify-between hover:shadow-lg transition-shadow">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-800">{t.name}</h4>
                          <div className="text-xs text-amber-600 font-medium">{t.estimated_minutes ? `${t.estimated_minutes} min` : null}</div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2 line-clamp-3">{t.description}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex gap-2">
                          {t.tags && t.tags.slice(0,2).map((tag, i) => (
                            <Badge key={i} className="bg-amber-100 text-amber-700 text-xs">{tag}</Badge>
                          ))}
                        </div>
                        <div>
                          <Button size="sm" variant="ghost" onClick={() => { onApplyTemplate?.(t.id); setDialogOpen(false) }}>Apply</Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
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

      </div>
    </div>
  )
}
