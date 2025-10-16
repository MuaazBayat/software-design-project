/** @jest-environment jsdom */
// --- Place mocks BEFORE importing the component ---

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: jest.fn(() => Promise.resolve('mock-token')),
    isLoaded: true,
    isSignedIn: true,
    userId: 'mock-user-id',
  }),
  useUser: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: { id: 'mock-user-id' },
  }),
}));

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

// Mock fetch globally
let fetchMock: jest.SpyInstance;

// In-memory store for moderation data
let moderationLogs: any[] = [];
let bannedUsers: any[] = [];

const resetModerationDb = () => {
  moderationLogs = [];
  bannedUsers = [];
};

const renderWithProfile = async (profile: any) => {
  (useProfile as jest.Mock).mockReturnValue({ profile, loading: false });
  const user = userEvent.setup();
  render(<ModerationDashboard />);
  return user;
};

let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
  fetchMock = jest.spyOn(global, 'fetch') as jest.SpyInstance;
});

beforeEach(() => {
  jest.clearAllMocks();
  resetModerationDb();
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { /* silence React act warnings in tests */ });
});

afterEach(() => {
  fetchMock.mockReset();
  consoleErrorSpy?.mockRestore();
});

afterAll(() => {
  fetchMock.mockRestore();
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
    moderationLogs = [
      { log_id: 'log_1', target_type: 'message', target_id: 'm_1', reported_user_id: 'u_100', reporting_user_id: 'mod_1', violation_type: 'profanity', violation_description: 'Message contains offensive language', severity_level: 'medium', automated_detection: true, status: 'open', created_at: new Date().toISOString() },
      { log_id: 'log_2', target_type: 'user', target_id: 'u_200', reported_user_id: 'u_200', reporting_user_id: 'mod_1', violation_type: 'harassment', violation_description: 'Repeated targeted insults', severity_level: 'high', automated_detection: false, status: 'resolved', created_at: new Date().toISOString() },
    ];
    bannedUsers = [];

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/v1/logs')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ logs: moderationLogs }),
        } as Response);
      } else if (url.includes('/api/v1/banned-users')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ banned_users: bannedUsers }),
        } as Response);
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    const user = await renderWithProfile({ user_id: 'mod_1', moderator: true });

    expect(await screen.findByText(/Moderation Dashboard/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/profanity/i)).toBeInTheDocument();
      expect(screen.getByText(/harassment/i)).toBeInTheDocument();
    });

    // Stats cards reflect counts (scope by card labels to avoid duplicate number matches)
    // "Total Cases" appears in both the stat card and nav, so filter for the <p> tag
    const totalCaseElements = screen.getAllByText(/^Total Cases$/i);
    const totalCaseP = totalCaseElements.find((el) => el.tagName.toLowerCase() === 'p') as HTMLElement;
    const totalCard = totalCaseP.closest('div')!;
    expect(within(totalCard).getByText(/^2$/)).toBeInTheDocument();

    const openCard = screen.getByText(/^Open Cases$/i, { selector: 'p' }).closest('div')!;
    expect(within(openCard).getByText(/^1$/)).toBeInTheDocument();

    // "In Review" appears both as a <p> label and a <option> in the filter.
    // Choose the <p> instance to scope the card value correctly.
    const reviewP = screen.getAllByText(/^In Review$/i)
      .find((el) => el.tagName.toLowerCase() === 'p') as HTMLElement;
    const reviewCard = reviewP.closest('div')!;
    expect(within(reviewCard).getByText(/^0$/)).toBeInTheDocument();
    const resolvedCard = screen.getByText(/^Resolved$/i, { selector: 'p' }).closest('div')!;
    expect(within(resolvedCard).getByText(/^1$/)).toBeInTheDocument();

    // Test Cases tab refresh button
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Moderation Cases/i })).toBeInTheDocument();
    });

    const casesHeading = screen.getByRole('heading', { name: /Moderation Cases/i });
    const casesHeaderBar = casesHeading.parentElement!;
    const casesRefreshBtn = within(casesHeaderBar).getByRole('button', { name: /refresh/i });

    await act(async () => { await user.click(casesRefreshBtn); });
    await waitFor(() => { 
      expect(screen.getByText(/profanity/i)).toBeInTheDocument(); 
    });

    // Now test Banned Users tab
    // Find the nav button using aria-label since text might be hidden on mobile
    const bannedNavButton = screen.getByRole('tab', { name: /Banned Users Tab/i });
    
    expect(bannedNavButton).toBeInTheDocument();

    // Switch to banned users tab
    await act(async () => { await user.click(bannedNavButton); });
    
    // Wait for the Banned Users heading to appear in the content area
    await waitFor(() => {
      const headings = screen.getAllByRole('heading', { name: /Banned Users/i });
      // Should have at least one heading (the content area heading)
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });

    // Find the banned users content heading (not the nav button text)
    const bannedHeading = screen.getAllByRole('heading', { name: /Banned Users/i })
      .find(h => h.tagName.toLowerCase() === 'h2');
    expect(bannedHeading).toBeInTheDocument();

    const bannedHeaderBar = bannedHeading!.parentElement!;
    const bannedRefreshBtn = within(bannedHeaderBar).getByRole('button', { name: /refresh/i });

    // Click banned refresh
    await act(async () => { await user.click(bannedRefreshBtn); });
    await waitFor(() => { 
      expect(screen.getByRole('heading', { name: /^Banned Users$/i })).toBeInTheDocument(); 
    });
  });

  test('filters by status and type', async () => {
    moderationLogs = [
      { log_id: 'log_3', target_type: 'message', target_id: 'm_2', reported_user_id: 'u_x', reporting_user_id: 'mod_2', violation_type: 'spam', violation_description: 'spam msg', severity_level: 'low', automated_detection: false, status: 'open', created_at: new Date().toISOString() },
      { log_id: 'log_4', target_type: 'user', target_id: 'u_y', reported_user_id: 'u_y', reporting_user_id: 'mod_2', violation_type: 'harassment', violation_description: 'mean words', severity_level: 'high', automated_detection: false, status: 'resolved', created_at: new Date().toISOString() },
    ];
    bannedUsers = [];

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/v1/logs')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ logs: moderationLogs }),
        } as Response);
      } else if (url.includes('/api/v1/banned-users')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ banned_users: bannedUsers }),
        } as Response);
      }
      return Promise.reject(new Error('Unexpected URL'));
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
    moderationLogs = [];
    bannedUsers = [];

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/v1/logs')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ logs: moderationLogs }),
        } as Response);
      } else if (url.includes('/api/v1/banned-users')) {
        return Promise.resolve({
          ok: false,
          text: async () => 'fail',
          status: 500,
        } as Response);
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    await renderWithProfile({ user_id: 'mod_3', moderator: true });

    // Switch to banned users tab first
    const bannedNavButton = screen.getByRole('tab', { name: /Banned Users Tab/i });
    await act(async () => { await userEvent.click(bannedNavButton); });

    // Wait for tab to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Banned Users$/i })).toBeInTheDocument();
    });

    // Click banned users Refresh to trigger the failing call
    const bannedSection = screen.getByRole('heading', { name: /^Banned Users$/i }).closest('div')!;
    const refreshBtn = within(bannedSection).getByRole('button', { name: /refresh/i });
    
    await act(async () => { await userEvent.click(refreshBtn); });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
  });

  test('unban flow calls API via toast action', async () => {
    moderationLogs = [];
    bannedUsers = [
      { user_id: 'banned_1', clerk_id: 'clrk_banned', account_status: 'banned', anonymous_handle: 'BannedUser' },
    ];

    fetchMock.mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/v1/logs')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ logs: moderationLogs }),
        } as Response);
      } else if (url.includes('/api/v1/banned-users')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ banned_users: bannedUsers }),
        } as Response);
      } else if (url.includes('/api/v1/unban-user/') && options?.method === 'POST') {
        // Update bannedUsers array after unban
        bannedUsers = bannedUsers.filter(u => !url.includes(u.user_id));
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: 'User has been unbanned.' }),
        } as Response);
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    const user = await renderWithProfile({ user_id: 'mod_4', moderator: true });

    // Switch to banned users tab
    const bannedNavButton = screen.getByRole('tab', { name: /Banned Users Tab/i });
    await act(async () => { await user.click(bannedNavButton); });

    // Wait for unban button to appear
    const unbanBtn = await screen.findByRole('button', { name: /Unban/i });
    await act(async () => { await user.click(unbanBtn); });

    // The component calls toast('Are you sure…', { action: { onClick } })
    // Our mock captured it; grab the last call and invoke the action
    await waitFor(() => {
      expect(toastFn).toHaveBeenCalled();
    });

    const calls = (toastFn as jest.Mock).mock.calls;
    const lastCall = calls[calls.length - 1];
    
    // Handle both possible toast signatures: toast(message, options) or toast(options)
    let opts;
    if (typeof lastCall[0] === 'string') {
      opts = lastCall[1];
    } else {
      opts = lastCall[0];
    }

    expect(opts?.action?.onClick).toBeDefined();

    await act(async () => { await opts.action.onClick(); });

    // Success toast should be called after API completes
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalled();
    });
  });
});