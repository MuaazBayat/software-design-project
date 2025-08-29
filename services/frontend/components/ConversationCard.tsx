'use client';

import React from 'react';
import { Globe, Clock, User, MessageCircle, Heart } from 'lucide-react';
import { SearchUsersResponseItem } from '../lib/MessagingApiClient';

interface ConversationCardProps {
  conversation: SearchUsersResponseItem;
  formatMessagePreview: (content: string, maxLength?: number) => string;
  formatTimeAgo: (dateString: string) => string;
  getDeliveryStatusBadge: (status: string, fromMe: boolean) => React.ReactNode;
}

const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  formatMessagePreview,
  formatTimeAgo,
  getDeliveryStatusBadge,
}) => {
  const { user_profile, latest_message } = conversation;
  const isUnread = !latest_message?.is_read;
  const isFromMe = latest_message?.from_me;

  return (
    <div
      className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border-l-4 ${
        isUnread ? 'border-red-400' : 'border-green-400'
      } group hover:-translate-y-1`}
    >
      {/* Card Header */}
      <div className="p-6 border-b border-amber-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                isUnread ? 'bg-red-100' : 'bg-green-100'
              }`}
            >
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
                    {latest_message.from_me
                      ? 'You: '
                      : `${user_profile.anonymous_handle}: `}
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
              {getDeliveryStatusBadge(
                latest_message.delivery_status,
                latest_message.from_me
              )}
            </div>
          </>
        ) : (
          <p className="text-amber-500 italic">No messages yet</p>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              isUnread
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {isUnread && !isFromMe ? 'New Letter' : 'Not Read Yet'}
          </span>
          <Heart className="w-5 h-5 text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
};

export default ConversationCard;