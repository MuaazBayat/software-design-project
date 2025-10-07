'use client';

import React, { useState, useEffect } from 'react';
import { Search, Mail, MailOpen, Mailbox } from 'lucide-react';
import { useSyncProfile } from '../../lib/context/ProfileContext';
import MessagingApiClient, { SearchUsersResponse, SearchUsersResponseItem } from '../../lib/MessagingApiClient';
import ConversationCard from '@/components/ConversationCard';
import { useRouter } from 'next/navigation';
import { useConversationUser } from '../../lib/context/ConversationUserContext';
import Loader from '@/components/ui/loader';

const LetterInbox = () => {
  const [conversations, setConversations] = useState<SearchUsersResponseItem[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<SearchUsersResponseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'read' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const [announceMessage, setAnnounceMessage] = useState<string>('');

  const { profile, synced } = useSyncProfile();
  const router = useRouter();
  const { setCurrentConversationUser, clearCurrentConversationUser } = useConversationUser();

  // Debug logging
  console.log('Inbox - profile:', profile);
  console.log('Inbox - synced:', synced);
  console.log('Inbox - profile?.user_id:', profile?.user_id);
  console.log('Inbox - profile?.clerk_id:', profile?.clerk_id);
  console.log('Inbox - profile keys:', profile ? Object.keys(profile) : 'null');

  const apiClient = new MessagingApiClient();

  const deriveFlags = (item: SearchUsersResponseItem) => {
    const lm: any = item.latest_message ?? {};
    const myId = profile?.user_id;

    const fromMe =
      typeof lm.from_me === 'boolean'
        ? lm.from_me
        : (lm.sender_id && myId ? lm.sender_id === myId : false);

    const isRead =
      typeof lm.is_read === 'boolean'
        ? lm.is_read
        : Boolean(lm.read_at);

    const scheduledAtISO: string | undefined = lm.scheduled_delivery_at;
    const scheduledTs = scheduledAtISO ? Date.parse(scheduledAtISO) : NaN;
    const isFuture = Number.isFinite(scheduledTs) && scheduledTs > Date.now();

    const inTransitFromMe = Boolean(item.in_transit_from_me || (fromMe && isFuture));

    const isNewIncoming = !fromMe && !isRead; // unread and from them
    return { fromMe, isRead, isNewIncoming, inTransitFromMe };
  };

  const handleConversationClick = async (conversation: SearchUsersResponseItem) => {
    clearCurrentConversationUser();
    setCurrentConversationUser(conversation.user_profile);

    const threadId = conversation.latest_message?.conversation_thread_id;
    if (threadId && profile?.user_id) {
      try {
        await apiClient.markRead({
          conversation_thread_id: threadId,
          my_user_id: profile.user_id,
        });
        
        // Announce that the message was marked as read
        setAnnounceMessage(`Message from ${conversation.user_profile.anonymous_handle} marked as read`);
        setTimeout(() => setAnnounceMessage(''), 1000);
      } catch (e) {
        console.warn('markRead failed (non-fatal):', e);
      }

      // optimistic update: if latest was incoming, mark read locally
      setConversations(prev =>
        prev.map(it => {
          if (it.user_profile.user_id !== conversation.user_profile.user_id) return it;
          const lm = it.latest_message;
          if (!lm) return it;
          const myId = profile?.user_id;
          const wasFromMe = lm.sender_id && myId ? lm.sender_id === myId : lm.from_me;
          if (!wasFromMe) {
            return {
              ...it,
              latest_message: { ...lm, read_at: new Date().toISOString(), is_read: true },
            };
          }
          return it;
        })
      );
    }

    router.push(threadId ? `/conversation/${threadId}` : `/conversation`);
  };

  useEffect(() => {
    if (!synced || !profile?.user_id) return;

    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching conversations for user_id:', profile.user_id);
        console.log('MessagingApiClient baseUrl:', process.env.NEXT_PUBLIC_MESSAGING_URL);
        const response: SearchUsersResponse = await apiClient.searchUsers({
          anonymous_handle: "",
          my_user_id: profile.user_id,
          limit: 50,
          offset: 0,
        });
        console.log('Fetched conversations:', response);
        setConversations(response.items);
        setError(null);
      } catch (err) {
        setError('Failed to load conversations');
        console.error('Error fetching conversations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synced, profile?.user_id]);

  useEffect(() => {
    let filtered = conversations;

    if (searchTerm) {
      filtered = filtered.filter(conv =>
        conv.user_profile.anonymous_handle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(conv => {
        const { fromMe, isNewIncoming, isRead } = deriveFlags(conv);
        if (filterStatus === 'unread') return isNewIncoming;
        // read: either from me (nothing for me to read) or incoming but already read
        return fromMe || isRead;
      });
    }

    setFilteredConversations(filtered);
    // Reset pagination when filter changes
    setVisibleCount(6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, searchTerm, filterStatus, profile?.user_id]);

  const formatMessagePreview = (content: string, maxLength = 60) =>
    content.length > maxLength ? content.substring(0, maxLength) + '...' : content;

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  // SA-time aware by comparing epoch (works regardless of local TZ)
  // 4th arg meaning:
  //  - if fromMe: inTransit flag
  //  - if fromThem: isRead flag
  const getDeliveryStatusBadge = (
    _status: string,
    fromMe: boolean,
    scheduledISO?: string,
    inTransitOrIsRead?: boolean
  ) => {
    const schedMs = scheduledISO ? Date.parse(scheduledISO) : NaN;
    const nowMs = Date.now();
    const isFuture = Number.isFinite(schedMs) && schedMs > nowMs;

    if (fromMe) {
      const inTransit = !!inTransitOrIsRead || isFuture;
      return inTransit ? (
        <span 
          className="px-2 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-blue-700 whitespace-nowrap"
          aria-label="Message in transit"
        >
          Outgoing…
        </span>
      ) : null;
    }

    // from them
    const visible = Number.isFinite(schedMs) ? schedMs <= nowMs : true;
    const isRead = !!inTransitOrIsRead;
    if (visible && !isRead) {
      return (
        <span 
          className="px-2 py-1 rounded-full text-[11px] font-medium bg-red-100 text-red-600 whitespace-nowrap"
          aria-label="Unread message"
        >
          Unread
        </span>
      );
    }
    return null;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div 
          className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md"
          role="alert"
          aria-live="assertive"
        >
          <div className="text-red-500 text-6xl mb-4" aria-hidden="true">📫</div>
          <h1 className="text-2xl font-bold text-amber-900 mb-2">Oops!</h1>
          <p className="text-amber-700" id="error-message">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 focus:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
            aria-describedby="error-message"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Live region for screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announceMessage}
      </div>
      
      {/* Skip to main content link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-black text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        Skip to main content
      </a>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="bg-white rounded-sm p-6 mb-8">
          <h1 className="sr-only">Letter Inbox</h1>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <label htmlFor="search-input" className="sr-only">
                Search conversations by username
              </label>
              <Search 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-black w-5 h-5" 
                aria-hidden="true"
              />
              <input
                id="search-input"
                type="text"
                placeholder="Search by username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-100 focus:border-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 text-orange-900 placeholder-black"
                aria-describedby="search-hint"
              />
              <div id="search-hint" className="sr-only">
                Type to filter conversations by username
              </div>
            </div>
            <fieldset className="flex gap-2">
              <legend className="sr-only">Filter conversations by read status</legend>
              {[
                { value: 'all', label: 'All Letters', icon: Mailbox },
                { value: 'unread', label: 'Unread', icon: Mail },
                { value: 'read', label: 'Read', icon: MailOpen }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setFilterStatus(value as 'all' | 'read' | 'unread')}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    filterStatus === value
                      ? 'bg-black text-white shadow-md focus:ring-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-black hover:text-white focus:ring-black'
                  }`}
                  aria-pressed={filterStatus === value}
                  aria-describedby={`filter-${value}-desc`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </fieldset>
          </div>
          {/* Hidden descriptions for filter buttons */}
          <div id="filter-all-desc" className="sr-only">Show all conversations regardless of read status</div>
          <div id="filter-unread-desc" className="sr-only">Show only unread conversations</div>
          <div id="filter-read-desc" className="sr-only">Show only read conversations</div>
        </header>

        <main id="main-content">
          {isLoading && (
            <div className="text-center py-12" role="status" aria-live="polite">
              <Loader />
              <span className="sr-only">Loading conversations...</span>
            </div>
          )}

          {!isLoading && filteredConversations.length === 0 && (
            <div className="text-center py-12" role="status" aria-live="polite">
              <div className="text-8xl mb-6" aria-hidden="true">📭</div>
              <h2 className="text-2xl font-bold text-amber-900 mb-2">No letters found</h2>
              <p className="text-amber-700">
                {searchTerm || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start a conversation with a pen pal!'}
              </p>
            </div>
          )}

          {!isLoading && filteredConversations.length > 0 && (
            <>
              <section aria-label="Conversations">
                <h2 className="sr-only">
                  {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''} found
                  {searchTerm && ` matching "${searchTerm}"`}
                  {filterStatus !== 'all' && ` (${filterStatus} only)`}
                </h2>
                <div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  role="list"
                  aria-label="Conversation list"
                >
                  {filteredConversations.slice(0, visibleCount).map((conversation, index) => (
                    <div key={conversation.user_profile.user_id} role="listitem">
                      <ConversationCard
                        conversation={conversation}
                        formatMessagePreview={(t, n) => formatMessagePreview(t, n)}
                        formatTimeAgo={formatTimeAgo}
                        getDeliveryStatusBadge={getDeliveryStatusBadge}
                        onClick={() => handleConversationClick(conversation)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Open conversation with ${conversation.user_profile.anonymous_handle}`}
                        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleConversationClick(conversation);
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* See More Button */}
              {filteredConversations.length > visibleCount && (
                <div className="text-center mt-8">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 6)}
                    className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-colors shadow-md hover:shadow-lg"
                    aria-describedby="load-more-desc"
                  >
                    See More Letters
                  </button>
                  <div id="load-more-desc" className="sr-only">
                    Load 6 more conversations. Currently showing {visibleCount} of {filteredConversations.length} conversations.
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default LetterInbox;
