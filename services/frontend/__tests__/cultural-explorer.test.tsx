/**
 * @file __tests__/cultural-explorer.test.tsx
 *
 * Tests CulturalExplorer (app/cultural-explorer/page.tsx)
 * - Render without errors with personalized pen pal countries
 * - 3-card carousel navigation and fact display  
 * - Quiz functionality with South Africa hardcoded quiz
 * - Pen pal information display and interaction
 * - Accessibility features and ARIA compliance
 * - Error states and empty data handling
 */

import React from 'react';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CulturalExplorer from '../app/cultural-explorer/page';

// Mock ProfileContext to provide consistent user data and matches
const mockMatches = [
  {
    match_id: 'match1',
    conversation_thread_id: 'thread1',
    match_type: 'long-term',
    compatibility_score: 0.85,
    status: 'active',
    created_at: '2025-01-01T00:00:00.000Z',
    penpal_profile: {
      user_id: 'user1',
      anonymous_handle: 'tokyo_explorer',
      country_code: 'JP',
      bio: 'Love exploring Japan',
      age_range: '25-30',
      interests: ['travel', 'culture'],
      primary_language: 'ja',
      secondary_languages: ['en'],
      favorite_local_fact: 'Tokyo has the most Michelin stars'
    }
  },
  {
    match_id: 'match2',
    conversation_thread_id: 'thread2',
    match_type: 'one-time',
    compatibility_score: 0.92,
    status: 'active',
    created_at: '2025-01-02T00:00:00.000Z',
    penpal_profile: {
      user_id: 'user2',
      anonymous_handle: 'cape_town_local',
      country_code: 'ZA',
      bio: 'Cape Town native',
      age_range: '26-35',
      interests: ['nature', 'wine'],
      primary_language: 'en',
      secondary_languages: ['af'],
      favorite_local_fact: 'Table Mountain is 260 million years old'
    }
  },
  {
    match_id: 'match3',
    conversation_thread_id: 'thread3',
    match_type: 'either',
    compatibility_score: 0.78,
    status: 'active',
    created_at: '2025-01-03T00:00:00.000Z',
    penpal_profile: {
      user_id: 'user3',
      anonymous_handle: 'nyc_wanderer',
      country_code: 'US',
      bio: 'New York explorer',
      age_range: '30-35',
      interests: ['art', 'food'],
      primary_language: 'en',
      secondary_languages: ['es'],
      favorite_local_fact: 'Central Park has 843 acres'
    }
  },
  {
    match_id: 'match4',
    conversation_thread_id: 'thread4',
    match_type: 'long-term',
    compatibility_score: 0.88,
    status: 'active',
    created_at: '2025-01-04T00:00:00.000Z',
    penpal_profile: {
      user_id: 'user4',
      anonymous_handle: 'another_sa_friend',
      country_code: 'ZA',
      bio: 'Another South African friend',
      age_range: '28-33',
      interests: ['sports', 'music'],
      primary_language: 'en',
      secondary_languages: ['zu'],
      favorite_local_fact: 'Drakensberg Mountains are UNESCO sites'
    }
  }
];

// Helper to create configurable ProfileContext mock  
const createMockProfileContext = (matches = mockMatches, matchesLoading = false) => ({
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
    matches,
    matchesLoading,
    syncProfile: async () => {},
    clearProfile: () => {},
    fetchMatches: async () => {},
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
    matches,
    matchesLoading,
    fetchMatches: async () => {},
  }),
});

// Mock ProfileContext with default matches
jest.mock('../lib/context/ProfileContext', () => ({
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
    matches: mockMatches,
    matchesLoading: false,
    syncProfile: async () => {},
    clearProfile: () => {},
    fetchMatches: async () => {},
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
    matches: mockMatches,
    matchesLoading: false,
    fetchMatches: async () => {},
  }),
}));

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
  },
  {
    name: { common: 'United Kingdom' },
    cca2: 'GB'
  }
]);

// Next/Image: render a plain img element for testing
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt = '', ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />;
  },
}));

// Use modern fake timers for deterministic time-based UI
beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.restoreAllMocks();
});

// Test Data and Helpers
const FACTS_DATA = {
  'United States of America': {
    emoji: '🇺🇸',
    facts: [
      'The US has the world\'s largest economy.',
      'It has 50 states and one federal district.',
      'The Statue of Liberty was a gift from France.',
      'Hollywood is the center of the film industry.',
      'The Grand Canyon is one of the natural wonders.',
      'It has the most Nobel Prize winners.',
      'Baseball is known as America\'s pastime.',
      'The US dollar is the world\'s reserve currency.',
      'Silicon Valley is the tech innovation hub.'
    ]
  },
  'Japan': {
    emoji: '🇯🇵',
    facts: [
      'Japan consists of 6,852 islands.',
      'Mount Fuji is Japan\'s highest mountain.',
      'Tokyo is the world\'s largest metropolitan area.',
      'Japan has more than 3,000 hot springs.',
      'The country has 4 distinct seasons.',
      'Sushi originated in Japan.',
      'Japan has the world\'s oldest monarchy.',
      'Bullet trains can reach 320 km/h.',
      'Cherry blossoms bloom nationwide in spring.'
    ]
  },
  'South Africa': {
    emoji: '🇿🇦',
    facts: [
      'South Africa has 11 official languages - more than any other country!',
      'It is the only country to voluntarily dismantle its nuclear weapons program.',
      'The world\'s largest diamond, the Cullinan, was found here in 1905.',
      'Cape Town\'s Table Mountain is over 260 million years old.',
      'South Africa has three capital cities: Cape Town, Pretoria, and Bloemfontein.',
      'The country is home to the Big Five safari animals.',
      'Nelson Mandela was imprisoned for 27 years.',
      'The Drakensberg Mountains are a UNESCO World Heritage Site.',
      'South Africa produces some of the world\'s finest wines.'
    ]
  }
};

/** Create a userEvent instance that advances Jest fake timers. */
const createUser = () =>
  userEvent.setup({
    advanceTimers: jest.advanceTimersByTime,
  });

/** Advance timers inside act */
const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

/** Flush any pending timers */
const flushAll = async () => {
  await advance(0);
  await advance(0);
};

function mockApiResponses({
  factsData = FACTS_DATA,
  factsSuccess = true,
}: {
  factsData?: any,
  factsSuccess?: boolean,
} = {}) {
  // Mock fetch for facts.json
  global.fetch = jest.fn(async (url) => {
    const urlStr = typeof url === 'string' ? url : url.toString();
    if (urlStr.endsWith('/facts.json')) {
      if (!factsSuccess) {
        throw new Error('Network failed');
      }
      return {
        ok: true,
        json: async () => factsData,
      } as Response;
    }
    return { ok: false, json: async () => ({}) } as Response;
  });
}

const expectMainLoaded = async () => {
  await flushAll();
  expect(screen.getByText(/cultural explorer/i)).toBeInTheDocument();
};

// ---------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------

describe('CulturalExplorer — Basic Rendering', () => {
  test('renders without errors and shows loading state initially', async () => {
    mockApiResponses({ factsSuccess: true });

    render(<CulturalExplorer />);
    
    // Initially shows loading
    expect(screen.getByText(/loading the cultural explorer/i)).toBeInTheDocument();

    await expectMainLoaded();

    // Header elements are visible
    expect(screen.getByRole('heading', { name: /cultural explorer/i })).toBeInTheDocument();
    expect(screen.getByText(/discover fascinating facts about countries/i)).toBeInTheDocument();
  });

  test('displays pen pal countries when matches are available', async () => {
    mockApiResponses({ factsSuccess: true });

    render(<CulturalExplorer />);
    await expectMainLoaded();

    // Should display countries from pen pals
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /south africa/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /united states of america/i })).toBeInTheDocument();
    });

    // Should show pen pal information
    expect(screen.getByText(/@tokyo_explorer/)).toBeInTheDocument();
    expect(screen.getByText(/@cape_town_local/)).toBeInTheDocument();
    expect(screen.getByText(/@nyc_wanderer/)).toBeInTheDocument();
  });
});

describe('CulturalExplorer — Carousel Functionality', () => {
  test('displays 3-card layout with facts and navigation', async () => {
    const user = createUser();
    mockApiResponses({ factsSuccess: true });

    render(<CulturalExplorer />);
    await expectMainLoaded();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
    });

    // Should show 3 fact cards for Japan
    const japanSection = screen.getByRole('heading', { name: /japan/i }).closest('article');
    expect(japanSection).toBeInTheDocument();
    
    // Should have navigation arrows if more than 3 facts
    const nextButton = within(japanSection!).getByLabelText(/show next 3 facts for japan/i);
    const prevButton = within(japanSection!).getByLabelText(/show previous 3 facts for japan/i);
    
    expect(nextButton).toBeInTheDocument();
    expect(prevButton).toBeInTheDocument();
    expect(prevButton).toBeDisabled(); // Should be disabled on first page

    // Click next to navigate
    await user.click(nextButton);
    await flushAll();

    // Previous button should now be enabled
    expect(prevButton).toBeEnabled();
  });

  test('carousel navigation works correctly', async () => {
    const user = createUser();
    mockApiResponses({ factsSuccess: true });

    render(<CulturalExplorer />);
    await expectMainLoaded();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
    });

    const japanSection = screen.getByRole('heading', { name: /japan/i }).closest('article');
    const nextButton = within(japanSection!).getByLabelText(/show next 3 facts for japan/i);
    const prevButton = within(japanSection!).getByLabelText(/show previous 3 facts for japan/i);

    // Navigate forward
    await user.click(nextButton);
    await flushAll();

    // Should show different facts (cards 4-6)
    expect(prevButton).toBeEnabled();

    // Navigate back  
    await user.click(prevButton);
    await flushAll();

    // Should be back to start
    expect(prevButton).toBeDisabled();
  });

  test('refresh facts button generates new random facts', async () => {
    const user = createUser();
    mockApiResponses({ factsSuccess: true });

    render(<CulturalExplorer />);
    await expectMainLoaded();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
    });

    const japanSection = screen.getByRole('heading', { name: /japan/i }).closest('article');
    const refreshButton = within(japanSection!).getByLabelText(/refresh facts for japan/i);

    await user.click(refreshButton);
    await flushAll();

    // Should still show Japan facts (content may change due to randomization)
    expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
  });
});

describe('CulturalExplorer — Quiz Functionality', () => {
  test('South Africa quiz flow works correctly', async () => {
    const user = createUser();
    mockApiResponses({ factsSuccess: true });

    render(<CulturalExplorer />);
    await expectMainLoaded();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /south africa/i })).toBeInTheDocument();
    });

    const saSection = screen.getByRole('heading', { name: /south africa/i }).closest('article');
    const quizButton = within(saSection!).getByRole('button', { name: /quiz/i });

    // Start quiz
    await user.click(quizButton);
    await flushAll();

    // Should show quiz interface
    expect(screen.getByRole('heading', { name: /south africa quiz/i })).toBeInTheDocument();
    expect(screen.getByText(/question 1 of/i)).toBeInTheDocument();

    // Should show first question about languages
    expect(screen.getByText(/how many official languages/i)).toBeInTheDocument();

    // Select correct answer (B: 11 languages)
    const correctOption = screen.getByRole('radio', { name: /b\./i });
    await user.click(correctOption.closest('label')!);
    await flushAll();

    // Submit answer
    const submitButton = screen.getByRole('button', { name: /submit answer/i });
    await user.click(submitButton);
    await flushAll();

    // Should show explanation
    expect(screen.getByText(/correct!/i)).toBeInTheDocument();
    expect(screen.getByText(/south africa has 11 official languages/i)).toBeInTheDocument();

    // Continue to next question
    const nextButton = screen.getByRole('button', { name: /continue to question 2 of 3/i });
    await user.click(nextButton);
    await flushAll();

    expect(screen.getByText(/question 2 of/i)).toBeInTheDocument();
  });

  test('quiz can be exited at any time', async () => {
    const user = createUser();
    mockApiResponses({ factsSuccess: true });

    render(<CulturalExplorer />);
    await expectMainLoaded();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /south africa/i })).toBeInTheDocument();
    });

    const saSection = screen.getByRole('heading', { name: /south africa/i }).closest('article');
    const quizButton = within(saSection!).getByRole('button', { name: /quiz/i });

    // Start quiz
    await user.click(quizButton);
    await flushAll();

    expect(screen.getByRole('heading', { name: /south africa quiz/i })).toBeInTheDocument();

    // Exit quiz
    const exitButton = screen.getByRole('button', { name: /exit quiz/i });
    await user.click(exitButton);
    await flushAll();

    // Should be back to facts view
    expect(screen.getByRole('heading', { name: /south africa/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /south africa quiz/i })).not.toBeInTheDocument();
  });
});

describe('CulturalExplorer — Pen Pal Integration', () => {
  test('displays pen pal information correctly', async () => {
    mockApiResponses({ factsSuccess: true });

    render(<CulturalExplorer />);
    await expectMainLoaded();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /south africa/i })).toBeInTheDocument();
    });

    // Should show pen pal count and handles
    expect(screen.getByText(/2 pen pals from this country/i)).toBeInTheDocument();
    expect(screen.getByText(/@cape_town_local/)).toBeInTheDocument();
    expect(screen.getByText(/@another_sa_friend/)).toBeInTheDocument();
  });

  test('shows summary information correctly', async () => {
    mockApiResponses({ factsSuccess: true });

    render(<CulturalExplorer />);
    await expectMainLoaded();

    await waitFor(() => {
      // Should show summary with country and pen pal counts
      expect(screen.getByText(/3 pen pal countries, 4 pen pals/i)).toBeInTheDocument();
    });
  });
});

describe('CulturalExplorer — Accessibility', () => {
  test('has proper ARIA landmarks and headings', async () => {
    mockApiResponses({ factsSuccess: true });

    render(<CulturalExplorer />);
    await expectMainLoaded();

    // Should have main content area
    expect(screen.getByRole('main')).toBeInTheDocument();

    // Should have proper heading hierarchy
    expect(screen.getByRole('heading', { level: 1, name: /cultural explorer/i })).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: /japan/i })).toBeInTheDocument();
    });
  });

  test('quiz has proper form accessibility', async () => {
    const user = createUser();
    mockApiResponses({ factsSuccess: true });

    render(<CulturalExplorer />);
    await expectMainLoaded();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /south africa/i })).toBeInTheDocument();
    });

    const saSection = screen.getByRole('heading', { name: /south africa/i }).closest('article');
    const quizButton = within(saSection!).getByRole('button', { name: /quiz/i });

    await user.click(quizButton);
    await flushAll();

    // Should have proper fieldset - look for the quiz question as the group name
    expect(screen.getByRole('group', { name: /how many official languages does south africa have/i })).toBeInTheDocument();
    
    // Radio buttons should be properly labeled
    const radioButtons = screen.getAllByRole('radio');
    expect(radioButtons.length).toBeGreaterThan(0);
    
    radioButtons.forEach(radio => {
      expect(radio).toHaveAccessibleName();
    });
  });

  test('navigation elements have proper ARIA labels', async () => {
    mockApiResponses({ factsSuccess: true });

    render(<CulturalExplorer />);
    await expectMainLoaded();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
    });

    const japanSection = screen.getByRole('heading', { name: /japan/i }).closest('article');
    
    // Navigation arrows should have descriptive labels
    const nextButton = within(japanSection!).getByLabelText(/show next 3 facts for japan/i);
    const prevButton = within(japanSection!).getByLabelText(/show previous 3 facts for japan/i);
    
    expect(nextButton).toHaveAccessibleName();
    expect(prevButton).toHaveAccessibleName();
  });
});

describe('CulturalExplorer — Error Handling', () => {
  test('handles facts fetch failure gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockApiResponses({ factsSuccess: false });

    render(<CulturalExplorer />);
    await expectMainLoaded();

    await waitFor(() => {
      // Should use fallback data
      expect(screen.getByRole('heading', { name: /south africa/i })).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});

describe('CulturalExplorer — Global Actions', () => {
  test('refresh all facts button works', async () => {
    const user = createUser();
    mockApiResponses({ factsSuccess: true });

    render(<CulturalExplorer />);
    await expectMainLoaded();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
    });

    // Find and click refresh all facts button - look for the actual button text
    const refreshAllButton = screen.getByRole('button', { name: /refresh facts for all/i });
    await user.click(refreshAllButton);
    await flushAll();

    // Should still show all countries
    expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /south africa/i })).toBeInTheDocument();
  });
});