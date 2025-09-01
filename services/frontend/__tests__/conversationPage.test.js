import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useParams, useRouter } from 'next/navigation';
import ConversationPage from '../app/conversation/[conversation_thread_id]/page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

// Mock MessagingApiClient
const mockPageLetters = jest.fn();
jest.mock('../lib/MessagingApiClient', () => {
  return jest.fn().mockImplementation(() => ({
    pageLetters: mockPageLetters,
  }));
});

// Mock SyncProfile hook
const mockUseSyncProfile = jest.fn();
jest.mock('../lib/SyncProfile', () => ({
  // Use a function wrapper to avoid a ReferenceError due to hoisting.
  useSyncProfile: () => mockUseSyncProfile(),
}));

// Mock ConversationUserContext hook
const mockUseConversationUser = jest.fn();
jest.mock('../lib/context/ConversationUserContext', () => ({
  useConversationUser: () => mockUseConversationUser(),
}));

// Mock conversation utils
jest.mock('../lib/conversationUtils', () => ({
  getOtherUserId: jest.fn().mockReturnValue('other-user-123'),
}));

// Mock UI components 
jest.mock('../components/ui/card', () => ({
  Card: ({ children, className, ...props }) => (
    <div data-testid="card" className={className} {...props}>
      {children}
    </div>
  ),
}));

jest.mock('../components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className, disabled, ...props }) => (
    <button
      data-testid="button"
      type="button"
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('../components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className, ...props }) => (
    <div data-testid="scroll-area" className={className} {...props}>
      {children}
    </div>
  ),
}));

jest.mock('../components/ui/separator', () => ({
  Separator: ({ className, ...props }) => (
    <div data-testid="separator" className={className} {...props} />
  ),
}));

// Mock LetterCard component
jest.mock('../components/LetterCard', () => {
  return function LetterCard({ message, currentUserId }) {
    return (
      <div data-testid="letter-card" data-message-id={message.message_id}>
        <div>Message: {message.content}</div>
        <div>From: {message.sender_id}</div>
        <div>Current User: {currentUserId}</div>
      </div>
    );
  };
});

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Mail: () => <div data-testid="mail-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Send: () => <div data-testid="send-icon" />,
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
}));

describe('ConversationPage', () => {
  let consoleLogSpy;
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
  };

  // Mock data
  const mockProfile = {
    user_id: 'current-user-123',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockCurrentUser = {
    user_id: 'other-user-123',
    anonymous_handle: 'TestPenPal',
    country_code: 'US',
  };

  const mockMessages = [
    {
      message_id: 'msg-1',
      content: 'Hello there!',
      sender_id: 'current-user-123',
      message_sequence: 1,
      created_at: '2025-01-01T10:00:00Z',
    },
    {
      message_id: 'msg-2', 
      content: 'Hi back!',
      sender_id: 'other-user-123',
      message_sequence: 2,
      created_at: '2025-01-01T11:00:00Z',
    },
  ];

  const mockApiResponse = {
    items: mockMessages,
    has_more: false,
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    useParams.mockReturnValue({
      conversation_thread_id: 'thread-123',
    });
    
    useRouter.mockReturnValue(mockRouter);
    
    mockUseSyncProfile.mockReturnValue({
      profile: mockProfile,
      synced: true,
    });

    mockUseConversationUser.mockReturnValue({
      currentUser: mockCurrentUser,
    });
    
    mockPageLetters.mockResolvedValue(mockApiResponse);

    // Mock console.log to avoid noise in tests
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Loading States', () => {
    it('shows loading spinner while profile is syncing', () => {
      mockUseSyncProfile.mockReturnValue({
        profile: null,
        synced: false,
      });

      render(<ConversationPage />);

      expect(screen.getByText('Syncing your profile...')).toBeInTheDocument();
      expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
    });

    it('shows loading spinner while messages are loading', () => {
      mockUseSyncProfile.mockReturnValue({
        profile: mockProfile,
        synced: true,
      });

      // Delay the API call to keep loading state
      mockPageLetters.mockImplementation(() => new Promise(() => {}));

      render(<ConversationPage />);

      expect(screen.getByText('Loading your letters...')).toBeInTheDocument();
      expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
    });

    it('shows loading state for load more button', async () => {
      const responseWithMore = {
        items: mockMessages,
        has_more: true,
      };
      mockPageLetters.mockResolvedValueOnce(responseWithMore);

      render(<ConversationPage />);

      await waitFor(() => {
        expect(screen.getByText('Load Earlier Letters')).toBeInTheDocument();
      });

      // Mock second API call to be slow
      mockPageLetters.mockImplementation(() => new Promise(() => {}));
      
      const loadMoreButton = screen.getByText('Load Earlier Letters');
      fireEvent.click(loadMoreButton);

      await waitFor(() => {
        expect(screen.getByText('Loading more letters...')).toBeInTheDocument();
        expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error state when API call fails', async () => {
      const errorMessage = 'Failed to load messages';
      mockPageLetters.mockRejectedValue(new Error(errorMessage));

      render(<ConversationPage />);

      await waitFor(() => {
        expect(screen.getByText('Oops!')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('handles non-Error exceptions', async () => {
      mockPageLetters.mockRejectedValue('String error');

      render(<ConversationPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load messages')).toBeInTheDocument();
      });
    });
  });

  describe('Message Display', () => {
    it('renders messages correctly', async () => {
      render(<ConversationPage />);

      await waitFor(() => {
        expect(screen.getByText(/Hello there!/)).toBeInTheDocument();
        expect(screen.getByText(/Hi back!/)).toBeInTheDocument();
      });

      // Check LetterCard components are rendered
      const letterCards = screen.getAllByTestId('letter-card');
      expect(letterCards).toHaveLength(2);
      
      expect(letterCards[0]).toHaveAttribute('data-message-id', 'msg-1');
      expect(letterCards[1]).toHaveAttribute('data-message-id', 'msg-2');
    });

    it('sorts messages by sequence number', async () => {
      const unsortedMessages = [
        { ...mockMessages[1], message_sequence: 3 },
        { ...mockMessages[0], message_sequence: 1 },
      ];
      
      mockPageLetters.mockResolvedValue({
        items: unsortedMessages,
        has_more: false,
      });

      render(<ConversationPage />);

      await waitFor(() => {
        const letterCards = screen.getAllByTestId('letter-card');
        expect(letterCards[0]).toHaveAttribute('data-message-id', 'msg-1');
        expect(letterCards[1]).toHaveAttribute('data-message-id', 'msg-2');
      });
    });

    it('passes correct props to LetterCard', async () => {
      render(<ConversationPage />);

      await waitFor(() => {
        // Use getAllByText because this text appears for each message card.
        const currentUserElements = screen.getAllByText('Current User: current-user-123');
        expect(currentUserElements).toHaveLength(mockMessages.length);
      });
    });

    it('handles empty message list', async () => {
      mockPageLetters.mockResolvedValue({
        items: [],
        has_more: false,
      });

      render(<ConversationPage />);

      await waitFor(() => {
        expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
      });

      const letterCards = screen.queryAllByTestId('letter-card');
      expect(letterCards).toHaveLength(0);
    });
  });

  describe('User Information Display', () => {
    it('displays current user information in header', async () => {
      render(<ConversationPage />);

      await waitFor(() => {
        expect(screen.getByText('Conversation with TestPenPal')).toBeInTheDocument();
        expect(screen.getByText('US')).toBeInTheDocument();
        expect(screen.getByTestId('map-pin-icon')).toBeInTheDocument();
      });
    });

    it('handles missing user information gracefully', async () => {
      mockUseConversationUser.mockReturnValue({
        currentUser: {
          user_id: 'other-user-123',
          anonymous_handle: null,
          country_code: null,
        },
      });

      render(<ConversationPage />);

      await waitFor(() => {
        expect(screen.getByText('Conversation with Unknown User')).toBeInTheDocument();
        expect(screen.queryByTestId('map-pin-icon')).not.toBeInTheDocument();
      });
    });

    it('handles missing currentUser gracefully', async () => {
      mockUseConversationUser.mockReturnValue({
        currentUser: null,
      });

      render(<ConversationPage />);

      await waitFor(() => {
        expect(screen.getByText('Conversation with Unknown User')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('shows load more button when there are more messages', async () => {
      mockPageLetters.mockResolvedValue({
        items: mockMessages,
        has_more: true,
      });

      render(<ConversationPage />);

      await waitFor(() => {
        expect(screen.getByText('Load Earlier Letters')).toBeInTheDocument();
      });
    });

    it('hides load more button when no more messages', async () => {
      mockPageLetters.mockResolvedValue({
        items: mockMessages,
        has_more: false,
      });

      render(<ConversationPage />);

      await waitFor(() => {
        expect(screen.queryByText('Load Earlier Letters')).not.toBeInTheDocument();
      });
    });

    it('loads more messages when button is clicked', async () => {
      // First load
      mockPageLetters.mockResolvedValueOnce({
        items: mockMessages,
        has_more: true,
      });

      const additionalMessages = [
        {
          message_id: 'msg-3',
          content: 'Earlier message',
          sender_id: 'other-user-123',
          message_sequence: 0,
        },
      ];

      // Second load
      mockPageLetters.mockResolvedValueOnce({
        items: additionalMessages,
        has_more: false,
      });

      render(<ConversationPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Load Earlier Letters')).toBeInTheDocument();
      });

      // Click load more
      const loadMoreButton = screen.getByText('Load Earlier Letters');
      fireEvent.click(loadMoreButton);

      // Verify second API call
      await waitFor(() => {
        expect(mockPageLetters).toHaveBeenCalledWith({
          conversation_thread_id: 'thread-123',
          page_size: 50,
          last_message_id: 'msg-2', // Last message ID from first load
        });
      });

      // Should have 3 messages total
      await waitFor(() => {
        const letterCards = screen.getAllByTestId('letter-card');
        expect(letterCards).toHaveLength(3);
      });
    });

    it('disables load more button while loading', async () => {
      mockPageLetters.mockResolvedValueOnce({
        items: mockMessages,
        has_more: true,
      });

      render(<ConversationPage />);

      await waitFor(() => {
        expect(screen.getByText('Load Earlier Letters')).toBeInTheDocument();
      });

      // Make second call slow
      mockPageLetters.mockImplementation(() => new Promise(() => {}));
      
      const loadMoreButton = screen.getByText('Load Earlier Letters');
      fireEvent.click(loadMoreButton);

      await waitFor(() => {
        const button = screen.getByText('Loading more letters...');
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates back to inbox when back button is clicked', async () => {
      render(<ConversationPage />);

      await waitFor(() => {
        expect(screen.getByText('Back to Inbox')).toBeInTheDocument();
      });

      const backButton = screen.getByText('Back to Inbox');
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/inbox');
    });

    it('renders write letter button with correct navigation', async () => {
      render(<ConversationPage />);

      await waitFor(() => {
        expect(screen.getByText('Write Letter')).toBeInTheDocument();
        expect(screen.getByTestId('send-icon')).toBeInTheDocument();
      });

      const writeLetterButton = screen.getByText('Write Letter');
      fireEvent.click(writeLetterButton);

      expect(mockPush).toHaveBeenCalledWith('/compose-letter/other-user-123');
    });
  });

  describe('API Integration', () => {
    it('calls pageLetters with correct parameters', async () => {
      render(<ConversationPage />);

      await waitFor(() => {
        expect(mockPageLetters).toHaveBeenCalledWith({
          conversation_thread_id: 'thread-123',
          page_size: 50,
          last_message_id: undefined,
        });
      });
    });

    it('waits for profile sync before loading messages', () => {
      mockUseSyncProfile.mockReturnValue({
        profile: null,
        synced: false,
      });

      render(<ConversationPage />);

      expect(mockPageLetters).not.toHaveBeenCalled();
    });

    it('logs API response', async () => {
      render(<ConversationPage />);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith('API response:', mockApiResponse);
      });
    });

    it('handles missing message sequence gracefully', async () => {
      const messagesWithoutSequence = [
        { ...mockMessages[0], message_sequence: undefined },
        { ...mockMessages[1], message_sequence: 5 },
      ];

      mockPageLetters.mockResolvedValue({
        items: messagesWithoutSequence,
        has_more: false,
      });

      render(<ConversationPage />);

      await waitFor(() => {
        expect(screen.getAllByTestId('letter-card')).toHaveLength(2);
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('reloads messages when conversation thread ID changes', async () => {
      const { rerender } = render(<ConversationPage />);

      await waitFor(() => {
        expect(mockPageLetters).toHaveBeenCalledTimes(1);
      });

      // Change conversation thread ID
      useParams.mockReturnValue({
        conversation_thread_id: 'thread-456',
      });

      rerender(<ConversationPage />);

      await waitFor(() => {
        expect(mockPageLetters).toHaveBeenCalledTimes(2);
        expect(mockPageLetters).toHaveBeenLastCalledWith({
          conversation_thread_id: 'thread-456',
          page_size: 50,
          last_message_id: undefined,
        });
      });
    });

    it('maintains API client instance across renders', () => {
      const { rerender } = render(<ConversationPage />);
      
      expect(mockPageLetters).toHaveBeenCalledTimes(1);
      
      rerender(<ConversationPage />);
      
      // Should not create new API client or make additional calls
      expect(mockPageLetters).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper button attributes', async () => {
      render(<ConversationPage />);

      await waitFor(() => {
        const buttons = screen.getAllByTestId('button');
        buttons.forEach(button => {
          expect(button).toHaveAttribute('type', 'button');
        });
      });
    });

    it('provides loading indicators with appropriate text', () => {
      mockUseSyncProfile.mockReturnValue({
        profile: null,
        synced: false,
      });

      render(<ConversationPage />);

      expect(screen.getByText('Syncing your profile...')).toBeInTheDocument();
    });

    it('provides error messages that are descriptive', async () => {
      mockPageLetters.mockRejectedValue(new Error('Network timeout'));

      render(<ConversationPage />);

      await waitFor(() => {
        expect(screen.getByText('Network timeout')).toBeInTheDocument();
        expect(screen.getByText('Oops!')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles missing conversation thread ID', () => {
      useParams.mockReturnValue({
        conversation_thread_id: undefined,
      });

      expect(() => {
        render(<ConversationPage />);
      }).not.toThrow();
    });

    it('handles messages without message_id for pagination', async () => {
      const messagesWithoutId = [
        { ...mockMessages[0], message_id: undefined },
        { ...mockMessages[1] },
      ];

      mockPageLetters.mockResolvedValue({
        items: messagesWithoutId,
        has_more: true,
      });

      render(<ConversationPage />);

      await waitFor(() => {
        expect(screen.getByText('Load Earlier Letters')).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByText('Load Earlier Letters');
      fireEvent.click(loadMoreButton);

      // Should handle undefined message_id gracefully
      expect(mockPageLetters).toHaveBeenCalledWith({
        conversation_thread_id: 'thread-123',
        page_size: 50,
        last_message_id: undefined,
      });
    });

    it('handles undefined profile gracefully', () => {
      mockUseSyncProfile.mockReturnValue({
        profile: undefined,
        synced: true,
      });

      expect(() => {
        render(<ConversationPage />);
      }).not.toThrow();
    });

    it('handles undefined currentUser gracefully', () => {
      mockUseConversationUser.mockReturnValue({
        currentUser: undefined,
      });

      expect(() => {
        render(<ConversationPage />);
      }).not.toThrow();
    });
  });
});