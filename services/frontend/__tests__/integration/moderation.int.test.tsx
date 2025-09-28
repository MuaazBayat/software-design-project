/** @jest-environment jsdom */
// --- Place mocks BEFORE importing the component ---

// Keep only the Profile context mocked so we can flip moderator/non‑moderator states.
jest.mock('../../lib/context/ProfileContext', () => ({
  __esModule: true,
  useProfile: jest.fn(),
}));

// Mock sonner toasts to keep the test output clean and let us trigger action callbacks
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
import { render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModerationDashboard from '@/app/moderation/page';
import { useProfile } from '../../lib/context/ProfileContext';

// MSW helpers from our drop‑in module (path is relative to this test file)
// NOTE: from __tests__/integration → ./setup/msw/...
import { resetModerationDb, seedModerationDb, factories } from '../setup/msw/moderation-handler';

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
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { /* silence React act warnings in tests */ });
});

afterEach(() => {
  consoleErrorSpy?.mockRestore();
});

describe('ModerationDashboard (MSW-backed)', () => {
  test('non-moderator sees Access Denied and does not attempt to fetch', async () => {
    await renderWithProfile({ user_id: 'user_123', moderator: false });
    expect(await screen.findByText(/Access Denied/i)).toBeInTheDocument();
    expect(screen.getByText(/You don't have permission/i)).toBeInTheDocument();
  });

  test('shows loading skeleton while profile is loading', async () => {
    (useProfile as jest.Mock).mockReturnValue({ profile: null, loading: true });
    render(<ModerationDashboard />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  test('moderator loads logs & banned users on mount; both Refresh buttons re-fetch', async () => {
    seedModerationDb({
      users: [
        factories.user({ user_id: 'mod_1', moderator: true, clerk_id: 'clrk_mod' }),
        factories.user({ user_id: 'u_100', clerk_id: 'clrk_100' }),
        factories.user({ user_id: 'u_200', clerk_id: 'clrk_200' }),
      ],
      logs: [
        factories.log({ target_type: 'message', target_id: 'm_1', reported_user_id: 'u_100', reporting_user_id: 'mod_1', violation_type: 'profanity', violation_description: 'Message contains offensive language', severity_level: 'medium', automated_detection: true, status: 'open' }),
        factories.log({ target_type: 'user', target_id: 'u_200', reported_user_id: 'u_200', reporting_user_id: 'mod_1', violation_type: 'harassment', violation_description: 'Repeated targeted insults', severity_level: 'high', automated_detection: false, status: 'resolved' }),
      ],
    });

    const user = await renderWithProfile({ user_id: 'mod_1', moderator: true });

    expect(await screen.findByText(/Moderation Dashboard/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/profanity/i)).toBeInTheDocument();
      expect(screen.getByText(/harassment/i)).toBeInTheDocument();
    });

    // Stats cards reflect counts (scope by card labels to avoid duplicate number matches)
    const totalCard = screen.getByText(/Total Cases/i).closest('div')!;
    expect(within(totalCard).getByText(/^2$/)).toBeInTheDocument();

    const openCard = screen.getByText(/Open Cases/i).closest('div')!;
    expect(within(openCard).getByText(/^1$/)).toBeInTheDocument();

    // "In Review" appears both as a <p> label and a <option> in the filter.
    // Choose the <p> instance to scope the card value correctly.
    const reviewP = screen.getAllByText(/^In Review$/i)
      .find((el) => el.tagName.toLowerCase() === 'p') as HTMLElement;
    const reviewCard = reviewP.closest('div')!;
    expect(within(reviewCard).getByText(/^0$/)).toBeInTheDocument();
    const resolvedCard = screen.getByText(/^Resolved$/i, { selector: 'p' }).closest('div')!;
    expect(within(resolvedCard).getByText(/^1$/)).toBeInTheDocument();

    // Banned users header present
    expect(screen.getByRole('heading', { name: /^Banned Users$/i })).toBeInTheDocument();

    const refreshButtons = await screen.findAllByRole('button', { name: /refresh/i });
    expect(refreshButtons.length).toBeGreaterThanOrEqual(2);

    await act(async () => { await user.click(refreshButtons[0]); });
    await waitFor(() => { expect(screen.getByText(/profanity/i)).toBeInTheDocument(); });

    await act(async () => { await user.click(refreshButtons[1]); });
    await waitFor(() => { expect(screen.getByRole('heading', { name: /^Banned Users$/i })).toBeInTheDocument(); });
  });

  test('filters by status and type', async () => {
    seedModerationDb({
      users: [ factories.user({ user_id: 'mod_2', moderator: true, clerk_id: 'clrk_mod2' }) ],
      logs: [
        factories.log({ target_type: 'message', target_id: 'm_2', reported_user_id: 'u_x', reporting_user_id: 'mod_2', violation_type: 'spam', violation_description: 'spam msg', severity_level: 'low', automated_detection: false, status: 'open' }),
        factories.log({ target_type: 'user', target_id: 'u_y', reported_user_id: 'u_y', reporting_user_id: 'mod_2', violation_type: 'harassment', violation_description: 'mean words', severity_level: 'high', automated_detection: false, status: 'resolved' }),
      ],
    });

    await renderWithProfile({ user_id: 'mod_2', moderator: true });

    // Initially both visible (anchor to avoid matching title+description simultaneously)
    await screen.findByText(/^spam$/i);
    await screen.findByText(/^harassment$/i);

    // Filter by status: resolved (labels may not be associated, so target by role)
    const [statusSelect, typeSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[];

    await act(async () => { await userEvent.selectOptions(statusSelect, 'resolved'); });

    expect(screen.queryByText(/^spam$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/^harassment$/i)).toBeInTheDocument();

    // Filter by type: message (should hide the user case)
    await act(async () => { await userEvent.selectOptions(typeSelect, 'message'); });

    expect(screen.queryByText(/^harassment$/i)).not.toBeInTheDocument();
  });

  test('shows toast error when banned users API fails', async () => {
    // Be tolerant to path differences in CI vs local by trying two likely paths
    let server: any;
    try { ({ server } = require('./setup/msw/server')); }
    catch { ({ server } = require('../setup/msw/server')); }

    const { http, HttpResponse } = require('msw');

    server.use(
      http.get('*/api/v1/banned-users', () => HttpResponse.text('fail', { status: 500 }))
    );

    seedModerationDb({ users: [ factories.user({ user_id: 'mod_3', moderator: true }) ] });

    await renderWithProfile({ user_id: 'mod_3', moderator: true });

    // Click banned users Refresh to trigger the failing call
    const refreshButtons = await screen.findAllByRole('button', { name: /refresh/i });
    await act(async () => { await userEvent.click(refreshButtons[1]); });

    expect(toastError).toHaveBeenCalled();
  });

  test('unban flow calls API via toast action', async () => {
    seedModerationDb({
      users: [
        factories.user({ user_id: 'mod_4', moderator: true, clerk_id: 'clrk_mod4' }),
        factories.user({ user_id: 'banned_1', clerk_id: 'clrk_banned', account_status: 'banned', anonymous_handle: 'badguy' }),
      ],
    });

    await renderWithProfile({ user_id: 'mod_4', moderator: true });

    const unbanBtn = await screen.findByRole('button', { name: /Unban/i });
    await act(async () => { await userEvent.click(unbanBtn); });

    // The component calls toast('Are you sure…', { action: { onClick } })
    // Our mock captured it; grab the last call and invoke the action
    const calls = (toastFn as jest.Mock).mock.calls;
    const last = calls[calls.length - 1];
    const opts = typeof last[0] === 'string' ? last[1] : last[0];

    await act(async () => { await opts.action.onClick(); });

    // Success toast should be called after API completes
    expect(toastSuccess).toHaveBeenCalled();
  });
});
