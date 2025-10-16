/** @jest-environment jsdom */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---- Mocks that must be declared BEFORE importing the page ----

// 1) Profile context
jest.mock('../../lib/context/ProfileContext', () => ({
  __esModule: true,
  useSyncProfile: () => ({ profile: { user_id: 'me_123' }, synced: true }),
}));

// 2) Conversation user context
const mockSetCurrentConversationUser = jest.fn();
const mockClearCurrentConversationUser = jest.fn();
jest.mock('../../lib/context/ConversationUserContext', () => ({
  __esModule: true,
  useConversationUser: () => ({
    setCurrentConversationUser: mockSetCurrentConversationUser,
    clearCurrentConversationUser: mockClearCurrentConversationUser,
  }),
}));

// 3) Next router
const push = jest.fn();
jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ push }),
}));

// 4) MessagingApiClient class (default export) — define mocks inside factory to avoid TDZ
jest.mock('../../lib/MessagingApiClient', () => {
  const searchUsers = jest.fn();
  const markRead = jest.fn();
  const Mock = jest.fn(() => ({ searchUsers, markRead }));
  return {
    __esModule: true,
    default: Mock,
    __private: { searchUsers, markRead, Mock },
  };
});

// 5) ConversationCard — keep it simple and test page behavior
jest.mock('@/components/ConversationCard', () => ({
  __esModule: true,
  default: ({ conversation, onClick }: any) => (
    React.createElement('div', { 'data-testid': `card-${conversation.user_profile.user_id}` },
      React.createElement('div', null, conversation.user_profile.anonymous_handle),
      React.createElement('button', { onClick }, `Open ${conversation.user_profile.anonymous_handle}`)
    )
  ),
}));

// 6) Loader: avoid timers/animations
jest.mock('@/components/ui/loader', () => ({
  __esModule: true,
  default: () => React.createElement('div', null, 'Loading…'),
}));

// Import the page AFTER mocks
import LetterInbox from '@/app/inbox/page';
// Get handles to our client mock fns
const { __private: MessagingMock } = jest.requireMock('../../lib/MessagingApiClient') as any;
const { searchUsers, markRead } = MessagingMock;

// ---- Fixtures ----
const now = new Date();
const iso = (d: Date) => d.toISOString();

function makeItems() {
  return [
    {
      user_profile: { user_id: 'u_alice', anonymous_handle: 'alice' },
      latest_message: {
        id: 'm1',
        conversation_thread_id: 't1',
        sender_id: 'u_alice', // incoming
        is_read: false,
        read_at: null,
        created_at: iso(new Date(now.getTime() - 60 * 60 * 1000)),
      },
      in_transit_from_me: false,
    },
    {
      user_profile: { user_id: 'u_bob', anonymous_handle: 'bob' },
      latest_message: {
        id: 'm2',
        conversation_thread_id: 't2',
        sender_id: 'me_123', // from me
        is_read: true,
        read_at: iso(new Date(now.getTime() - 30 * 60 * 1000)),
        created_at: iso(new Date(now.getTime() - 30 * 60 * 1000)),
        scheduled_delivery_at: iso(new Date(now.getTime() + 10 * 60 * 1000)), // future (in transit)
      },
      in_transit_from_me: true,
    },
  ];
}

beforeEach(() => {
  jest.clearAllMocks();
  searchUsers.mockReset();
  markRead.mockReset();
  searchUsers.mockResolvedValue({ items: makeItems(), total: 2, offset: 0, limit: 50 });
  markRead.mockResolvedValue({ ok: true });
});

// ---- Tests ----

describe('LetterInbox (Inbox page)', () => {
  test('loads conversations and renders cards', async () => {
    render(<LetterInbox />);

    // wait for fetch to happen
    await waitFor(() => expect(searchUsers).toHaveBeenCalled());

    // after fetch resolves, cards appear
    const aliceCard = await screen.findByTestId('card-u_alice');
    const bobCard = await screen.findByTestId('card-u_bob');
    expect(within(aliceCard).getByText('alice')).toBeInTheDocument();
    expect(within(bobCard).getByText('bob')).toBeInTheDocument();

    // api was called with expected defaults (adjust if your client uses different keys)
    expect(searchUsers).toHaveBeenCalledWith({
      anonymous_handle: '',
      my_user_id: 'me_123',
      limit: 50,
      offset: 0,
    });
  });

  test('search filters by username', async () => {
    render(<LetterInbox />);

    await screen.findByTestId('card-u_alice'); // wait for load

    const input = screen.getByPlaceholderText(/search by username/i);
    await userEvent.type(input, 'ali');

    // alice visible, bob filtered out
    expect(screen.getByTestId('card-u_alice')).toBeInTheDocument();
    expect(screen.queryByTestId('card-u_bob')).toBeNull();
  });

  test('Unread filter shows only incoming unread conversations', async () => {
    render(<LetterInbox />);

    await screen.findByTestId('card-u_alice');

    const unreadBtn = screen.getByRole('button', { name: /unread/i });
    await userEvent.click(unreadBtn);

    // alice (incoming & unread) remains, bob (from me) disappears
    expect(screen.getByTestId('card-u_alice')).toBeInTheDocument();
    expect(screen.queryByTestId('card-u_bob')).toBeNull();
  });

  test('clicking a conversation marks it read (if incoming) and navigates', async () => {
    render(<LetterInbox />);

    const aliceCard = await screen.findByTestId('card-u_alice');
    const openAlice = within(aliceCard).getByRole('button', { name: /open alice/i });
    await userEvent.click(openAlice);

    // markRead called with thread and my id
    expect(markRead).toHaveBeenCalledWith({ conversation_thread_id: 't1', my_user_id: 'me_123' });

    // navigates to thread route
    expect(push).toHaveBeenCalledWith('/conversation/t1');

    // also sets/clears conversation user via context
    expect(mockClearCurrentConversationUser).toHaveBeenCalled();
    expect(mockSetCurrentConversationUser).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u_alice', anonymous_handle: 'alice' })
    );
  });
});
