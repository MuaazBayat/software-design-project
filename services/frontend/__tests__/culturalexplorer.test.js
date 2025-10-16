/**
 * @file __tests__/culturalexplorer.test.js
 *
 * Tests CulturalExplorer (app/cultural-explorer/page.tsx)
 * - Render without errors
 * - Deck switching, select-country workflow
 * - Next Fact flipping (disabled while flipping)
 * - South Africa quiz (local bank) full flow
 * - Edge: facts fetch failure fallback
 * - Edge: empty dataset → select-country empty state
 * - Edge: API quiz failure (non-SA) → recover to facts
 */

import React from 'react';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CulturalExplorer from '../app/cultural-explorer/page';
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


// ---- Mocks ----

// Next/Image: render a plain <img />
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt = '', ...props }) => <img alt={alt} {...props} />,
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

// Helpers -------------------------------------------------------------

/** Create a userEvent instance that advances Jest fake timers. */
const createUser = () =>
  userEvent.setup({
    advanceTimers: jest.advanceTimersByTime, // <-- critical for fake timers
  });

/** Advance timers inside act */
const advance = async (ms) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

/** Flush any pending timers (like micro timeouts, animations) */
const flushAll = async () => {
  // Run a few cycles just in case there are chained timeouts
  await advance(0);
  await advance(0);
};

function mockFetchHandlers({
  factsJson,
  quizApi = { ok: true, data: { exercises: [] } },
}) {
  global.fetch = jest.fn(async (url) => {
    const u = typeof url === 'string' ? url : '';
    if (u.endsWith('/facts.json')) {
      if (factsJson === null) {
        throw new Error('Network down');
      }
      return {
        ok: factsJson && factsJson.__ok !== false,
        json: async () => (factsJson && factsJson.__data) || factsJson || {},
      };
    }
    if (u.includes('/api/quiz-engine')) {
      if (!quizApi || quizApi.ok === false) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return { ok: true, json: async () => ({ data: quizApi.data }) };
    }
    return { ok: true, json: async () => ({}) };
  });
}

// Data used in tests
const FACTS_OK = {
  Japan: {
    emoji: '🇯🇵',
    facts: ['Japan fact 1', 'Japan fact 2'],
  },
  'South Africa': {
    emoji: '🇿🇦',
    facts: ['SA fact 1', 'SA fact 2', 'SA fact 3'],
  },
};
const FACTS_NOT_OK = { __ok: false, __data: {} };

// Stabilize randomness (first item in sorted keys => "Japan")
const mockStableRandom = (value = 0.1) =>
  jest.spyOn(Math, 'random').mockReturnValue(value);

// A simple gate to ensure the main view is visible (no polling)
const expectMainLoaded = async () => {
  await flushAll();
  // The main headline is rendered once initial state is ready
  expect(screen.getByText(/cultural explorer/i)).toBeInTheDocument();
};

// ---------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------



describe('CulturalExplorer — render & basics', () => {
  test('renders without errors and transitions from loading → content', async () => {
    mockFetchHandlers({ factsJson: FACTS_OK });
    mockStableRandom(0.1);

    render(<CulturalExplorer />);
    // Initially shows loading
    expect(screen.getByText(/loading the deck/i)).toBeInTheDocument();

    await expectMainLoaded();

    // Deck buttons visible
    expect(screen.getByRole('button', { name: /your country/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /random country/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose country/i })).toBeInTheDocument();

    // Info badge (countries available)
    expect(screen.getByText(/countries available/i)).toBeInTheDocument();
  });
});

describe('CulturalExplorer — deck switching & facts', () => {
  test('switching decks updates state; select-country shows dropdown and options', async () => {
    const user = createUser();
    mockFetchHandlers({ factsJson: FACTS_OK });
    mockStableRandom(0.1);

    render(<CulturalExplorer />);
    await expectMainLoaded();

    // Default deck should be random → Shuffle button is visible
    expect(screen.getByRole('button', { name: /shuffle/i })).toBeInTheDocument();

    // Switch to "Your Country"
    await user.click(screen.getByRole('button', { name: /your country/i }));
    await flushAll();

    expect(screen.queryByRole('button', { name: /shuffle/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /south africa/i })).toBeInTheDocument();
    expect(screen.getByText(/card 1 of/i)).toBeInTheDocument();

    // Choose country flow
    await user.click(screen.getByRole('button', { name: /choose country/i }));
    await flushAll();

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'Japan');
    await flushAll();

    expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
  });

  test('Next Fact flips to next and disables button during flip', async () => {
    const user = createUser();
    mockFetchHandlers({ factsJson: FACTS_OK });
    mockStableRandom(0.1);

    render(<CulturalExplorer />);
    await expectMainLoaded();

    const nextBtn = screen.getByRole('button', { name: /next fact/i });
    expect(nextBtn).toBeEnabled();

    await user.click(nextBtn);
    // Immediately after click, flipping starts, label likely changes
    await flushAll();

    expect(screen.getByRole('button', { name: /flipping/i })).toBeDisabled();

    // Finish flip (220ms)
    await advance(220);
    expect(screen.getByRole('button', { name: /next fact/i })).toBeEnabled();
    expect(screen.getByText(/card 2 of/i)).toBeInTheDocument();
  });
});

describe('CulturalExplorer — quiz flow (South Africa hardcoded quiz)', () => {
  test('Take Quiz → loading → active; answer shows explanation; next → complete; back to facts', async () => {
    const user = createUser();
    mockFetchHandlers({ factsJson: FACTS_OK });
    mockStableRandom(0.1);

    render(<CulturalExplorer />);
    await expectMainLoaded();

    // Force South Africa
    await user.click(screen.getByRole('button', { name: /your country/i }));
    await flushAll();
    expect(screen.getByRole('heading', { name: /south africa/i })).toBeInTheDocument();

    // Start quiz
    await user.click(screen.getByRole('button', { name: /take quiz/i }));
    await flushAll();
    expect(screen.getByText(/generating your personalized quiz/i)).toBeInTheDocument();

    // Quiz appears after 1500ms
    await advance(1500);
    expect(screen.getByRole('heading', { name: /south africa quiz/i })).toBeInTheDocument();
    expect(screen.getAllByText(/question 1 of/i)).toHaveLength(2); // One in UI, one in aria-live announcements

    // Answer first question (option A)
    const firstOption = screen.getByRole('button', { name: /Option A: 9 languages/ });
    await user.click(firstOption);
    await flushAll();

    // Explanation shows after 500ms
    await advance(500);
    expect(screen.getByText(/explanation:/i)).toBeInTheDocument();

    // Next → q2
    await user.click(screen.getByRole('button', { name: /next question/i }));
    await flushAll();
    expect(screen.getAllByText(/question 2 of/i)).toHaveLength(2); // One in UI, one in aria-live announcements

    // Answer Q2 (any option), explain, next
    const anyOptionQ2 = screen.getByRole('button', { name: /Option B:/ });
    await user.click(anyOptionQ2);
    await flushAll();
    await advance(500);
    await user.click(screen.getByRole('button', { name: /next question/i }));
    await flushAll();
    expect(screen.getAllByText(/question 3 of/i)).toHaveLength(2); // One in UI, one in aria-live announcements

    // Q3 → finish
    const anyOptionQ3 = screen.getByRole('button', { name: /Option C:/ });
    await user.click(anyOptionQ3);
    await flushAll();
    await advance(500);
    await user.click(screen.getByRole('button', { name: /finish quiz/i }));
    await flushAll();

    // Completed state
    expect(screen.getByRole('heading', { name: /quiz complete/i })).toBeInTheDocument();
    expect(screen.getByTestId('final-score')).toHaveTextContent(/\d+ out of \d+ correct/);

    // Back to facts
    await user.click(screen.getByRole('button', { name: /back to facts/i }));
    await flushAll();
    expect(screen.getByText(/card 1 of/i)).toBeInTheDocument();
  });
});

describe('CulturalExplorer — edges', () => {
  test('facts fetch failure uses fallback dataset', async () => {
    mockFetchHandlers({ factsJson: null }); // throws on /facts.json
    mockStableRandom(0.1);

    render(<CulturalExplorer />);
    await expectMainLoaded();

    // Fallback has 2 countries
    const info = screen.getByText(/countries available/i);
    expect(info).toHaveTextContent('2');
  });

test('empty dataset shows select-country empty state when chosen', async () => {
  const user = createUser();
  mockFetchHandlers({ factsJson: {} });
  mockStableRandom(0.1);

  render(<CulturalExplorer />);
  await expectMainLoaded();

  // Enter Choose Country mode
  await user.click(screen.getByRole('button', { name: /choose country/i }));
  await flushAll();

  // Empty state is visible
  expect(
    screen.getByRole('heading', { name: /select a country/i })
  ).toBeInTheDocument();

  // The dropdown exists but has only the placeholder option
  const select = screen.getByRole('combobox');
  const options = within(select).getAllByRole('option');
  expect(options).toHaveLength(1);
  expect(options[0]).toHaveTextContent(/select a country/i);

  // With no facts selected, these actions should not be rendered
  expect(screen.queryByRole('button', { name: /take quiz/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /next fact/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /shuffle/i })).not.toBeInTheDocument();
});


  test('API quiz failure (non South Africa): returns to idle facts (no crash)', async () => {
    const user = createUser();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchHandlers({ factsJson: FACTS_OK, quizApi: { ok: false } });
    mockStableRandom(0.1); // random -> Japan

    render(<CulturalExplorer />);
    await expectMainLoaded();

    // Confirm we’re on a facts card
    expect(screen.getByRole('heading', { name: /japan/i })).toBeInTheDocument();
    expect(screen.getByText(/card 1 of/i)).toBeInTheDocument();

    // Start quiz (API path since country !== South Africa)
    await user.click(screen.getByRole('button', { name: /take quiz/i }));
    await flushAll();
    expect(screen.getByText(/generating your personalized quiz/i)).toBeInTheDocument();

    // After 1500ms, API "fails" → component should recover to idle facts
    await advance(1500);
    await flushAll();

    await waitFor(() => {
      expect(screen.getByText(/card 1 of/i)).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalled();
  });
});
