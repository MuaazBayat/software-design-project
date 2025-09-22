import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import LetterInbox from '../app/inbox/page'; // Adjust path as needed
import { useSyncProfile } from '../lib/context/ProfileContext'; // Fixed import path
import MessagingApiClient from '../lib/MessagingApiClient'; // Adjust path as needed
import { useConversationUser } from '../lib/context/ConversationUserContext';

// Mock external dependencies
jest.mock('next/navigation');
jest.mock('../lib/context/ProfileContext'); // Fixed mock path
jest.mock('../lib/MessagingApiClient');
jest.mock('../lib/context/ConversationUserContext');
jest.mock('@/components/ConversationCard');
 
// Mock components
jest.mock('@/components/ConversationCard', () => {
  return function MockConversationCard({ conversation, onClick, formatMessagePreview, formatTimeAgo, getDeliveryStatusBadge }) {
    return (
      <div 
        data-testid={`conversation-card-${conversation.user_profile.user_id}`}
        onClick={onClick} // The card needs to receive and use this prop
        role="button"
      >
        <div data-testid="username">{conversation.user_profile.anonymous_handle}</div>
        <div data-testid="message-preview">
          {formatMessagePreview(conversation.latest_message?.content || '')}
        </div>
        <div data-testid="time-ago">
          {formatTimeAgo(conversation.latest_message?.created_at || '')}
        </div>
        <div data-testid="delivery-status">
          {getDeliveryStatusBadge(
            conversation.latest_message?.delivery_status || '',
            conversation.latest_message?.from_me || false
          )}
        </div>
      </div>
    );
  };
});

jest.mock('@/components/footer', () => {
  return function MockFooter() {
    return <div data-testid="footer">Footer</div>;
  };
});

// Mock data
const mockProfile = {
  user_id: 'user123',
  clerk_id: 'clerk123',
  anonymous_handle: 'testuser',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockConversations = [
  {
    user_profile: {
      user_id: 'conv1',
      anonymous_handle: 'alice',
      profile_image_url: 'image1.jpg'
    },
    latest_message: {
      conversation_thread_id: 'thread1',
      content: 'Hello there, how are you doing today?',
      created_at: '2024-01-01T10:00:00Z',
      is_read: false,
      delivery_status: 'delivered',
      from_me: false
    }
  },
  {
    user_profile: {
      user_id: 'conv2',
      anonymous_handle: 'bob',
      profile_image_url: 'image2.jpg'
    },
    latest_message: {
      conversation_thread_id: 'thread2',
      content: 'Thanks for the letter!',
      created_at: '2024-01-01T08:00:00Z',
      is_read: true,
      delivery_status: 'delivered',
      from_me: true
    }
  },
  {
    user_profile: {
      user_id: 'conv3',
      anonymous_handle: 'charlie',
      profile_image_url: 'image3.jpg'
    },
    latest_message: {
      conversation_thread_id: 'thread3',
      content: 'Looking forward to your reply',
      created_at: '2024-01-01T06:00:00Z',
      is_read: false,
      delivery_status: 'scheduled',
      from_me: false
    }
  }
];

// Mock implementations
const mockPush = jest.fn();
const mockUseSyncProfile = useSyncProfile;
const mockUseRouter = useRouter;
const mockUseConversationUser = useConversationUser;
const mockMessagingApiClient = MessagingApiClient;

describe('LetterInbox', () => {
  let mockSearchUsers;
  let mockSetCurrentConversationUser;
  let mockClearCurrentConversationUser;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup router mock
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn()
    });

    // Setup conversation user context mock with correct function names
    mockSetCurrentConversationUser = jest.fn();
    mockClearCurrentConversationUser = jest.fn();
    mockUseConversationUser.mockReturnValue({
      setCurrentConversationUser: mockSetCurrentConversationUser,
      clearCurrentConversationUser: mockClearCurrentConversationUser,
      currentUser: null,
      isLoading: false,
      setIsLoading: jest.fn()
    });

    // Setup API client mock
    mockSearchUsers = jest.fn();
    mockMessagingApiClient.mockImplementation(() => ({
      searchUsers: mockSearchUsers
    }));

    // Mock system date for consistent time calculations
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Loading and Profile Sync', () => {
    it('shows loading state when profile is not synced', () => {
      mockUseSyncProfile.mockReturnValue({
        profile: null,
        synced: false,
        loading: false,
        error: null,
        setProfile: jest.fn(),
        syncProfile: jest.fn(),
        clearProfile: jest.fn()
      });

      render(<LetterInbox />);

      expect(screen.getByText('Loading your letters...')).toBeInTheDocument();
    });

    it('does not fetch conversations when profile is not synced', () => {
      mockUseSyncProfile.mockReturnValue({
        profile: null,
        synced: false,
        loading: false,
        error: null,
        setProfile: jest.fn(),
        syncProfile: jest.fn(),
        clearProfile: jest.fn()
      });

      render(<LetterInbox />);

      expect(mockSearchUsers).not.toHaveBeenCalled();
    });

    it('fetches conversations when profile is synced', async () => {
      mockUseSyncProfile.mockReturnValue({
        profile: mockProfile,
        synced: true,
        loading: false,
        error: null,
        setProfile: jest.fn(),
        syncProfile: jest.fn(),
        clearProfile: jest.fn()
      });

      mockSearchUsers.mockResolvedValue({
        items: mockConversations
      });

      render(<LetterInbox />);

      await waitFor(() => {
        expect(mockSearchUsers).toHaveBeenCalledWith({
          anonymous_handle: "",
          my_user_id: mockProfile.user_id,
          limit: 50,
          offset: 0
        });
      });
    });
  });

  describe('Conversation Display', () => {
    beforeEach(() => {
      mockUseSyncProfile.mockReturnValue({
        profile: mockProfile,
        synced: true,
        loading: false,
        error: null,
        setProfile: jest.fn(),
        syncProfile: jest.fn(),
        clearProfile: jest.fn()
      });

      mockSearchUsers.mockResolvedValue({
        items: mockConversations
      });
    });

    it('displays conversations after loading', async () => {
      render(<LetterInbox />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument();
        expect(screen.getByTestId('conversation-card-conv2')).toBeInTheDocument();
        expect(screen.getByTestId('conversation-card-conv3')).toBeInTheDocument();
      });
    });

    it('shows empty state when no conversations exist', async () => {
      mockSearchUsers.mockResolvedValue({
        items: []
      });

      render(<LetterInbox />);

      await waitFor(() => {
        expect(screen.getByText('No letters found')).toBeInTheDocument();
        expect(screen.getByText('Start a conversation with a pen pal!')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      mockUseSyncProfile.mockReturnValue({
        profile: mockProfile,
        synced: true,
        loading: false,
        error: null,
        setProfile: jest.fn(),
        syncProfile: jest.fn(),
        clearProfile: jest.fn()
      });

      mockSearchUsers.mockResolvedValue({
        items: mockConversations
      });
    });

    it('filters conversations by username', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<LetterInbox />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by username...');
      await user.type(searchInput, 'alice');

      await waitFor(() => {
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument();
        expect(screen.queryByTestId('conversation-card-conv2')).not.toBeInTheDocument();
        expect(screen.queryByTestId('conversation-card-conv3')).not.toBeInTheDocument();
      });
    });

    it('shows empty state when search returns no results', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<LetterInbox />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by username...');
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No letters found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
      });
    });

    it('search is case insensitive', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<LetterInbox />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by username...');
      await user.type(searchInput, 'ALICE');

      await waitFor(() => {
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument();
        expect(screen.queryByTestId('conversation-card-conv2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filter Functionality', () => {
    beforeEach(() => {
      mockUseSyncProfile.mockReturnValue({
        profile: mockProfile,
        synced: true,
        loading: false,
        error: null,
        setProfile: jest.fn(),
        syncProfile: jest.fn(),
        clearProfile: jest.fn()
      });

      mockSearchUsers.mockResolvedValue({
        items: mockConversations
      });
    });

    it('filters to show only unread messages', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<LetterInbox />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument();
      });

      const unreadButton = screen.getByRole('button', { name: /unread/i });
      await user.click(unreadButton);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument(); // unread
        expect(screen.queryByTestId('conversation-card-conv2')).not.toBeInTheDocument(); // read
        expect(screen.getByTestId('conversation-card-conv3')).toBeInTheDocument(); // unread
      });
    });

    it('filters to show only read messages', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<LetterInbox />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument();
      });

      const readButton = screen.getByRole('button', { name: /^read$/i });
      await user.click(readButton);

      await waitFor(() => {
        expect(screen.queryByTestId('conversation-card-conv1')).not.toBeInTheDocument(); // unread
        expect(screen.getByTestId('conversation-card-conv2')).toBeInTheDocument(); // read
        expect(screen.queryByTestId('conversation-card-conv3')).not.toBeInTheDocument(); // unread
      });
    });

    it('shows all messages when "All Letters" filter is selected', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<LetterInbox />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument();
      });

      // First filter to unread
      const unreadButton = screen.getByRole('button', { name: /unread/i });
      await user.click(unreadButton);

      await waitFor(() => {
        expect(screen.queryByTestId('conversation-card-conv2')).not.toBeInTheDocument();
      });

      // Then back to all
      const allButton = screen.getByRole('button', { name: /all letters/i });
      await user.click(allButton);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument();
        expect(screen.getByTestId('conversation-card-conv2')).toBeInTheDocument();
        expect(screen.getByTestId('conversation-card-conv3')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      mockUseSyncProfile.mockReturnValue({
        profile: mockProfile,
        synced: true,
        loading: false,
        error: null,
        setProfile: jest.fn(),
        syncProfile: jest.fn(),
        clearProfile: jest.fn()
      });

      mockSearchUsers.mockResolvedValue({
        items: mockConversations
      });
    });

    it('navigates to conversation when clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<LetterInbox />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument();
      });

      const conversationCard = screen.getByTestId('conversation-card-conv1');
      await user.click(conversationCard);

      expect(mockPush).toHaveBeenCalledWith('/conversation/thread1');
      expect(mockClearCurrentConversationUser).toHaveBeenCalled();
      expect(mockSetCurrentConversationUser).toHaveBeenCalledWith(mockConversations[0].user_profile);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseSyncProfile.mockReturnValue({
        profile: mockProfile,
        synced: true,
        loading: false,
        error: null,
        setProfile: jest.fn(),
        syncProfile: jest.fn(),
        clearProfile: jest.fn()
      });
    });

    it('displays error state when API call fails', async () => {
      mockSearchUsers.mockRejectedValue(new Error('API Error'));

      render(<LetterInbox />);

      await waitFor(() => {
        expect(screen.getByText('Oops!')).toBeInTheDocument();
        expect(screen.getByText('Failed to load conversations')).toBeInTheDocument();
      });
    });
  });

  describe('Helper Functions Integration', () => {
    beforeEach(() => {
      mockUseSyncProfile.mockReturnValue({
        profile: mockProfile,
        synced: true,
        loading: false,
        error: null,
        setProfile: jest.fn(),
        syncProfile: jest.fn(),
        clearProfile: jest.fn()
      });

      mockSearchUsers.mockResolvedValue({
        items: mockConversations
      });

      render(<LetterInbox />);
    });

    it('formats message preview correctly', async () => {
      await waitFor(() => {
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument();
      });

      // Test long message truncation
      const messagePreview = screen.getAllByTestId('message-preview')[0];
      expect(messagePreview).toHaveTextContent('Hello there, how are you doing today?');
    });

    it('formats time ago correctly', async () => {
      await waitFor(() => {
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument();
      });

      // The mock dates should show hours ago
      const timeElements = screen.getAllByTestId('time-ago');
      expect(timeElements[0]).toHaveTextContent('2h ago'); // 10:00 vs 12:00
      expect(timeElements[1]).toHaveTextContent('4h ago'); // 08:00 vs 12:00
      expect(timeElements[2]).toHaveTextContent('6h ago'); // 06:00 vs 12:00
    });

    it('shows correct delivery status badges', async () => {
      await waitFor(() => {
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument();
      });

      const deliveryStatuses = screen.getAllByTestId('delivery-status');
      
      // First conversation: delivered
      expect(deliveryStatuses[0]).toHaveTextContent('✅ Delivered');
      
      // Third conversation: scheduled
      expect(deliveryStatuses[2]).toHaveTextContent('📤 Incoming...');
    });
  });

  describe('Combined Filters', () => {
    beforeEach(() => {
      mockUseSyncProfile.mockReturnValue({
        profile: mockProfile,
        synced: true,
        loading: false,
        error: null,
        setProfile: jest.fn(),
        syncProfile: jest.fn(),
        clearProfile: jest.fn()
      });

      mockSearchUsers.mockResolvedValue({
        items: mockConversations
      });
    });

    it('applies both search and filter simultaneously', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<LetterInbox />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument();
      });

      // Apply search filter
      const searchInput = screen.getByPlaceholderText('Search by username...');
      await user.type(searchInput, 'a'); // 'alice' and 'charlie'

      // Apply read status filter
      const unreadButton = screen.getByRole('button', { name: /unread/i });
      await user.click(unreadButton);

      await waitFor(() => {
        // Alice's and Charlie's conversations are unread and contain 'a'
        expect(screen.getByTestId('conversation-card-conv1')).toBeInTheDocument();
        expect(screen.queryByTestId('conversation-card-conv2')).not.toBeInTheDocument();
        expect(screen.getByTestId('conversation-card-conv3')).toBeInTheDocument();
      });
    });
  });
});