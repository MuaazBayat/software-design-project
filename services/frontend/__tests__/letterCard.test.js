import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import LetterCard from '../components/LetterCard';

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }) => <div className={className} data-testid="card">{children}</div>
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }) => (
    <span className={className} data-testid="badge" data-variant={variant}>
      {children}
    </span>
  )
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Mail: () => <div data-testid="mail-icon">Mail</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Heart: () => <div data-testid="heart-icon">Heart</div>,
}));

describe('LetterCard', () => {
  const currentUserId = 'user123';
  const otherUserId = 'user456';

  // Mock Date.now() for consistent testing
  const mockDate = new Date('2023-10-01T12:00:00Z');
  const originalDate = global.Date;

  beforeAll(() => {
    global.Date = jest.fn((...args) => {
      if (args.length === 0) {
        return mockDate;
      }
      return new originalDate(...args);
    });
    global.Date.now = jest.fn(() => mockDate.getTime());
  });

  afterAll(() => {
    global.Date = originalDate;
  });

  // Sample message data
  const baseMockMessage = {
    message_id: 'msg1',
    sender_id: otherUserId,
    message_content: 'Hello! This is a test message from your pen pal.',
    scheduled_delivery_at: '2023-10-01T10:00:00Z',
    message_sequence: 1,
    created_at: '2023-10-01T09:00:00Z'
  };

  const myMessage = {
    ...baseMockMessage,
    message_id: 'msg2',
    sender_id: currentUserId,
    message_content: 'This is my reply message.',
    message_sequence: 2
  };

  const readMessage = {
    ...baseMockMessage,
    read_at: '2023-10-01T11:00:00Z'
  };

  const futureMessage = {
    ...baseMockMessage,
    scheduled_delivery_at: '2023-10-01T14:00:00Z' // Future delivery
  };

  const messageWithStyles = {
    ...baseMockMessage,
    letter_styles: {
      font_family: 'handwritten',
      font_size: 18
    }
  };

  describe('Component Rendering', () => {
    test('renders letter card with basic message content', () => {
      render(<LetterCard message={baseMockMessage} currentUserId={currentUserId} />);

      expect(screen.getByText('Hello! This is a test message from your pen pal.')).toBeInTheDocument();
      expect(screen.getByText('From: Your Pen Pal')).toBeInTheDocument();
      expect(screen.getByText('Letter #1')).toBeInTheDocument();
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    test('renders different layout for my messages vs others', () => {
      const { rerender, container } = render(
        <LetterCard message={baseMockMessage} currentUserId={currentUserId} />
      );

      // Other's message - should justify start
      expect(container.querySelector('.justify-start')).toBeInTheDocument();
      expect(screen.getByText('From: Your Pen Pal')).toBeInTheDocument();

      rerender(<LetterCard message={myMessage} currentUserId={currentUserId} />);

      // My message - should justify end
      expect(container.querySelector('.justify-end')).toBeInTheDocument();
      expect(screen.getByText('From: You')).toBeInTheDocument();
    });

    test('displays correct message sequence', () => {
      render(<LetterCard message={myMessage} currentUserId={currentUserId} />);

      expect(screen.getByText('Letter #2')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
    });
  });

  // describe('Date Formatting', () => {
  //   test('formats delivery time correctly', () => {
  //     render(<LetterCard message={baseMockMessage} currentUserId={currentUserId} />);

  //     // Should format the scheduled delivery time
  //     expect(screen.getByText('Oct 1, 12:00 PM')).toBeInTheDocument();
  //     expect(screen.getByText('Written 2023/10/01')).toBeInTheDocument();
  //   });
  // });

  describe('Delivery Status Logic', () => {
    test('shows "Read" status when message has read_at', () => {
      render(<LetterCard message={readMessage} currentUserId={currentUserId} />);

      expect(screen.getByText('Read')).toBeInTheDocument();
      expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
      expect(screen.getByTestId('badge')).toHaveClass('bg-green-100', 'text-green-800');
    });

    test('shows "Delivered" status when delivery time has passed', () => {
      render(<LetterCard message={baseMockMessage} currentUserId={currentUserId} />);

      const badge = screen.getByTestId('badge');
      expect(screen.getByText('Delivered')).toBeInTheDocument();
      expect(within(badge).getByTestId('mail-icon')).toBeInTheDocument();
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    test('shows "Sending..." status when delivery time is in future', () => {
      render(<LetterCard message={futureMessage} currentUserId={currentUserId} />);

      const badge = screen.getByTestId('badge');
      expect(screen.getByText('Sending...')).toBeInTheDocument();
      expect(within(badge).getByTestId('clock-icon')).toBeInTheDocument();
      expect(badge).toHaveClass('bg-orange-100', 'text-orange-800');
    });
  });

  describe('Message Ownership Detection', () => {
    test('identifies my messages correctly', () => {
      render(<LetterCard message={myMessage} currentUserId={currentUserId} />);

      expect(screen.getByText('From: You')).toBeInTheDocument();
      expect(screen.getByText('Yours truly,')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    test('identifies other user messages correctly', () => {
      render(<LetterCard message={baseMockMessage} currentUserId={currentUserId} />);

      expect(screen.getByText('From: Your Pen Pal')).toBeInTheDocument();
      expect(screen.getByText('With warm regards,')).toBeInTheDocument();
      expect(screen.getByText('Your Pen Pal')).toBeInTheDocument();
    });

    test('handles undefined currentUserId', () => {
      render(<LetterCard message={baseMockMessage} currentUserId={undefined} />);

      // Should treat as not my message
      expect(screen.getByText('From: Your Pen Pal')).toBeInTheDocument();
    });
  });

  describe('Font Styling', () => {
    test('applies correct font class for handwritten style', () => {
      const handwrittenMessage = {
        ...baseMockMessage,
        letter_styles: { font_family: 'handwritten' }
      };

      const { container } = render(
        <LetterCard message={handwrittenMessage} currentUserId={currentUserId} />
      );

      expect(container.querySelector('.font-serif')).toBeInTheDocument();
      expect(container.querySelector('.tracking-wide')).toBeInTheDocument();
      expect(screen.getByText('handwritten')).toBeInTheDocument();
    });

    test('applies correct font class for typewriter style', () => {
      const typewriterMessage = {
        ...baseMockMessage,
        letter_styles: { font_family: 'typewriter' }
      };

      const { container } = render(
        <LetterCard message={typewriterMessage} currentUserId={currentUserId} />
      );

      expect(container.querySelector('.font-mono')).toBeInTheDocument();
      expect(container.querySelector('.tracking-wider')).toBeInTheDocument();
      expect(screen.getByText('typewriter')).toBeInTheDocument();
    });

    test('applies correct font class for cursive style', () => {
      const cursiveMessage = {
        ...baseMockMessage,
        letter_styles: { font_family: 'cursive' }
      };

      const { container } = render(
        <LetterCard message={cursiveMessage} currentUserId={currentUserId} />
      );

      expect(container.querySelector('.font-serif.italic')).toBeInTheDocument();
      expect(screen.getByText('cursive')).toBeInTheDocument();
    });

    test('applies correct font class for formal style', () => {
      const formalMessage = {
        ...baseMockMessage,
        letter_styles: { font_family: 'formal' }
      };

      const { container } = render(
        <LetterCard message={formalMessage} currentUserId={currentUserId} />
      );

      expect(container.querySelector('.font-serif')).toBeInTheDocument();
      expect(screen.getByText('formal')).toBeInTheDocument();
    });

    test('applies default font class when no font family specified', () => {
      const { container } = render(
        <LetterCard message={baseMockMessage} currentUserId={currentUserId} />
      );

      expect(container.querySelector('.font-sans')).toBeInTheDocument();
    });

    test('handles case insensitive font family matching', () => {
      const uppercaseMessage = {
        ...baseMockMessage,
        letter_styles: { font_family: 'HANDWRITTEN' }
      };

      const { container } = render(
        <LetterCard message={uppercaseMessage} currentUserId={currentUserId} />
      );

      expect(container.querySelector('.font-serif')).toBeInTheDocument();
    });
  });

//   describe('Font Size Handling', () => {
//     test('applies custom font size when specified', () => {
//       const { container } = render(
//         <LetterCard message={messageWithStyles} currentUserId={currentUserId} />
//       );

//       const contentElement = container.querySelector('[style*="fontSize"]');
//       expect(contentElement).toHaveStyle('font-size: 14px'); // Clamped to max of 14
//     });

//     test('applies default font size when not specified', () => {
//       const { container } = render(
//         <LetterCard message={baseMockMessage} currentUserId={currentUserId} />
//       );

//       const contentElement = container.querySelector('[style*="fontSize"]');
//       expect(contentElement).toHaveStyle('font-size: 14px'); // Default 16, clamped to 14
//     });

//     test('clamps font size to maximum of 14px', () => {
//       const largeFontMessage = {
//         ...baseMockMessage,
//         letter_styles: { font_size: 24 }
//       };

//       const { container } = render(
//         <LetterCard message={largeFontMessage} currentUserId={currentUserId} />
//       );

//       const contentElement = container.querySelector('[style*="fontSize"]');
//       expect(contentElement).toHaveStyle('font-size: 14px');
//     });
//   });

  describe('Message Sequence Features', () => {
    test('shows salutation for messages after the first', () => {
      const secondMessage = {
        ...baseMockMessage,
        message_sequence: 2
      };

      render(<LetterCard message={secondMessage} currentUserId={currentUserId} />);

      expect(screen.getByText('Dear friend,')).toBeInTheDocument();
    });

    test('does not show salutation for first message', () => {
      render(<LetterCard message={baseMockMessage} currentUserId={currentUserId} />);

      expect(screen.queryByText('Dear friend,')).not.toBeInTheDocument();
    });

    test('handles missing message sequence', () => {
      const messageNoSequence = {
        ...baseMockMessage,
        message_sequence: undefined
      };

      render(<LetterCard message={messageNoSequence} currentUserId={currentUserId} />);

      expect(screen.queryByText('Dear friend,')).not.toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    test('renders different border colors for my messages vs others', () => {
      const { rerender } = render(
        <LetterCard message={baseMockMessage} currentUserId={currentUserId} />
      );

      expect(screen.getByTestId('card')).toHaveClass('border-rose-200');

      rerender(<LetterCard message={myMessage} currentUserId={currentUserId} />);

      expect(screen.getByTestId('card')).toHaveClass('border-blue-200');
    });

    test('renders status indicators in different colors', () => {
      const { rerender } = render(
        <LetterCard message={readMessage} currentUserId={currentUserId} />
      );

      expect(screen.getByTestId('badge')).toHaveClass('bg-green-100', 'text-green-800');

      rerender(<LetterCard message={baseMockMessage} currentUserId={currentUserId} />);

      expect(screen.getByTestId('badge')).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    test('renders all required icons', () => {
      render(<LetterCard message={baseMockMessage} currentUserId={currentUserId} />);

      expect(screen.getAllByTestId('mail-icon')).toHaveLength(2); // Status and postmark
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    test('displays font family in footer when available', () => {
      render(<LetterCard message={messageWithStyles} currentUserId={currentUserId} />);

      expect(screen.getByText('handwritten')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles missing letter_styles gracefully', () => {
      const messageNoStyles = {
        ...baseMockMessage,
        letter_styles: undefined
      };

      render(<LetterCard message={messageNoStyles} currentUserId={currentUserId} />);

      expect(screen.getByText('Hello! This is a test message from your pen pal.')).toBeInTheDocument();
      // Should not show font family in footer
      expect(screen.queryByText('•')).not.toBeInTheDocument();
    });

    test('handles empty message content', () => {
      const emptyMessage = {
        ...baseMockMessage,
        message_content: ''
      };

      render(<LetterCard message={emptyMessage} currentUserId={currentUserId} />);

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByText('From: Your Pen Pal')).toBeInTheDocument();
    });

    test('handles very long message content', () => {
      const longMessage = {
        ...baseMockMessage,
        message_content: 'A'.repeat(1000)
      };

      render(<LetterCard message={longMessage} currentUserId={currentUserId} />);

      expect(screen.getByText('A'.repeat(1000))).toBeInTheDocument();
    });

    test('handles invalid date strings', () => {
      const invalidDateMessage = {
        ...baseMockMessage,
        scheduled_delivery_at: 'invalid-date'
      };

      render(<LetterCard message={invalidDateMessage} currentUserId={currentUserId} />);

      // Should still render without crashing
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });
  });

  describe('Styling Classes', () => {
    test('applies correct container alignment classes', () => {
      const { container, rerender } = render(
        <LetterCard message={baseMockMessage} currentUserId={currentUserId} />
      );

      expect(container.firstChild).toHaveClass('justify-start');
      expect(container.firstChild.firstChild).toHaveClass('mr-12');

      rerender(<LetterCard message={myMessage} currentUserId={currentUserId} />);

      expect(container.firstChild).toHaveClass('justify-end');
      expect(container.firstChild.firstChild).toHaveClass('ml-12');
    });

    test('applies correct color scheme classes for my messages', () => {
      const { container } = render(
        <LetterCard message={myMessage} currentUserId={currentUserId} />
      );

      expect(container.querySelector('.bg-blue-500')).toBeInTheDocument();
      expect(container.querySelector('.text-blue-900')).toBeInTheDocument();
      expect(container.querySelector('.text-blue-800')).toBeInTheDocument();
    });

    test('applies correct color scheme classes for other messages', () => {
      const { container } = render(
        <LetterCard message={baseMockMessage} currentUserId={currentUserId} />
      );

      expect(container.querySelector('.bg-rose-500')).toBeInTheDocument();
      expect(container.querySelector('.text-rose-900')).toBeInTheDocument();
      expect(container.querySelector('.text-rose-800')).toBeInTheDocument();
    });
  });
});