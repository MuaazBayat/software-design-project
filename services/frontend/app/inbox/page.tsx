'use client';

import React, { useState, useEffect } from 'react';
import { Search, Mail, MailOpen, Globe, Clock, Heart, User, MessageCircle } from 'lucide-react';
import {useSyncProfile} from '../../lib/SyncProfile'
import MessagingApiClient, { SearchUsersResponse, SearchUsersResponseItem } from '../../lib/MessagingApiClient';


const LetterInbox = () => {
  const [conversations, setConversations] = useState<SearchUsersResponseItem[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<SearchUsersResponseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'read' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { profile, synced} = useSyncProfile();

 // Fetch conversations on component mount
  useEffect(() => {
    
    if (!synced || !profile?.user_id) return;

    const apiClient = new MessagingApiClient();
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        const response: SearchUsersResponse = await apiClient.searchUsers({
          anonymous_handle: "", // Empty string acts like inbox
          my_user_id: profile.user_id,
          limit: 50,
          offset: 0
        });
        setConversations(response.items);
        console.log(response.items);
        setError(null);
      } catch (err) {
        setError('Failed to load conversations');
        console.error('Error fetching conversations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [synced, profile?.user_id]);

  // Filter conversations based on search term and read status
  useEffect(() => {
    let filtered = conversations;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(conv =>
        conv.user_profile.anonymous_handle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply read status filter - now using is_read boolean
    if (filterStatus !== 'all') {
      filtered = filtered.filter(conv => {
        return filterStatus === 'read' ? conv.latest_message?.is_read : !conv.latest_message?.is_read;
      });
    }

    setFilteredConversations(filtered);
  }, [conversations, searchTerm, filterStatus]);

  // Format message preview
  const formatMessagePreview = (content: string, maxLength: number = 60) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  // Format time ago
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

  // Get delivery status badge
  const getDeliveryStatusBadge = (status: string, fromMe: boolean) => {
    if (status === 'scheduled') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          📤 {fromMe ? 'Sending...' : 'Incoming...'}
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        ✅ Delivered
      </span>
    );
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b-4 border-amber-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-3 rounded-full">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-amber-900">Letter Box</h1>
                <p className="text-amber-700">Your pen pal conversations</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl">📮</div>
              <p className="text-sm text-amber-600">{conversations.length} conversations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-l-4 border-amber-400">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-amber-200 focus:border-amber-500 focus:outline-none text-amber-900 placeholder-amber-500"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'All Letters', icon: Mail },
                { value: 'unread', label: 'Unread', icon: Mail },
                { value: 'read', label: 'Read', icon: MailOpen }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setFilterStatus(value as 'all' | 'read' | 'unread')}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    filterStatus === value
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin text-6xl mb-4">📮</div>
            <p className="text-amber-700 text-lg">Loading your letters...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredConversations.length === 0 && (
          <div className="text-center py-12">
            <div className="text-8xl mb-6">📭</div>
            <h3 className="text-2xl font-bold text-amber-900 mb-2">No letters found</h3>
            <p className="text-amber-700">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Start a conversation with a pen pal!'
              }
            </p>
          </div>
        )}

        {/* Conversations Grid */}
        {!isLoading && filteredConversations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredConversations.map((conversation) => {
              const { user_profile, latest_message } = conversation;
              const isUnread = !latest_message?.is_read;
              const isFromMe = latest_message?.from_me;
              
              return (
                <div
                  key={user_profile.user_id}
                  className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border-l-4 ${
                    isUnread ? 'border-red-400' : 'border-green-400'
                  } group hover:-translate-y-1`}
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-amber-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                          isUnread ? 'bg-red-100' : 'bg-green-100'
                        }`}>
                          {isUnread ? '✉️' : '📖'}
                        </div>
                        <div>
                          <h3 className="font-bold text-amber-900 text-lg">
                            {user_profile.anonymous_handle}
                          </h3>
                          <div className="flex items-center gap-1 text-amber-600">
                            <Globe className="w-4 h-4" />
                            <span className="text-sm">
                              {user_profile.country_code || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isUnread && (
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    
                    {/* Profile Details */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <User className="w-4 h-4" />
                        <span>{user_profile.age_range}</span>
                      </div>
                      <p className="text-xs text-amber-700 line-clamp-2">
                        {user_profile.bio}
                      </p>
                      {user_profile.interests && user_profile.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {user_profile.interests.slice(0, 3).map((interest, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full"
                            >
                              {interest}
                            </span>
                          ))}
                          {user_profile.interests.length > 3 && (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                              +{user_profile.interests.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message Preview */}
                  <div className="p-6">
                    {latest_message ? (
                      <>
                        <div className="flex items-start gap-2 mb-3">
                          <MessageCircle className="w-4 h-4 text-amber-500 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-amber-800 leading-relaxed text-sm">
                              <span className="font-medium text-amber-900">
                                {latest_message.from_me ? 'You: ' : `${user_profile.anonymous_handle}: `}
                              </span>
                              &quot;{formatMessagePreview(latest_message.message_content)}&quot;
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-amber-600">
                            <Clock className="w-4 h-4" />
                            <span>{formatTimeAgo(latest_message.scheduled_delivery_at)}</span>
                          </div>
                          {getDeliveryStatusBadge(latest_message.delivery_status, latest_message.from_me)}
                        </div>
                      </>
                    ) : (
                      <p className="text-amber-500 italic">No messages yet</p>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="px-6 pb-6">
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isUnread 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {isUnread && !isFromMe ? 'New Letter' : 'Not Read Yet'}
                      </span>
                      <Heart className="w-5 h-5 text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 bg-amber-900 text-amber-100 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="text-4xl mb-4">✉️</div>
          <p className="text-lg font-medium">Happy letter writing!</p>
          <p className="text-amber-300 mt-2">Connecting hearts across the world, one letter at a time</p>
        </div>
      </footer>
    </div>
  );
};

export default LetterInbox;