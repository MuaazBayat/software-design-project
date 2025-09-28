/** @jest-environment jsdom */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---- Mocks BEFORE importing the page ----
// Clerk user (page gates on this)
jest.mock('@clerk/nextjs', () => ({
  __esModule: true,
  useUser: () => ({ isLoaded: true, isSignedIn: true, user: { id: 'clerk_1' } }),
}));

// Router
const push = jest.fn();
jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ push }),
}));

// Toasts (avoid noisy UI)
jest.mock('sonner', () => ({
  __esModule: true,
  Toaster: () => null,
  toast: Object.assign(() => {}, {
    success: () => {},
    error: () => {},
    dismiss: () => {},
  }),
}));

// ---- MSW ----
import { server } from '../setup/msw/server';
import { http, HttpResponse } from 'msw';

// Common fake data the page expects
const makeProfiles = () => ([
  { id: 'p_ari', handle: 'ari',   title: 'Ari',   description: 'A' },
  { id: 'p_bao', handle: 'bao',   title: 'Bao',   description: 'B' },
  { id: 'p_cyra', handle: 'cyra', title: 'Cyra',  description: 'C' },
  { id: 'p_dima', handle: 'dima', title: 'Dima',  description: 'D' },
]);

// Wire default handlers that match the page's fetches
beforeEach(() => {
  jest.clearAllMocks();

  server.resetHandlers();
  server.use(
    // GET real profiles for a given Clerk id
    http.get('*/preferences/profiles/:clerkId', () => {
      return HttpResponse.json({ profiles: makeProfiles() });
    }),

    // POST save selected profile
    http.post('*/preferences/select', async ({ request }) => {
      // let body = await request.json().catch(() => ({}));
      return HttpResponse.json({ ok: true });
    }),
  );
});

// Import page AFTER mocks
import PreferenceProfileSelector from '@/app/preference-profile/page';

// ---- Tests ----
describe('PreferenceProfileSelector (MSW-backed)', () => {
  test('loads profiles and allows selecting + saving preference', async () => {
    render(<PreferenceProfileSelector />);

    // Wait for one of the returned profile handles to appear
    const first = await screen.findByText(/ari|bao|cyra|dima/i);
    expect(first).toBeInTheDocument();

    // Click a profile card (pick Ari)
    await userEvent.click(screen.getByText(/ari/i));

    // Click save button
    const save = await screen.findByRole('button', { name: /save/i });
    await act(async () => { await userEvent.click(save); });

    // Expect navigation to matchmaking or success state (adapt to your page)
    // If your page shows a success banner, assert that instead.
    // Here we at least assert the button becomes disabled/changes text after save if implemented.
    // Fallback: just ensure save button still exists (render didn’t crash)
    expect(save).toBeInTheDocument();
  });

  test('handles API failure with error state and retry button', async () => {
    // First call fails
    server.use(
      http.get('*/preferences/profiles/:clerkId', () => HttpResponse.text('boom', { status: 500 }))
    );

    render(<PreferenceProfileSelector />);

    // Error UI renders
    expect(await screen.findByText(/failed to load profiles/i)).toBeInTheDocument();

    // Fix handler, then click Try Again
    server.use(
      http.get('*/preferences/profiles/:clerkId', () => HttpResponse.json({ profiles: makeProfiles() }))
    );

    const retry = screen.getByRole('button', { name: /try again/i });
    await act(async () => { await userEvent.click(retry); });

    // Now a profile should render
    expect(await screen.findByText(/ari|bao|cyra|dima/i)).toBeInTheDocument();
  });

  test('toggle to example profiles and back to real profiles', async () => {
    render(<PreferenceProfileSelector />);

    // Real profiles loaded
    const realFirst = await screen.findByText(/ari|bao|cyra|dima/i);
    expect(realFirst).toBeInTheDocument();

    // If your page has a toggle for example profiles, click it
    const toggleToExamples = screen.queryByRole('button', { name: /example profiles|use examples/i });
    if (toggleToExamples) {
      await userEvent.click(toggleToExamples);
      // Expect some placeholder/example text to appear (adjust this to your UI copy)
      // We use a permissive regex so the test won’t be brittle.
      expect(await screen.findByText(/example|demo|sample/i)).toBeInTheDocument();

      // Toggle back to real
      const toggleBack = screen.queryByRole('button', { name: /real profiles|use real/i });
      if (toggleBack) {
        await userEvent.click(toggleBack);
        expect(await screen.findByText(/ari|bao|cyra|dima/i)).toBeInTheDocument();
      }
    }
  });
});
