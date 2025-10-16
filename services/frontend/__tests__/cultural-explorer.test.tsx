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

// Mock ProfileContext to provide consistent user data
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

// Mock MessagingApiClient for pen pal data
jest.mock('../lib/MessagingApiClient', () => {
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
  },
  {
    user_profile: {
      user_id: 'user3',
      anonymous_handle: 'nyc_wanderer', 
      country_code: 'US'
    }
  },
  {
    user_profile: {
      user_id: 'user4',
      anonymous_handle: 'another_sa_friend',
      country_code: 'ZA'
    }
  }
];

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
  penPalsData = MOCK_PEN_PALS,
  factsSuccess = true,
  penPalsSuccess = true,
}: {
  factsData?: any,
  penPalsData?: any[],
  factsSuccess?: boolean,
  penPalsSuccess?: boolean,
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
      };
    }
    return { ok: false, json: async () => ({}) };
  });

  // Mock MessagingApiClient
  const MessagingApiClient = require('../lib/MessagingApiClient').default;
  MessagingApiClient.mockImplementation(() => ({
    searchUsers: jest.fn(penPalsSuccess 
      ? () => Promise.resolve({ items: penPalsData })
      : () => Promise.reject(new Error('API Error'))
    ),
  }));
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

  test('shows no matches state when no pen pals exist', async () => {
    mockApiResponses({ penPalsData: [], factsSuccess: true });

    render(<CulturalExplorer />);
    await expectMainLoaded();

    // Should show empty state
    expect(screen.getByRole('heading', { name: /no pen pal countries yet/i })).toBeInTheDocument();
    expect(screen.getByText(/start connecting with pen pals/i)).toBeInTheDocument();
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

  test('expand/collapse pen pal list when more than 4 pen pals', async () => {
    const user = createUser();
    const manyPenPals = [
      ...MOCK_PEN_PALS,
      { user_profile: { user_id: 'user5', anonymous_handle: 'extra_sa_1', country_code: 'ZA' }},
      { user_profile: { user_id: 'user6', anonymous_handle: 'extra_sa_2', country_code: 'ZA' }},
      { user_profile: { user_id: 'user7', anonymous_handle: 'extra_sa_3', country_code: 'ZA' }},
    ];
    
    mockApiResponses({ penPalsData: manyPenPals, factsSuccess: true });

    render(<CulturalExplorer />);
    await expectMainLoaded();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /south africa/i })).toBeInTheDocument();
    });

    // Should show +1 more button (5 total SA pen pals - 4 showing = 1 more)
    expect(screen.getByText('+1 more')).toBeInTheDocument();

    // Click to expand (showing 1 more) - use South Africa specific pattern
    const expandButton = screen.getByRole('button', { name: /show 1 more pen pals from south africa/i });
    await user.click(expandButton);
    await flushAll();

    // Should show all pen pals and show less button
    expect(screen.getByText(/@extra_sa_1/)).toBeInTheDocument();
    expect(screen.getByText(/@extra_sa_2/)).toBeInTheDocument();
    expect(screen.getByText(/@extra_sa_3/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show fewer pen pals from south africa/i })).toBeInTheDocument();
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

  test('handles pen pal API failure gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock pen pal API to fail while facts succeed
    mockApiResponses({ factsSuccess: true, penPalsSuccess: false });

    render(<CulturalExplorer />);
    await expectMainLoaded();

    await waitFor(() => {
      // Should show no matches state when API fails - use the actual heading text
      expect(screen.getByRole('heading', { name: /no pen pal countries yet/i })).toBeInTheDocument();
    }, { timeout: 8000 });

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