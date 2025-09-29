'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MessagingApiClient, { MessageRow, PageLettersResponse } from '@/lib/MessagingApiClient';
import { moderationApi } from '@/lib/moderationApiClient'; 
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSyncProfile } from '../../../lib/context/ProfileContext';
import LetterCard from '@/components/LetterCard';
import { Toaster, toast } from "sonner";
import { useConversationUser } from '../../../lib/context/ConversationUserContext';
import { 
  Mail, 
  Clock, 
  Send, 
  ArrowLeft, 
  MapPin,
  Flag,
  Ban,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConversationPageProps {}

export default function ConversationPage({}: ConversationPageProps) {
  const params = useParams();
  const router = useRouter();
  const conversationThreadId = params.conversation_thread_id as string;
  const { profile, synced } = useSyncProfile();
  const { currentConversationUser } = useConversationUser();

  const CURRENT_USER_ID = profile?.user_id;
  
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [apiClient] = useState(() => new MessagingApiClient());
  
  // Moderation states
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState('inappropriate_content');
  const [moderationLoading, setModerationLoading] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

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

  // Moderation functions using your existing client
  const handleReportUser = async () => {
    if (!CURRENT_USER_ID || !otherUserId) return;
    
    setModerationLoading(true);
    setModerationError(null);
    
    try {
      await moderationApi.reportUser(
        CURRENT_USER_ID,
        otherUserId,
        selectedViolation
      );
      
      setShowReportDialog(false);
      toast.success('User reported successfully');
    } catch (err) {
      setModerationError(err instanceof Error ? err.message : 'Failed to report user');
    } finally {
      setModerationLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!CURRENT_USER_ID || !otherUserId) return;
    
    setModerationLoading(true);
    setModerationError(null);
    
    try {
      await moderationApi.blockUser(
        CURRENT_USER_ID,
        otherUserId
      );
      
      setShowBlockDialog(false);
      toast.success('User blocked successfully');
      router.push('/inbox');
    } catch (err) {
      setModerationError(err instanceof Error ? err.message : 'Failed to block user');
    } finally {
      setModerationLoading(false);
    }
  };

  const handleReportMessage = async (messageId: string, reportedUserId: string, violationType: string) => {
  if (!CURRENT_USER_ID) {
    toast.error('Unable to report message: Please sign in first');
    return;
  }
  
  setModerationLoading(true);
  setModerationError(null);
  
  try {
    console.log('Reporting message:', {
      reporterId: CURRENT_USER_ID,
      reportedUserId: reportedUserId,
      reportedMessageId: messageId,
      violationType: violationType
    });
    
    await moderationApi.reportMessage(
      CURRENT_USER_ID,
      reportedUserId,
      messageId,
      violationType  
    );
    
    toast.success('Message reported successfully. Our moderation team will review this report.');
    console.log('Message reported successfully');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to report message';
    setModerationError(errorMessage);
    toast.error(`Failed to report message: ${errorMessage}`);
    console.error('Error reporting message:', err);
  } finally {
    setModerationLoading(false);
  }
};

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
       <Toaster position="top-center" richColors />
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
          
          {/* Moderation Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-amber-700 hover:bg-amber-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                <Flag className="h-4 w-4 mr-2" />
                Report User
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowBlockDialog(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Ban className="h-4 w-4 mr-2" />
                Block User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                onReportMessage={handleReportMessage}
              />
            ))}

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

      {/* Report User Dialog */}
      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report User</AlertDialogTitle>
            <AlertDialogDescription>
              Why are you reporting this user? This will help our moderation team review the issue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Violation Type</label>
              <select 
                value={selectedViolation}
                onChange={(e) => setSelectedViolation(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md"
              >
                <option value="harassment">Harassment</option>
                <option value="spam">Spam</option>
                <option value="inappropriate_content">Inappropriate Content</option>
                <option value="other">Other</option>
              </select>
            </div>
            {moderationError && (
              <p className="text-sm text-red-600">{moderationError}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReportUser}
              disabled={moderationLoading}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {moderationLoading ? 'Reporting...' : 'Report User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block User Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to block this user? You will no longer receive messages from them and they won't be able to see your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {moderationError && (
            <p className="text-sm text-red-600">{moderationError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBlockUser}
              disabled={moderationLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {moderationLoading ? 'Blocking...' : 'Block User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}