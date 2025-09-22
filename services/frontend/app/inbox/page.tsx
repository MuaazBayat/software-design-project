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

  const { profile, synced } = useSyncProfile();
  const router = useRouter();
  const { setCurrentConversationUser, clearCurrentConversationUser } = useConversationUser();

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
        <span className="px-2 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-blue-700 whitespace-nowrap">
          Outgoing…
        </span>
      ) : null;
    }

    // from them
    const visible = Number.isFinite(schedMs) ? schedMs <= nowMs : true;
    const isRead = !!inTransitOrIsRead;
    if (visible && !isRead) {
      return (
        <span className="px-2 py-1 rounded-full text-[11px] font-medium bg-red-100 text-red-600 whitespace-nowrap">
          Unread
        </span>
      );
    }
    return null;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">📫</div>
          <h2 className="text-2xl font-bold text-amber-900 mb-2">Oops!</h2>
          <p className="text-amber-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black w-5 h-5" />
              <input
                type="text"
                placeholder="Search by username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-100 focus:border-black focus:outline-none text-orange-900 placeholder-black"
              />
            </div>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'All Letters', icon: Mailbox },
                { value: 'unread', label: 'Unread', icon: Mail },
                { value: 'read', label: 'Read', icon: MailOpen }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setFilterStatus(value as 'all' | 'read' | 'unread')}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    filterStatus === value
                      ? 'bg-black text-white shadow-md'
                      : 'bg-gray-100 text-gray-800 hover:bg-black hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <Loader />
          </div>
        )}

        {!isLoading && filteredConversations.length === 0 && (
          <div className="text-center py-12">
            <div className="text-8xl mb-6">📭</div>
            <h3 className="text-2xl font-bold text-amber-900 mb-2">No letters found</h3>
            <p className="text-amber-700">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start a conversation with a pen pal!'}
            </p>
          </div>
        )}

        {!isLoading && filteredConversations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredConversations.map((conversation) => (
              <ConversationCard
                key={conversation.user_profile.user_id}
                conversation={conversation}
                formatMessagePreview={(t, n) => formatMessagePreview(t, n)}
                formatTimeAgo={formatTimeAgo}
                getDeliveryStatusBadge={getDeliveryStatusBadge}
                onClick={() => handleConversationClick(conversation)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LetterInbox;
