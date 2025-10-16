import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConversationCard from '../components/ConversationCard';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={typeof src === 'string' ? src : '/img.jpg'} alt={alt} {...props} />;
  };
});

// FIXED: Mock uses the correct hook name - useSyncProfile instead of useProfile
jest.mock('../lib/context/ProfileContext', () => ({
  useSyncProfile: () => ({
    profile: { user_id: 'test-current-user' },
  }),
  ProfileProvider: ({ children }) => children,
}));

describe('ConversationCard', () => {
  const mockFormatMessagePreview = jest.fn((content, maxLength = 100) => 
    content && content.length > maxLength ? content.substring(0, maxLength) + '...' : content
  );
  const mockFormatTimeAgo = jest.fn((dateString) => '2 hours ago');
  const mockGetDeliveryStatusBadge = jest.fn((status, fromMe, scheduledISO, inTransitOrIsRead) => (
    <span data-testid="delivery-badge">{status}</span>
  ));
  const mockOnClick = jest.fn();

  const baseMockConversation = {
    user_profile: {
      anonymous_handle: 'TestUser123',
      country_code: 'US',
      age_range: '25-30',
      interests: ['Photography', 'Travel', 'Cooking', 'Reading']
    }
  };

  const mockConversationWithMessage = { 
    ...baseMockConversation,
    latest_message: {
      message_content: 'Hello! How are you doing today?',
      scheduled_delivery_at: '2023-10-01T12:00:00Z',
      delivery_status: 'delivered',
      from_me: false,
      is_read: true,
      sender_id: 'other-user-id' // Added sender_id for more accurate testing
    }
  };

  const mockConversationUnread = {
    ...baseMockConversation,
    latest_message: {
      message_content: 'This is an unread message that should be highlighted',
      scheduled_delivery_at: '2023-10-01T14:00:00Z',
      delivery_status: 'delivered',
      from_me: false,
      is_read: false,
      sender_id: 'other-user-id'
    }
  };

  const mockConversationFromMe = {
    ...baseMockConversation,
    latest_message: {
      message_content: 'This is a message I sent',
      scheduled_delivery_at: '2023-10-01T10:00:00Z',
      delivery_status: 'delivered',
      from_me: true,
      is_read: true,
      sender_id: 'test-current-user' // This should match the mock profile user_id
    }
  };

  const mockConversationNoMessage = {
    ...baseMockConversation,
    latest_message: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders conversation card with user profile information', () => {
      render(
        <ConversationCard
          conversation={mockConversationWithMessage}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(screen.getByText('TestUser123')).toBeInTheDocument();
      // Check for location and age information using regex to handle screen reader elements
      expect(screen.getByText(/US.*25-30/)).toBeInTheDocument();
    });

    test('renders interests with truncation when more than 2', () => {
      render(
        <ConversationCard
          conversation={mockConversationWithMessage}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(screen.getByText('Photography')).toBeInTheDocument();
      expect(screen.getByText('Travel')).toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    test('renders all interests when 2 or fewer', () => {
      const conversationWithFewInterests = {
        ...mockConversationWithMessage,
        user_profile: {
          ...mockConversationWithMessage.user_profile,
          interests: ['Photography', 'Travel']
        }
      };

      render(
        <ConversationCard
          conversation={conversationWithFewInterests}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(screen.getByText('Photography')).toBeInTheDocument();
      expect(screen.getByText('Travel')).toBeInTheDocument();
      expect(screen.queryByText('+')).not.toBeInTheDocument();
    });

    test('handles missing interests gracefully', () => {
      const conversationNoInterests = {
        ...mockConversationWithMessage,
        user_profile: {
          ...mockConversationWithMessage.user_profile,
          interests: []
        }
      };

      render(
        <ConversationCard
          conversation={conversationNoInterests}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(screen.getByText('TestUser123')).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    test('displays message content when latest_message exists', () => {
      mockFormatMessagePreview.mockReturnValue('Hello! How are you doing today?');
      
      render(
        <ConversationCard
          conversation={mockConversationWithMessage}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(mockFormatMessagePreview).toHaveBeenCalledWith('Hello! How are you doing today?', 80);
      expect(screen.getByText(/Hello! How are you doing today?/)).toBeInTheDocument();
    });

    test('displays "You haven\'t written to each other..." when latest_message is null', () => {
      render(
        <ConversationCard
          conversation={mockConversationNoMessage}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(screen.getByText("You haven't written to each other...")).toBeInTheDocument();
    });

    test('shows "(You wrote)" prefix for messages from user', () => {
      mockFormatMessagePreview.mockReturnValue('This is a message I sent');
      
      render(
        <ConversationCard
          conversation={mockConversationFromMe}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(screen.getByText('(You wrote)')).toBeInTheDocument();
    });

    test('does not show "(You wrote)" prefix for messages not from user', () => {
      mockFormatMessagePreview.mockReturnValue('Hello! How are you doing today?');
      
      render(
        <ConversationCard
          conversation={mockConversationWithMessage}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(screen.queryByText('(You wrote)')).not.toBeInTheDocument();
    });
  });

  describe('Status and Labels', () => {
    test('shows correct FROM/TO label based on message direction', () => {
      const { rerender } = render(
        <ConversationCard
          conversation={mockConversationWithMessage}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(screen.getByText('From:')).toBeInTheDocument();

      rerender(
        <ConversationCard
          conversation={mockConversationFromMe}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(screen.getByText('To:')).toBeInTheDocument();
    });

    test('displays correct status when no messages exist', () => {
      render(
        <ConversationCard
          conversation={mockConversationNoMessage}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(screen.getByText("You haven't written to each other...")).toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    test('shows wax seal for unread messages', () => {
      render(
        <ConversationCard
          conversation={mockConversationUnread}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(screen.getByAltText('Wax Seal')).toBeInTheDocument();
    });

    test('does not show wax seal for read messages', () => {
      render(
        <ConversationCard
          conversation={mockConversationWithMessage}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(screen.queryByAltText('Wax Seal')).not.toBeInTheDocument();
    });

    test('renders stamp images correctly', () => {
      const { rerender } = render(
        <ConversationCard
          conversation={mockConversationUnread}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(screen.getByAltText('Unread')).toBeInTheDocument();

      rerender(
        <ConversationCard
          conversation={mockConversationWithMessage}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(screen.getByAltText('Read')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    test('calls onClick when card is clicked', () => {
      render(
        <ConversationCard
          conversation={mockConversationWithMessage}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
          onClick={mockOnClick}
        />
      );

      // More reliable way to find the clickable element
      const card = screen.getByText('TestUser123').closest('.cursor-pointer');
      fireEvent.click(card);

      expect(mockOnClick).toHaveBeenCalledWith(mockConversationWithMessage);
    });

    test('does not call onClick when no onClick prop provided', () => {
      render(
        <ConversationCard
          conversation={mockConversationWithMessage}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      const card = screen.getByText('TestUser123').closest('.cursor-pointer');
      fireEvent.click(card);
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Function Calls', () => {
    test('calls getDeliveryStatusBadge with correct parameters', () => {
      render(
        <ConversationCard
          conversation={mockConversationWithMessage}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(mockGetDeliveryStatusBadge).toHaveBeenCalledWith(
        'delivered', 
        false, 
        '2023-10-01T12:00:00Z', 
        true
      );
      expect(screen.getByTestId('delivery-badge')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles very long message content', () => {
      const longMessage = 'A'.repeat(200);
      const conversationLongMessage = {
        ...mockConversationWithMessage,
        latest_message: {
          ...mockConversationWithMessage.latest_message,
          message_content: longMessage
        }
      };

      render(
        <ConversationCard
          conversation={conversationLongMessage}
          formatMessagePreview={mockFormatMessagePreview}
          formatTimeAgo={mockFormatTimeAgo}
          getDeliveryStatusBadge={mockGetDeliveryStatusBadge}
        />
      );

      expect(mockFormatMessagePreview).toHaveBeenCalledWith(longMessage, 80);
    });
  });
});