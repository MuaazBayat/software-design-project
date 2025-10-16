'use client';

import React from 'react';
import Image from 'next/image';
import wc from 'world-countries';
import { useSyncProfile } from '@/lib/context/ProfileContext';
import waxseal from '@/public/wax.png';
import { SearchUsersResponseItem } from '../lib/MessagingApiClient';

/* ---------- Static visual constants (do not change with showHobbies) ---------- */
const WAX = { SIZE: 64, TOP: 60 } as const;
const STAMP = {
  W: 92,
  H: 66,
  TOP: 14,
  RIGHT: 12,
  ROTATE: 6,
  PAPER: '#faf4e7',
  BORDER: 'rgba(27,31,41,.12)',
} as const;
const MSG_PAPER_BASE = '#fff8ee';

/* ---------- Country → ISO alpha-2 ---------- */
const norm = (s: string) =>
  s.toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|of|and|republic|kingdom|federation|state|states|democratic|people|islamic|united)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const COUNTRY_INDEX: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const c of wc) {
    const code = (c.cca2 || '').toUpperCase();
    if (!code) continue;
    const aliases: string[] = [];
    if (c.name?.common) aliases.push(c.name.common);
    if (c.name?.official) aliases.push(c.name.official);
    if (Array.isArray(c.altSpellings)) aliases.push(...c.altSpellings);
    if (c.name?.common === 'United States') aliases.push('USA', 'US', 'United States of America', 'America');
    if (c.name?.common === 'United Kingdom') aliases.push('UK', 'Great Britain', 'Britain');
    if (c.name?.common === 'Czechia') aliases.push('Czech Republic');
    if (c.name?.common === 'Myanmar') aliases.push('Burma');
    if (c.name?.common === 'Côte d’Ivoire') aliases.push("Cote d'Ivoire", 'Ivory Coast');
    if (c.name?.common === 'South Korea') aliases.push('Republic of Korea', 'Korea, Republic of');
    if (c.name?.common === 'North Korea') aliases.push("Korea, Democratic People's Republic of", 'DPRK');
    if (c.name?.common === 'Russia') aliases.push('Russian Federation');
    if (c.name?.common === 'Vietnam') aliases.push('Viet Nam');
    for (const raw of aliases) {
      const key = norm(raw);
      if (key && !map.has(key)) map.set(key, code);
    }
  }
  return map;
})();

function resolveAlpha2(country: string | null | undefined): string | null {
  if (!country) return null;
  if (/^[A-Za-z]{2}$/.test(country)) return country.toUpperCase();
  let code = COUNTRY_INDEX.get(norm(country));
  if (code) return code;
  for (const p of country.split(',').map((x) => x.trim())) {
    code = COUNTRY_INDEX.get(norm(p));
    if (code) return code;
  }
  const stripped = country
    .replace(/\(.*\)/g, '')
    .replace(/Republic of|Kingdom of|Federation of|State of|Province of/gi, '')
    .trim();
  return COUNTRY_INDEX.get(norm(stripped)) || null;
}

/* ----------------------- Stamp (clean + “stampy”) ----------------------- */
const FlagStamp: React.FC<{ country: string | null | undefined }> = ({ country }) => {
  const alpha2 = resolveAlpha2(country)?.toLowerCase();
  if (!alpha2) return null;

  return (
    <div
      className="absolute z-40 select-none"
      style={{
        width: STAMP.W,
        height: STAMP.H,
        top: STAMP.TOP,
        right: STAMP.RIGHT,
        transform: `rotate(${STAMP.ROTATE}deg)`,
        filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.22))',
      }}
      aria-label={country ? `Stamp: ${country} flag` : 'Stamp'}
    >
      <div
        className="relative w-full h-full overflow-hidden"
        style={{
          borderRadius: 7,
          background: STAMP.PAPER,
          boxShadow: '0 1px 0 rgba(255,255,255,.6), 0 6px 14px rgba(0,0,0,.14)',
          border: `1px solid ${STAMP.BORDER}`,
        }}
      >
        <Image
          src={`https://flagcdn.com/w160/${alpha2}.png`}
          alt={country ? `Flag of ${country}` : 'Country flag'}
          fill
          sizes={`${STAMP.W}px`}
          className="object-cover"
          priority={false}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 1px 6px rgba(0,0,0,.18), inset 0 0 0 1px rgba(0,0,0,.08)',
            borderRadius: 7,
          }}
        />
        <div
          className="absolute"
          style={{
            width: 12,
            height: 12,
            borderRadius: '9999px',
            background: '#ffffff',
            left: 6,
            top: 6,
            boxShadow: '0 2px 4px rgba(0,0,0,.25), inset 0 -1px 0 rgba(0,0,0,.12)',
          }}
          aria-hidden
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: STAMP.W * 1.15,
            height: 16,
            left: -STAMP.W * 0.25,
            top: STAMP.H * 0.6,
            transform: 'rotate(-12deg)',
            background:
              'repeating-linear-gradient(90deg, rgba(30,30,30,.18) 0 14px, transparent 14px 26px)',
          }}
          aria-hidden
        />
      </div>
    </div>
  );
};

/* -------------------------- Props -------------------------- */
interface ConversationCardProps {
  conversation: SearchUsersResponseItem;
  formatMessagePreview: (content: string, maxLength?: number) => string;
  formatTimeAgo: (dateString: string) => string;
  getDeliveryStatusBadge: (
    status: string,
    fromMe: boolean,
    scheduledISO?: string,
    inTransitOrIsRead?: boolean
  ) => React.ReactNode;
  onClick?: (conversation: SearchUsersResponseItem) => void;
  tabIndex?: number;
  role?: string;
  'aria-label'?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;

  /** NEW: show/hide interests chips. Defaults to true. Accepts true/false or 0/1. */
  showHobbies?: boolean | 0 | 1;
}

/* --------------------- Envelope Card ----------------------- */
const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  formatMessagePreview,
  formatTimeAgo,
  getDeliveryStatusBadge,
  onClick,
  tabIndex,
  role,
  'aria-label': ariaLabel,
  onKeyDown,
  showHobbies = true, // default ON
}) => {
  const { user_profile, latest_message } = conversation;
  const { profile } = useSyncProfile();

  // normalize the bit/boolean
  const shouldShowHobbies = !!showHobbies;

  // Heights that change with showHobbies
  const CARD_MIN_H = shouldShowHobbies ? 420 : 350;
  const HEADER_MIN_H = shouldShowHobbies ? 110 : 50;

  // Heights that stay the same
  const FLAP_H = 116;
  const PREVIEW_MIN_H = 130;

  const lm: any = latest_message ?? {};
  const myId = profile?.user_id;

  const fromMe =
    typeof lm.from_me === 'boolean' ? lm.from_me : (lm.sender_id && myId ? lm.sender_id === myId : false);

  const isRead = typeof lm.is_read === 'boolean' ? lm.is_read : Boolean(lm.read_at);

  const scheduledAtISO: string | undefined = lm.scheduled_delivery_at;
  const deliveryStatus: string | undefined = lm.delivery_status;

  const nextOutgoingISO = (conversation.next_outgoing_at || undefined) as string | undefined;
  const hasOutgoingFuture =
    Boolean(conversation.in_transit_from_me) || (nextOutgoingISO ? Date.parse(nextOutgoingISO) > Date.now() : false);

  const isNewIncoming = !fromMe && !isRead;

  const handleClick = () => onClick?.(conversation);

  return (
    <article
      className="
        relative overflow-visible group flex flex-col cursor-pointer
        rounded-b-xl rounded-t-sm transition-transform duration-300
        focus:outline-none focus:ring-2 focus:ring-rose-600/40 focus:ring-offset-2
        hover:-translate-y-1
      "
      style={{
        minHeight: CARD_MIN_H,
        background:
          'radial-gradient(120% 80% at 50% -10%, #ffffff 30%, #fff7ea 70%, #ffe8cf 120%)',
        boxShadow: '0 10px 28px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.65)',
        border: '1px solid rgba(238,174,114,.35)',
      }}
      onClick={handleClick}
      tabIndex={tabIndex ?? 0}
      role={role ?? 'button'}
      aria-label={ariaLabel ?? `Open conversation with ${user_profile.anonymous_handle}`}
      onKeyDown={
        onKeyDown ??
        ((e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        })
      }
      aria-describedby={`conversation-status-${user_profile.anonymous_handle}`}
    >
      {/* paper grain */}
      <div
        className="pointer-events-none absolute inset-0 rounded-b-xl rounded-t-sm"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,.015) 0 2px, transparent 2px 4px), repeating-linear-gradient(90deg, rgba(0,0,0,.012) 0 2px, transparent 2px 4px)',
          mixBlendMode: 'multiply',
          opacity: 0.6,
        }}
      />

      {/* --------- Envelope Flap ---------- */}
      <div className="relative overflow-visible" style={{ height: FLAP_H }}>
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: FLAP_H,
            clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
            background: 'linear-gradient(180deg,#0f172a,#0b1229)',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-x-0 top-0 transition-transform duration-300 group-hover:-translate-y-0.5"
          style={{
            height: FLAP_H,
            clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
            background: isNewIncoming
              ? 'linear-gradient(180deg,#fff,#fef6ea)'
              : 'linear-gradient(180deg,#fffdf8,#fff7eb)',
            border: `2px solid ${isNewIncoming ? '#0f172a' : 'rgba(238,174,114,.60)'}`,
            boxShadow: '0 4px 10px rgba(0,0,0,.10)',
          }}
          aria-hidden
        />
        {isNewIncoming && (
          <div
            className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none transform-gpu transition-transform duration-300 ease-out group-hover:scale-110"
            style={{
              top: WAX.TOP,
              filter: 'drop-shadow(0 10px 14px rgba(0,0,0,0.28))',
              width: WAX.SIZE,
              height: WAX.SIZE,
            }}
            aria-hidden
          >
            <Image src={waxseal} alt="Wax seal" fill className="select-none object-contain" />
          </div>
        )}
        <FlagStamp country={user_profile.country_code || user_profile.anonymous_handle} />
      </div>

      {/* -------------------- Body --------------------- */}
      <div className="relative flex-1 flex flex-col px-6 pb-6 -mt-2">
        {/* Header */}
        <section
          className="pt-2"
          aria-labelledby={`user-info-${user_profile.anonymous_handle}`}
          style={{ minHeight: HEADER_MIN_H }}
        >
          <div className="text-[11px] tracking-[0.18em] text-slate-500/80 mb-1 font-mono uppercase">
            {fromMe ? 'To:' : 'From:'}
          </div>
          <h2
            id={`user-info-${user_profile.anonymous_handle}`}
            className="font-serif text-2xl font-extrabold tracking-tight text-slate-900"
          >
            {user_profile.anonymous_handle}
          </h2>

          {!!shouldShowHobbies && !!user_profile.interests?.length && (
            <div className="flex flex-wrap gap-1.5 mt-2" role="list" aria-label="User interests">
              {user_profile.interests.slice(0, 3).map((interest, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-600/90 text-white shadow-sm"
                  role="listitem"
                >
                  {interest}
                </span>
              ))}
              {user_profile.interests.length > 3 && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-white/90 shadow-sm"
                  role="listitem"
                  aria-label={`And ${user_profile.interests.length - 3} more interests`}
                >
                  +{user_profile.interests.length - 3}
                </span>
              )}
            </div>
          )}
        </section>

        {/* Message preview */}
        <section
          className="mt-3 flex-1"
          aria-labelledby={`message-preview-${user_profile.anonymous_handle}`}
          style={{ minHeight: PREVIEW_MIN_H }}
        >
          <h3 id={`message-preview-${user_profile.anonymous_handle}`} className="text-xs text-slate-500/90 mb-2 font-mono">
            Message:
          </h3>

          {latest_message ? (
            <div
              className="rounded-xl p-3 h-full flex flex-col"
              style={{
                background: `linear-gradient(180deg, ${MSG_PAPER_BASE}, #fff4e3)`,
                border: '1px solid rgba(15,23,42,.08)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.75)',
                position: 'relative',
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none rounded-xl"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, rgba(0,0,0,.018) 0 2px, transparent 2px 4px), repeating-linear-gradient(90deg, rgba(0,0,0,.012) 0 2px, transparent 2px 4px)',
                  mixBlendMode: 'multiply',
                  opacity: 0.5,
                }}
              />
              <div className="flex items-start justify-between gap-3 relative">
                <p className="text-slate-800/90 text-[15px] italic font-serif leading-relaxed line-clamp-3">
                  <span className="text-slate-500 not-italic text-xs">{fromMe && showHobbies ? '(You wrote) ' : ''}</span>
                  <span className="sr-only">{!fromMe && !isRead ? 'Unread message: ' : 'Message: '}</span>
                  &ldquo;{formatMessagePreview(lm.message_content ?? '', 90)}&rdquo;
                </p>
                <div aria-label={`Message status: ${deliveryStatus || 'unknown'}`} className="shrink-0">
                  {showHobbies
                    ? getDeliveryStatusBadge(
                    deliveryStatus || 'unknown',
                    fromMe || hasOutgoingFuture,
                    (fromMe || hasOutgoingFuture) ? (hasOutgoingFuture ? nextOutgoingISO : scheduledAtISO) : scheduledAtISO,
                    (fromMe || hasOutgoingFuture) ? hasOutgoingFuture : isRead
                  ) : null}
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-500/90 relative">
                <span className="font-mono">{scheduledAtISO && showHobbies ? formatTimeAgo(scheduledAtISO) : ''}</span>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 italic text-sm h-full flex items-center" role="status">
              You haven&apos;t written to each other...
            </div>
          )}
        </section>
      </div>

      {/* Screen-reader status */}
      <div id={`conversation-status-${user_profile.anonymous_handle}`} className="sr-only">
        {!latest_message
          ? `No messages exchanged yet with ${user_profile.anonymous_handle}`
          : !fromMe && !isRead
          ? `You have an unread message from ${user_profile.anonymous_handle}`
          : `Latest message exchanged ${formatTimeAgo(scheduledAtISO || '')}`}
      </div>
    </article>
  );
};

export default ConversationCard;
