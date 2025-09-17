'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MessagingApiClient, { MessageRow, PageLettersResponse } from '@/lib/MessagingApiClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSyncProfile } from '../../../lib/context/ProfileContext';
import LetterCard from '@/components/LetterCard';
import { useConversationUser } from '../../../lib/context/ConversationUserContext';
import { 
  Mail, 
  Clock, 
  Send, 
  ArrowLeft, 
  MapPin
} from 'lucide-react';

interface ConversationPageProps {}

export default function ConversationPage({}: ConversationPageProps) {
  const params = useParams();
  const router = useRouter();
  const conversationThreadId = params.conversation_thread_id as string;
  const { profile, synced } = useSyncProfile();
  const { currentConversationUser} = useConversationUser();

  const CURRENT_USER_ID = profile?.user_id;
  
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [apiClient] = useState(() => new MessagingApiClient());

  // Get the other user's ID from the conversation
  const otherUserId = currentConversationUser?.user_id;

  const loadMessages = useCallback(async (lastMessageId?: string) => {
    try {
      setLoading(true);
      const response: PageLettersResponse = await apiClient.pageLetters({
        conversation_thread_id: conversationThreadId,
        page_size: 50,
        last_message_id: lastMessageId
      });

      console.log("API response:", response);
      
      if (lastMessageId) {
        setMessages(prev => [...prev, ...response.items]);
      } else {
        // Sort messages by sequence number for proper chronological order
        const sortedMessages = response.items.sort((a, b) => 
          (a.message_sequence || 0) - (b.message_sequence || 0)
        );
        setMessages(sortedMessages);
        console.log("Loaded messages:", sortedMessages);
      }
      
      setHasMore(response.has_more);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [apiClient, conversationThreadId]);

  useEffect(() => {
    if (synced) {
      loadMessages();
    }
  }, [conversationThreadId, synced, loadMessages]);

  if (!synced || (loading && messages.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Mail className="h-12 w-12 mx-auto text-amber-600 animate-pulse" />
          <p className="text-amber-800 font-medium">
            {!synced ? 'Syncing your profile...' : 'Loading your letters...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50 flex items-center justify-center">
        <Card className="max-w-md p-8 text-center border-red-200 bg-red-50">
          <Mail className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Oops!</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => loadMessages()} variant="outline" className="border-red-200">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-amber-700 hover:bg-amber-100"
            onClick={() => router.push('/inbox')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inbox
          </Button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold text-amber-900">
              Conversation with {currentConversationUser?.anonymous_handle || 'Unknown User'}
            </h1>
            {currentConversationUser?.country_code && (
              <p className="text-sm text-amber-600 flex items-center justify-center gap-1">
                <MapPin className="h-4 w-4" />
                {currentConversationUser.country_code}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-6">
            {messages.map((message) => (
              <LetterCard
                key={message.message_id}
                message={message}
                currentUserId={CURRENT_USER_ID}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center py-8">
                <Button 
                  onClick={() => loadMessages(messages[messages.length - 1]?.message_id)}
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Loading more letters...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Load Earlier Letters
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Write New Letter Button */}
        <div className="fixed bottom-8 right-8">
          <Button 
            onClick={() => router.push(`/compose-letter/${otherUserId}`)}
            size="lg" 
            className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <Send className="h-5 w-5 mr-2" />
            Write Letter
          </Button>
        </div>
      </div>
    </div>
  );
}