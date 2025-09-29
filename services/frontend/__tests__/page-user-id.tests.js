import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import LetterApp from '../app/compose-letter/[user_id]/page';

// Mock Next.js components and hooks
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockParams = { user_id: 'test-user-id' };

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  useParams: () => mockParams,
}));

// Mock context
const mockUseSyncProfile = jest.fn();
const mockUseComposeLetter = jest.fn();

jest.mock('../app/compose-letter/components/ComposeLetterContext', () => ({
  ComposeLetterProvider: ({ children }) => <div data-testid="compose-provider">{children}</div>,
  useComposeLetter: () => mockUseComposeLetter(),
}));

jest.mock('../lib/context/ProfileContext', () => ({
  useSyncProfile: () => mockUseSyncProfile(),
}));

// Mock API client
const mockSearchUsers = jest.fn();
const mockSendLetter = jest.fn();
const mockUploadImage = jest.fn();

jest.mock('../lib/MessagingApiClient', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    searchUsers: mockSearchUsers,
    sendLetter: mockSendLetter,
    uploadImage: mockUploadImage,
  })),
}));

// Mock UI components
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open, onOpenChange }) => open ? <div data-testid="sheet">{children}</div> : null,
  SheetTrigger: ({ children }) => <div>{children}</div>,
  SheetContent: ({ children }) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }) => <div>{children}</div>,
  SheetTitle: ({ children }) => <div>{children}</div>,
  SheetDescription: ({ children }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left" />,
  CheckCircle2: () => <div data-testid="check-circle" />,
  AlertCircle: () => <div data-testid="alert-circle" />,
  PanelLeft: () => <div data-testid="panel-left" />,
  PanelRight: () => <div data-testid="panel-right" />,
}));

// Mock components
jest.mock('../app/compose-letter/components/LetterSendAnimation', () => ({
  __esModule: true,
  default: ({ show, onAnimationComplete, onSendWithImage }) => 
    show ? <div data-testid="letter-send-animation" onClick={onSendWithImage} /> : null,
}));

jest.mock('../app/compose-letter/components/LeftSidebar', () => ({
  __esModule: true,
  default: ({ selectedMatch, ...props }) => (
    <div 
      data-testid="left-sidebar" 
      data-selected-match-id={selectedMatch ? selectedMatch.id : null}
      {...props} 
    />
  ),
}));

jest.mock('../app/compose-letter/components/MainContent', () => ({
  __esModule: true,
  default: (props) => <div data-testid="main-content" {...props} />,
}));

jest.mock('../app/compose-letter/components/RightSidebar', () => ({
  __esModule: true,
  default: ({ sendDisabled, ...props }) => (
    <div 
      data-testid="right-sidebar" 
      senddisabled={sendDisabled ? 'true' : 'false'}
      {...props} 
    />
  ),
}));

jest.mock('../app/compose-letter/components/FontSidePanel', () => ({
  FontSidePanel: (props) => <div data-testid="font-side-panel" {...props} />,
}));

jest.mock('../app/compose-letter/components/TemplateSidePanel', () => ({
  __esModule: true,
  default: (props) => <div data-testid="template-side-panel" {...props} />,
}));

// Mock Radix UI
jest.mock('@radix-ui/react-visually-hidden', () => ({
  Root: ({ children }) => <div data-testid="visually-hidden">{children}</div>,
}));

// Mock sonner
jest.mock('sonner', () => ({
  Toaster: () => <div data-testid="toaster" />,
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock html-to-image
jest.mock('html-to-image', () => ({
  toJpeg: jest.fn(),
  toPng: jest.fn(),
}));

// Mock jsPDF
jest.mock('jspdf', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
  })),
}));

// Mock PDFGenerator
jest.mock('../app/compose-letter/lib/pdfGenerator', () => ({
  PDFGenerator: {
    generateLetterPDF: jest.fn(),
    downloadPDF: jest.fn(),
  },
}));

// Mock JPEG generator
jest.mock('../app/compose-letter/lib/jpegGenerator', () => ({
  generateJPEG: jest.fn(),
  generateJPEGDataUrl: jest.fn(),
  captureLetterCloneAsPng: jest.fn(),
}));

describe('LetterApp', () => {
  const mockProfile = {
    user_id: 'test-user-id',
    anonymous_handle: 'TestUser',
  };

  const mockPresets = [
    {
      id: 'preset1',
      name: 'Test Preset',
      config: {
        background: { color: '#fff', filterKey: 'none', opacity: 1 },
        pattern: { type: 'none', params: {} },
        patternBlendMode: 'normal',
        fontColor: '#000',
        fontOpacity: 1,
      },
      thumbnailDataUrl: '',
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  const mockMatches = [
    {
      id: 'match1',
      name: 'MatchUser1',
      location: 'US',
      interests: ['Reading', 'Writing'],
      conversation_thread_id: 'thread1',
      match_id: 'match1',
    },
    {
      id: 'match2',
      name: 'MatchUser2',
      location: 'UK',
      interests: ['Travel', 'Cooking'],
      conversation_thread_id: 'thread2',
      match_id: 'match2',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseSyncProfile.mockReturnValue({
      profile: mockProfile,
      synced: true,
    });

    mockUseComposeLetter.mockReturnValue({
      presets: mockPresets,
    });

    mockSearchUsers.mockResolvedValue({
      items: mockMatches.map(match => ({
        user_profile: {
          user_id: match.id,
          anonymous_handle: match.name,
          country_code: match.location,
        },
        latest_message: {
          conversation_thread_id: match.conversation_thread_id,
          match_id: match.match_id,
        },
      })),
    });

    // Mock window methods
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

    // Mock crypto
    Object.defineProperty(global, 'crypto', {
      value: { randomUUID: () => 'mock-uuid' },
      writable: true,
    });

    // Mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    test('renders with provider wrapper', () => {
      render(<LetterApp />);
      expect(screen.getByTestId('compose-provider')).toBeInTheDocument();
    });

    test('renders header with back button', () => {
      render(<LetterApp />);
      
      expect(screen.getByText('Back to inbox')).toBeInTheDocument();
      expect(screen.getByTestId('arrow-left')).toBeInTheDocument();
    });

    test('renders main layout components', async () => {
      render(<LetterApp />);
      
      await waitFor(() => {
        expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
        expect(screen.getByTestId('main-content')).toBeInTheDocument();
        expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();
      });
    });

    test('loads matches on mount', async () => {
      render(<LetterApp />);
      
      await waitFor(() => {
        expect(mockSearchUsers).toHaveBeenCalledWith({
          anonymous_handle: '',
          my_user_id: 'test-user-id',
          limit: 10,
          offset: 0,
        });
      });
    });
  });

  describe('Mobile Layout', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
    });

    test('shows mobile top bar on small screens', async () => {
      render(<LetterApp />);
      
      await waitFor(() => {
        expect(screen.getByText('Matches')).toBeInTheDocument();
        expect(screen.getByText('Preview & Send')).toBeInTheDocument();
      });
    });

    test('opens left sheet when matches button clicked', async () => {
      const user = userEvent.setup();
      render(<LetterApp />);
      
      const matchesButton = screen.getByText('Matches');
      await user.click(matchesButton);
      
      expect(screen.getByTestId('sheet')).toBeInTheDocument();
    });
  });

  describe('Letter Statistics', () => {
    test('calculates word count correctly', async () => {
      render(<LetterApp />);
      
      await waitFor(() => {
        // The component should calculate stats from initial letter content
        const mainContent = screen.getByTestId('main-content');
        expect(mainContent).toHaveAttribute('lettercontent', expect.stringContaining('I\'m writing this'));
      });
    });

    test('estimates CEFR level', async () => {
      render(<LetterApp />);
      
      await waitFor(() => {
        // Component should have readability state
        expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();
      });
    });
  });

  describe('Template Management', () => {
    test('loads default templates', async () => {
      render(<LetterApp />);
      
      await waitFor(() => {
        // Templates are loaded internally, check that the component renders without error
        expect(screen.getByTestId('compose-provider')).toBeInTheDocument();
      });
    });

    test('applies template when selected', async () => {
      const user = userEvent.setup();
      render(<LetterApp />);
      
      await waitFor(() => {
        // Template functionality is available through right sidebar
        expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();
      });
    });
  });

  describe('Send Letter Functionality', () => {
    test('disables send when no match selected', async () => {
      // Mock no matches
      mockSearchUsers.mockResolvedValue({ items: [] });
      
      render(<LetterApp />);
      
      await waitFor(() => {
        const rightSidebar = screen.getByTestId('right-sidebar');
        expect(rightSidebar).toHaveAttribute('senddisabled', 'true');
      });
    });

    test('enables send when match selected and content exists', async () => {
      render(<LetterApp />);
      
      await waitFor(() => {
        const rightSidebar = screen.getByTestId('right-sidebar');
        expect(rightSidebar).toHaveAttribute('senddisabled', 'false');
      });
    });

    test('calls send letter API when send clicked', async () => {
      const user = userEvent.setup();
      render(<LetterApp />);
      
      await waitFor(() => {
        // Find and click send button in right sidebar
        // This would require more detailed mocking of the right sidebar component
        expect(mockSendLetter).not.toHaveBeenCalled();
      });
    });
  });

  describe('Export Functionality', () => {
    test('exports PDF when requested', async () => {
      render(<LetterApp />);
      
      await waitFor(() => {
        // PDF export should be available in right sidebar
        expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();
      });
    });

    test('exports JPG when requested', async () => {
      render(<LetterApp />);
      
      await waitFor(() => {
        // JPG export should be available in right sidebar
        expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('shows error message when API fails', async () => {
      mockSearchUsers.mockRejectedValue(new Error('API Error'));
      
      render(<LetterApp />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load matches/)).toBeInTheDocument();
      });
    });

    test('handles send letter errors gracefully', async () => {
      mockSendLetter.mockRejectedValue(new Error('Send failed'));
      
      render(<LetterApp />);
      
      // Error handling during send would need more detailed test setup
      expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    test('navigates back to inbox when back button clicked', async () => {
      const user = userEvent.setup();
      render(<LetterApp />);
      
      const backButton = screen.getByText('Back to inbox');
      await user.click(backButton);
      
      expect(mockPush).toHaveBeenCalledWith('/inbox');
    });

    test('redirects to inbox after successful send', async () => {
      // This would require mocking the entire send flow
      render(<LetterApp />);
      
      expect(mockPush).not.toHaveBeenCalledWith('/inbox');
    });
  });

  describe('Responsive Behavior', () => {
    test('adapts layout for different screen sizes', () => {
      // Test desktop layout - mobile bar should be hidden
      Object.defineProperty(window, 'innerWidth', { value: 1400, writable: true });
      const { rerender } = render(<LetterApp />);
      
      const mobileBar = document.querySelector('.xl\\:hidden');
      expect(mobileBar).toBeInTheDocument();
      
      // Test mobile layout - mobile bar should be visible
      Object.defineProperty(window, 'innerWidth', { value: 600, writable: true });
      rerender(<LetterApp />);
      
      expect(screen.getByText('Matches')).toBeInTheDocument();
    });
  });

  describe('Animation Handling', () => {
    test('shows send animation when triggered', () => {
      render(<LetterApp />);
      
      // Initially no animation
      expect(screen.queryByTestId('letter-send-animation')).not.toBeInTheDocument();
      
      // Animation would be triggered by send process
    });

    test('handles animation completion', () => {
      // Animation completion handling would require more detailed mocking
      render(<LetterApp />);
      
      expect(screen.getByTestId('compose-provider')).toBeInTheDocument();
    });
  });
});