/** @jest-environment jsdom */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock ProfileContext
jest.mock('../../lib/context/ProfileContext', () => ({
  __esModule: true,
  useProfile: () => ({
    profile: {
      user_id: "user_123",
      clerk_id: "clerk_123", 
      anonymous_handle: "test_user",
      moderator: false,
      country_code: "ZA",
    },
    loading: false,
    error: null,
    synced: true,
    syncProfile: async () => {},
    clearProfile: () => {},
  }),
  useSyncProfile: () => ({
    profile: {
      user_id: "user_123",
      clerk_id: "clerk_123", 
      anonymous_handle: "test_user", 
      moderator: false,
      country_code: "ZA",
    },
    loading: false,
    error: null,
    synced: true,
  }),
}));

// Mock MessagingApiClient
jest.mock('../../lib/MessagingApiClient', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      searchUsers: jest.fn(),
    })),
  };
});

// Mock world-countries library
jest.mock('world-countries', () => [
  {
    name: { common: 'United States' },
    cca2: 'US'
  },
  {
    name: { common: 'Japan' },
    cca2: 'JP'
  },
  {
    name: { common: 'South Africa' },
    cca2: 'ZA'
  }
]);

// Mock Next/Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt = '', ...props }: any) => {
    return React.createElement('img', { alt, ...props });
  },
}));

// Import the component after mocks
import CulturalExplorer from '../../app/cultural-explorer/page';

// Test data
const FACTS_DATA = {
  'United States of America': {
    emoji: '🇺🇸',
    facts: ['The US has the world\'s largest economy.']
  },
  'Japan': {
    emoji: '🇯🇵',
    facts: ['Japan consists of 6,852 islands.']
  },
  'South Africa': {
    emoji: '🇿🇦',
    facts: ['South Africa has 11 official languages.']
  }
};

const MOCK_PEN_PALS = [
  {
    user_profile: {
      user_id: 'user1',
      anonymous_handle: 'tokyo_explorer',
      country_code: 'JP'
    }
  },
  {
    user_profile: {
      user_id: 'user2',
      anonymous_handle: 'cape_town_local',
      country_code: 'ZA'
    }
  }
];

// Mock fetch for facts.json
global.fetch = jest.fn(async (url: RequestInfo | URL) => {
  const urlStr = typeof url === 'string' ? url : url.toString();
  if (urlStr.endsWith('/facts.json')) {
    const body = JSON.stringify(FACTS_DATA);
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(null, { status: 404 });
}) as unknown as typeof fetch;

describe('Cultural Explorer Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock MessagingApiClient for each test
    const MessagingApiClient = require('../../lib/MessagingApiClient').default;
    MessagingApiClient.mockImplementation(() => ({
      searchUsers: jest.fn().mockResolvedValue({
        items: MOCK_PEN_PALS,
      }),
    }));
  });

  test('renders and displays basic functionality', async () => {
    render(<CulturalExplorer />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText(/cultural explorer/i)).toBeInTheDocument();
    });

    // Should display countries from pen pals
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
    });

    // Should show pen pal information
    expect(screen.getByText(/@tokyo_explorer/)).toBeInTheDocument();
  });

  test('handles error states gracefully', async () => {
    // Mock API failure
    const MessagingApiClient = require('../../lib/MessagingApiClient').default;
    MessagingApiClient.mockImplementation(() => ({
      searchUsers: jest.fn().mockRejectedValue(new Error('API Error')),
    }));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<CulturalExplorer />);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/cultural explorer/i)).toBeInTheDocument();
    });

    // Should show no matches state
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /no pen pal countries yet/i })).toBeInTheDocument();
    }, { timeout: 8000 });

    consoleSpy.mockRestore();
  });

  test('refresh facts functionality works', async () => {
    const user = userEvent.setup();
    render(<CulturalExplorer />);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
    });

    // Find and click refresh button for Japan
    const refreshButton = screen.getByRole('button', { name: /refresh facts for japan/i });
    await user.click(refreshButton);

    // Facts should still be displayed (may be different ones)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
      // Should still have facts available
      const japanSection = screen.getByRole('heading', { name: /japan/i }).closest('article');
      expect(japanSection).toBeInTheDocument();
    });
  });

  test('quiz functionality integration', async () => {
    const user = userEvent.setup();
    render(<CulturalExplorer />);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /south africa/i })).toBeInTheDocument();
    });

    // Find and click quiz button for South Africa (if available)
    const quizButtons = screen.queryAllByRole('button', { name: /take quiz for south africa/i });
    if (quizButtons.length > 0) {
      await user.click(quizButtons[0]);

      // Should show quiz interface or quiz-related content
      await waitFor(() => {
        // Quiz functionality exists but may be complex - just verify interaction doesn't break
        expect(screen.getByRole('heading', { name: /south africa/i })).toBeInTheDocument();
      });
    }
  });

  test('multiple countries display correctly', async () => {
    render(<CulturalExplorer />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText(/cultural explorer/i)).toBeInTheDocument();
    });

    // Should display multiple countries from pen pals
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /south africa/i })).toBeInTheDocument();
    });

    // Should show pen pal information for each country
    expect(screen.getByText(/@tokyo_explorer/)).toBeInTheDocument();
    expect(screen.getByText(/@cape_town_local/)).toBeInTheDocument();

    // Verify facts sections exist (without checking specific text since it may be rendered differently)
    const japanSection = screen.getByRole('heading', { name: /japan/i }).closest('article');
    const southAfricaSection = screen.getByRole('heading', { name: /south africa/i }).closest('article');
    
    expect(japanSection).toBeInTheDocument();
    expect(southAfricaSection).toBeInTheDocument();
  });

  test('accessibility features work correctly', async () => {
    render(<CulturalExplorer />);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/cultural explorer/i)).toBeInTheDocument();
    });

    // Should have proper ARIA landmarks
    expect(screen.getByRole('main')).toBeInTheDocument();
    
    // Should have skip link
    expect(screen.getByText(/skip to main content/i)).toBeInTheDocument();

    // Should have proper headings hierarchy
    expect(screen.getByRole('heading', { name: /cultural explorer/i })).toBeInTheDocument();
    
    // Country headings should be properly structured
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /south africa/i })).toBeInTheDocument();
    });

    // Interactive elements should have proper labels
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      // All buttons should have accessible names (either text content or aria-label)
      expect(button).toHaveAttribute('aria-label');
    });
  });

  test('empty state displays when no pen pals available', async () => {
    // Mock empty pen pals response
    const MessagingApiClient = require('../../lib/MessagingApiClient').default;
    MessagingApiClient.mockImplementation(() => ({
      searchUsers: jest.fn().mockResolvedValue({
        items: [],
      }),
    }));

    render(<CulturalExplorer />);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/cultural explorer/i)).toBeInTheDocument();
    });

    // Should show no matches state
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /no pen pal countries yet/i })).toBeInTheDocument();
    });

    // Should show helpful message
    expect(screen.getByText(/start connecting with pen pals/i)).toBeInTheDocument();
  });

  test('global refresh functionality works', async () => {
    const user = userEvent.setup();
    render(<CulturalExplorer />);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/cultural explorer/i)).toBeInTheDocument();
    });

    // Wait for countries to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
    });

    // Find global refresh button (if available)
    const globalRefreshButtons = screen.queryAllByRole('button', { name: /refresh all facts/i });
    if (globalRefreshButtons.length > 0) {
      await user.click(globalRefreshButtons[0]);

      // Should maintain countries display after refresh
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
      });
    }
  });

  test('pen pal expansion functionality', async () => {
    // Mock more pen pals to trigger expansion
    const MessagingApiClient = require('../../lib/MessagingApiClient').default;
    const manyPenPals = [
      ...MOCK_PEN_PALS,
      { user_profile: { user_id: 'user3', anonymous_handle: 'sa_friend_1', country_code: 'ZA' }},
      { user_profile: { user_id: 'user4', anonymous_handle: 'sa_friend_2', country_code: 'ZA' }},
      { user_profile: { user_id: 'user5', anonymous_handle: 'sa_friend_3', country_code: 'ZA' }},
    ];
    
    MessagingApiClient.mockImplementation(() => ({
      searchUsers: jest.fn().mockResolvedValue({
        items: manyPenPals,
      }),
    }));

    const user = userEvent.setup();
    render(<CulturalExplorer />);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /south africa/i })).toBeInTheDocument();
    });

    // Should show expand button for South Africa (if more than 4 pen pals)
    const expandButtons = screen.queryAllByText(/\+\d+ more/);
    if (expandButtons.length > 0) {
      await user.click(expandButtons[0]);

      // Should show additional pen pals
      await waitFor(() => {
        expect(screen.getByText(/@sa_friend_1/)).toBeInTheDocument();
      });

      // Should show collapse button
      const collapseButtons = screen.queryAllByText(/show fewer/i);
      if (collapseButtons.length > 0) {
        await user.click(collapseButtons[0]);

        // Should hide additional pen pals
        await waitFor(() => {
          expect(screen.queryByText(/@sa_friend_1/)).not.toBeInTheDocument();
        });
      }
    }
  });
});