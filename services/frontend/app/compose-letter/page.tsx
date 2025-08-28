"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Moon, ArrowLeft, Save, Send, CheckCircle2, AlertCircle } from "lucide-react"
import MessagingApiClient, { SearchUsersRequest, SendLetterRequest } from "@/lib/MessagingApiClient"
import { useSyncProfile } from "@/lib/SyncProfile"
import LeftSidebar from "./components/LeftSidebar"
import MainContent from "./components/MainContent"
import RightSidebar from "./components/RightSidebar"
import { Toaster, toast } from "sonner"

// Define the Match interface here until we move it to a separate file
interface Match {
  id: string
  name: string
  location: string
  interests: string[]
  conversation_thread_id: string
  match_id?: string
}

// Utility functions (we'll move these to utils.ts later)
function getLetterStats(content: string) {
  const wordCount = content.trim().split(/\s+/).length;
  const charCount = content.length;
  const readingTime = Math.ceil(wordCount / 200);
  
  return {
    wordCount,
    charCount,
    readingTime,
    readability: 'A2' // Simplified for now
  };
}

// Generate a proper UUID for thread/match IDs based on two user IDs
function generateStableId(userId1: string, userId2: string): string {
  // Instead of concatenating IDs, create a real UUID
  // We'll use crypto.randomUUID() to ensure it's a valid UUID format
  return crypto.randomUUID();
}

export default function LetterApp() {
  const [fontStyle, setFontStyle] = useState("handwritten")
  const [fontSize, setFontSize] = useState([16])
  const [letterContent, setLetterContent] = useState(
    `I'm writing this from a small cafe, watching the world go by. The smell of coffee and old books hangs in the air, a comforting mix. I've been thinking a lot about the simple things that bring us joy. For me, it's the first sip of tea in the morning, the feeling of a good book in my hands, and the sound of rain against the windowpane. What simple pleasures do you cherish in your part of the world? I'm curious about the daily rituals and moments that make up your life. I've been learning to paint with watercolors recently. My creations are far from perfect, but I love how the colors blend and create something unexpected. It feels like a small act of magic.`,
  )

  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { profile, synced } = useSyncProfile()
  const api = new MessagingApiClient()

  useEffect(() => {
    if (!synced || !profile?.user_id) return

    const fetchMatches = async () => {
      try {
        setLoading(true)
        setError(null)
        const searchBody: SearchUsersRequest = {
          anonymous_handle: "",
          my_user_id: profile.user_id,
          limit: 10,
          offset: 0,
        }
        const res = await api.searchUsers(searchBody)
        const mappedMatches: Match[] = res.items.map(item => {
          // Use existing thread ID if available, or generate a proper UUID
          const threadId = item.latest_message?.conversation_thread_id || 
            crypto.randomUUID(); // Using crypto.randomUUID() directly
            
          // Make sure match_id is a valid UUID string
          const matchId: string = item.latest_message?.match_id || crypto.randomUUID();
            
          return {
            id: item.user_profile.user_id,
            name: item.user_profile.anonymous_handle,
            location: item.user_profile.country_code || "Unknown",
            interests: [],
            conversation_thread_id: threadId,
            match_id: matchId
          };
        })
        setMatches(mappedMatches)
        if (mappedMatches.length > 0) {
          setSelectedMatchId(mappedMatches[0].id)
        }
      } catch (error) {
        console.error('Failed to fetch matches:', error)
        toast.error('Failed to load matches')
        setError('Failed to load matches. Please check your connection or try again later.')
      } finally {
        setLoading(false)
      }
    }
    fetchMatches()
  }, [synced, profile?.user_id])

  const [selectedMatchId, setSelectedMatchId] = useState<string>('')
  const selectedMatch = matches.find(match => match.id === selectedMatchId) || null

  // Calculate letter stats
  const { wordCount, charCount, readingTime, readability } = getLetterStats(letterContent);

  const handleSend = async () => {
    if (!selectedMatch || !profile?.user_id) return

    setSending(true)
    setError(null)
    setSuccess(false)
    
    try {
      // Use the existing thread ID from your database
      const threadId = "44444444-1111-4444-4444-444444444444"; // Existing thread ID
      
      // Use the existing match ID from your database
      const existingMatchId = "88332edc-5c5c-4eee-8be9-715e11c9ee4a"; // Existing match ID
      
      // Log the actual IDs that will be used
      const senderID = profile.user_id;
      const recipientID = selectedMatch.id;
      
      console.log('Using IDs from database:', {
        sender_id: senderID,
        recipient_id: recipientID,
        match_id: existingMatchId,
        thread_id: threadId
      });
      
      // Create the request body with the existing IDs
      const body: SendLetterRequest = {
        match_id: existingMatchId,
        sender_id: senderID,
        recipient_id: recipientID,
        conversation_thread_id: threadId,
        message_content: letterContent,
        letter_styles: { font_size: fontSize[0], font_family: fontStyle },
      };
      
      console.log('Sending letter with payload:', body);
      const response = await api.sendLetter(body);
      console.log('Letter sent successfully:', response);
      
      // Show success notification
      setSuccess(true);
      toast.success('Your letter has been sent!', {
        description: 'It will be delivered to your pen pal soon.',
        icon: <CheckCircle2 className="text-green-500" />
      });
    } catch (error) {
      console.error('Failed to send letter:', error);
      let errorMsg = 'Unknown error';
      
      if (error instanceof Error) {
        errorMsg = error.message;
        
        // Add specific checks for different types of errors
        if (errorMsg.includes('foreign key') || errorMsg.includes('FK') || errorMsg.includes('violation') || errorMsg.includes('constraint')) {
          errorMsg = 'Database relationship error. This may require database setup to link these users.';
          console.error('Foreign key details:', errorMsg);
          
          // Show a more helpful message to the user
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
  }
  
  const resetLetter = () => {
    // Confirm before clearing
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
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Mail className="w-6 h-6 text-rose-500" />
              <span className="font-semibold text-rose-600">PenPal</span>
            </div>
            <Button variant="ghost" size="sm">
              <Moon className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedMatchId} onValueChange={setSelectedMatchId} disabled={loading || sending}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={loading ? "Loading matches..." : "Select a pen pal"} />
              </SelectTrigger>
              <SelectContent>
                {matches.map(match => (
                  <SelectItem key={match.id} value={match.id}>
                    {match.name} ({match.location})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-600" 
              onClick={resetLetter}
              disabled={sending}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              New Letter
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-gray-600 border-gray-300 bg-transparent"
              disabled={sending || !letterContent.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              disabled={sending || !selectedMatch || !letterContent.trim()}
              onClick={handleSend}
              className="bg-rose-500 hover:bg-rose-600 text-white px-6"
              size="sm"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send Letter'}
            </Button>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-auto max-w-7xl mt-2">
          <p>{error}</p>
        </div>
      )}

      <div className="flex max-w-7xl mx-auto">
        <LeftSidebar selectedMatch={selectedMatch} />
        <MainContent
          letterContent={letterContent}
          setLetterContent={setLetterContent}
          fontStyle={fontStyle}
          fontSize={fontSize}
          success={success}
        />
        <RightSidebar
          fontStyle={fontStyle}
          setFontStyle={setFontStyle}
          fontSize={fontSize}
          setFontSize={setFontSize}
          wordCount={wordCount}
          charCount={charCount}
          readingTime={readingTime}
          readability={readability}
          selectedMatch={selectedMatch}
        />
      </div>
    </div>
  )
}
