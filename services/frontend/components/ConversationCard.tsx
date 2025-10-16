'use client';

import React from 'react';
import { SearchUsersResponseItem } from '../lib/MessagingApiClient';
import Image from 'next/image';
import waxseal from "@/public/wax.png";
import read from "@/public/read.png";
import notread from "@/public/not_read.png";
import { useSyncProfile } from '@/lib/context/ProfileContext';

interface ConversationCardProps {
  conversation: SearchUsersResponseItem;
  formatMessagePreview: (content: string, maxLength?: number) => string;
  formatTimeAgo: (dateString: string) => string;
  // signature: (status, fromMeForBadge, scheduledISO, inTransitOrIsRead)
  getDeliveryStatusBadge: (
    status: string,
    fromMe: boolean,
    scheduledISO?: string,
    inTransitOrIsRead?: boolean
  ) => React.ReactNode;
  onClick?: (conversation: SearchUsersResponseItem) => void;
  // Accessibility props
  tabIndex?: number;
  role?: string;
  'aria-label'?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  formatMessagePreview,
  formatTimeAgo,
  getDeliveryStatusBadge,
  onClick,
  tabIndex,
  role,
  'aria-label': ariaLabel,
  onKeyDown
}) => {
  const { user_profile, latest_message } = conversation;
  const { profile } = useSyncProfile();

  const lm: any = latest_message ?? {};
  const myId = profile?.user_id;

  const fromMe: boolean =
    typeof lm.from_me === 'boolean'
      ? lm.from_me
      : (lm.sender_id && myId ? lm.sender_id === myId : false);

  const isRead: boolean =
    typeof lm.is_read === 'boolean'
      ? lm.is_read
      : Boolean(lm.read_at);

  const scheduledAtISO: string | undefined = lm.scheduled_delivery_at;
  const deliveryStatus: string | undefined = lm.delivery_status;

  // Outgoing-in-transit info from /search
  const nextOutgoingISO = (conversation.next_outgoing_at || undefined) as string | undefined;
  const hasOutgoingFuture =
    Boolean(conversation.in_transit_from_me) ||
    (nextOutgoingISO ? Date.parse(nextOutgoingISO) > Date.now() : false);

  // visual “unread incoming” (wax & stamp)
  const isNewIncoming = !fromMe && !isRead;

  const handleClick = () => onClick?.(conversation);

  return (
    <article
      className="relative group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2 bg-white shadow-2xl overflow-visible focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 focus:scale-105 focus:-translate-y-2"
      onClick={handleClick}
      tabIndex={tabIndex ?? 0}
      role={role ?? "button"}
      aria-label={ariaLabel ?? `Open conversation with ${user_profile.anonymous_handle} from ${user_profile.country_code}`}
      onKeyDown={onKeyDown ?? ((e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      })}
      aria-describedby={`conversation-status-${user_profile.anonymous_handle}`}
    >
      {/* Envelope flap (taller; overflow visible so wax isn't clipped) */}
      <div className="absolute inset-x-0 top-0 z-10 rounded-sm overflow-visible">
        <div className="relative overflow-visible">
          {/* Back flap shadow */}
          <div
            className="absolute inset-x-0 top-0 h-24 bg-gray-900 rounded-sm"
            style={{ clipPath: 'polygon(0 0, 50% 100%, 100% 0)' }}
          />
          {/* Front flap */}
          <div
            className={`relative h-24 transition-transform duration-300 ${
              isNewIncoming
                ? 'bg-white border-2 border-black'
                : 'bg-gradient-to-br from-amber-50 via-white to-gray-50 border-2 border-amber-300'
            } group-hover:-translate-y-2`}
            style={{
              clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          />
          {/* Wax seal as sibling so it isn't clipped; bigger + gentle lift */}
          {isNewIncoming && (
            <div
              className="
                absolute left-1/2 top-12 -translate-x-1/2 z-50 pointer-events-none
                transform-gpu transition-transform duration-300 ease-out
                group-hover:-translate-y-1 group-hover:scale-110
              "
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
            >
              <Image 
                src={waxseal} 
                alt="Wax Seal" 
                width={64} 
                height={64} 
                className="select-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Envelope body */}
      <div className="relative mt-24 flex flex-col">
        {/* Stamp */}
        <div className="absolute top-4 right-4">
          <div className="w-15 h-20 transform rotate-3">
            {isNewIncoming ? (
              <Image 
                src={notread} 
                alt="Unread" 
                width={32} 
                height={32} 
                className="w-13 h-16 top-1 right-1" 
              />
            ) : (
              <Image 
                src={read} 
                alt="Read" 
                width={32} 
                height={32} 
                className="w-13 h-16 top-1 right-1" 
              />
            )}
          </div>
        </div>

        {/* Address */}
        <div className="relative p-6 pt-12 flex-1 flex flex-col">
          <section className="mb-4" aria-labelledby={`user-info-${user_profile.anonymous_handle}`}>
            <div className="text-xs text-gray-500 mb-2 font-mono">
              {fromMe ? 'To:' : 'From:'}
            </div>
            <div className="space-y-1">
              <h2 
                id={`user-info-${user_profile.anonymous_handle}`}
                className="font-bold text-gray-800 text-lg font-serif"
              >
                {user_profile.anonymous_handle}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-mono text-xs">
                  <span className="sr-only">Location:</span>
                  {user_profile.country_code || 'Unknown'} • 
                  <span className="sr-only">Age range:</span>
                  {user_profile.age_range}
                </span>
              </div>
              {!!user_profile.interests?.length && (
                <div className="flex flex-wrap gap-1 mt-2" role="list" aria-label="User interests">
                  {user_profile.interests.slice(0, 2).map((interest, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-black text-white text-[10px] rounded-full font-mono"
                      role="listitem"
                    >
                      {interest}
                    </span>
                  ))}
                  {user_profile.interests.length > 2 && (
                    <span 
                      className="px-2 py-0.5 bg-black text-white text-[10px] rounded-full font-mono"
                      role="listitem"
                      aria-label={`And ${user_profile.interests.length - 2} more interests`}
                    >
                      +{user_profile.interests.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Message preview + single inline badge */}
          <section className="relative flex-1 overflow-hidden" aria-labelledby={`message-preview-${user_profile.anonymous_handle}`}>
            <h3 id={`message-preview-${user_profile.anonymous_handle}`} className="text-xs text-gray-500 mb-2 font-mono">
              Message:
            </h3>
            {latest_message ? (
              <div className="bg-white/50 rounded p-3 border border-gray-200">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-gray-700 text-sm italic font-serif leading-relaxed line-clamp-3">
                    <span className="text-gray-500 not-italic text-xs">
                      {fromMe ? '(You wrote) ' : ''}
                    </span>
                    <span className="sr-only">
                      {isNewIncoming ? 'Unread message: ' : 'Message: '}
                    </span>
                    &ldquo;{formatMessagePreview(lm.message_content ?? '', 80)}&rdquo;
                  </p>

                  {/* KEY: if there is a future outgoing, treat as "from me" for the badge,
                      and pass that future timestamp so it shows "Outgoing…" */}
                  <div aria-label={`Message status: ${deliveryStatus || 'unknown'}`}>
                    {getDeliveryStatusBadge(
                      deliveryStatus || 'unknown',
                      fromMe || hasOutgoingFuture,
                      (fromMe || hasOutgoingFuture) ? (hasOutgoingFuture ? nextOutgoingISO : scheduledAtISO) : scheduledAtISO,
                      (fromMe || hasOutgoingFuture) ? hasOutgoingFuture : isRead
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                  <span className="font-mono" aria-label={`Message time: ${scheduledAtISO ? formatTimeAgo(scheduledAtISO) : 'Unknown time'}`}>
                    {scheduledAtISO ? formatTimeAgo(scheduledAtISO) : ''}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 italic text-sm" role="status">
                You haven&apos;t written to each other...
              </div>
            )}
          </section>

          {/* Bottom chips intentionally removed */}
        </div>
      </div>
      
      {/* Hidden status description for screen readers */}
      <div id={`conversation-status-${user_profile.anonymous_handle}`} className="sr-only">
        {isNewIncoming 
          ? `You have an unread message from ${user_profile.anonymous_handle}` 
          : latest_message 
            ? `Latest message exchanged ${formatTimeAgo(scheduledAtISO || '')}`
            : `No messages exchanged yet with ${user_profile.anonymous_handle}`
        }
      </div>
    </article>
  );
};

export default ConversationCard;
