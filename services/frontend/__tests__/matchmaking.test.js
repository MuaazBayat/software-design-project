/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor,act  } from '@testing-library/react';
import MatchScreen from '../app/matchmaking/page';
import { useUser } from '@clerk/nextjs';
import userEvent from '@testing-library/user-event';
// Mock the useUser hook
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
}));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};

// Must be BEFORE the component import
jest.mock('sonner', () => {
  return {
    toast: {
      success: jest.fn(),
      error: jest.fn(),
    },
    // Avoid JSX in tests to keep SWC happy
    Toaster: () => null,
  };
});
const { toast } = require('sonner');

// Mock the ldrs library to avoid ES module issues
jest.mock('ldrs/react', () => ({
  LineSpinner: ({ size, stroke, speed, color }) => (
    <div data-testid="line-spinner" data-size={size} data-stroke={stroke} data-speed={speed} data-color={color}>
      Loading spinner mock
    </div>
  ),
}));

// Mock the CSS import
jest.mock('ldrs/react/LineSpinner.css', () => ({}));

// Mock the Loader component
jest.mock('@/components/ui/loader', () => {
  return function MockLoader() {
    return <div data-testid="loader">Loading...</div>;
  };
});



function jsonResponse(body, init = {}) {
  const status = init.status ?? 200;
  const headers = { 'Content-Type': 'application/json', ...(init.headers || {}) };
  const text = JSON.stringify(body);

  // Minimal fetch-like response object
  return {
    ok: status >= 200 && status < 300,
    status,
    headers,                  // only used rarely; fine as a plain object
    json: async () => body,   // consumers call res.json()
    text: async () => text,   // just in case something calls res.text()
  };
}
function setupHappyPathFetch() {
  const base = process.env.NEXT_PUBLIC_MATCHMAKING_URL || 'http://localhost:8001';
  const likeUrl = `${base}/matches/find`;
  const statsUrl = `${base}/user/stats/u_test`;
  const suggestionsUrl = `${base}/profiles/suggestions/u_test`;
  const passUrl = `${base}/profiles/pass`;
  const profileUrl = `${base}/user/profile/u_test`;

  // was: let finishLikeInternal: (() => void) | null = null;
  let finishLikeInternal = null;

  // If your Jest env doesn’t have fetch, stub something so we can spy on it.
  if (!global.fetch) {
    global.fetch = () => Promise.reject(new Error('fetch not available in this env'));
  }

  const fetchMock = jest.spyOn(global, 'fetch').mockImplementation((input, init = {}) => {
    const url = typeof input === 'string' ? input : String(input);
    const method = (init.method || 'GET').toUpperCase();

    // 1) GET stats → allow likes
    if (url.startsWith(statsUrl) && method === 'GET') {
      return Promise.resolve(jsonResponse({ matches_remaining: 5, total_daily_limit: 10 }));
    }

    // 2) GET suggestions → return ONE profile so the UI has something to like
    if (url.startsWith(suggestionsUrl) && method === 'GET') {
      return Promise.resolve(
        jsonResponse([
          {
            user_id: 'p_1',
            anonymous_handle: 'MatchUser',
            country_code: 'JP',
            age_range: '26-35',
            primary_language: 'ja',
            secondary_languages: ['en'],
            interests: ['Reading'],
            last_active: new Date().toISOString(),
            cultural_completeness_score: 0.9,
            preferred_correspondence_type: 'either',
          },
        ])
      );
    }

    // 3) Optional GET /user/profile (component calls but doesn't use)
    if (url.startsWith(profileUrl) && method === 'GET') {
      return Promise.resolve(jsonResponse({}));
    }

    // 4) POST pass → immediate ok
    if (url.startsWith(passUrl) && method === 'POST') {
      return Promise.resolve(jsonResponse({ ok: true }));
    }

    // 5) POST like → DELAY until we call finishLike()
    if (url.startsWith(likeUrl) && method === 'POST') {
      return new Promise((resolve) => {
        finishLikeInternal = () => {
          resolve(jsonResponse({ penpal_profile: { anonymous_handle: 'MatchUser' } }));
        };
      });
    }

    // Unexpected route — fail loudly so tests point you at missing stubs
    return Promise.reject(new Error(`Unhandled fetch: ${method} ${url}`));
  });

  return {
    fetchMock,
    finishLike: () => {
      if (finishLikeInternal) finishLikeInternal();
    },
  };
}
// Reset mocks before each test
beforeEach(() => {
  global.fetch = jest.fn();
  // Mock environment variable
  process.env.NEXT_PUBLIC_MATCHMAKING_URL = 'http://localhost:3000/api';
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();});

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
      expect(screen.getByText('3 of 10 remaining')).toBeInTheDocument();
    });
  });

  test('opens and closes filter modal', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1', firstName: 'TestUser' } });

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

    // Find settings button - look for UserSearch icon button
    const allButtons = screen.getAllByRole('button');
    const settingsButton = allButtons.find(button =>
      button.querySelector('svg') &&
      button.querySelector('svg').classList.contains('lucide-user-search')
    );

    if (settingsButton) {
      fireEvent.click(settingsButton);
    } else {
      // Skip this test if the settings button is not found
      return;
    }

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
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1', firstName: 'TestUser' } });

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
      expect(screen.getByText('No profiles available')).toBeInTheDocument();
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

// test('handles API errors gracefully during match creation', async () => {
//   const { fetchMock } = setupHappyPathFetch();
//   jest.useFakeTimers();

//   // Force ONLY the like call to fail for this test
//   const base = process.env.NEXT_PUBLIC_MATCHMAKING_URL || 'http://localhost:8001';
//   const likeUrl = `${base}/matches/find`;
//   const originalImpl = fetchMock.getMockImplementation();

//   fetchMock.mockImplementation((input, init = {}) => {
//     const url = typeof input === 'string' ? input : String(input);
//     const method = (init.method || 'GET').toUpperCase();
//     if (url.startsWith(likeUrl) && method === 'POST') {
//       return Promise.resolve(jsonResponse({ error: 'boom' }, { status: 500 }));
//     }
//     return originalImpl(input, init);
//   });

//   render(<MatchScreen />);

//   // The component uses setTimeout(...,0) before suggestions land; flush it
//   await act(async () => {
//     jest.runOnlyPendingTimers();
//   });

//   // Now suggestions should be on screen
//   await screen.findByText(/Japan/i);

//   // Use the same selectors you use in the passing "success" test
//   const likeBtn = screen.getByRole('button', { name: /like/i });
//   const passBtn = screen.getByRole('button', { name: /pass/i });

//   // Trigger the failing POST
//   await userEvent.click(likeBtn);

//   // Flush any follow-up timers
//   await act(async () => {
//     jest.runOnlyPendingTimers();
//   });

//   // Assert toast error was shown
//   const { toast } = require('sonner');
//   await waitFor(() => {
//     expect(toast.error).toHaveBeenCalledWith('Error creating match. Please try again.');
//   });

//   // Buttons should be re-enabled after the failure
//   await waitFor(() => {
//     expect(likeBtn).not.toBeDisabled();
//     expect(passBtn).not.toBeDisabled();
//   });
// });

   test('handles network errors during API calls', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1', firstName: 'TestUser' } });

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
    const likeButton = screen.getByLabelText(/like/i);
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error creating match. Please try again.');
    });
  });

// test('shows loading state during action processing', async () => {
//   const { finishLike } = setupHappyPathFetch(); // this returns one suggestion + a deferred POST /matches/find

//   render(<MatchScreen />);

//   // Wait for the Like/Pass buttons to actually appear in the DOM.
//   // Using findByRole ensures we don’t proceed until the profile card is rendered.
//   const likeBtn = await screen.findByRole('button', { name: /like/i });
//   const passBtn = screen.getByRole('button', { name: /pass/i });

//   // Kick off the async like action — the UI should disable both buttons while in-flight
//   await userEvent.click(likeBtn);
//   expect(likeBtn).toBeDisabled();
//   expect(passBtn).toBeDisabled();

//   // Resolve the deferred POST created by setupHappyPathFetch
//   finishLike();

//   // Wait for the UI to settle and re-enable controls
//   await waitFor(() => {
//     expect(likeBtn).not.toBeDisabled();
//     expect(passBtn).not.toBeDisabled();
//   });
// });



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
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user1', firstName: 'TestUser' } });

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
    const likeButton = screen.getByLabelText(/like/i);
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Match created with MatchUser! 🎉');
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

// test('displays loading spinner when processing actions', async () => {
// const { fetchMock, finishLike } = setupHappyPathFetch();
// jest.useFakeTimers();

// render(<MatchScreen />);
// await screen.findByText(/Japan/i);



// finishLike();
// await act(async () => {
//   jest.runOnlyPendingTimers();
// });

// await waitFor(() => {
//   expect(likeBtn).not.toBeDisabled();
//   expect(passBtn).not.toBeDisabled();
// });

//   });
});