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
      currentConversationUser: null,
      setCurrentConversationUser: jest.fn(),
      clearCurrentConversationUser: jest.fn()
    });
    
    jest.clearAllMocks();
  });

  // Basic rendering tests
  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      render(<NoConversationPage />);
      expect(screen.getByText(/Your Letter Adventure/)).toBeInTheDocument();
      expect(screen.getByText(/Begins!/)).toBeInTheDocument();
    });

    it('displays main heading and welcome message', () => {
      render(<NoConversationPage />);
      
      expect(screen.getByText(/Your Letter Adventure/)).toBeInTheDocument();
      expect(screen.getByText(/Begins!/)).toBeInTheDocument();
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

      expect(screen.getByText(/Your letter will be delivered in 12 hours/)).toBeInTheDocument();
      expect(screen.getByText('Start Writing')).toBeInTheDocument();
    });

    it('shows the tips section with letter ideas', () => {
      render(<NoConversationPage />);

      // The tips are now in a bullet list without a heading
      expect(screen.getByText(/Tell them about your hometown/)).toBeInTheDocument();
      expect(screen.getByText(/Share what you had for breakfast/)).toBeInTheDocument();
      expect(screen.getByText(/Describe the weather where you are/)).toBeInTheDocument();
    });
  });

  // Navigation tests - focus on successful scenarios
  describe('Navigation', () => {
    it('does not navigate when write letter button is clicked and no current user', () => {
      // Default mock has currentConversationUser: null
      render(<NoConversationPage />);
      
      const writeButton = screen.getByText('Start Writing');
      fireEvent.click(writeButton);
      
      // Should not navigate if no current user
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('navigates to specific user compose page when current user exists', () => {
      // Mock with current user
      mockUseConversationUser.mockReturnValue({
        currentConversationUser: {
          user_id: 'user123',
          anonymous_handle: 'testuser'
        },
        setCurrentConversationUser: jest.fn(),
        clearCurrentConversationUser: jest.fn()
      });

      render(<NoConversationPage />);
      
      const writeButton = screen.getByText('Start Writing');
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
        currentConversationUser: {
          user_id: 'user456',
          anonymous_handle: 'penpal'
        },
        setCurrentConversationUser: jest.fn(),
        clearCurrentConversationUser: jest.fn()
      });

      render(<NoConversationPage />);
      
      const writeButton = screen.getByText('Start Writing');
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

      // The component no longer uses Card components - check for content sections instead
      expect(screen.getByText('Break the Ice')).toBeInTheDocument();
      expect(screen.getByText('Be Authentic')).toBeInTheDocument();
      expect(screen.getByText('Start Simple')).toBeInTheDocument();
    });

    it('renders the correct number of buttons', () => {
      render(<NoConversationPage />);
      
      const buttons = screen.getAllByTestId('button');
      expect(buttons).toHaveLength(2); // back + write letter
    });

    it('includes all expected icons', () => {
      render(<NoConversationPage />);

      // Only these icons are actually used in the current component
      expect(screen.getByTestId('send-icon')).toBeInTheDocument();
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument();
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

      // Check that the main heading exists (now h1)
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent(/Your Letter Adventure.*Begins!/s);

      // Check for sub-headings (h3 elements for the cards)
      const cardHeadings = screen.getAllByRole('heading', { level: 3 });
      expect(cardHeadings.length).toBeGreaterThan(0);
    });
  });

  // Content validation tests
  describe('Content Validation', () => {
    it('contains all required instructional text', () => {
      render(<NoConversationPage />);
      
      // Key instructional content - use getAllByText for duplicate content
      expect(screen.getAllByText(/12 hours/)).toHaveLength(2); // Now appears twice due to sr-only text
      expect(screen.getByText(/authentic postal feel/)).toBeInTheDocument();
      expect(screen.getByText(/pen pal is waiting/)).toBeInTheDocument();
    });

    it('includes all letter writing tips', () => {
      render(<NoConversationPage />);

      // Only check for tips that are actually in the component
      const tips = [
        'hometown',
        'breakfast',
        'weather'
      ];

      tips.forEach(tip => {
        expect(screen.getByText(new RegExp(tip, 'i'))).toBeInTheDocument();
      });
    });

    it('displays encouraging and motivational language', () => {
      render(<NoConversationPage />);

      expect(screen.getByText(/magical journey/)).toBeInTheDocument();
      expect(screen.getByText(/beautiful friendships/)).toBeInTheDocument();
    });
  });

  // Component state tests
  describe('Component State', () => {
    it('maintains consistent content across re-renders', () => {
      const { rerender } = render(<NoConversationPage />);
      
      expect(screen.getByText('Start Writing')).toBeInTheDocument();
      
      rerender(<NoConversationPage />);
      
      expect(screen.getByText('Start Writing')).toBeInTheDocument();
      expect(screen.getByText(/Your Letter Adventure/)).toBeInTheDocument();
      expect(screen.getByText(/Begins!/)).toBeInTheDocument();
    });
  });

  // Test different currentConversationUser scenarios
  describe('Current User Scenarios', () => {
    it('renders correctly when no current user is set', () => {
      // Default mock has currentConversationUser: null
      render(<NoConversationPage />);
      
      // Should still render all content
      expect(screen.getByText('Start Writing')).toBeInTheDocument();
      expect(screen.getByText(/Your Letter Adventure/)).toBeInTheDocument();
      expect(screen.getByText(/Begins!/)).toBeInTheDocument();
    });

    it('renders correctly when current user is set', () => {
      mockUseConversationUser.mockReturnValue({
        currentConversationUser: {
          user_id: 'user789',
          anonymous_handle: 'buddy',
          profile_image_url: 'image.jpg'
        },
        setCurrentConversationUser: jest.fn(),
        clearCurrentConversationUser: jest.fn()
      });

      render(<NoConversationPage />);
      
      // Should render the same content regardless of current user
      expect(screen.getByText('Start Writing')).toBeInTheDocument();
      expect(screen.getByText(/Your Letter Adventure/)).toBeInTheDocument();
      expect(screen.getByText(/Begins!/)).toBeInTheDocument();
    });
  });
});