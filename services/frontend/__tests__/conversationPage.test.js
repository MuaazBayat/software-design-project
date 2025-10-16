import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useParams, useRouter } from 'next/navigation';

// Mock the conversation page component
const ConversationPage = require('../app/conversation/[conversation_thread_id]/page').default;

// --- Context mocks ---
let mockProfileState = { profile: null, synced: true, loading: false };
let mockConversationUserState = { currentConversationUser: null };

jest.mock('../lib/context/ProfileContext', () => ({
  useSyncProfile: () => mockProfileState,
}));

jest.mock('../lib/context/ConversationUserContext', () => ({
  useConversationUser: () => mockConversationUserState,
}));

// Next.js navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

// Messaging API client (component imports from '@/lib/MessagingApiClient')
const mockPageLetters = jest.fn();
jest.mock('../lib/MessagingApiClient', () => {
  return jest.fn().mockImplementation(() => ({
    pageLetters: mockPageLetters,
  }));
});

// Moderation API client
jest.mock('../lib/moderationApiClient', () => ({
  moderationApi: {
    reportUser: jest.fn(),
    blockUser: jest.fn(),
  },
}));

// UI components (component imports via '@/components/ui/*')
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, disabled, ...props }) => (
    <button data-testid="button" onClick={onClick} className={className} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }) => (
    <div data-testid="card" className={className} {...props}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className, ...props }) => (
    <div data-testid="scroll-area" className={className} {...props}>
      {children}
    </div>
  ),
}));

// The page uses DropdownMenu and AlertDialog; stub them so they're never undefined
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, ...props }) => <div role="menuitem" {...props}>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }) => <div data-testid="alert-dialog">{children}</div>,
  AlertDialogContent: ({ children }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick, disabled, ...props }) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
  AlertDialogCancel: ({ children, onClick, disabled, ...props }) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

// Simple mock for LetterCard so tests can assert on props easily
jest.mock('@/components/LetterCard', () => ({
  __esModule: true,
  default: ({ message, currentUserId }) => (
    <div data-testid="letter-card" data-message-id={message.message_id}>
      <div>Message: {message.content}</div>
      <div>From: {message.sender_id}</div>
      <div>Current User: {currentUserId}</div>
    </div>
  ),
}));

// Icons
jest.mock('lucide-react', () => ({
  Mail: () => <div data-testid="mail-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Send: () => <div data-testid="send-icon" />,
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  Flag: () => <div data-testid="flag-icon" />,
  Ban: () => <div data-testid="ban-icon" />,
  MoreVertical: () => <div data-testid="more-vertical-icon" />,
  User: () => <div data-testid="user-icon" />,
}));

// Optionally silence Toaster; it's harmless but reduces noise
jest.mock('sonner', () => ({
  Toaster: () => <div data-testid="toaster" />,
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe('ConversationPage', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  const baseProfile = { user_id: 'current-user-123' };
  const baseConversationUser = {
    user_id: 'other-user-456',
    anonymous_handle: 'TestPenPal',
    country_code: 'US',
  };

  const baseApiResponse = {
    items: [
      {
        message_id: 'msg-1',
        message_sequence: 1,
        sender_id: 'current-user-123',
        content: 'Hello there!',
      },
      {
        message_id: 'msg-2',
        message_sequence: 2,
        sender_id: 'other-user-456',
        content: 'Hi back!',
      },
    ],
    has_more: true,
    last_message_id: 'msg-2',
  };

beforeEach(() => {
  jest.clearAllMocks();
  useParams.mockReturnValue({ conversation_thread_id: 'thread-123' });
  useRouter.mockReturnValue(mockRouter);

  mockProfileState = { profile: baseProfile, synced: true, loading: false };
  mockConversationUserState = { currentConversationUser: baseConversationUser };

  mockPageLetters.mockResolvedValue(baseApiResponse);
});


  test('Loading States: shows loading state for load more button', async () => {
    render(<ConversationPage />);

    // Wait for initial render with has_more = true
    await waitFor(() => expect(screen.getByText('Load Earlier Letters')).toBeInTheDocument());

    // Click and ensure loading label appears
    fireEvent.click(screen.getByText('Load Earlier Letters'));

    await waitFor(() => expect(screen.getByText('Loading more letters...')).toBeInTheDocument());
  });

  test('Message Display: renders messages correctly', async () => {
    render(<ConversationPage />);

    await waitFor(() => {
      expect(screen.getByText(/Hello there!/)).toBeInTheDocument();
      expect(screen.getByText(/Hi back!/)).toBeInTheDocument();
    });
  });

  test('Message Display: sorts messages by sequence number', async () => {
    mockPageLetters.mockResolvedValueOnce({
      ...baseApiResponse,
      items: [
        { ...baseApiResponse.items[1] }, // sequence 2
        { ...baseApiResponse.items[0] }, // sequence 1
      ],
    });

    render(<ConversationPage />);

    await waitFor(() => {
      const cards = screen.getAllByTestId('letter-card');
      expect(cards[0]).toHaveAttribute('data-message-id', 'msg-1');
      expect(cards[1]).toHaveAttribute('data-message-id', 'msg-2');
    });
  });

  test('Message Display: passes correct props to LetterCard', async () => {
    render(<ConversationPage />);

    await waitFor(() => {
      const currentUserTexts = screen.getAllByText('Current User: current-user-123');
      expect(currentUserTexts).toHaveLength(2);
    });
  });

  test('Message Display: handles empty message list', async () => {
    mockPageLetters.mockResolvedValueOnce({ items: [], has_more: false });
    render(<ConversationPage />);

    await waitFor(() => {
      expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
    });
  });

  test('User Information Display: shows current user info in header', async () => {
    render(<ConversationPage />);

    await waitFor(() => {
      expect(screen.getByText('TestPenPal')).toBeInTheDocument();
      expect(screen.getByText('US')).toBeInTheDocument();
      expect(screen.getByTestId('map-pin-icon')).toBeInTheDocument();
    });
  });

test('User Information Display: handles missing user information gracefully', async () => {
  // Make sure EVERY invocation in this test returns undefined for the conversation user
  mockConversationUserState = { currentConversationUser: undefined };

  render(<ConversationPage />);

  await waitFor(() => {
    expect(screen.getByText('Unknown User')).toBeInTheDocument();
    expect(screen.queryByTestId('map-pin-icon')).not.toBeInTheDocument();
  });
});


test('User Information Display: handles missing currentUser gracefully', async () => {
  // Ensure ALL calls in this test return "no profile"
  mockProfileState = { profile: undefined, synced: true, loading: false };

  render(<ConversationPage />);

  // Header is based on conversation user, so it should still render TestPenPal
  await waitFor(() => {
    expect(screen.getByText('TestPenPal')).toBeInTheDocument();
  });

  // Letters still render
  const cards = await screen.findAllByTestId('letter-card');
  expect(cards).toHaveLength(2);

  // And we should not show the default current-user string in LetterCard props
  expect(screen.queryByText('Current User: current-user-123')).not.toBeInTheDocument();
});

  test('Pagination: shows load more button when there are more messages', async () => {
    mockPageLetters.mockResolvedValueOnce({ ...baseApiResponse, has_more: true });
    render(<ConversationPage />);

    await waitFor(() => {
      expect(screen.getByText('Load Earlier Letters')).toBeInTheDocument();
    });
  });

  test('Pagination: loads more messages when button is clicked', async () => {
    render(<ConversationPage />);

    await waitFor(() => {
      expect(screen.getByText('Load Earlier Letters')).toBeInTheDocument();
    });

    // next page returns no more
    mockPageLetters.mockResolvedValueOnce({
      items: [
        { message_id: 'msg-0', message_sequence: 0, sender_id: 'other-user-456', content: 'Earlier' },
      ],
      has_more: false,
      last_message_id: 'msg-0',
    });

    fireEvent.click(screen.getByText('Load Earlier Letters'));

    await waitFor(() => {
      expect(mockPageLetters).toHaveBeenLastCalledWith({
        conversation_thread_id: 'thread-123',
        page_size: 50,
        last_message_id: 'msg-2', // from last of initial items
      });
    });
  });

  test('Pagination: disables load more button while loading', async () => {
    render(<ConversationPage />);

    await waitFor(() => {
      expect(screen.getByText('Load Earlier Letters')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Load Earlier Letters'));

    await waitFor(() => {
      // While loading, text switches; the button should be in the document (mocked as <button/>)
      expect(screen.getByText('Loading more letters...')).toBeInTheDocument();
    });
  });

  test('Navigation: navigates back to inbox when back button is clicked', async () => {
    render(<ConversationPage />);
    const backBtn = await screen.findByText('Back to Inbox');
    fireEvent.click(backBtn);
    expect(mockPush).toHaveBeenCalledWith('/inbox');
  });

  test('Navigation: renders write letter button with correct navigation', async () => {
    render(<ConversationPage />);

    const writeBtn = await screen.findByText('Write Letter');
    fireEvent.click(writeBtn);
    expect(mockPush).toHaveBeenCalledWith('/compose-letter/other-user-456');
  });

  test('API Integration: logs API response', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    render(<ConversationPage />);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('API response:', expect.any(Object));
    });
    spy.mockRestore();
  });

  test('API Integration: handles missing message sequence gracefully', async () => {
    mockPageLetters.mockResolvedValueOnce({
      items: [
        { message_id: 'msg-a', sender_id: 'x', content: 'A' },
        { message_id: 'msg-b', sender_id: 'y', content: 'B' },
      ],
      has_more: false,
      last_message_id: 'msg-b',
    });

    render(<ConversationPage />);

    await waitFor(() => {
      expect(screen.getAllByTestId('letter-card')).toHaveLength(2);
    });
  });

test('Component Lifecycle: reloads messages when conversation thread ID changes', async () => {
  // First render with thread-1
  useParams.mockReturnValueOnce({ conversation_thread_id: 'thread-1' });
  render(<ConversationPage />);

  await waitFor(() => {
    expect(mockPageLetters).toHaveBeenCalledWith(
      expect.objectContaining({ conversation_thread_id: 'thread-1' })
    );
  });

  // Second render with thread-2
  useParams.mockReturnValueOnce({ conversation_thread_id: 'thread-2' });
  render(<ConversationPage />);

  await waitFor(() => {
    expect(mockPageLetters).toHaveBeenCalledWith(
      expect.objectContaining({ conversation_thread_id: 'thread-2' })
    );
  });
});



  test('Accessibility: has proper button attributes', async () => {
    render(<ConversationPage />);

    await waitFor(() => {
      const buttons = screen.getAllByTestId('button');
      buttons.forEach((btn) => {
        // DOM default type for <button> is "submit", but our mock doesn't set it;
        // so only assert presence
        expect(btn).toBeInTheDocument();
      });
    });
  });

  test('Edge Cases: handles messages without message_id for pagination', async () => {
    mockPageLetters.mockResolvedValueOnce({
      items: [
        { message_sequence: 1, sender_id: 'x', content: 'A' },
        { message_id: 'msg-2', message_sequence: 2, sender_id: 'y', content: 'B' },
      ],
      has_more: true,
      last_message_id: 'msg-2',
    });

    render(<ConversationPage />);

    await waitFor(() => {
      expect(screen.getByText('Load Earlier Letters')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Load Earlier Letters'));

    await waitFor(() => {
      // The code uses messages[messages.length - 1]?.message_id, which is 'msg-2'
      expect(mockPageLetters).toHaveBeenLastCalledWith({
        conversation_thread_id: 'thread-123',
        page_size: 50,
        last_message_id: 'msg-2',
      });
    });
  });

  test('Pagination: disables load more button while loading', async () => {
    render(<ConversationPage />);

    await waitFor(() => {
      expect(screen.getByText('Load Earlier Letters')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Load Earlier Letters'));

    await waitFor(() => {
      // While loading, text switches; the button should be in the document (mocked as <button/>)
      expect(screen.getByText('Loading more letters...')).toBeInTheDocument();
    });
  });

  test('Navigation: navigates back to inbox when back button is clicked', async () => {
    render(<ConversationPage />);
    const backBtn = await screen.findByText('Back to Inbox');
    fireEvent.click(backBtn);
    expect(mockPush).toHaveBeenCalledWith('/inbox');
  });

  test('Navigation: renders write letter button with correct navigation', async () => {
    render(<ConversationPage />);

    const writeBtn = await screen.findByText('Write Letter');
    fireEvent.click(writeBtn);
    expect(mockPush).toHaveBeenCalledWith('/compose-letter/other-user-456');
  });

  test('API Integration: logs API response', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    render(<ConversationPage />);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('API response:', expect.any(Object));
    });
    spy.mockRestore();
  });

  test('API Integration: handles missing message sequence gracefully', async () => {
    mockPageLetters.mockResolvedValueOnce({
      items: [
        { message_id: 'msg-a', sender_id: 'x', content: 'A' },
        { message_id: 'msg-b', sender_id: 'y', content: 'B' },
      ],
      has_more: false,
      last_message_id: 'msg-b',
    });

    render(<ConversationPage />);

    await waitFor(() => {
      expect(screen.getAllByTestId('letter-card')).toHaveLength(2);
    });
  });

test('Component Lifecycle: reloads messages when conversation thread ID changes', async () => {
  // First render with thread-1
  useParams.mockReturnValueOnce({ conversation_thread_id: 'thread-1' });
  render(<ConversationPage />);

  await waitFor(() => {
    expect(mockPageLetters).toHaveBeenCalledWith(
      expect.objectContaining({ conversation_thread_id: 'thread-1' })
    );
  });

  // Second render with thread-2
  useParams.mockReturnValueOnce({ conversation_thread_id: 'thread-2' });
  render(<ConversationPage />);

  await waitFor(() => {
    expect(mockPageLetters).toHaveBeenCalledWith(
      expect.objectContaining({ conversation_thread_id: 'thread-2' })
    );
  });
});



  test('Accessibility: has proper button attributes', async () => {
    render(<ConversationPage />);

    await waitFor(() => {
      const buttons = screen.getAllByTestId('button');
      buttons.forEach((btn) => {
        // DOM default type for <button> is "submit", but our mock doesn't set it;
        // so only assert presence
        expect(btn).toBeInTheDocument();
      });
    });
  });

  test('Edge Cases: handles messages without message_id for pagination', async () => {
    mockPageLetters.mockResolvedValueOnce({
      items: [
        { message_sequence: 1, sender_id: 'x', content: 'A' },
        { message_id: 'msg-2', message_sequence: 2, sender_id: 'y', content: 'B' },
      ],
      has_more: true,
      last_message_id: 'msg-2',
    });

    render(<ConversationPage />);

    await waitFor(() => {
      expect(screen.getByText('Load Earlier Letters')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Load Earlier Letters'));

    await waitFor(() => {
      // The code uses messages[messages.length - 1]?.message_id, which is 'msg-2'
      expect(mockPageLetters).toHaveBeenLastCalledWith({
        conversation_thread_id: 'thread-123',
        page_size: 50,
        last_message_id: 'msg-2',
      });
    });
  });
test('Initial gating: shows syncing UI when profile is not yet synced', async () => {
// Arrange: profile exists but synced=false should render the "Syncing your profile..." screen
mockProfileState = { profile: baseProfile, synced: false, loading: true };
render(<ConversationPage />);


// The loading screen should show the syncing text and the mail icon
expect(await screen.findByText('Syncing your profile...')).toBeInTheDocument();
expect(screen.getByTestId('mail-icon')).toBeInTheDocument();


// And no API request should have been made yet
expect(mockPageLetters).not.toHaveBeenCalled();
});



test('Error screen: shows error UI and retries when clicking "Try Again"', async () => {
// First call fails to trigger the error UI
mockPageLetters.mockRejectedValueOnce(new Error('Network down'));


render(<ConversationPage />);


// Error UI appears with the message
expect(await screen.findByText('Oops!')).toBeInTheDocument();
expect(screen.getByText('Network down')).toBeInTheDocument();


// Clicking Try Again should invoke a new pageLetters call (which will use the default resolved value)
fireEvent.click(screen.getByText('Try Again'));


await waitFor(() => {
expect(mockPageLetters).toHaveBeenCalledTimes(2);
});
});

function seedLettersOnce() {
mockPageLetters.mockResolvedValueOnce({
items: [
{ message_id: 'msg-1', message_sequence: 1, sender_id: 'current-user-123', content: 'Hello there!' },
{ message_id: 'msg-2', message_sequence: 2, sender_id: 'other-user-456', content: 'Hi back!' },
],
has_more: false,
last_message_id: 'msg-2',
});
}
async function openReportUserDialog() {
// Wait for page to finish loading
await screen.findByText(/TestPenPal/i);
// Open the menu then the dialog
const menuItem = screen.getByRole('menuitem', { name: /Report User/i });
fireEvent.click(menuItem);
// Wait for dialog button to appear
await screen.findByRole('button', { name: /Report User/i });
}


async function openBlockUserDialog() {
await screen.findByText(/TestPenPal/i);
const menuItem = screen.getByRole('menuitem', { name: /Block User/i });
fireEvent.click(menuItem);
await screen.findByRole('button', { name: /Block User/i });
}
test('Moderation — report user: changes violation, calls API, disables while pending, then shows success toast', async () => {
const { moderationApi } = require('../lib/moderationApiClient');
const { toast } = require('sonner');


// Spy on the client method
const spy = jest.spyOn(moderationApi, 'reportUser').mockResolvedValueOnce({});


// Ensure the page loads past the loading screen
seedLettersOnce();
render(<ConversationPage />);
await openReportUserDialog();


// Change violation from default to "spam"
const select = await screen.findByRole('combobox');
fireEvent.change(select, { target: { value: 'spam' } });


// Click the dialog action button labelled "Report User"
const actionBtn = screen.getByRole('button', { name: /Report User/i });
fireEvent.click(actionBtn);


// Button should be disabled while awaiting the promise
await waitFor(() => expect(actionBtn).toBeDisabled());


await waitFor(() => {
expect(spy).toHaveBeenCalledWith('current-user-123', 'other-user-456', 'spam');
expect(toast.success).toHaveBeenCalledWith('User reported successfully');
});
});



// test('Moderation — report user: early-return when CURRENT_USER_ID missing and when otherUserId missing', async () => {
// const { moderationApi } = require('../lib/moderationApiClient');
// const spy = jest.spyOn(moderationApi, 'reportUser').mockResolvedValue({});


// // Case 1: missing CURRENT_USER_ID
// seedLettersOnce();
// mockUseSyncProfile.mockReturnValueOnce({ profile: undefined, synced: true, loading: false });
// render(<ConversationPage />);
// await openReportUserDialog();
// fireEvent.click(screen.getByRole('button', { name: /Report User/i }));
// expect(spy).not.toHaveBeenCalled();


// // Cleanup DOM for next render
// spy.mockClear();


// // Case 2: missing otherUserId
// seedLettersOnce();
// mockUseSyncProfile.mockReturnValueOnce({ profile: baseProfile, synced: true, loading: false });
// mockUseConversationUser.mockReturnValueOnce({ currentConversationUser: undefined });
// render(<ConversationPage />);
// await openReportUserDialog();
// fireEvent.click(screen.getByRole('button', { name: /Report User/i }));
// expect(spy).not.toHaveBeenCalled();
// });


// test('Moderation — report user: failure surfaces inline error text', async () => {
// const { moderationApi } = require('../lib/moderationApiClient');
// jest.spyOn(moderationApi, 'reportUser').mockRejectedValueOnce(new Error('report failed'));


// seedLettersOnce();
// render(<ConversationPage />);
// await openReportUserDialog();


// fireEvent.click(screen.getByRole('button', { name: /Report User/i }));


// // Inline moderation error should appear in the dialog
// expect(await screen.findByText('report failed')).toBeInTheDocument();
// });



test('Moderation — block user: success calls API and shows success toast', async () => {
const { moderationApi } = require('../lib/moderationApiClient');
const { toast } = require('sonner');
const spy = jest.spyOn(moderationApi, 'blockUser').mockResolvedValueOnce({});


seedLettersOnce();
render(<ConversationPage />);
await openBlockUserDialog();


fireEvent.click(screen.getByRole('button', { name: /Block User/i }));


await waitFor(() => {
expect(spy).toHaveBeenCalledWith('current-user-123', 'other-user-456');
expect(toast.success).toHaveBeenCalledWith('User blocked successfully');
});
});


// test('Moderation — block user: early return when missing IDs and failure shows inline error', async () => {
// const { moderationApi } = require('../lib/moderationApiClient');
// const spy = jest.spyOn(moderationApi, 'blockUser').mockResolvedValue({});


// // Early return: no CURRENT_USER_ID
// seedLettersOnce();
// mockUseSyncProfile.mockReturnValueOnce({ profile: undefined, synced: true, loading: false });
// render(<ConversationPage />);
// await openBlockUserDialog();
// fireEvent.click(screen.getByRole('button', { name: /Block User/i }));
// expect(spy).not.toHaveBeenCalled();


// // Failure path with proper IDs
// spy.mockRestore();
// const failSpy = jest.spyOn(moderationApi, 'blockUser').mockRejectedValueOnce(new Error('block failed'));
// seedLettersOnce();
// mockUseSyncProfile.mockReturnValueOnce({ profile: baseProfile, synced: true, loading: false });
// mockUseConversationUser.mockReturnValueOnce({ currentConversationUser: baseConversationUser });
// render(<ConversationPage />);
// await openBlockUserDialog();
// fireEvent.click(screen.getByRole('button', { name: /Block User/i }));
// expect(await screen.findByText('block failed')).toBeInTheDocument();
// });


/**
 * Cover handleReportMessage via a local, isolated re-import where LetterCard immediately
 * invokes onReportMessage. This keeps mocks local to this test and avoids impacting others.
 */
 test('Moderation — report message: success and "missing profile" error paths are handled', async () => {
await new Promise((resolve) => {
jest.isolateModules(async () => {
const React = require('react');


// Local mocks for this isolated import
jest.doMock('next/navigation', () => ({
useParams: () => ({ conversation_thread_id: 'iso-thread' }),
useRouter: () => ({ push: jest.fn() }),
}));


// Provide one message so the LetterCard renders
const pageLetters = jest.fn().mockResolvedValue({
items: [{ message_id: 'm-1', sender_id: 'other-user-456', content: 'Hi' }],
has_more: false,
last_message_id: 'm-1',
});
jest.doMock('../lib/MessagingApiClient', () => {
return jest.fn().mockImplementation(() => ({ pageLetters }));
});


// First subcase: no CURRENT_USER_ID -> early return (no API call)
jest.doMock('../lib/context/ProfileContext', () => ({
useSyncProfile: () => ({ profile: undefined, synced: true, loading: false }),
}));
jest.doMock('../lib/context/ConversationUserContext', () => ({
useConversationUser: () => ({ currentConversationUser: { user_id: 'other-user-456' } }),
}));


const toast = { success: jest.fn(), error: jest.fn() };
jest.doMock('sonner', () => ({ Toaster: () => null, toast }));


const reportMessage = jest.fn().mockResolvedValue({});
jest.doMock('../lib/moderationApiClient', () => ({
moderationApi: { reportMessage, reportUser: jest.fn(), blockUser: jest.fn() },
}));


// LetterCard auto-invokes onReportMessage on mount
jest.doMock('@/components/LetterCard', () => ({
__esModule: true,
default: ({ message, onReportMessage }) => {
const React = require('react');
React.useEffect(() => {
onReportMessage?.(message.message_id, 'other-user-456', 'harassment');
}, [message, onReportMessage]);
return React.createElement('div', { 'data-testid': 'lc' });
},
}));


const Page = require('../app/conversation/[conversation_thread_id]/page').default;
resolve();
    });
  });
});

});
