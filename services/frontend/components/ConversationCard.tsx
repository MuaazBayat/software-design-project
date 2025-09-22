'use client';

import React from 'react';
import { SearchUsersResponseItem } from '../lib/MessagingApiClient';
import Image from 'next/image';
import waxseal from "@/public/wax.png"
import read from "@/public/read.png"
import notread from "@/public/not_read.png"
interface ConversationCardProps {
  conversation: SearchUsersResponseItem;
  formatMessagePreview: (content: string, maxLength?: number) => string;
  formatTimeAgo: (dateString: string) => string;
  getDeliveryStatusBadge: (status: string, fromMe: boolean) => React.ReactNode;
  onClick?: (conversation: SearchUsersResponseItem) => void; // Add this line
}

const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  formatMessagePreview,
  formatTimeAgo,
  getDeliveryStatusBadge,
  onClick
}) => {
  const { user_profile, latest_message } = conversation;
  const isUnread = !latest_message?.is_read;
  const isFromMe = latest_message?.from_me;

  // Add click handler
  const handleClick = () => {
    onClick?.(conversation);
  };

  return (
    <div className="relative group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2 bg-white shadow-2xl"
        onClick={handleClick}>
      {/* Envelope Flap - Top Triangle */}
      <div className="absolute inset-x-0 top-0 z-10 rounded-sm">
        <div className="relative">
          {/* Back flap (shadow) */}
          <div 
            className="absolute inset-x-0 top-0 h-20 bg-gray-900 rounded-sm"
            style={{
              clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
            }}
          />
          {/* Front flap */}
          <div 
            className={`relative h-20 transition-all duration-300 ${
              isUnread 
                ? 'bg-white border-2 border-black' 
                : 'bg-gradient-to-br from-amber-50 via-white to-gray-50 border-2 border-amber-300'
            } border-t-2 border-l-2 border-r-2 ${
              isUnread ? 'border-2 border-amber-300' : ' border-2 border-amber-300'
            } group-hover:translate-y-[-8px]`}
            style={{
              clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            {/* Wax Seal */}
            {isUnread && (
              <div className="absolute top-11 left-1/2 transform -translate-x-1/2">
                <Image src={waxseal} alt="Wax Seal" width={32} height={32} className="w-8 h-8" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Envelope Body */}
      <div 
        className={`relative mt-16 h-100  ${
          isUnread ? 'border-red-200' : 'border-black-200'
        } overflow-hidden flex flex-col`}
      >
        
        {/* Stamp Area */}
        <div className="absolute top-4 right-4">
          <div className="w-15 h-20 transform rotate-3">
            {isUnread ? (
              <Image
                src={notread}
                alt="Unread - Wax Seal"
                width={32}
                height={32}
                className="w-13 h-16 top-1 right-1"
              />
            ) : (
              <Image
                src={read}
                alt="Read - Opened Letter"
                width={32}
                height={32}
                className="w-13 h-16 top-1 right-1"
              />
            )}
          </div>
        </div>


        {/* {/*Postmark}
        <div className="absolute top-4 left-4 opacity-30">
          <div className="w-20 h-20 rounded-full border-2 border-gray-400 border-dashed flex items-center justify-center">
            <div className="text-xs text-gray-600 text-center">
              <div className="font-bold">{formatTimeAgo(latest_message?.scheduled_delivery_at || new Date().toISOString())}</div>
              <div className="text-[10px]">DELIVERED</div>
            </div>
          </div>
        </div> */}

        {/* Address Section (To:) */}
        <div className="relative p-6 pt-12 flex-1 flex flex-col">
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-2 font-mono">
                {isFromMe ? "To:" : "From:"}
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-gray-800 text-lg font-serif">
                {user_profile.anonymous_handle}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-mono text-xs">
                  {user_profile.country_code || 'Unknown'} • {user_profile.age_range}
                </span>
              </div>
              {user_profile.interests && user_profile.interests.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {user_profile.interests.slice(0, 2).map((interest, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-black text-white text-[10px] rounded-full font-mono"
                    >
                      {interest}
                    </span>
                  ))}
                  {user_profile.interests.length > 2 && (
                    <span className="px-2 py-0.5 bg-black text-white text-[10px] rounded-full font-mono">
                      +{user_profile.interests.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>


          {/* Letter Content Preview */}
          <div className="relative flex-1 overflow-hidden">
            <div className="text-xs text-gray-500 mb-2 font-mono">Message:</div>
            {latest_message ? (
              <div className=" bg-white/50 rounded p-3 border border-gray-200">
                <p className="text-gray-700 text-sm italic font-serif leading-relaxed line-clamp-3">
                  <span className="text-gray-500 not-italic text-xs">
                    {latest_message.from_me ? '(You wrote) ' : ''}
                  </span>
                  &ldquo;{formatMessagePreview(latest_message.message_content, 80)}&rdquo;
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span className="font-mono">{formatTimeAgo(latest_message.scheduled_delivery_at)}</span>
                  </div>
                  {getDeliveryStatusBadge(latest_message.delivery_status, latest_message.from_me)}
                </div>
              </div>
            ) : (
              <div className=" text-gray-400 italic text-sm">You havent written to each other...</div>
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
                  ? 'bg-gray-100 text-blue-600'
                  : 'bg-gray-100 text-green-600'
              }`}
            >
              {!latest_message 
                ? 'Send a message' 
                : latest_message && isUnread && !isFromMe 
                ? 'New Mail' 
                : isFromMe 
                ? '✓ Sent'
                : '✓ Read'}
            </span>
          </div>
        </div>

        {/* Envelope Bottom Fold Line */}
      </div>

      {/* Shadow for depth */}
    </div>
  );
};

export default ConversationCard;