'use client';

import React from 'react';
import { Clock, Heart, MapPin } from 'lucide-react';
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
    <div className="relative group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2 bg-red-100 rounded-b-lg">
      {/* Envelope Flap - Top Triangle */}
      <div className="absolute inset-x-0 top-0 z-10">
        <div className="relative">
          {/* Back flap (shadow) */}
          <div 
            className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-amber-100 to-amber-50"
            style={{
              clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
            }}
          />
          {/* Front flap */}
          <div 
            className={`relative h-20 transition-all duration-300 ${
              isUnread 
                ? 'bg-gradient-to-br from-red-50 via-white to-red-50' 
                : 'bg-gradient-to-br from-amber-50 via-white to-amber-50'
            } border-t-2 border-l-2 border-r-2 ${
              isUnread ? 'border-red-200' : 'border-amber-200'
            } group-hover:translate-y-[-8px]`}
            style={{
              clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            {/* Wax Seal */}
            {isUnread && (
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <span className="text-white text-lg">✉</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Envelope Body */}
      <div 
        className={`relative mt-16 h-100 bg-gradient-to-b from-white via-amber-50/30 to-white rounded-b-lg shadow-xl border-2 ${
          isUnread ? 'border-red-200' : 'border-amber-200'
        } overflow-hidden flex flex-col`}
      >
        {/* Airmail Stripes */}
        <div className="absolute inset-x-0 top-0 h-2 bg-repeating-linear-gradient(45deg, transparent, transparent 10px, red 10px, red 20px, blue 20px, blue 30px) opacity-20" />
        
        {/* Stamp Area */}
        <div className="absolute top-4 right-4">
          <div className="w-16 h-20 bg-gradient-to-br from-amber-100 to-amber-200 border-2 border-amber-300 rounded shadow-sm p-1 transform rotate-3">
            <div className="w-full h-full bg-white rounded-sm flex items-center justify-center text-2xl">
              {isUnread ? '🌍' : '📬'}
            </div>
            <div className="text-[6px] text-center text-amber-700 mt-0.5">AIRMAIL</div>
          </div>
        </div>

        {/* Postmark */}
        <div className="absolute top-4 left-4 opacity-30">
          <div className="w-20 h-20 rounded-full border-2 border-gray-400 border-dashed flex items-center justify-center">
            <div className="text-xs text-gray-600 text-center">
              <div className="font-bold">{formatTimeAgo(latest_message?.scheduled_delivery_at || new Date().toISOString())}</div>
              <div className="text-[10px]">DELIVERED</div>
            </div>
          </div>
        </div>

        {/* Address Section (To:) */}
        <div className="relative p-6 pt-12 flex-1 flex flex-col">
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-2 font-mono">
                {isFromMe ? "TO:" : "FROM:"}
            </div>
            <div className="ml-4 space-y-1">
              <h3 className="font-bold text-gray-800 text-lg font-serif">
                {user_profile.anonymous_handle}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-3 h-3" />
                <span className="font-mono text-xs">
                  {user_profile.country_code || 'Unknown'} • {user_profile.age_range}
                </span>
              </div>
              {user_profile.interests && user_profile.interests.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {user_profile.interests.slice(0, 2).map((interest, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-amber-100/50 text-amber-700 text-[10px] rounded-full font-mono"
                    >
                      {interest}
                    </span>
                  ))}
                  {user_profile.interests.length > 2 && (
                    <span className="px-2 py-0.5 bg-amber-100/50 text-amber-700 text-[10px] rounded-full font-mono">
                      +{user_profile.interests.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Divider Line */}
          <div className="border-t-2 border-dashed border-gray-300 my-4 opacity-30" />

          {/* Letter Content Preview */}
          <div className="relative flex-1 overflow-hidden">
            <div className="text-xs text-gray-500 mb-2 font-mono">MESSAGE:</div>
            {latest_message ? (
              <div className="ml-4 bg-white/50 rounded p-3 border border-gray-200">
                <p className="text-gray-700 text-sm italic font-serif leading-relaxed line-clamp-3">
                  <span className="text-gray-500 not-italic text-xs">
                    {latest_message.from_me ? '(You wrote) ' : ''}
                  </span>
                  &ldquo;{formatMessagePreview(latest_message.message_content, 80)}&rdquo;
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span className="font-mono">{formatTimeAgo(latest_message.scheduled_delivery_at)}</span>
                  </div>
                  {getDeliveryStatusBadge(latest_message.delivery_status, latest_message.from_me)}
                </div>
              </div>
            ) : (
              <div className="ml-4 text-gray-400 italic text-sm">No messages yet</div>
            )}
          </div>

          {/* Bottom Status */}
          <div className="flex items-center justify-between mt-4">
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono ${
                !latest_message
                  ? 'bg-gray-100 text-gray-600'
                  : latest_message && isUnread && !isFromMe
                  ? 'bg-red-100 text-red-600 font-bold'
                  : isFromMe
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-green-100 text-green-600'
              }`}
            >
              {!latest_message 
                ? '• SEND A MESSAGE •' 
                : latest_message && isUnread && !isFromMe 
                ? '• NEW MAIL •' 
                : isFromMe 
                ? '✓ SENT'
                : '✓ READ'}
            </span>
            <Heart className="w-4 h-4 text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Envelope Bottom Fold Line */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      </div>

      {/* Shadow for depth */}
      <div className="absolute inset-x-0 top-16 h-80 rounded-b-lg shadow-2xl -z-10 transform translate-y-1 opacity-20" />
    </div>
  );
};

export default ConversationCard;