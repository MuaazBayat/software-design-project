/** @jest-environment jsdom */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// -- Make sure the page sees a signed-in user
jest.mock('../../lib/context/ProfileContext', () => ({
  __esModule: true,
  useSyncProfile: () => ({ profile: { user_id: 'me_1', clerk_id: 'clerk_1' }, synced: true }),
}));

// Give the page a router it can push to (if it does)
const push = jest.fn();
jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ push }),
}));

// Ensure we have a matchmaking base URL so the page builds absolute URLs;
// MSW will intercept regardless of the host.
process.env.NEXT_PUBLIC_MATCHMAKING_URL = 'https://matchmaking.local';

// --- MSW ---
import { server } from '../setup/msw/server';
import { http, HttpResponse } from 'msw';

// Local in-memory fixtures the handlers will serve. We reset these before each test.
let profile: any;
let stats: { daily_remaining: number };
let suggestions: Array<any>;
let likeCalls = 0;
let passCalls = 0;

function useDefaultFixtures() {
  profile = {
    user_id: 'me_1',
    clerk_id: 'clerk_1',
    anonymous_handle: 'me',
    age: 24,
    location: 'Somewhere',
  };
  stats = { daily_remaining: 3 };
  suggestions = [
    {
      user_id: 'u_alice',
      anonymous_handle: 'alice',
      age: 23,
      bio: 'Hi I am Alice',
    },
    {
      user_id: 'u_bob',
      anonymous_handle: 'bob',
      age: 26,
      bio: 'Yo I am Bob',
    },
  ];
  likeCalls = 0;
  passCalls = 0;
}

beforeEach(() => {
  useDefaultFixtures();

  // Wire up the endpoints the page calls. These patterns intentionally use wildcards
  // so they match regardless of the exact base URL/route prefix the page constructs.
  server.use(
    // Profile of the signed-in user
    http.get('**/user/profile/:clerkId', ({ params }) => {
      if (params.clerkId !== 'clerk_1') return HttpResponse.json({ error: 'not found' }, { status: 404 });
      return HttpResponse.json(profile);
    }),

    // Daily remaining likes/passes/etc.
    http.get('**/user/stats/:clerkId', () => {
      return HttpResponse.json({ daily_remaining: stats.daily_remaining });
    }),

    // Suggestions feed
    http.get('**/profiles/suggestions/:clerkId', () => {
      return HttpResponse.json({ items: suggestions });
    }),

    // Like (aka find a match / send like)
    http.post('**/matches/find', async ({ request }) => {
      likeCalls += 1;
      // decrement remaining if possible
      if (stats.daily_remaining > 0) stats.daily_remaining -= 1;
      // emulate a small network delay
      await new Promise((r) => setTimeout(r, 5));
      return HttpResponse.json({ status: 'sent' });
    }),

    // Pass the current suggestion
    http.post('**/profiles/pass', async ({ request }) => {
      passCalls += 1;
      // Remove the first suggestion (the one currently shown)
      suggestions.shift();
      await new Promise((r) => setTimeout(r, 5));
      return HttpResponse.json({ ok: true });
    })
  );
});

afterEach(() => {
  server.resetHandlers();
});

// Import the page AFTER mocks/handlers so it binds to them
import MatchmakingPage from '@/app/matchmaking/page';

// -------- Tests --------
describe('Matchmaking page', () => {
  test('loads profile/stats and shows first suggestion', async () => {
    render(<MatchmakingPage />);

    // Wait for the first suggestion card to appear (alice)
    await screen.findByText(/alice/i);

    // Check the daily remaining number is shown somewhere ("3").
    // We don’t know the exact label, so just assert the number appears eventually.
    await waitFor(() => {
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    });
  });

  test('pass removes current suggestion and reveals the next', async () => {
    render(<MatchmakingPage />);
    await screen.findByText(/alice/i);

    // Click the Pass button
    await userEvent.click(screen.getByRole('button', { name: /pass/i }));

    // Pass handler called and the UI now shows the next suggestion (bob)
    await waitFor(() => {
      expect(passCalls).toBe(1);
      expect(screen.queryByText(/alice/i)).toBeNull();
      expect(screen.getByText(/bob/i)).toBeInTheDocument();
    });
  });

  test('like decrements remaining and shows confirmation behavior', async () => {
    render(<MatchmakingPage />);
    await screen.findByText(/alice/i);

    await userEvent.click(screen.getByRole('button', { name: /like/i }));

    await waitFor(() => {
      expect(likeCalls).toBe(1);
    });

    // Remaining should drop from 3 to 2 somewhere on the page.
    await waitFor(() => {
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    });
  });
});
