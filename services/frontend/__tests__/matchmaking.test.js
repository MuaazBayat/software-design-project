/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MatchScreen from '../app/matchmaking/page';
import { useUser } from '@clerk/nextjs';

// Mock the useUser hook
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
}));

// Reset mocks before each test
beforeEach(() => {
  global.fetch = jest.fn();
  // Mock environment variable
  process.env.NEXT_PUBLIC_MATCHMAKING_URL = 'http://localhost:3000/api';
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('MatchScreen - Additional Tests', () => {

  test('displays daily stats correctly when available', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1' } });

    fetch.mockImplementation((url) => {
      if (url.includes('/user/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ profile: { anonymous_handle: 'TestUser', country_code: 'US' } }) });
      }
      if (url.includes('/user/stats/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches_remaining: 3, total_daily_limit: 10 }) });
      }
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<MatchScreen />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('3 of 10 remaining')).toBeInTheDocument();
    });
  });

  test('opens and closes filter modal', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1' } });

    fetch.mockImplementation((url) => {
      if (url.includes('/user/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ profile: { anonymous_handle: 'TestUser', country_code: 'US' } }) });
      }
      if (url.includes('/user/stats/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches_remaining: 5, total_daily_limit: 10 }) });
      }
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<MatchScreen />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText(/Hi, TestUser/i)).toBeInTheDocument();
    });

    // Find settings button by icon (Settings button is the first one with no aria-label)
    const allButtons = screen.getAllByRole('button');
    const settingsButton = allButtons.find(button => 
      button.querySelector('svg') && 
      !button.hasAttribute('aria-label') &&
      button.querySelector('svg').querySelector('circle[cx="12"][cy="12"][r="3"]')
    );
    
    expect(settingsButton).toBeTruthy();
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Find Your Perfect Match')).toBeInTheDocument();
    });

    // Find close button by looking for X icon
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(button => 
      button.querySelector('svg') &&
      button.querySelector('path[d="M18 6 6 18"]')
    );
    
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton);
  });

  test('displays no suggestions message when no profiles available', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1' } });

    fetch.mockImplementation((url) => {
      if (url.includes('/user/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ profile: { anonymous_handle: 'TestUser', country_code: 'US' } }) });
      }
      if (url.includes('/user/stats/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches_remaining: 5, total_daily_limit: 10 }) });
      }
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<MatchScreen />);

    await waitFor(() => {
      expect(screen.getByText('No more suggestions')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters or check back later!')).toBeInTheDocument();
    });
  });

  test('displays daily limit reached message when matches remaining is 0', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1' } });

    fetch.mockImplementation((url) => {
      if (url.includes('/user/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ profile: { anonymous_handle: 'TestUser', country_code: 'US' } }) });
      }
      if (url.includes('/user/stats/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches_remaining: 0, total_daily_limit: 10 }) });
      }
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ user_id: 'suggested1', anonymous_handle: 'MatchUser', country_code: 'JP' }]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<MatchScreen />);

    await waitFor(() => {
      expect(screen.getByText('Daily limit reached!')).toBeInTheDocument();
      expect(screen.getByText(/You've used all your daily matches/i)).toBeInTheDocument();
    });
  });

  test('disables action buttons when daily limit is reached', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1' } });

    fetch.mockImplementation((url) => {
      if (url.includes('/user/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ profile: { anonymous_handle: 'TestUser', country_code: 'US' } }) });
      }
      if (url.includes('/user/stats/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches_remaining: 0, total_daily_limit: 10 }) });
      }
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ user_id: 'suggested1', anonymous_handle: 'MatchUser', country_code: 'JP' }]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<MatchScreen />);

    await waitFor(() => {
      const likeButton = screen.getByRole('button', { name: /like/i });
      const passButton = screen.getByRole('button', { name: /pass/i });
      
      expect(likeButton).toBeDisabled();
      expect(passButton).toBeDisabled();
    });
  });

  test('displays profile with bio and interests correctly', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1' } });

    const mockProfile = {
      user_id: 'suggested1',
      anonymous_handle: 'MatchUser',
      country_code: 'JP',
      bio: 'Love traveling and meeting new people',
      age_range: '25-34',
      interests: ['Reading', 'Photography', 'Hiking'],
      favorite_local_fact: 'Tokyo has more vending machines than any other city',
      primary_language: 'ja',
      secondary_languages: ['en'],
      cultural_completeness_score: 0.85
    };

    fetch.mockImplementation((url) => {
      if (url.includes('/user/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ profile: { anonymous_handle: 'TestUser', country_code: 'US' } }) });
      }
      if (url.includes('/user/stats/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches_remaining: 5, total_daily_limit: 10 }) });
      }
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([mockProfile]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<MatchScreen />);

    await waitFor(() => {
      expect(screen.getByText('MatchUser')).toBeInTheDocument();
    });

    // Check bio content is there (may be wrapped in quotes)
    await waitFor(() => {
      expect(screen.getByText((content, element) => 
        content.includes('Love traveling and meeting new people')
      )).toBeInTheDocument();
    });

    // Check for other profile elements
    expect(screen.getByText('Adult')).toBeInTheDocument();
    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByText('Photography')).toBeInTheDocument();
    expect(screen.getByText('Hiking')).toBeInTheDocument();
    expect(screen.getByText('Tokyo has more vending machines than any other city')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  test('handles API errors gracefully during match creation', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1' } });

    // Mock window.alert
    window.alert = jest.fn();

    fetch.mockImplementation((url) => {
      if (url.includes('/user/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ profile: { anonymous_handle: 'TestUser', country_code: 'US' } }) });
      }
      if (url.includes('/user/stats/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches_remaining: 5, total_daily_limit: 10 }) });
      }
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ user_id: 'suggested1', anonymous_handle: 'MatchUser', country_code: 'JP' }]) });
      }
      if (url.includes('/matches/find')) {
        return Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({ detail: 'Match creation failed' }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<MatchScreen />);

    // Wait for suggestion to appear
    await waitFor(() => {
      expect(screen.getByText(/MatchUser/i)).toBeInTheDocument();
    });

    // Click like button
    const likeButton = screen.getByRole('button', { name: /like/i });
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Match creation failed');
    });
  });

  test('handles network errors during API calls', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1' } });

    // Mock window.alert
    window.alert = jest.fn();

    fetch.mockImplementation((url) => {
      if (url.includes('/user/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ profile: { anonymous_handle: 'TestUser', country_code: 'US' } }) });
      }
      if (url.includes('/user/stats/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches_remaining: 5, total_daily_limit: 10 }) });
      }
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ user_id: 'suggested1', anonymous_handle: 'MatchUser', country_code: 'JP' }]) });
      }
      if (url.includes('/matches/find')) {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<MatchScreen />);

    // Wait for suggestion to appear
    await waitFor(() => {
      expect(screen.getByText(/MatchUser/i)).toBeInTheDocument();
    });

    // Click like button
    const likeButton = screen.getByRole('button', { name: /like/i });
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Connection error. Please check if the server is running and try again.');
    });
  });

  test('shows loading state during action processing', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1' } });

    let resolveMatchPromise;
    const matchPromise = new Promise(resolve => {
      resolveMatchPromise = resolve;
    });

    fetch.mockImplementation((url) => {
      if (url.includes('/user/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ profile: { anonymous_handle: 'TestUser', country_code: 'US' } }) });
      }
      if (url.includes('/user/stats/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches_remaining: 5, total_daily_limit: 10 }) });
      }
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ user_id: 'suggested1', anonymous_handle: 'MatchUser', country_code: 'JP' }]) });
      }
      if (url.includes('/matches/find')) {
        return matchPromise.then(() => 
          Promise.resolve({ ok: true, json: () => Promise.resolve({ penpal_profile: { anonymous_handle: 'MatchUser' } }) })
        );
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<MatchScreen />);

    // Wait for suggestion to appear
    await waitFor(() => {
      expect(screen.getByText(/MatchUser/i)).toBeInTheDocument();
    });

    // Click like button
    const likeButton = screen.getByRole('button', { name: /like/i });
    fireEvent.click(likeButton);

    // Check loading state
    expect(screen.getByText('Processing your choice...')).toBeInTheDocument();

    // Resolve the promise to finish loading
    resolveMatchPromise();
  });

  test('displays correct country flags and names', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1' } });

    const testCases = [
      { code: 'JP', name: 'Japan' },
      { code: 'US', name: 'United States' },
      { code: 'FR', name: 'France' },
      { code: 'DE', name: 'Germany' },
      { code: 'UNKNOWN', name: 'UNKNOWN' }
    ];

    for (const testCase of testCases) {
      fetch.mockImplementation((url) => {
        if (url.includes('/user/profile/')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ profile: { anonymous_handle: 'TestUser', country_code: 'US' } }) });
        }
        if (url.includes('/user/stats/')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches_remaining: 5, total_daily_limit: 10 }) });
        }
        if (url.includes('/profiles/suggestions/')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ 
            user_id: 'suggested1', 
            anonymous_handle: 'MatchUser', 
            country_code: testCase.code 
          }]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { unmount } = render(<MatchScreen />);

      await waitFor(() => {
        // For countries that appear multiple times, just check that at least one exists
        const elements = screen.getAllByText(testCase.name);
        expect(elements.length).toBeGreaterThan(0);
      });

      unmount();
    }
  });

  test('handles successful match creation and shows success message', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1' } });

    // Mock window.alert
    window.alert = jest.fn();

    fetch.mockImplementation((url) => {
      if (url.includes('/user/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ profile: { anonymous_handle: 'TestUser', country_code: 'US' } }) });
      }
      if (url.includes('/user/stats/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches_remaining: 5, total_daily_limit: 10 }) });
      }
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ user_id: 'suggested1', anonymous_handle: 'MatchUser', country_code: 'JP' }]) });
      }
      if (url.includes('/matches/find')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ penpal_profile: { anonymous_handle: 'MatchUser' } }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<MatchScreen />);

    // Wait for suggestion to appear
    await waitFor(() => {
      expect(screen.getByText(/MatchUser/i)).toBeInTheDocument();
    });

    // Click like button
    const likeButton = screen.getByRole('button', { name: /like/i });
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Match created with MatchUser! 🎉');
    });
  });

  test('displays age range correctly', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1' } });

    const ageRangeTests = [
      { range: '18-24', display: 'Young Adult' },
      { range: '25-34', display: 'Adult' },
      { range: '35-49', display: 'Middle-aged' },
      { range: '50+', display: 'Senior' }
    ];

    for (const test of ageRangeTests) {
      fetch.mockImplementation((url) => {
        if (url.includes('/user/profile/')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ profile: { anonymous_handle: 'TestUser', country_code: 'US' } }) });
        }
        if (url.includes('/user/stats/')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches_remaining: 5, total_daily_limit: 10 }) });
        }
        if (url.includes('/profiles/suggestions/')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ 
            user_id: 'suggested1', 
            anonymous_handle: 'MatchUser', 
            country_code: 'JP',
            age_range: test.range
          }]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { unmount } = render(<MatchScreen />);

      await waitFor(() => {
        expect(screen.getByText(test.display)).toBeInTheDocument();
      });

      unmount();
    }
  });

  test('prevents like action when daily limit exceeded with alert', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1' } });

    // Mock window.alert
    window.alert = jest.fn();

    fetch.mockImplementation((url) => {
      if (url.includes('/user/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ profile: { anonymous_handle: 'TestUser', country_code: 'US' } }) });
      }
      if (url.includes('/user/stats/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches_remaining: 0, total_daily_limit: 10 }) });
      }
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ user_id: 'suggested1', anonymous_handle: 'MatchUser', country_code: 'JP' }]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<MatchScreen />);

    // Wait for suggestion to appear
    await waitFor(() => {
      expect(screen.getByText(/MatchUser/i)).toBeInTheDocument();
    });

    // The like button should be disabled, so no API call should be made
    const likeButton = screen.getByRole('button', { name: /like/i });
    expect(likeButton).toBeDisabled();

    // Verify that no match API call was made when button is disabled
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/matches/find'), expect.any(Object));
  });

  test('displays different age range labels correctly', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1' } });

    const testProfile = {
      user_id: 'suggested1',
      anonymous_handle: 'TestUser',
      country_code: 'US',
      age_range: '18-24'
    };

    fetch.mockImplementation((url) => {
      if (url.includes('/user/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ profile: { anonymous_handle: 'TestUser', country_code: 'US' } }) });
      }
      if (url.includes('/user/stats/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches_remaining: 5, total_daily_limit: 10 }) });
      }
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([testProfile]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<MatchScreen />);

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument();
      expect(screen.getByText('Young Adult')).toBeInTheDocument();
    });
  });

  test('displays loading spinner when processing actions', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1' } });

    let resolvePromise;
    const slowPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    fetch.mockImplementation((url) => {
      if (url.includes('/user/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ profile: { anonymous_handle: 'TestUser', country_code: 'US' } }) });
      }
      if (url.includes('/user/stats/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ matches_remaining: 5, total_daily_limit: 10 }) });
      }
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ user_id: 'suggested1', anonymous_handle: 'MatchUser', country_code: 'JP' }]) });
      }
      if (url.includes('/profiles/pass')) {
        return slowPromise.then(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<MatchScreen />);

    await waitFor(() => {
      expect(screen.getByText(/MatchUser/i)).toBeInTheDocument();
    });

    // Click pass button
    const passButton = screen.getByRole('button', { name: /pass/i });
    fireEvent.click(passButton);

    // Should show loading
    expect(screen.getByText('Processing your choice...')).toBeInTheDocument();

    // Complete the action
    resolvePromise();

    // Wait for loading to disappear
    await waitFor(() => {
      expect(screen.queryByText('Processing your choice...')).not.toBeInTheDocument();
    });
  });
});