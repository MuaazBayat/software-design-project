// __tests__/profile-page.test.js
// @jest-environment jsdom
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the profile page component
const ProfilePage = require('../app/profile/page').default;

// ---------- Context mocks ----------
let mockConversationUserState = { currentConversationUser: null };
let mockProfileState = { profile: null };
let mockAuthState = { getToken: jest.fn() };

jest.mock('../lib/context/ConversationUserContext', () => ({
  useConversationUser: () => mockConversationUserState,
}));

jest.mock('../lib/context/ProfileContext', () => ({
  useSyncProfile: () => mockProfileState,
}));

jest.mock('@clerk/nextjs', () => ({
  useAuth: () => mockAuthState,
}));

// ---------- Router mock ----------
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// ---------- API Client mocks ----------
const mockProfilesApiClient = {
  getProfileByUserId: jest.fn(),
};

const mockMessagingApiClient = {
  searchUsers: jest.fn(),
};

jest.mock('../lib/profilesApiClient', () => ({
  ProfilesApiClient: jest.fn(() => mockProfilesApiClient),
}));

jest.mock('../lib/MessagingApiClient', () => {
  return jest.fn(() => mockMessagingApiClient);
});

// ---------- UI Component mocks ----------
jest.mock('../components/ui/card', () => ({
  Card: ({ children, className, ...props }) => (
    <div data-testid="card" className={className} {...props}>{children}</div>
  ),
  CardContent: ({ children, className, ...props }) => (
    <div data-testid="card-content" className={className} {...props}>{children}</div>
  ),
}));

jest.mock('../components/ui/avatar', () => ({
  Avatar: ({ children, className, ...props }) => (
    <div data-testid="avatar" className={className} {...props}>{children}</div>
  ),
  AvatarFallback: ({ children, className, ...props }) => (
    <div data-testid="avatar-fallback" className={className} {...props}>{children}</div>
  ),
}));

jest.mock('../components/ui/badge', () => ({
  Badge: ({ children, className, ...props }) => (
    <span data-testid="badge" className={className} {...props}>{children}</span>
  ),
}));

jest.mock('../components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }) => (
    <button data-testid="button" onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('../components/ui/separator', () => ({
  Separator: ({ className, ...props }) => (
    <div data-testid="separator" className={className} {...props} />
  ),
}));

// ---------- Icon mocks ----------
jest.mock('lucide-react', () => {
  const React = require('react');
  const Icon = ({ 'data-testid': testId, ...props }) => (
    <svg data-testid={testId || 'icon'} {...props} />
  );
  return {
    ArrowLeft: (props) => <Icon data-testid="arrow-left-icon" {...props} />,
    MapPin: (props) => <Icon data-testid="map-pin-icon" {...props} />,
    Clock: (props) => <Icon data-testid="clock-icon" {...props} />,
    MessageCircle: (props) => <Icon data-testid="message-circle-icon" {...props} />,
    Heart: (props) => <Icon data-testid="heart-icon" {...props} />,
    Globe: (props) => <Icon data-testid="globe-icon" {...props} />,
  };
});

// ---------- Test Data ----------
const mockCurrentUser = {
  user_id: 'user-123',
  anonymous_handle: 'TestUser',
  country_code: 'US',
  bio: 'Test bio content',
  age_range: '25-30',
  interests: ['reading', 'coding', 'travel'],
  primary_language: 'en',
  secondary_languages: ['es', 'fr'],
  last_active: '2025-10-15T10:00:00Z',
  favorite_local_fact: 'Test local fact'
};

const mockProfile = {
  user_id: 'profile-456',
  anonymous_handle: 'ProfileUser',
  country_code: 'CA',
  bio: 'Profile bio content',
  age_range: '30-35',
  interests: ['music', 'art'],
  primary_language: 'fr',
  secondary_languages: ['en'],
  last_active: '2025-10-14T15:30:00Z',
  favorite_local_fact: 'Canada fact'
};

const mockMyProfile = {
  user_id: 'my-profile-789',
  anonymous_handle: 'MyHandle'
};

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks
    mockPush.mockClear();
    mockBack.mockClear();
    mockProfilesApiClient.getProfileByUserId.mockClear();
    mockMessagingApiClient.searchUsers.mockClear();
    mockAuthState.getToken.mockResolvedValue('mock-token');
    
    // Reset state
    mockConversationUserState = { currentConversationUser: mockCurrentUser };
    mockProfileState = { profile: mockMyProfile };
    
    // Mock successful API responses
    mockProfilesApiClient.getProfileByUserId.mockResolvedValue(mockProfile);
    mockMessagingApiClient.searchUsers.mockResolvedValue({
      items: [{
        user_profile: { user_id: 'user-123' },
        latest_message: { conversation_thread_id: 'thread-123' }
      }]
    });
  });

  describe('Initial Loading and Navigation', () => {
    test('redirects to inbox when no currentConversationUser', async () => {
      mockConversationUserState.currentConversationUser = null;
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/inbox');
      });
    });

    test('displays loading state initially', () => {
      render(<ProfilePage />);
      
      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('sets page title with user handle', async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(document.title).toBe("TestUser's Profile - GlobeTalk");
      });
    });
  });

  describe('Profile Data Fetching', () => {
    test('fetches profile data on mount', async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(mockProfilesApiClient.getProfileByUserId).toHaveBeenCalledWith('user-123');
      });
    });

    test('fetches conversation thread ID', async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(mockMessagingApiClient.searchUsers).toHaveBeenCalledWith({
          my_user_id: 'my-profile-789',
          anonymous_handle: '',
          limit: 100
        });
      });
    });

    test('handles profile fetch error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockProfilesApiClient.getProfileByUserId.mockRejectedValue(new Error('API Error'));
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching profile:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Profile Display', () => {
    test('displays profile not found when no profile data', async () => {
      mockProfilesApiClient.getProfileByUserId.mockResolvedValue(null);
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByText('Profile not found')).toBeInTheDocument();
        expect(screen.getByText('The requested user profile could not be found.')).toBeInTheDocument();
      });
    });

    test('displays interests as badges', async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByText('music')).toBeInTheDocument();
        expect(screen.getByText('art')).toBeInTheDocument();
      });
    });

    test('displays languages correctly', async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByText('FR')).toBeInTheDocument(); // Primary language
        expect(screen.getByText('EN')).toBeInTheDocument(); // Secondary language
      });
    });

    test('handles missing optional fields gracefully', async () => {
      const profileWithMissingFields = {
        ...mockProfile,
        bio: undefined,
        interests: undefined,
        secondary_languages: undefined,
        favorite_local_fact: undefined
      };
      
      mockProfilesApiClient.getProfileByUserId.mockResolvedValue(profileWithMissingFields);
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByText('ProfileUser')).toBeInTheDocument();
        // Should not crash or display undefined values
      });
    });
  });

  describe('Utility Functions', () => {
    test('formats last active time correctly', async () => {
      // Test with recent activity (less than 1 hour)
      const recentProfile = {
        ...mockProfile,
        last_active: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
      };
      
      mockProfilesApiClient.getProfileByUserId.mockResolvedValue(recentProfile);
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByText('Active now')).toBeInTheDocument();
      });
    });

    test('displays country flag correctly', async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        // Should display Canada flag emoji
        expect(screen.getByText('🇨🇦')).toBeInTheDocument();
      });
    });

    test('generates correct initials', async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByText('PR')).toBeInTheDocument(); // First 2 chars of "ProfileUser"
      });
    });
  });

  describe('Navigation Actions', () => {
    test('back button navigates to previous page', async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        const backButton = screen.getByLabelText('Go back to previous page');
        fireEvent.click(backButton);
        expect(mockBack).toHaveBeenCalled();
      });
    });

    test('continue conversation button navigates with thread ID', async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        const continueButton = screen.getByText('Continue Conversation');
        fireEvent.click(continueButton);
        expect(mockPush).toHaveBeenCalledWith('/conversation/thread-123');
      });
    });

    test('continue conversation button navigates without thread ID when not found', async () => {
      mockMessagingApiClient.searchUsers.mockResolvedValue({ items: [] });
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        const continueButton = screen.getByText('Continue Conversation');
        fireEvent.click(continueButton);
        expect(mockPush).toHaveBeenCalledWith('/conversation');
      });
    });

    test('back to inbox button navigates to inbox', async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        const inboxButton = screen.getByText('Back to Inbox');
        fireEvent.click(inboxButton);
        expect(mockPush).toHaveBeenCalledWith('/inbox');
      });
    });

    test('go back to inbox button in not found state', async () => {
      mockProfilesApiClient.getProfileByUserId.mockResolvedValue(null);
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        const goBackButton = screen.getByText('Go back to inbox');
        fireEvent.click(goBackButton);
        expect(mockPush).toHaveBeenCalledWith('/inbox');
      });
    });
  });

  describe('Accessibility Features', () => {
    test('includes skip navigation link', async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByText('Skip to profile content')).toBeInTheDocument();
      });
    });

    test('has proper ARIA labels and roles', async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument(); // header
        expect(screen.getByRole('main')).toBeInTheDocument(); // main content
        expect(screen.getByRole('navigation')).toBeInTheDocument(); // action buttons
      });
    });

    test('includes screen reader only descriptions', async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByText(/Navigate back to your conversation with/)).toBeInTheDocument();
        expect(screen.getByText(/Return to your main inbox to view all conversations/)).toBeInTheDocument();
      });
    });

    test('loading state has proper accessibility attributes', () => {
      render(<ProfilePage />);
      
      const loadingStatus = screen.getByRole('status');
      expect(loadingStatus).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByText(/Please wait while we load the user's profile information/)).toBeInTheDocument();
    });

    test('error state has proper alert role', async () => {
      mockProfilesApiClient.getProfileByUserId.mockResolvedValue(null);
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design and Styling', () => {
    test('applies correct CSS classes for layout', async () => {
      const { container } = render(<ProfilePage />);
      
      await waitFor(() => {
        const mainContainer = container.querySelector('.min-h-screen');
        expect(mainContainer).toHaveClass('bg-gradient-to-br', 'from-amber-50', 'via-rose-50', 'to-purple-50');
      });
    });

    test('cards have proper styling classes', async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        const cards = screen.getAllByTestId('card');
        cards.forEach(card => {
          expect(card).toHaveClass('bg-white/80', 'backdrop-blur-sm', 'border-amber-200', 'shadow-lg');
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('handles conversation thread fetch error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockMessagingApiClient.searchUsers.mockRejectedValue(new Error('Thread fetch error'));
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching conversation thread ID:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });

    test('handles missing myProfile gracefully', async () => {
      mockProfileState.profile = null;
      
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(mockMessagingApiClient.searchUsers).not.toHaveBeenCalled();
      });
    });
  });
});