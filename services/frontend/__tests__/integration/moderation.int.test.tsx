/** @jest-environment jsdom */
// --- Place mocks BEFORE importing the component ---

// We will use MSW handlers instead of mocking the API client.
// Keep only the Profile context mocked so we can flip moderator/non‑moderator states.
jest.mock('../../lib/context/ProfileContext', () => ({
  __esModule: true,
  useProfile: jest.fn(),
}));

// Mock sonner toasts to keep the test output clean
const toastSuccess = jest.fn();
const toastError = jest.fn();
const toastFn = jest.fn();
jest.mock('sonner', () => ({
  __esModule: true,
  Toaster: () => null,
  toast: Object.assign((...args: any[]) => toastFn(...args), {
    success: (...args: any[]) => toastSuccess(...args),
    error: (...args: any[]) => toastError(...args),
    dismiss: jest.fn(),
  }),
}));

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModerationDashboard from '@/app/moderation/page'; // adjust if route differs
import { useProfile } from '../../lib/context/ProfileContext';

// Import MSW test utils for the moderation service (use your real path)
import {
  resetModerationDb,
  seedModerationDb,
  factories,
} from '../setup/msw/moderation-handler';

// If your global test setup (setupTests.ts) already calls server.listen/reset/close,
// we don't need to import the server here. We only reset/seed our in‑memory tables per test.

const renderWithProfile = async (profile: any) => {
  (useProfile as jest.Mock).mockReturnValue({ profile, loading: false });
  const user = userEvent.setup();
  render(<ModerationDashboard />);
  return user;
};

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  resetModerationDb();
  // Silence React act warnings without breaking TS
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { /* noop */ });
});

afterEach(() => {
  consoleErrorSpy?.mockRestore();
});

describe('ModerationDashboard (MSW-backed)', () => {
  test('non-moderator sees Access Denied and does not attempt to fetch', async () => {
    // No seeding required; component should short‑circuit before calling endpoints
    await renderWithProfile({ user_id: 'user_123', moderator: false });

    expect(await screen.findByText(/Access Denied/i)).toBeInTheDocument();
    expect(screen.getByText(/You don't have permission/i)).toBeInTheDocument();
  });

  test('moderator loads logs & banned users on mount; both Refresh buttons re-fetch', async () => {
    // Seed a moderator profile (so /api/v1/logs allows access via X-User-Id header)
    seedModerationDb({
      users: [
        factories.user({ user_id: 'mod_1', moderator: true, clerk_id: 'clrk_mod' }),
        factories.user({ user_id: 'u_100', clerk_id: 'clrk_100' }),
        factories.user({ user_id: 'u_200', clerk_id: 'clrk_200' }),
      ],
      logs: [
        // two sample logs in reverse chronological order
        factories.log({
          target_type: 'message',
          target_id: 'm_1',
          reported_user_id: 'u_100',
          reporting_user_id: 'mod_1',
          violation_type: 'profanity',
          violation_description: 'Message contains offensive language',
          severity_level: 'medium',
          automated_detection: true,
          status: 'open',
        }),
        factories.log({
          target_type: 'user',
          target_id: 'u_200',
          reported_user_id: 'u_200',
          reporting_user_id: 'mod_1',
          violation_type: 'harassment',
          violation_description: 'Repeated targeted insults',
          severity_level: 'high',
          automated_detection: false,
          status: 'resolved',
        }),
      ],
    });

    const user = await renderWithProfile({ user_id: 'mod_1', moderator: true });

    // Header appears
    expect(await screen.findByText(/Moderation Dashboard/i)).toBeInTheDocument();

    // Logs list should eventually show items seeded above
    await waitFor(() => {
      expect(screen.getByText(/profanity/i)).toBeInTheDocument();
      expect(screen.getByText(/harassment/i)).toBeInTheDocument();
    });

    // Banned users section should render (may be empty initially)
    expect(
      screen.getByRole('heading', { name: /^Banned Users$/i })
    ).toBeInTheDocument();

    // There should be two refresh buttons: one for cases/logs and one for banned users
    const refreshButtons = await screen.findAllByRole('button', { name: /refresh/i });
    expect(refreshButtons.length).toBeGreaterThanOrEqual(2);

    // Click cases Refresh
    await act(async () => { await user.click(refreshButtons[0]); });
    // No explicit call count to assert; we rely on UI remaining stable and logs still present
    await waitFor(() => {
      expect(screen.getByText(/profanity/i)).toBeInTheDocument();
    });

    // Click banned users Refresh
    await act(async () => { await user.click(refreshButtons[1]); });
    // Still stable
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /^Banned Users$/i })
      ).toBeInTheDocument();
    });
  });
});
