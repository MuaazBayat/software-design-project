import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';
import NoConversationPage from '../app/conversation/page';
import { useConversationUser } from '../lib/context/ConversationUserContext'; // Add this import

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock ConversationUser context
jest.mock('../lib/context/ConversationUserContext'); // Add this mock

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }) => (
    <div data-testid="card" className={className} {...props}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className, ...props }) => (
    <button
      data-testid="button"
      type="button"
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
      {...props}
    >
      {children}
    </button> 
  ),
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Mail: () => <div data-testid="mail-icon" />,
  Send: () => <div data-testid="send-icon" />,
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  Heart: () => <div data-testid="heart-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
}));

describe('NoConversationPage - Simple Tests', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
  };

  const mockUseConversationUser = useConversationUser;

  beforeEach(() => {
    useRouter.mockReturnValue(mockRouter);
    
    // Setup conversation user context mock with no current user by default
    mockUseConversationUser.mockReturnValue({
      currentUser: null,
      setCurrentUser: jest.fn(),
      clearCurrentUser: jest.fn()
    });
    
    jest.clearAllMocks();
  });

  // Basic rendering tests
  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      render(<NoConversationPage />);
      expect(screen.getByText('New Pen Pal Connection')).toBeInTheDocument();
    });

    it('displays main heading and welcome message', () => {
      render(<NoConversationPage />);
      
      expect(screen.getByText('Your Letter Adventure Begins! ✨')).toBeInTheDocument();
      expect(screen.getByText(/You've been matched with a wonderful pen pal/)).toBeInTheDocument();
    });

    it('shows all three encouragement cards', () => {
      render(<NoConversationPage />);
      
      expect(screen.getByText('Break the Ice')).toBeInTheDocument();
      expect(screen.getByText('Be Authentic')).toBeInTheDocument();
      expect(screen.getByText('Start Simple')).toBeInTheDocument();
    });

    it('displays the call-to-action section', () => {
      render(<NoConversationPage />);
      
      expect(screen.getByText('Ready to make a new friend? 🌍')).toBeInTheDocument();
      expect(screen.getByText('Write Your First Letter')).toBeInTheDocument();
    });

    it('shows the tips section with letter ideas', () => {
      render(<NoConversationPage />);
      
      expect(screen.getByText('First Letter Ideas')).toBeInTheDocument();
      expect(screen.getByText(/Tell them about your hometown/)).toBeInTheDocument();
    });
  });

  // Navigation tests - focus on successful scenarios
  describe('Navigation', () => {
    it('does not navigate when write letter button is clicked and no current user', () => {
      // Default mock has currentUser: null
      render(<NoConversationPage />);
      
      const writeButton = screen.getByText('Write Your First Letter');
      fireEvent.click(writeButton);
      
      // Should not navigate if no current user
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('navigates to specific user compose page when current user exists', () => {
      // Mock with current user
      mockUseConversationUser.mockReturnValue({
        currentUser: {
          user_id: 'user123',
          anonymous_handle: 'testuser'
        },
        setCurrentUser: jest.fn(),
        clearCurrentUser: jest.fn()
      });

      render(<NoConversationPage />);
      
      const writeButton = screen.getByText('Write Your First Letter');
      fireEvent.click(writeButton);
      
      expect(mockPush).toHaveBeenCalledWith('/compose-letter/user123');
    });

    it('calls router.push with correct path when back button is clicked', () => {
      render(<NoConversationPage />);
      
      const backButton = screen.getByText('Back to Inbox');
      fireEvent.click(backButton);
      
      expect(mockPush).toHaveBeenCalledWith('/inbox');
    });

    it('handles multiple navigation actions with current user', () => {
      // Mock with current user
      mockUseConversationUser.mockReturnValue({
        currentUser: {
          user_id: 'user456',
          anonymous_handle: 'penpal'
        },
        setCurrentUser: jest.fn(),
        clearCurrentUser: jest.fn()
      });

      render(<NoConversationPage />);
      
      const writeButton = screen.getByText('Write Your First Letter');
      const backButton = screen.getByText('Back to Inbox');
      
      fireEvent.click(writeButton);
      fireEvent.click(backButton);
      
      expect(mockPush).toHaveBeenCalledTimes(2);
      expect(mockPush).toHaveBeenNthCalledWith(1, '/compose-letter/user456');
      expect(mockPush).toHaveBeenNthCalledWith(2, '/inbox');
    });
  });

  // UI structure tests
  describe('UI Structure', () => {
    it('renders the correct number of cards', () => {
      render(<NoConversationPage />);
      
      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(4); // 3 encouragement + 1 tips
    });

    it('renders the correct number of buttons', () => {
      render(<NoConversationPage />);
      
      const buttons = screen.getAllByTestId('button');
      expect(buttons).toHaveLength(2); // back + write letter
    });

    it('includes all expected icons', () => {
      render(<NoConversationPage />);
      
      // Just verify key icons are present
      expect(screen.getAllByTestId('mail-icon')).toHaveLength(2);
      expect(screen.getAllByTestId('send-icon')).toHaveLength(2);
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('globe-icon')).toBeInTheDocument();
    });
  });

  // Accessibility tests
  describe('Accessibility', () => {
    it('has proper button attributes', () => {
      render(<NoConversationPage />);
      
      const buttons = screen.getAllByTestId('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('has proper heading structure', () => {
      render(<NoConversationPage />);
      
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('New Pen Pal Connection');
      
      const h2 = screen.getByRole('heading', { level: 2 });
      expect(h2).toHaveTextContent('Your Letter Adventure Begins! ✨');
    });
  });

  // Content validation tests
  describe('Content Validation', () => {
    it('contains all required instructional text', () => {
      render(<NoConversationPage />);
      
      // Key instructional content
      expect(screen.getByText(/12 hours/)).toBeInTheDocument();
      expect(screen.getByText(/authentic postal feel/)).toBeInTheDocument();
      expect(screen.getByText(/pen pal is waiting/)).toBeInTheDocument();
    });

    it('includes all letter writing tips', () => {
      render(<NoConversationPage />);
      
      const tips = [
        'hometown',
        'breakfast',
        'weather',
        'culture',
        'fun fact'
      ];
      
      tips.forEach(tip => {
        expect(screen.getByText(new RegExp(tip, 'i'))).toBeInTheDocument();
      });
    });

    it('displays encouraging and motivational language', () => {
      render(<NoConversationPage />);
      
      expect(screen.getByText(/magical journey/)).toBeInTheDocument();
      expect(screen.getByText(/beautiful friendships/)).toBeInTheDocument();
      expect(screen.getByText(/make a new friend/)).toBeInTheDocument();
    });
  });

  // Component state tests
  describe('Component State', () => {
    it('maintains consistent content across re-renders', () => {
      const { rerender } = render(<NoConversationPage />);
      
      expect(screen.getByText('Write Your First Letter')).toBeInTheDocument();
      
      rerender(<NoConversationPage />);
      
      expect(screen.getByText('Write Your First Letter')).toBeInTheDocument();
      expect(screen.getByText('Your Letter Adventure Begins! ✨')).toBeInTheDocument();
    });
  });

  // Test different currentUser scenarios
  describe('Current User Scenarios', () => {
    it('renders correctly when no current user is set', () => {
      // Default mock has currentUser: null
      render(<NoConversationPage />);
      
      // Should still render all content
      expect(screen.getByText('Write Your First Letter')).toBeInTheDocument();
      expect(screen.getByText('New Pen Pal Connection')).toBeInTheDocument();
    });

    it('renders correctly when current user is set', () => {
      mockUseConversationUser.mockReturnValue({
        currentUser: {
          user_id: 'user789',
          anonymous_handle: 'buddy',
          profile_image_url: 'image.jpg'
        },
        setCurrentUser: jest.fn(),
        clearCurrentUser: jest.fn()
      });

      render(<NoConversationPage />);
      
      // Should render the same content regardless of current user
      expect(screen.getByText('Write Your First Letter')).toBeInTheDocument();
      expect(screen.getByText('New Pen Pal Connection')).toBeInTheDocument();
    });
  });
});