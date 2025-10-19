'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MessagingApiClient, { MessageRow, PageLettersResponse } from '@/lib/MessagingApiClient';
import { moderationApi } from '@/lib/moderationApiClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSyncProfile } from '../../../lib/context/ProfileContext';
import LetterCard from '@/components/LetterCard';
import { Toaster, toast } from 'sonner';
import { useConversationUser } from '../../../lib/context/ConversationUserContext';
import {
  Mail,
  Clock,
  Send,
  ArrowLeft,
  MapPin,
  Flag,
  Ban,
  MoreVertical,
  User,
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

type PeerSummary = {
  user_id: string;
  anonymous_handle: string;
  country_code?: string | null;
};

const LS_KEY = (threadId: string) => `letters.peer.${threadId}`;

export default function ConversationPage({}: ConversationPageProps) {
  const params = useParams();
  const router = useRouter();
  const conversationThreadId = params.conversation_thread_id as string;

  const { profile, synced } = useSyncProfile();
  const { currentConversationUser } = useConversationUser();
  const CURRENT_USER_ID = profile?.user_id ?? null;

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

  // Header peer fallback (localStorage-backed)
  const [headerPeer, setHeaderPeer] = useState<PeerSummary | null>(null);

  // ---- Hydrate header from localStorage ASAP (cold reload case)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY(conversationThreadId));
      if (raw) {
        const parsed = JSON.parse(raw) as PeerSummary;
        if (parsed?.user_id) setHeaderPeer(parsed);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationThreadId]);

  // ---- If context becomes available later, override and persist
  useEffect(() => {
    if (currentConversationUser?.user_id) {
      const fromCtx: PeerSummary = {
        user_id: currentConversationUser.user_id,
        anonymous_handle: currentConversationUser.anonymous_handle ?? 'Unknown User',
        country_code: currentConversationUser.country_code ?? null,
      };
      setHeaderPeer(fromCtx);
      try {
        localStorage.setItem(LS_KEY(conversationThreadId), JSON.stringify(fromCtx));
      } catch {}
    }
  }, [currentConversationUser, conversationThreadId]);

  // Effective values (context → localStorage headerPeer → default)
  const effectiveName = useMemo(
    () =>
      currentConversationUser?.anonymous_handle ??
      headerPeer?.anonymous_handle ??
      'Unknown User',
    [currentConversationUser?.anonymous_handle, headerPeer?.anonymous_handle]
  );

  const effectiveCountry = useMemo(
    () => currentConversationUser?.country_code ?? headerPeer?.country_code ?? null,
    [currentConversationUser?.country_code, headerPeer?.country_code]
  );

  const otherUserId = useMemo(
    () => currentConversationUser?.user_id ?? headerPeer?.user_id ?? undefined,
    [currentConversationUser?.user_id, headerPeer?.user_id]
  );

  // Keep title synced with effective name
  useEffect(() => {
    document.title = `Conversation with ${effectiveName} - Letters`;
  }, [effectiveName]);

  // ---- Load messages; also capture/overwrite peer summary from API and persist
  const loadMessages = useCallback(
    async (lastMessageId?: string) => {
      if (!CURRENT_USER_ID) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response: PageLettersResponse = await apiClient.pageLetters({
          conversation_thread_id: conversationThreadId,
          page_size: 50,
          last_message_id: lastMessageId,
          viewer_user_id: CURRENT_USER_ID,
        });

        // Pull peer from the payload if provided and persist
        const peer = (response as any)?.other_user_summary as PeerSummary | undefined;
        if (peer?.user_id) {
          setHeaderPeer((prev) => {
            // If context already filled in, keep it; else use API peer
            if (currentConversationUser?.user_id) return prev;
            const cleanPeer: PeerSummary = {
              user_id: peer.user_id,
              anonymous_handle: peer.anonymous_handle ?? 'Unknown User',
              country_code: peer.country_code ?? null,
            };
            try {
              localStorage.setItem(LS_KEY(conversationThreadId), JSON.stringify(cleanPeer));
            } catch {}
            return cleanPeer;
          });
        }

        if (lastMessageId) {
          setMessages((prev) => [...prev, ...response.items]);
        } else {
          const sorted = response.items.sort(
            (a, b) => (a.message_sequence || 0) - (b.message_sequence || 0)
          );
          setMessages(sorted);
        }

        setHasMore(response.has_more);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    },
    [
      apiClient,
      conversationThreadId,
      CURRENT_USER_ID,
      currentConversationUser?.user_id, // to keep the guard logic consistent
    ]
  );

  // ---- Initial load / re-run when viewer is known
  useEffect(() => {
    if (synced && CURRENT_USER_ID) {
      loadMessages();
    } else if (synced && !CURRENT_USER_ID) {
      setLoading(false);
    }
  }, [conversationThreadId, synced, CURRENT_USER_ID, loadMessages]);

  // Moderation
  const handleReportUser = async () => {
    if (!CURRENT_USER_ID || !otherUserId) return;
    setModerationLoading(true);
    setModerationError(null);
    try {
      await moderationApi.reportUser(CURRENT_USER_ID, otherUserId, selectedViolation);
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
      await moderationApi.blockUser(CURRENT_USER_ID, otherUserId);
      setShowBlockDialog(false);
      toast.success('User blocked successfully');
      router.push('/inbox');
    } catch (err) {
      setModerationError(err instanceof Error ? err.message : 'Failed to block user');
    } finally {
      setModerationLoading(false);
    }
  };

  const handleReportMessage = async (
    messageId: string,
    reportedUserId: string,
    violationType: string
  ) => {
    if (!CURRENT_USER_ID) {
      toast.error('Unable to report message: Please sign in first');
      return;
    }
    setModerationLoading(true);
    setModerationError(null);
    try {
      await moderationApi.reportMessage(CURRENT_USER_ID, reportedUserId, messageId, violationType);
      toast.success('Message reported successfully. Our moderation team will review this report.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to report message';
      setModerationError(errorMessage);
      toast.error(`Failed to report message: ${errorMessage}`);
    } finally {
      setModerationLoading(false);
    }
  };

  if (!synced || (loading && messages.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4" role="status" aria-live="polite">
          <Mail className="h-12 w-12 mx-auto text-amber-600 animate-pulse" aria-hidden="true" />
          <p className="text-amber-800 font-medium">
            {!synced ? 'Syncing your profile...' : 'Loading your letters...'}
          </p>
          <span className="sr-only">
            {!synced
              ? 'Please wait while we sync your profile data'
              : 'Please wait while we load your conversation letters'}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50 flex items-center justify-center">
        <Card className="max-w-md p-8 text-center border-red-200 bg-red-50" role="alert">
          <Mail className="h-12 w-12 mx-auto text-red-500 mb-4" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-red-800 mb-2">Oops!</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <Button
            onClick={() => loadMessages()}
            variant="outline"
            className="border-red-200 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            aria-describedby="error-retry-help"
          >
            Try Again
          </Button>
          <p id="error-retry-help" className="sr-only">
            Click to retry loading the conversation messages
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50">
      {/* Skip to main content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-black text-white px-4 py-2 rounded z-50"
      >
        Skip to conversation
      </a>

      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-700 hover:bg-amber-100 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            onClick={() => router.push('/inbox')}
            aria-label="Go back to inbox"
          >
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Back to Inbox
          </Button>
          <div className="flex-1 text-center">
            <button
              onClick={() => router.push('/profile')}
              className="hover:bg-amber-100 rounded-lg p-2 transition-colors focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 group"
              aria-label={`View ${effectiveName}'s profile`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <User className="h-4 w-4 text-amber-600 group-hover:text-amber-700" aria-hidden="true" />
                <h1 className="text-lg font-semibold text-amber-900 group-hover:text-amber-800">
                  {effectiveName}
                </h1>
              </div>
              {effectiveCountry && (
                <p className="text-sm text-amber-600 flex items-center justify-center gap-1">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">User location:</span>
                  {effectiveCountry}
                </p>
              )}
            </button>
          </div>

          {/* Moderation Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-700 hover:bg-amber-100 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                aria-label="User moderation options"
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                <Flag className="h-4 w-4 mr-2" aria-hidden="true" />
                Report User
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowBlockDialog(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Ban className="h-4 w-4 mr-2" aria-hidden="true" />
                Block User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages Container */}
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-8">
        <ScrollArea className="h-[calc(100vh-200px)]" aria-label="Conversation messages">
          <div className="space-y-6" role="log" aria-live="polite" aria-label="Letter conversation">
            {messages.length === 0 && !loading ? (
              <div className="text-center py-12" role="status">
                <Mail className="h-16 w-16 mx-auto text-amber-400 mb-4" aria-hidden="true" />
                <h2 className="text-xl font-semibold text-amber-800 mb-2">No letters yet</h2>
                <p className="text-amber-600">Start your conversation by writing the first letter!</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <LetterCard
                  key={message.message_id}
                  message={message}
                  currentUserId={CURRENT_USER_ID ?? undefined}
                  onReportMessage={handleReportMessage}
                  aria-label={`Letter ${index + 1} of ${messages.length}`}
                />
              ))
            )}

            {hasMore && (
              <div className="flex justify-center py-8">
                <Button
                  onClick={() => loadMessages(messages[messages.length - 1]?.message_id)}
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                  disabled={loading}
                  aria-describedby="load-more-help"
                >
                  {loading ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      Loading more letters...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
                      Load Earlier Letters
                    </>
                  )}
                </Button>
                <p id="load-more-help" className="sr-only">
                  Click to load earlier letters in this conversation
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Write New Letter Button */}
        <div className="fixed bottom-8 right-8">
          <Button
            onClick={() => router.push(`/compose-letter/${otherUserId}`)}
            size="lg"
            className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
            aria-label="Write a new letter to this user"
            disabled={!otherUserId}
          >
            <Send className="h-5 w-5 mr-2" aria-hidden="true" />
            Write Letter
          </Button>
        </div>
      </main>

      {/* Report User Dialog */}
      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent
          role="dialog"
          aria-labelledby="report-dialog-title"
          aria-describedby="report-dialog-description"
        >
          <AlertDialogHeader>
            <AlertDialogTitle id="report-dialog-title">Report User</AlertDialogTitle>
            <AlertDialogDescription id="report-dialog-description">
              Why are you reporting this user? This will help our moderation team review the issue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="violation-type" className="text-sm font-medium">
                Violation Type
              </label>
              <select
                id="violation-type"
                value={selectedViolation}
                onChange={(e) => setSelectedViolation(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                aria-describedby="violation-type-help"
              >
                <option value="harassment">Harassment</option>
                <option value="spam">Spam</option>
                <option value="inappropriate_content">Inappropriate Content</option>
                <option value="other">Other</option>
              </select>
              <p id="violation-type-help" className="sr-only">
                Select the type of violation this user has committed
              </p>
            </div>
            {moderationError && (
              <div role="alert" className="text-sm text-red-600" aria-live="polite">
                {moderationError}
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReportUser}
              disabled={moderationLoading}
              className="bg-rose-600 hover:bg-rose-700 focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
              aria-describedby="report-action-help"
            >
              {moderationLoading ? 'Reporting...' : 'Report User'}
            </AlertDialogAction>
            <p id="report-action-help" className="sr-only">
              {moderationLoading
                ? 'Please wait while we process your report'
                : 'Click to submit the report to our moderation team'}
            </p>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block User Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent
          role="dialog"
          aria-labelledby="block-dialog-title"
          aria-describedby="block-dialog-description"
        >
          <AlertDialogHeader>
            <AlertDialogTitle id="block-dialog-title">Block User</AlertDialogTitle>
            <AlertDialogDescription id="block-dialog-description">
              {'Are you sure you want to block this user? You will no longer receive messages from them and they will not be able to see your profile.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {moderationError && (
            <div role="alert" className="text-sm text-red-600" aria-live="polite">
              {moderationError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              disabled={moderationLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-describedby="block-action-help"
            >
              {moderationLoading ? 'Blocking...' : 'Block User'}
            </AlertDialogAction>
            <p id="block-action-help" className="sr-only">
              {moderationLoading
                ? 'Please wait while we process the block request'
                : 'Click to permanently block this user from contacting you'}
            </p>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
